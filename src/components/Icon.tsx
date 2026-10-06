export function Icon({ n, s = 20 }: { n: string; s?: number }) {
  const a = {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const m: any = {
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
    car: (
      <>
        <path d="M5 16l1.5-6h11L19 16" />
        <path d="M3 16h18v4H3zM7 20v1M17 20v1M7 14h.01M17 14h.01" />
      </>
    ),
    book: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" />
        <path d="M4 5.5V21" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    message: (
      <>
        <path d="M4 5.5h16v11H8l-4 3v-14z" />
        <path d="M8 10h.01M12 10h.01M16 10h.01" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 1 1 4.4 1.6c-.9 1-1.9 1.2-1.9 2.7" />
        <path d="M12 17h.01" />
      </>
    ),
    close: (
      <>
        <path d="M6 6l12 12M18 6L6 18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    shield: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />,
    play: <path d="m9 6 9 6-9 6" />,
  };
  return <svg {...a}>{m[n] || m.car}</svg>;
}
