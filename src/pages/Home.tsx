import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Heading } from "../components/Heading";
import { Reveal } from "../components/Reveal";
import { VideoShowcase } from "../components/VideoShowcase";
import { PackageCard } from "../components/PackageCard";
import { LessonCard } from "../components/LessonCard";
import { FAQSection } from "../components/FAQSection";
import { VideoEmbed } from "../components/VideoEmbed";
import { getSiteContent } from "../services/siteContentService";
import { lessons, instructors } from "../data/site";
import { packageService } from "../services/packages/packageService";
import type { Package } from "../services/domain/types";

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

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function toPackageCard(plan: Package) {
  const copy = packageCopy[plan.name.trim().toLowerCase()];
  return {
    id: plan.id,
    name: plan.name,
    price: formatMoney(plan.priceMinor, plan.currency),
    eyebrow: copy?.eyebrow ?? (plan.lessonHours ? `${plan.lessonHours} Hours` : "Driving Programme"),
    description: copy?.description ?? "A structured BSDA driving programme managed through our booking and pricing system.",
    features: plan.features.length > 0 ? plan.features : copy?.features ?? ["Structured driving tuition", "Flexible scheduling"],
    popular: copy?.popular,
  };
}

function AnimatedStat({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frame = 0;
    let started = false;

    const animate = () => {
      const duration = 1300;
      const start = performance.now();

      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(target * eased);
        if (element) {
          element.textContent =
            value.toString().padStart(target < 10 ? 2 : 1, "0") + suffix;
        }
        if (progress < 1) frame = requestAnimationFrame(tick);
      };

      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          animate();
        }
      },
      { threshold: 0.45 },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, suffix]);

  return <strong ref={ref}>{target < 10 ? "0" : ""}{target}{suffix}</strong>;
}

