import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";
import "./adminDashboard.css";

type NavItem = [string, string, string];
type SelectOption = { value: string; label: string };

const nav: NavItem[] = [
  ["overview", "Overview", "car"],
  ["packages", "Packages", "book"],
  ["bookings", "Bookings", "calendar"],
  ["students", "Students", "users"],
  ["instructors", "Instructors", "car"],
  ["payments", "Payments", "wallet"],
  ["content", "Content", "book"],
];

const stats = [
  { id: "students", label: "Active Students", value: "128", change: "+12.4%", note: "vs last month", icon: "users" },
  { id: "bookings", label: "Lessons This Month", value: "246", change: "+8.7%", note: "vs last month", icon: "car" },
  { id: "payments", label: "Revenue", value: "£18,640", change: "+14.2%", note: "vs last month", icon: "wallet" },
  { id: "bookings", label: "Pending Bookings", value: "17", change: "Needs action", note: "next 48 hours", icon: "calendar" },
];

const bookings = [
  ["BSDA-1048", "Aisha Rahman", "Standard · 10h", "Today · 16:00", "Confirmed"],
  ["BSDA-1047", "Daniel Smith", "Beginner · 5h", "Today · 18:00", "Pending"],
  ["BSDA-1046", "Nusrat Jahan", "Intensive · 20h", "Tomorrow · 10:00", "Confirmed"],
  ["BSDA-1045", "Omar Khan", "Mock Practical", "Tomorrow · 14:30", "Confirmed"],
  ["BSDA-1044", "Sadia Islam", "Automatic · 10h", "Thu · 11:00", "Pending"],
];

const activity = [
  ["08:42", "New booking received", "Aisha Rahman selected Standard 10h."],
  ["08:15", "Payment verified", "BSDA-1043 · £390 bank transfer."],
  ["Yesterday", "Student progress updated", "Samir marked Daniel's lesson as complete."],
  ["Yesterday", "Instructor availability changed", "Nabila opened Thursday afternoon slots."],
];

const bookingDates: Record<number, { count: number; label: string }> = {
  7: { count: 3, label: "3 bookings" },
  8: { count: 2, label: "2 bookings" },
  10: { count: 4, label: "4 bookings" },
  12: { count: 1, label: "1 booking" },
  14: { count: 3, label: "3 bookings" },
  16: { count: 2, label: "2 bookings" },
  19: { count: 5, label: "5 bookings" },
  22: { count: 2, label: "2 bookings" },
  24: { count: 3, label: "3 bookings" },
  28: { count: 1, label: "1 booking" },
};

const reminders = [
  { time: "09:30", title: "Lesson reminder", detail: "Aisha Rahman · Standard lesson", tone: "red" },
  { time: "11:00", title: "Instructor availability", detail: "Review Nabila's Thursday slots", tone: "navy" },
  { time: "14:30", title: "Mock practical", detail: "Omar Khan · Vehicle assessment", tone: "cream" },
];

const reminderDates: Record<number, string> = {
  7: "Lesson reminder",
  8: "Instructor availability",
  14: "Mock practical",
};

const periodOptions: SelectOption[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
];

const monthOptions: SelectOption[] = [
  { value: "sep", label: "September 2026" },
  { value: "oct", label: "October 2026" },
  { value: "nov", label: "November 2026" },
];

