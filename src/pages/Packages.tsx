import { Link } from "react-router-dom";
import { Heading } from "../components/Heading";
import { PackageCard } from "../components/PackageCard";
import { packages, services } from "../data/site";

export function Packages() {
  return (
    <section className="page">
      <div className="container">
        <Heading
          center
          ey="UK pricing"
          title="Straightforward pricing for every stage of learning."
          text="Prices are positioned against current UK driving-school rates, with manual, automatic, intensive, motorway, refresher and post-test options."
        />
        <div className="cards pagecards">
          {packages.map((p) => (
            <PackageCard key={p.id} p={p} full />
          ))}
        </div>

        <div className="servicepricing">
          <div className="sectionIntro">
            <Heading
              ey="Additional services"
              title="More than standard lessons."
              text="Build a complete learning plan around the support you actually need."
            />
          </div>
          <div className="servicegrid">
            {services.map((service) => (
              <article className="servicecard" key={service.name}>
                <div>
                  <span className="cardey">{service.price}</span>
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>
                </div>
                <Link className="textlink" to="/booking">
                  Enquire <span>→</span>
                </Link>
              </article>
            ))}
          </div>
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
