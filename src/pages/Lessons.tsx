import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heading } from "../components/Heading";
// Legacy mock-card component retained for reference while testing the CMS-driven implementation.
// import { LessonCard } from "../components/LessonCard";
import { LessonPathPopup, type LessonPathSelection } from "../components/LessonPathPopup";
// import { Reveal } from "../components/Reveal";
// Legacy static lesson data retained for reference; the CMS-driven lesson path is being tested instead.
// import { lessons } from "../data/site";
import "../package-page-grid.css";
import { packageService } from "../services/packages/packageService";
import type { Package } from "../services/domain/types";

type LessonPathRecord = {
  id: string;
  title: string;
  slug: string;
  introText: string;
  learnerCategory: string;
  transmission: string;
  isActive: boolean;
};

type LessonPathPlanRecord = {
  id: string;
  title: string;
  lessonPathSlug: string;
  pricingPlanId: string;
  displayOrder: number;
  isRecommended: boolean;
  recommendationLabel: string;
};

type LessonPathApiResponse = {
  ok: boolean;
  lessonPaths?: LessonPathRecord[];
  lessonPathPlans?: LessonPathPlanRecord[];
  message?: string;
};

type RecommendedPlan = {
  mapping: LessonPathPlanRecord;
  plan: Package;
};

const goalLabels: Record<LessonPathSelection["goal"], string> = {
  beginner: "Beginner",
  "partly-trained": "Partly trained",
  refresher: "Refresher",
  "full-experience": "Full experience",
  "test-ready": "Test-ready learner",
  motorway: "Motorway training",
  "pdi-adi": "PDI and ADI training",
};

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function Lessons() {
  const [showLessonPath, setShowLessonPath] = useState(true);
  const [selection, setSelection] = useState<LessonPathSelection | null>(null);
  const [lessonPaths, setLessonPaths] = useState<LessonPathRecord[]>([]);
  const [lessonPathPlans, setLessonPathPlans] = useState<LessonPathPlanRecord[]>([]);
  const [recommendedPlans, setRecommendedPlans] = useState<RecommendedPlan[]>([]);
  const [cmsLoading, setCmsLoading] = useState(true);
  const [cmsError, setCmsError] = useState("");
  const [planWarning, setPlanWarning] = useState("");
  const dismissLessonPath = useCallback(() => setShowLessonPath(false), []);

  const continueWithSelection = (nextSelection: LessonPathSelection) => {
    setSelection(nextSelection);
    setShowLessonPath(false);
  };

  useEffect(() => {
    let active = true;
    fetch("/api/lesson-paths", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const payload = await response.json() as LessonPathApiResponse;
        if (!response.ok || !payload.ok || !Array.isArray(payload.lessonPaths) || !Array.isArray(payload.lessonPathPlans)) {
          throw new Error(payload.message || "Lesson recommendations could not be loaded.");
        }
        if (active) {
          setLessonPaths(payload.lessonPaths);
          setLessonPathPlans(payload.lessonPathPlans);
          setCmsError("");
        }
      })
      .catch((error: unknown) => {
        if (active) setCmsError(error instanceof Error ? error.message : "Lesson recommendations could not be loaded.");
      })
      .finally(() => {
        if (active) setCmsLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setRecommendedPlans([]);
    setPlanWarning("");
    if (!selection) return () => { active = false; };

    const selectedCategory = goalLabels[selection.goal];
    const matchingPath = lessonPaths.find((path) =>
      path.isActive &&
      path.learnerCategory.toLowerCase() === selectedCategory.toLowerCase() &&
      path.transmission.toLowerCase() === selection.transmission.toLowerCase()
    );

    if (!matchingPath) {
      if (!cmsLoading && !cmsError) {
        setPlanWarning("There is no active lesson path configured for this combination yet.");
      }
      return () => { active = false; };
    }

    const mappings = lessonPathPlans
      .filter((mapping) => mapping.lessonPathSlug === matchingPath.slug && mapping.pricingPlanId)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    if (mappings.length === 0) {
      setPlanWarning("This lesson path is configured, but no active package is linked to its exact slug in LessonPathPlans.");
      return () => { active = false; };
    }

    Promise.all(mappings.map(async (mapping) => {
      const result = await packageService.getById(mapping.pricingPlanId);
      if (!result.ok) {
        return { mapping, plan: null as Package | null };
      }
      return { mapping, plan: result.data };
    }))
      .then((results) => {
        if (!active) return;
        const valid = results.filter((result): result is { mapping: LessonPathPlanRecord; plan: Package } => result.plan !== null);
        setRecommendedPlans(valid);
        if (valid.length !== mappings.length) {
          setPlanWarning("One or more linked plan IDs could not be retrieved from Wix Pricing Plans. Check that pricingPlanId contains a real Pricing Plan ID, not a Bookings service ID.");
        } else {
          setPlanWarning("");
        }
      })
      .catch(() => {
        if (active) setPlanWarning("Wix Pricing Plans could not be loaded. Please try again.");
      });

    return () => { active = false; };
  }, [selection, lessonPaths, lessonPathPlans, cmsLoading, cmsError]);

  return (
    <section className="page">
      {showLessonPath && (
        <LessonPathPopup onContinue={continueWithSelection} onDismiss={dismissLessonPath} />
      )}
      <div className="container">
        {selection && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
            <button className="btn light" type="button" onClick={() => setShowLessonPath(true)}>Change choices</button>
          </div>
        )}

        {selection && (
          <section className="lesson-recommendations" aria-live="polite">
            <Heading
              ey="YOUR PERSONAL LESSON PATH"
              title={recommendedPlans.length ? "Recommended for your next step." : "Finding the right lesson path."}
              text="Recommendations are matched to your selected learner category and transmission using your Wix CMS configuration."
            />
            {cmsLoading && <p role="status">Loading lesson paths from Wix…</p>}
            {!cmsLoading && cmsError && <p role="alert">{cmsError}</p>}
            {!cmsLoading && !cmsError && planWarning && <p role="status">{planWarning}</p>}
            {!cmsLoading && !cmsError && recommendedPlans.length > 0 && (
              <div className="cards pagecards">
                {recommendedPlans.map(({ mapping, plan }) => (
                  <article className="lesson-plan-card" key={mapping.id}>
                    <div className="lesson-plan-card__topline">
                      <span className="lesson-plan-card__eyebrow">
                        {plan.lessonHours > 0 ? `${plan.lessonHours} Hours` : "Driving Programme"}
                      </span>
                      {mapping.isRecommended && (
                        <span className="lesson-plan-card__recommended">
                          {mapping.recommendationLabel || "Recommended"}
                        </span>
                      )}
                    </div>
                    <h3>{plan.name}</h3>
                    {(plan.description || mapping.title) && (
                      <p className="lesson-plan-card__description">{plan.description || mapping.title}</p>
                    )}
                    <div className="lesson-plan-card__price">
                      {formatMoney(plan.priceMinor, plan.currency)}
                      <span> / package</span>
                    </div>
                    {plan.features.length > 0 && (
                      <ul className="lesson-plan-card__features">
                        {plan.features.map((feature, index) => (
                          <li key={index}>
                            <span aria-hidden="true">✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link className="btn red full lesson-plan-card__action" to={`/booking?package=${encodeURIComponent(plan.id)}`}>
                      Select &amp; continue <span aria-hidden="true">→</span>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/*
          LEGACY MOCK LESSON CARDS — intentionally commented out, not deleted.
          Restore this block only when the static mock data is needed again.
          <Heading
            center
            ey="Driving Lesson"
            title="A progression, not random practice."
            text="Each lesson type has a clear outcome so learners understand what they are improving and why it matters."
          />
          <div className="lessoncards light">
            {lessons.map((lesson, index) => (
              <Reveal key={lesson[0]}>
                <LessonCard lesson={lesson} index={index} light />
              </Reveal>
            ))}
          </div>
        */}

        <div className="timeline">
          {["Understand", "Practice", "Refine", "Perform"].map((label, index) => (
            <div key={label}>
              <b>0{index + 1}</b>
              <h3>{label}</h3>
              <p>
                {[
                  "Learn the control, rule or decision.",
                  "Repeat it under real road conditions.",
                  "Correct habits before they become faults.",
                  "Use the skill independently and safely.",
                ][index]}
              </p>
            </div>
          ))}
        </div>
        <div className="panel">
          <div>
            <span className="ey">Not sure where to start?</span>
            <h2>Let us recommend your first lesson.</h2>
          </div>
          <Link className="btn red" to="/packages">
            View packages <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
