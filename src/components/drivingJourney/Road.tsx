import { forwardRef, type Ref } from "react";

export const DRIVING_PATH =
  "M 150 690 C 210 690 270 650 315 595 C 365 535 350 445 410 390 C 470 335 585 345 665 385 C 755 430 805 505 760 555 C 715 605 600 610 545 555 C 490 500 510 410 585 335 C 660 260 785 225 900 250 C 1010 275 1080 350 1045 445 C 1015 525 945 585 930 645 C 922 678 945 700 990 700";

type RoadProps = {
  pathRef: Ref<SVGPathElement>;
  carRef: Ref<SVGGElement>;
};

export const Road = forwardRef<SVGSVGElement, RoadProps>(function Road(
  { pathRef, carRef },
  ref,
) {
  return (
    <svg
      ref={ref}
      className="drivingJourneySvg"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid meet"
      aria-label="Interactive driving route"
      role="img"
    >
      <defs>
        <filter id="journeyRoadShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" floodOpacity=".18" />
        </filter>
        <pattern id="parkingStripe" width="54" height="54" patternUnits="userSpaceOnUse">
          <path d="M0 54L54 0" stroke="#ffffff" strokeOpacity=".22" strokeWidth="2" />
        </pattern>
      </defs>

      <rect width="1200" height="800" fill="#eef0eb" />

      <g className="journeyTerrain">
        <path d="M0 110H1200V0H0Z" fill="#e5e8e2" />
        <path d="M0 730H1200V800H0Z" fill="#e5e8e2" />
        <path d="M0 250C160 210 260 220 390 185C520 150 670 175 820 125C960 80 1070 100 1200 65V0H0Z" fill="#e9ece7" />
      </g>

      <g className="journeyBuildings">
        <g transform="translate(42 130)">
          <rect width="145" height="92" rx="5" fill="#d7d8d2" />
          <rect x="14" y="16" width="117" height="14" rx="2" fill="#b8bbb5" />
          <rect x="18" y="47" width="28" height="24" fill="#eef0eb" />
          <rect x="58" y="47" width="28" height="24" fill="#eef0eb" />
          <rect x="98" y="47" width="28" height="24" fill="#eef0eb" />
        </g>
        <g transform="translate(955 115)">
          <rect width="180" height="110" rx="5" fill="#d1d3cd" />
          <rect x="18" y="18" width="144" height="16" rx="2" fill="#b4b8b1" />
          <rect x="20" y="52" width="38" height="30" fill="#eef0eb" />
          <rect x="71" y="52" width="38" height="30" fill="#eef0eb" />
          <rect x="122" y="52" width="38" height="30" fill="#eef0eb" />
        </g>
      </g>

      <g className="journeyParking">
        <rect x="55" y="625" width="205" height="120" rx="14" fill="#aeb3ae" />
        <rect x="55" y="625" width="205" height="120" rx="14" fill="url(#parkingStripe)" />
        <rect x="885" y="635" width="230" height="105" rx="14" fill="#aeb3ae" />
        <rect x="885" y="635" width="230" height="105" rx="14" fill="url(#parkingStripe)" />
        <text x="78" y="652" className="parkingLabel">START</text>
        <text x="916" y="662" className="parkingLabel">ACADEMY PARKING</text>
      </g>

      <g className="journeyRoad">
        <path
          d={DRIVING_PATH}
          className="roadEdge"
          stroke="#f8f6f0"
          strokeWidth="238"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter="url(#journeyRoadShadow)"
        />
        <path
          d={DRIVING_PATH}
          className="roadSurface"
          stroke="#292d32"
          strokeWidth="220"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          ref={pathRef}
          d={DRIVING_PATH}
          className="roadCenter"
          stroke="#f4e8b4"
          strokeWidth="5"
          strokeDasharray="26 22"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={DRIVING_PATH}
          className="roadInnerEdge"
          stroke="#ffffff"
          strokeOpacity=".78"
          strokeWidth="3"
          fill="none"
        />
      </g>

      <g className="journeyTrafficLight" transform="translate(170 325)" aria-hidden="true">
        <rect x="0" y="0" width="22" height="62" rx="8" fill="#25292f" />
        <circle cx="11" cy="14" r="5" fill="#8f252c" />
        <circle cx="11" cy="31" r="5" fill="#d2a72f" />
        <circle cx="11" cy="48" r="5" fill="#657f69" />
        <path d="M11 62V91" stroke="#626860" strokeWidth="4" />
      </g>

      <g className="journeySigns" aria-hidden="true">
        <g transform="translate(260 245)">
          <rect x="0" y="0" width="54" height="38" rx="4" fill="#fff" stroke="#cfd2cc" />
          <text x="27" y="25" textAnchor="middle" className="signText">30</text>
          <path d="M27 38V72" stroke="#6e736e" strokeWidth="4" />
        </g>
        <g transform="translate(1010 455)">
          <rect x="0" y="0" width="58" height="40" rx="4" fill="#fff" stroke="#cfd2cc" />
          <text x="29" y="26" textAnchor="middle" className="signText">STOP</text>
          <path d="M29 40V73" stroke="#6e736e" strokeWidth="4" />
        </g>
      </g>

      <g className="journeyTrees" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i} transform={`translate(${120 + i * 190} ${85 + (i % 2) * 48})`}>
            <rect x="13" y="32" width="7" height="26" rx="3" fill="#6b6256" />
            <circle cx="16" cy="26" r="20" fill="#667c68" />
            <circle cx="6" cy="34" r="13" fill="#708872" />
            <circle cx="27" cy="35" r="13" fill="#5e7462" />
          </g>
        ))}
      </g>

      <g className="academyMarker">
        <rect x="905" y="42" width="230" height="74" rx="10" fill="#111827" />
        <rect x="922" y="58" width="38" height="38" rx="7" fill="#d51f2a" />
        <path d="M933 82h16l-8-13z" fill="#fff" />
        <text x="974" y="72" className="academyMarkerEy">BRITISH STANDARD</text>
        <text x="974" y="91" className="academyMarkerTitle">DRIVING ACADEMY</text>
      </g>

      <g ref={carRef} className="journeyCar" aria-hidden="true">
        <ellipse cx="0" cy="12" rx="25" ry="46" fill="#000" opacity=".18" />
        <rect x="-20" y="-43" width="40" height="86" rx="14" fill="#d51f2a" />
        <path d="M-15-25Q0-39 15-25L13 1H-13Z" fill="#1c2638" />
        <path d="M-13 8H13L16 26Q0 37-16 26Z" fill="#9aa4ad" opacity=".95" />
        <rect x="-25" y="-28" width="8" height="22" rx="4" fill="#15181d" />
        <rect x="17" y="-28" width="8" height="22" rx="4" fill="#15181d" />
        <rect x="-25" y="9" width="8" height="22" rx="4" fill="#15181d" />
        <rect x="17" y="9" width="8" height="22" rx="4" fill="#15181d" />
        <rect className="carLight" x="-11" y="-39" width="8" height="4" rx="2" fill="#fff4ca" />
        <rect className="carLight" x="3" y="-39" width="8" height="4" rx="2" fill="#fff4ca" />
        <rect x="-11" y="35" width="8" height="4" rx="2" fill="#7d1018" />
        <rect x="3" y="35" width="8" height="4" rx="2" fill="#7d1018" />
        <path d="M0-31V31" stroke="#fff" strokeOpacity=".22" />
      </g>
    </svg>
  );
});
