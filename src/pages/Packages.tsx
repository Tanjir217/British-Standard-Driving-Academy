import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heading } from "../components/Heading";
import { PackageCard } from "../components/PackageCard";
import { packageService } from "../services/packages/packageService";
import { bookingService } from "../services/bookings/bookingService";
import type { Package } from "../services/domain/types";
import type { BookingServiceCatalogItem } from "../services/bookings/bookingService";

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

const packageCopy: Record<string, { eyebrow: string; description: string; features: string[]; popular?: boolean }> = {
  "10-hour block booking": {
    eyebrow: "10 Hours",
    description: "A discounted block booking for learners who want consistent progress over a structured period.",
    features: ["10 driving lessons", "Complete within 1 month", "Progress-focused tuition"],
    popular: true,
  },
  "20-hour block booking": {
    eyebrow: "20 Hours",
    description: "A larger discounted block for learners who want more practice and continuity.",
    features: ["20 driving lessons", "Complete within 1 month", "Progress-focused tuition"],
  },
  "10-hour intensive programme": {
    eyebrow: "10 Hours · Intensive",
    description: "A focused programme designed to complete 10 hours of training within a two-week period.",
    features: ["10 driving lessons", "Complete within 2 weeks", "Intensive training structure"],
  },
  "20-hour intensive programme": {
    eyebrow: "20 Hours · Intensive",
    description: "A focused programme designed to complete 20 hours of training within a three-week period.",
    features: ["20 driving lessons", "Complete within 3 weeks", "Intensive training structure"],
  },
};

function getPackageCopy(plan: Package) {
  const copy = packageCopy[plan.name.trim().toLowerCase()];
  return {
    eyebrow: copy?.eyebrow ?? `${plan.lessonHours} Hours`,
    description:
      copy?.description ??
      "A structured BSDA driving programme managed through our booking and pricing system.",
    features:
      plan.features.length > 0
        ? plan.features
        : copy?.features ?? ["Structured driving tuition", "Flexible scheduling"],
    popular: copy?.popular,
  };
}

function ServiceCard({ service }: { service: BookingServiceCatalogItem }) {
  return (
    <article className="servicecard">
      <div>
        <span className="cardey">
          {formatMoney(service.priceMinor, service.currency)}
        </span>
        <h3>{service.name}</h3>
        <p>{service.description || "Driving service available through BSDA."}</p>
      </div>
      <Link className="textlink" to={`/booking?service=${service.id}`}>
        Enquire <span>→</span>
      </Link>
    </article>
  );
}

export function Packages() {
  const [packageData, setPackageData] = useState<Package[]>([]);
  const [serviceData, setServiceData] = useState<BookingServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([packageService.list(), bookingService.listServices()]).then(
      ([packagesResult, servicesResult]) => {
        if (!active) return;

        if (packagesResult.ok) {
          setPackageData(packagesResult.data);
        } else {
          setError(packagesResult.error.message);
        }

        if (servicesResult.ok) {
          setServiceData(servicesResult.data);
        } else if (!packagesResult.ok) {
          setError(
            `${packagesResult.error.message} Additional services could not be loaded: ${servicesResult.error.message}`,
          );
        }
      },
    ).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const packageCards = packageData.map((plan) => {
    const copy = getPackageCopy(plan);
    return {
      ...plan,
      price: formatMoney(plan.priceMinor, plan.currency),
      eyebrow: copy.eyebrow,
      description: copy.description,
      features: copy.features,
      popular: copy.popular,
    };
  });

  return (
    <section className="page">
      <div className="container">
        <Heading
          center
          ey="UK pricing"
          title="Straightforward pricing for every stage of learning."
          text="Live package and service pricing is loaded from BSDA's Wix booking and pricing-plan configuration."
        />

        {loading && (
          <div className="paystrip">
            <div>
              <span className="ey">Loading live pricing</span>
              <h3>Fetching the latest BSDA prices.</h3>
              <p>Please wait while the site loads the current pricing from Wix.</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="paystrip">
            <div>
              <span className="ey">Pricing unavailable</span>
              <h3>We couldn't load the current prices.</h3>
              <p>{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && packageCards.length === 0 && (
          <div className="paystrip">
            <div>
              <span className="ey">No packages available</span>
              <h3>There are currently no public pricing plans.</h3>
              <p>Please contact BSDA for current package options.</p>
            </div>
          </div>
        )}

        {!loading && !error && packageCards.length > 0 && (
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
              text="Service names, descriptions and prices below are loaded from Wix Bookings."
            />
          </div>

          {!loading && !error && serviceData.length === 0 && (
            <div className="paystrip">
              <div>
                <span className="ey">No services available</span>
                <h3>There are currently no public appointment services.</h3>
              </div>
            </div>
          )}

          {!loading && !error && serviceData.length > 0 && (
            <div className="servicegrid">
              {serviceData.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </div>

        <div className="paystrip">
          <div>
            <span className="ey">UK test costs</span>
            <h3>Theory and practical test fees are separate.</h3>
            <p>
              GOV.UK currently lists the car theory test at £23 and the car practical
              test at £62–£75, depending on when it is taken.
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