export function Home() {
  const [reelPage, setReelPage] = useState(0);
  const [reelsInteracted, setReelsInteracted] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [testimonialIndex, setTestimonialIndex] = useState(6);
  const [testimonialResetting, setTestimonialResetting] = useState(false);
  const [reelUrls, setReelUrls] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    packageService.list().then((result) => {
      if (active && result.ok) setPackages(result.data);
    });
    return () => {
      active = false;
    };
  }, []);

  const packageCards = packages.map(toPackageCard);

  const testimonialItems = [
    ["My lessons finally felt structured. I knew what I had improved and what I needed to practise next.", "Demo learner · Beginner"],
    ["The calm coaching made a huge difference. I became much more comfortable in busy traffic.", "Demo learner · Refresher"],
    ["I stopped feeling rushed behind the wheel and started making decisions with confidence.", "Demo learner · New driver"],
    ["The instructor explained everything clearly and gave me a plan for every lesson.", "Demo learner · Beginner"],
    ["I felt much more prepared for real traffic, not just the test route.", "Demo learner · Test preparation"],
    ["The lessons were practical, patient and focused on the areas I actually needed to improve.", "Demo learner · Refresher"],
  ];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTestimonialIndex((current) => current + 1);
    }, 2000);

    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (testimonialIndex === 12) {
      const timer = window.setTimeout(() => {
        setTestimonialResetting(true);
        setTestimonialIndex(6);
      }, 560);

      return () => window.clearTimeout(timer);
    }

    if (testimonialIndex === 5) {
      const timer = window.setTimeout(() => {
        setTestimonialResetting(true);
        setTestimonialIndex(11);
      }, 560);

      return () => window.clearTimeout(timer);
    }
  }, [testimonialIndex]);

  useEffect(() => {
    if (!testimonialResetting) return;

    const frame = window.requestAnimationFrame(() => {
      setTestimonialResetting(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [testimonialResetting]);
  const reelViewportRef = useRef<HTMLDivElement | null>(null);
  const reelItems = reelUrls.length ? reelUrls : ["", "", "", "", "", ""];

  useEffect(() => {
    let active = true;

    getSiteContent()
      .then((content) => {
        if (!active) return;
        setReelUrls(
          Array.from({ length: 6 }, (_, index) => content[`reel-${index + 1}`]?.url || ""),
        );
      })
      .catch(() => {
        if (active) setReelUrls([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const scrollReels = (direction: -1 | 1) => {
    const viewport = reelViewportRef.current;
    const grid = viewport?.querySelector<HTMLElement>(".socialReelsGrid");
    const card = grid?.querySelector<HTMLElement>(".socialReelCard");
    if (!viewport || !grid || !card) return;

    const gap = parseFloat(getComputedStyle(grid).columnGap || getComputedStyle(grid).gap || "0");
    viewport.scrollBy({
      left: direction * (card.getBoundingClientRect().width + gap),
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (reelsInteracted || reelItems.length < 2) return;
    const isMobile = window.matchMedia("(max-width: 600px)").matches;
    if (!isMobile) return;
    const timer = window.setInterval(() => {
      const viewport = reelViewportRef.current;
      const grid = viewport?.querySelector<HTMLElement>(".socialReelsGrid");
      const card = grid?.querySelector<HTMLElement>(".socialReelCard");
      if (!viewport || !grid || !card) return;
      const gap = parseFloat(getComputedStyle(grid).columnGap || getComputedStyle(grid).gap || "0");
      const step = card.getBoundingClientRect().width + gap;
      const maxPage = Math.max(0, reelItems.length - 1);
      if (reelPage >= maxPage) return;
      viewport.scrollTo({ left: (reelPage + 1) * step, behavior: "smooth" });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [reelsInteracted, reelItems.length, reelPage]);

  const syncReelPage = () => {
    const viewport = reelViewportRef.current;
    const grid = viewport?.querySelector<HTMLElement>(".socialReelsGrid");
    const card = grid?.querySelector<HTMLElement>(".socialReelCard");
    if (!viewport || !grid || !card) return;

    const gap = parseFloat(getComputedStyle(grid).columnGap || getComputedStyle(grid).gap || "0");
    const step = card.getBoundingClientRect().width + gap;
    const page = step > 0 ? Math.round(viewport.scrollLeft / step) : 0;
    setReelPage(Math.max(0, Math.min(reelItems.length - 1, page)));
  };
  return (
    <>
      <section className="hero">
        <div className="container herogrid">
          <div className="heroCopy">
            <span className="ey">British-standard driving education</span>
            <h1>Learn to drive.<br /><em>Learn to live.</em></h1>
            <p>Confident drivers are built through patient coaching, purposeful practice and a learning path that makes every lesson count.</p>
            <div className="actions">
              <Link className="btn red" to="/booking">Book your first lesson <Icon n="arrow" /></Link>
              <Link className="btn light" to="/instructors">Meet our instructors</Link>
            </div>
            <div className="heroTrust">
              <span><Icon n="shield" s={16} /> Safety-first coaching</span>
              <span><Icon n="car" s={16} /> Practical road skills</span>
              <span><Icon n="calendar" s={16} /> Flexible scheduling</span>
            </div>
          </div>

          <div className="heroart">
            <div className="heroRing ringone" />
            <div className="heroRing ringtwo" />
            <div className="heroFrame">
              <div className="heroSky" />
              <div className="heroBuilding bOne" />
              <div className="heroBuilding bTwo" />
              <div className="heroRoad" />
              <div className="heroDash dashOne" />
              <div className="heroDash dashTwo" />
              <div className="heroDash dashThree" />
              <div className="heroCar" />
              <div className="heroFramecopy"><small>YOUR NEXT MILE</small><b>Starts here.</b></div>
            </div>
            <div className="floatingCard">
              <span className="ey">Learning path</span>
              <b>Beginner → Road-ready</b>
              <i><span /></i>
            </div>
          </div>
        </div>

      </section>

      <section className="quickLinks section">
        <div className="container">
          <div className="quickLinksGrid">
            {[
              {
                image: "/quick-links/driving-lessons.svg",
                eyebrow: "Start learning",
                title: "Driving Lessons",
                text: "Manual and automatic lessons with qualified instructors.",
                label: "Learn more",
                to: "/lessons",
              },
              {
                image: "/quick-links/packages.svg",
                eyebrow: "Choose your pace",
                title: "Price & Packages",
                text: "Starter, Plus and Premium lesson paths with transparent pricing.",
                label: "View packages",
                to: "/packages",
              },
              {
                image: "/quick-links/learning-portal.svg",
                eyebrow: "Keep progressing",
                title: "Learning Portal",
                text: "Access theory support, mock tests and progress tracking.",
                label: "Student login",
                to: "/portal",
              },
              {
                image: "/quick-links/government-links.svg",
                eyebrow: "Official information",
                title: "Government Info Links",
                text: "Find DVLA, theory test booking and practical exam information.",
                label: "More info",
                to: "/faq",
              },
            ].map((item, index) => (
              <Reveal key={item.title} delay={index * 70}>
                <article className="quickLinkCard">
                  <div className="quickLinkImage">
                    <img
                      src={item.image}
                      alt=""
                      width="800"
                      height="450"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="quickLinkBody">
                    <span className="ey">{item.eyebrow}</span>
                    <h2>{item.title}</h2>
                    <p>{item.text}</p>
                    <Link className="btn light" to={item.to}>
                      {item.label}
                      <Icon n="arrow" />
                    </Link>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="homeMotionStats" aria-label="BSDA highlights">
        <div className="homeMotionTicker" aria-hidden="true">
          <div className="homeMotionTickerTrack">
            <span>DRIVING LESSONS</span><i>✦</i>
            <span>MANUAL &amp; AUTOMATIC</span><i>✦</i>
            <span>THEORY TEST SUPPORT</span><i>✦</i>
            <span>INTENSIVE COURSES</span><i>✦</i>
            <span>QUALIFIED INSTRUCTORS</span><i>✦</i>
            <span>ROAD-READY CONFIDENCE</span><i>✦</i>
            <span>DRIVING LESSONS</span><i>✦</i>
            <span>MANUAL &amp; AUTOMATIC</span><i>✦</i>
            <span>THEORY TEST SUPPORT</span><i>✦</i>
            <span>INTENSIVE COURSES</span><i>✦</i>
            <span>QUALIFIED INSTRUCTORS</span><i>✦</i>
            <span>ROAD-READY CONFIDENCE</span><i>✦</i>
          </div>
        </div>

        <div className="homeStats">
          <div className="container homeStatsGrid">
            <div><AnimatedStat target={1} /><span>Clear learning path</span></div>
            <div><AnimatedStat target={3} /><span>Flexible lesson paths</span></div>
            <div><AnimatedStat target={24} suffix="/7" /><span>Learning resources</span></div>
            <div><AnimatedStat target={100} suffix="%" /><span>Safety-first coaching</span></div>
          </div>
        </div>
      </section>

      <section className="offerstrip">
        <div className="container offerin">
          <div><span className="ey">New learner offer</span><h2>Choose your pace. Keep your progress.</h2></div>
          <div><strong>3 / 8 / 15</strong><span>lesson paths</span></div>
          <Link className="btn white" to="/packages">See packages <Icon n="arrow" /></Link>
        </div>
      </section>

      <section className="section soft">
        <div className="container">
          <div className="sectionIntro">
            <Heading center ey="Choose your path" title="Training built around your goal." text="Start small, train consistently or choose an intensive path when time matters." />
            <span className="sectionNumber">02</span>
          </div>
          <div className="cards package-home-grid">
            {packageCards.map((p, i) => (
              <Reveal key={p.id} delay={i * 90}><PackageCard p={p} /></Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section videoSection">
        <div className="container">
          <div className="sectionIntro">
            <Heading center ey="Inside the learning journey" title="Focused lessons. Real road confidence." text="A visual layer brings movement to the experience without getting in the way of the information." />
            <span className="sectionNumber">04</span>
          </div>
          <Reveal><VideoShowcase /></Reveal>
        </div>
      </section>

      <section className="section dark">
        <div className="container">
          <div className="sectionIntro">
            <Heading ey="Lesson system" title="Skills that matter beyond the test." text="Four focused lesson paths cover the fundamentals and the situations learners need most." />
            <span className="sectionNumber lightNumber">03</span>
          </div>
          <div className="lessoncards">
            {lessons.map((l, i) => (
              <Reveal key={l[0]} delay={i * 80}><LessonCard lesson={l} index={i} /></Reveal>
            ))}
          </div>
          <div className="darklink"><Link className="textlink" to="/lessons">Explore the full lesson system <Icon n="arrow" s={15} /></Link></div>
        </div>
      </section>

      <section className="missionVision section">
        <div className="container">
          <div className="sectionIntro">
            <Heading
              center
              ey="Our purpose"
              title="Building better drivers for life."
              text="Our mission and vision shape every lesson, from the first control to confident everyday driving."
            />
            <span className="sectionNumber">04</span>
          </div>

          <div className="missionVisionGrid">
            <article className="missionVisionCard missionCard">
              <span className="missionVisionLabel">Our Mission</span>
              <h2>Teach with purpose. Coach with patience.</h2>
              <p>
                To provide structured, safety-first driving education that helps
                every learner develop practical skills, sound judgement and the
                confidence to drive independently.
              </p>
              <div className="missionVisionLine" />
              <span className="missionVisionTag">Learn · Practise · Progress</span>
            </article>

            <article className="missionVisionCard visionCard">
              <span className="missionVisionLabel">Our Vision</span>
              <h2>A generation of confident, responsible drivers.</h2>
              <p>
                To become a trusted driving education academy where learners
                leave with more than a licence — they leave with the awareness,
                discipline and road confidence to make better decisions every day.
              </p>
              <div className="missionVisionLine" />
              <span className="missionVisionTag">Confidence · Safety · Independence</span>
            </article>
          </div>
        </div>
      </section>

      <section className="socialReels section">
        <div className="container">
          <div className="sectionIntro">
            <Heading
              center
              ey="Follow the journey"
              title="See BSDA in motion."
              text="Short tips, road moments and learner-focused content from our social channels."
            />
            <span className="sectionNumber">04</span>
          </div>

          <div
            className="socialReelsViewport"
            ref={reelViewportRef}
            onScroll={syncReelPage}
            onTouchStart={() => setReelsInteracted(true)}
            onPointerDown={() => setReelsInteracted(true)}
          >
            <div className="socialReelsGrid">
              {reelItems.map((url, index) => (
                <article className="socialReelCard" key={"reel-" + (index + 1)}>
                  <div className="socialReelFrame" aria-label={"Short video " + (index + 1)}>
                    {url ? (
                      <VideoEmbed
                        url={url}
                        title={"BSDA short video " + (index + 1)}
                        className="socialReelEmbed"
                      />
                    ) : (
                      <div className="socialReelPlaceholder" aria-hidden="true">
                        <span>REEL {String(index + 1).padStart(2, "0")}</span>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="socialReelsControls" aria-label="Short video navigation">
            <button
              type="button"
              className="socialReelArrow"
              onClick={() => { setReelsInteracted(true); scrollReels(-1); }}
              disabled={reelPage === 0}
              aria-label="Show previous short videos"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              className="socialReelArrow"
              onClick={() => { setReelsInteracted(true); scrollReels(1); }}
              disabled={reelPage === reelItems.length - 4}
              aria-label="Show next short videos"
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </div>
      </section>
      <section className="testimonials">
        <div className="container testimonialgrid">
          <div>
            <span className="ey">Learner feedback</span>
            <h2>“The goal is not just passing. It is knowing what to do when the road changes.”</h2>
          </div>

          <div className="testimonialCarousel">
            <div className="testimonialViewport">
              <div
                className={"testimonialTrack" + (testimonialResetting ? " testimonialTrackReset" : "")}
                style={{ transform: `translateY(-${testimonialIndex * 221}px)` }}
              >
                {[...testimonialItems, ...testimonialItems, ...testimonialItems, ...testimonialItems].map(([quote, learner], index) => (
                  <article className="quoteCard" key={index}>
                    <b>“</b>
                    <p>{quote}</p>
                    <span>— {learner}</span>
                  </article>
                ))}
              </div>
            </div>

            <div className="testimonialControls" aria-label="Learner feedback navigation">
              <button
                type="button"
                className="testimonialArrow"
                onClick={() => setTestimonialIndex((current) => current - 1)}
                aria-label="Show previous learner feedback"
              >
                <span aria-hidden="true">↑</span>
              </button>
              <button
                type="button"
                className="testimonialArrow"
                onClick={() => setTestimonialIndex((current) => current + 1)}
                aria-label="Show next learner feedback"
              >
                <span aria-hidden="true">↓</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <FAQSection />

    </>
  );
}
