import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

export type DrivingJourneyRefs = {
  root: HTMLElement;
  viewport: HTMLElement;
  path: SVGPathElement;
  car: SVGGElement;
  hero: HTMLElement;
  panels: HTMLElement[];
  trainingCards: HTMLElement[];
  processSteps: HTMLElement[];
  instructor: HTMLElement;
  finalCta: HTMLElement;
  progress: HTMLElement;
  environment: HTMLElement[];
};

export function setupDrivingJourney(refs: DrivingJourneyRefs) {
  const {
    root,
    viewport,
    path,
    car,
    hero,
    panels,
    trainingCards,
    processSteps,
    instructor,
    finalCta,
    progress,
    environment,
  } = refs;

  const mm = gsap.matchMedia();

  mm.add(
    {
      desktop: "(min-width: 901px)",
      mobile: "(max-width: 900px)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      const conditions = context.conditions as {
        desktop: boolean;
        mobile: boolean;
        reduceMotion: boolean;
      };

      const reduced = conditions.reduceMotion;
      const journeyEnd = conditions.mobile ? "+=500%" : "+=600%";

      gsap.set(car, {
        transformOrigin: "50% 50%",
        opacity: 1,
      });

      if (reduced) {
        gsap.set(hero, { opacity: 0 });
        gsap.set(panels, { opacity: 1, y: 0 });
        gsap.set(trainingCards, { opacity: 1, y: 0 });
        gsap.set(processSteps, { opacity: 1, y: 0 });
        gsap.set(instructor, { opacity: 1, x: 0 });
        gsap.set(finalCta, { opacity: 1, y: 0 });
        gsap.set(car, {
          motionPath: {
            path,
            align: path,
            alignOrigin: [0.5, 0.5],
            autoRotate: true,
            end: 1,
          },
        });
        return;
      }

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          id: "bsda-driving-journey",
          trigger: root,
          start: "top top",
          end: journeyEnd,
          scrub: 1,
          pin: viewport,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // The car uses ONE continuous SVG path as the source of truth.
      // MotionPathPlugin handles position + automatic road-following rotation.
      timeline.to(
        car,
        {
          duration: 10,
          motionPath: {
            path,
            align: path,
            alignOrigin: [0.5, 0.5],
            autoRotate: true,
            start: 0,
            end: 1,
          },
        },
        0,
      );

      // Hero exits during the opening part of the journey.
      timeline.to(hero, { opacity: 0, y: -28, duration: 1.25 }, 0.2);

      // Content stops are tied to the same scrubbed timeline.
      timeline
        .fromTo(
          panels[0],
          { opacity: 0, x: conditions.mobile ? 0 : -55 },
          { opacity: 1, x: 0, duration: 1 },
          2.05,
        )
        .to(panels[0], { opacity: 0, x: conditions.mobile ? 0 : -30, duration: 0.7 }, 3.15)
        .fromTo(
          panels[1],
          { opacity: 0, x: conditions.mobile ? 0 : 55 },
          { opacity: 1, x: 0, duration: 1 },
          3.65,
        )
        .to(panels[1], { opacity: 0, x: conditions.mobile ? 0 : 30, duration: 0.7 }, 5.35);

      // Training cards use a stagger while the car passes the training zone.
      timeline.fromTo(
        trainingCards,
        { opacity: 0, y: 35 },
        { opacity: 1, y: 0, duration: 0.65, stagger: 0.12 },
        4.05,
      );

      timeline
        .fromTo(
          processSteps,
          { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.18 },
          6.0,
        )
        .fromTo(
          instructor,
          { opacity: 0, x: conditions.mobile ? 0 : 45 },
          { opacity: 1, x: 0, duration: 0.9 },
          7.45,
        )
        .fromTo(
          finalCta,
          { opacity: 0, y: 35 },
          { opacity: 1, y: 0, duration: 0.9 },
          10.0,
        );

      // Subtle environmental parallax is intentionally small so it never competes with the road.
      environment.forEach((element, index) => {
        timeline.to(
          element,
          {
            y: index % 2 === 0 ? -14 : 12,
            x: index % 2 === 0 ? 8 : -8,
            duration: 10,
          },
          0,
        );
      });

      // Progress is written directly to the DOM; React does not re-render on scroll.
      ScrollTrigger.getById("bsda-driving-journey")?.animation?.eventCallback(
        "onUpdate",
        () => {
          const current = ScrollTrigger.getById("bsda-driving-journey");
          if (current) {
            gsap.set(progress, { scaleX: current.progress });
          }
        },
      );

      // A tiny final settle keeps the vehicle visually stable once the path ends.
      timeline.set(car, { scale: 1 }, 10);
    },
    root,
  );

  return () => mm.revert();
}
