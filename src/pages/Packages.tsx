import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heading } from "../components/Heading";
import { PackageCard } from "../components/PackageCard";
import { packageService } from "../services/packages/packageService";
import { bookingService } from "../services/bookings/bookingService";
import type { Package } from "../services/domain/types";
import type { BookingServiceCatalogItem } from "../services/bookings/bookingService";
import "../package-page-grid.css";

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function getDescriptionList(description: string) {
  const normalized = description.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return { intro: "", items: [] as string[] };

  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const sourceLines = lines.length > 1
    ? lines
    : (() => {
        const colon = normalized.match(/^(.+?:)\s+(.+)$/);
        const intro = colon?.[1] ?? "";
        const remainder = colon?.[2] ?? normalized;
        const sentences = remainder.match(/[^.!?]+[.!?]+(?:["')\]]*)|[^.!?]+$/g) ?? [remainder];
        return intro ? [intro, ...sentences.map((sentence) => sentence.trim()).filter(Boolean)] : sentences.map((sentence) => sentence.trim()).filter(Boolean);
      })();

  const intro = sourceLines[0]?.endsWith(":") ? sourceLines[0] : "";
  const items = (intro ? sourceLines.slice(1) : sourceLines)
    .map((item) => item.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
  return { intro, items };
}

function ServiceCard({
  service,
  descriptionAsList = false,
}: {
  service: BookingServiceCatalogItem;
  descriptionAsList?: boolean;
}) {
  const description = service.description?.trim() ?? "";
  const descriptionList = descriptionAsList ? getDescriptionList(description) : null;

  return (
    <article className="servicecard">
      <div>
        <span className="cardey">
          {formatMoney(service.priceMinor, service.currency)}
        </span>
        <h3>{service.name}</h3>
        {descriptionAsList && descriptionList ? (
          <div className="servicecardDescription">
            {descriptionList.intro && <p>{descriptionList.intro}</p>}
            {descriptionList.items.length > 0 && (
              <ul className="serviceDescriptionList">
                {descriptionList.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p>{description || "Driving service available through BSDA."}</p>
        )}
      </div>
      <Link className="btn red servicecardContinue" to={`/booking?service=${encodeURIComponent(service.id)}`}>
        Select &amp; continue <span>→</span>
      </Link>
    </article>
  );
}

function isCarHireService(service: BookingServiceCatalogItem) {
  return /car hire|test[- ]day car hire|test[- ]day|exam car hire/i.test(
    service.name,
  );
}

function isTestPreparationService(service: BookingServiceCatalogItem) {
  return /test preparation|test prep|practical test|driving test/i.test(
    service.name,
  );
}

export function Packages() {
  const [packageData, setPackageData] = useState<Package[]>([]);
  const [serviceData, setServiceData] = useState<BookingServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [packageError, setPackageError] = useState("");
  const [serviceError, setServiceError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([packageService.list(), bookingService.listServices()])
      .then(([packagesResult, servicesResult]) => {
        if (!active) return;

        if (packagesResult.ok) {
          setPackageData(packagesResult.data);
          setPackageError("");
        } else {
          setPackageError(packagesResult.error.message);
        }

        if (servicesResult.ok) {
          setServiceData(servicesResult.data);
          setServiceError("");
        } else {
          setServiceError(servicesResult.error.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const packageCards = packageData.map((plan) => ({
    ...plan,
    price: formatMoney(plan.priceMinor, plan.currency),
    eyebrow: plan.lessonHours > 0 ? `${plan.lessonHours} Hours` : "Driving Programme",
    description: plan.description,
    features: plan.features,
  }));

  const standardServices = serviceData.filter(
    (service) =>
      !isCarHireService(service) && !isTestPreparationService(service),
  );

  const testSupportServices = serviceData.filter(
    (service) =>
      isCarHireService(service) || isTestPreparationService(service),
  );

  return (
    <section className="page">
      <div className="container">
        <Heading
          center
          ey=""
          title="Straightforward pricing for every stage of learning."
          text="Lessons are generally scheduled in 2-hour slots.
          "
        />

        {loading && (
          <div className="paystrip">
            <div>
              <span className="ey">Loading live pricing</span>
              <h3>Fetching the latest BSDA prices.</h3>
              <p>
                Please wait while the site loads the current pricing from Wix.
              </p>
            </div>
          </div>
        )}

        {!loading && packageError && (
          <div className="paystrip">
            <div>
              <span className="ey">Packages unavailable</span>
              <h3>We couldn't load the current pricing plans.</h3>
              <p>{packageError}</p>
            </div>
          </div>
        )}

        {!loading && !packageError && packageCards.length === 0 && (
          <div className="paystrip">
            <div>
              <span className="ey">No packages available</span>
              <h3>There are currently no public pricing plans.</h3>
              <p>Please contact BSDA for current package options.</p>
            </div>
          </div>
        )}

        {!loading && !packageError && packageCards.length > 0 && (
          <div className="cards pagecards">
            {packageCards.map((p) => (
              <PackageCard key={p.id} p={p} full />
            ))}
          </div>
        )}

        <div className="servicepricing">
          <div className="sectionIntro">
            <Heading
              ey="Additional services"
              title="More than standard lessons."
              text=""
            />
          </div>

          {!loading && serviceError && (
            <div className="paystrip">
              <div>
                <span className="ey">Services unavailable</span>
                <h3>We couldn't load the current appointment services.</h3>
                <p>{serviceError}</p>
              </div>
            </div>
          )}

          {!loading && !serviceError && serviceData.length === 0 && (
            <div className="paystrip">
              <div>
                <span className="ey">No services available</span>
                <h3>
                  There are currently no public appointment services.
                </h3>
              </div>
            </div>
          )}

          {!loading && !serviceError && standardServices.length > 0 && (
            <div className="servicegrid">
              {standardServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}

          {!loading && !serviceError && testSupportServices.length > 0 && (
            <div className="servicepricing servicepricing--highlight">
              <div className="sectionIntro">
                <Heading
                  ey="Test support"
                  title="Test preparation and test-day car hire."
                  text="Build confidence, improve your skills, and prepare for your practical test. All test-day car hire is subject to eligibility, instructor approval, and availability."
                />
              </div>

              <div className="servicegrid">
                {testSupportServices.map((service) => (
                  <ServiceCard key={service.id} service={service} descriptionAsList />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="paystrip">
          <div>
            <span className="ey">UK test costs</span>
            <h3>Theory and practical test fees are separate.</h3>
            <p>
              GOV.UK currently lists the car theory test at £23 and the car
              practical test at £62–£75, depending on when it is taken.
            </p>
          </div>
          <div className="paychips">
            <span>Theory · £23</span>
            <span>Practical · £62–£75</span>
          </div>
        </div>
      </div>
    </section>
  );
}
