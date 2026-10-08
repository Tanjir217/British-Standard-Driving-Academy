import { gsap } from "gsap/dist/gsap";
import { MotionPathPlugin } from "gsap/dist/MotionPathPlugin";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

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

const motionPath = (path: SVGPathElement, end: number) => ({
  path,
  align: path,
  alignOrigin: [0.5, 0.5] as [number, number],
  autoRotate: true,
  start: 0,
  end,
});

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

      const reduced = Boolean(conditions.reduceMotion);

      // Always establish a valid starting position. This prevents the SVG group
      // from rendering at (0, 0) while ScrollTrigger is initializing.
      gsap.set(car, {
        opacity: 1,
        scale: 1,
        transformOrigin: "50% 50%",
        motionPath: motionPath(path, 0),
      });

      gsap.set(progress, { scaleX: 0 });

      if (reduced) {
        gsap.set(hero, { opacity: 1, y: 0 });
        gsap.set(panels, { opacity: 1, x: 0, y: 0 });
        gsap.set(trainingCards, { opacity: 1, y: 0 });
        gsap.set(processSteps, { opacity: 1, y: 0 });
        gsap.set(instructor, { opacity: 1, x: 0 });
        gsap.set(finalCta, { opacity: 1, y: 0 });
        gsap.set(car, { motionPath: motionPath(path, 1) });
        gsap.set(progress, { scaleX: 1 });
        return;
      }

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          id: "bsda-driving-journey",
          trigger: root,
          start: "top top",
          // The section itself is the scroll distance (600vh desktop / 500vh mobile).
          // "bottom top" prevents an end distance that is accidentally calculated
          // as 600% of an already 600vh-tall trigger.
          end: "bottom top",
          scrub: 1,
          pin: viewport,
          pinSpacing: false,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            gsap.set(progress, { scaleX: self.progress });
          },
        },
      });

      // ONE continuous SVG route controls the car's position and rotation.
      timeline.to(
        car,
        {
          duration: 10,
          motionPath: motionPath(path, 1),
        },
        0,
      );

      timeline.to(
        car.querySelectorAll(".carLight"),
        { opacity: 1, duration: 0.35 },
        0.15,
      );

      timeline.to(hero, { opacity: 0, y: -28, duration: 1.25 }, 0.2);

      timeline
        .fromTo(
          panels[0],
          { opacity: 0, x: conditions.mobile ? 0 : -55 },
          { opacity: 1, x: 0, duration: 1 },
          2.05,
        )
        .to(
          panels[0],
          { opacity: 0, x: conditions.mobile ? 0 : -30, duration: 0.7 },
          3.15,
        )
        .fromTo(
          panels[1],
          { opacity: 0, x: conditions.mobile ? 0 : 55 },
          { opacity: 1, x: 0, duration: 1 },
          3.65,
        )
        .to(
          panels[1],
          { opacity: 0, x: conditions.mobile ? 0 : 30, duration: 0.7 },
          5.35,
        );

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
          6,
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
          9.15,
        )
        .to(finalCta, { opacity: 1, y: 0, duration: 0.85 }, 10);

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

      // Keep the vehicle parked at the end of the route.
      timeline.set(car, { scale: 1 }, 10);

      // Refresh after the SVG is laid out so MotionPath alignment and pinning
      // use the actual viewport dimensions.
      requestAnimationFrame(() => ScrollTrigger.refresh());
    },
    root,
  );

  return () => mm.revert();
}