export function AdminDashboard() {
  const [active, setActive] = useState("overview");
  const [period, setPeriod] = useState("month");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pageTitle = nav.find(([id]) => id === active)?.[1] ?? "Overview";

  const exportData = () => {
    const csv = [
      ["Reference", "Student", "Package", "Schedule", "Status"],
      ...bookings,
    ].map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bsda-bookings.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="adminApp">
      <header className="adminTopbar">
        <div className="adminTopbarInner">
          <Link className="adminBrand" to="/" aria-label="Back to public BSDA website">
            <Brand />
          </Link>

          <nav className="adminNav" aria-label="Admin navigation">
            {nav.map(([id, label]) => (
              <button
                key={id}
                className={active === id ? "active" : ""}
                onClick={() => {
                  setActive(id);
                  setMobileMenuOpen(false);
                }}
                type="button"
              >
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <button
            type="button"
            className="adminMobileMenuButton"
            aria-label={mobileMenuOpen ? "Close admin menu" : "Open admin menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            <Icon n={mobileMenuOpen ? "close" : "menu"} s={21} />
          </button>

          <div className="adminTopActions">
            <button type="button" onClick={() => setActive("content")} aria-label="Open academy settings" title="Academy settings">
              <Icon n="settings" s={18} />
            </button>
            <button type="button" onClick={() => setActive("students")} aria-label="Open student messages" title="Student messages">
              <Icon n="mail" s={18} />
            </button>
            <button type="button" onClick={() => setActive("bookings")} aria-label="Open booking notifications" title="Booking notifications" className="hasDot">
              <Icon n="bell" s={18} />
            </button>
            <div className="adminUserMini">
              <span>AD</span>
              <div>
                <strong>Academy Admin</strong>
                <small>Administrator</small>
              </div>
            </div>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="adminMobileMenu">
          <div className="adminMobileMenuInner">
            <div className="adminMobileMenuLabel">ADMIN MENU</div>
            {nav.map(([id, label, icon]) => (
              <button
                key={id}
                type="button"
                className={active === id ? "active" : ""}
                onClick={() => {
                  setActive(id);
                  setMobileMenuOpen(false);
                }}
              >
                <span className="adminMobileMenuIcon"><Icon n={icon} s={16} /></span>
                <span>{label}</span>
                <Icon n="arrow" s={13} />
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="adminMain">
        <section className="adminHero">
          <div>
            <div className="adminBreadcrumb">OVERVIEW <span>/</span> {pageTitle.toUpperCase()}</div>
            <h1>{active === "overview" ? "Welcome back, Admin" : pageTitle}</h1>
            <p>
              Manage students, lessons, instructors and bookings from one place.
              Your BSDA academy overview is ready for today's work.
            </p>
          </div>

          <div className="adminHeroSide">
            <span className="adminDate">Wednesday, 7 October 2026</span>
            <div className="adminHeroActions">
              <CustomSelect
                value={period}
                options={periodOptions}
                onChange={setPeriod}
                prefix="Showing:"
              />
              <button type="button" className="adminExport" onClick={exportData}>
                <Icon n="download" s={15} /> Export data
              </button>
            </div>
          </div>
        </section>

        {active === "overview" ? (
          <Overview onNavigate={setActive} />
        ) : (
          <section className="adminPlaceholder">
            <span className="adminEyebrow">MODULE READY</span>
            <h2>{pageTitle}</h2>
            <p>
              This section is part of the redesigned BSDA admin architecture.
              Its Wix-backed data layer can be connected without changing the dashboard shell.
            </p>
            <button type="button" className="adminPrimaryButton" onClick={() => setActive("overview")}>
              Back to overview <Icon n="arrow" s={14} />
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

function CustomSelect({
  value,
  options,
  onChange,
  prefix,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  prefix?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className={`adminSelect ${open ? "open" : ""}`} ref={ref}>
      <button
        type="button"
        className="adminSelectTrigger"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {prefix && <span>{prefix}</span>}
        <b>{selected.label}</b>
        <Icon n="chevron" s={13} />
      </button>

      {open && (
        <div className="adminSelectMenu" role="listbox">
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              key={option.value}
              className={option.value === value ? "selected" : ""}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <Icon n="check" s={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Overview({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <div className="adminContent">
      <section className="adminStats">
        {stats.map((stat) => (
          <button
            className="adminStat"
            key={stat.label}
            type="button"
            onClick={() => onNavigate(stat.id)}
            aria-label={`Open ${stat.label}`}
          >