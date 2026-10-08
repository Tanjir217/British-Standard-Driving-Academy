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
            aria-label={"Open " + stat.label}
          >
            <div className="adminStatTop">
              <span className="adminStatIcon"><Icon n={stat.icon} s={18} /></span>
              <span className="adminStatChange">{stat.change}</span>
            </div>
            <strong>{stat.value}</strong>
            <small>{stat.label}</small>
            <em>{stat.note}</em>
          </button>
        ))}
      </section>

      <section className="adminDashboardGrid">
        <div className="adminLeftColumn">
          <article className="adminPanel adminRevenue">
          <div className="adminPanelHead">
            <div>
              <span className="adminEyebrow">ACADEMY PERFORMANCE</span>
              <h2>Bookings & revenue</h2>
              <p>Monthly performance across BSDA lessons and packages.</p>
            </div>
            <button type="button" className="adminPanelAction" onClick={() => onNavigate("payments")}>
              Payments <Icon n="arrow" s={13} />
            </button>
          </div>

          <RevenueChart />
          </article>

          <UpcomingLessons onNavigate={onNavigate} />
        </div>

        <CalendarPanel onNavigate={onNavigate} />
      </section>

      <section className="adminBottomGrid">
        <article className="adminPanel adminBookings">
          <div className="adminPanelHead">
            <div>
              <span className="adminEyebrow">BOOKINGS</span>
              <h2>Recent bookings</h2>
            </div>
            <button type="button" className="adminTextButton" onClick={() => onNavigate("bookings")}>
              View all <Icon n="arrow" s={13} />
            </button>
          </div>

          <div className="bookingTable">
            <div className="bookingRow bookingHead">
              <span>Reference</span><span>Student</span><span>Package</span><span>Schedule</span><span>Status</span>
            </div>
            {bookings.map((booking) => (
              <button
                type="button"
                className="bookingRow bookingRowButton"
                key={booking[0]}
                onClick={() => onNavigate("bookings")}
                title={`Open ${booking[0]}`}
              >
                <strong>{booking[0]}</strong>
                <span>{booking[1]}</span>
                <span>{booking[2]}</span>
                <span>{booking[3]}</span>
                <span><i className={booking[4].toLowerCase()}>{booking[4]}</i></span>
              </button>
            ))}
          </div>
        </article>

        <article className="adminPanel adminActivity">
          <div className="adminPanelHead">
            <div>
              <span className="adminEyebrow">ACTIVITY</span>
              <h2>Latest updates</h2>
            </div>
            <button type="button" className="adminTextButton" onClick={() => onNavigate("overview")}>
              Refresh view <Icon n="arrow" s={13} />
            </button>
          </div>
          <div className="activityList">
            {activity.map(([time, title, detail]) => (
              <button type="button" className="activityItem" key={title} onClick={() => onNavigate("bookings")}>
                <span>{time}</span>
                <div><strong>{title}</strong><p>{detail}</p></div>
              </button>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function UpcomingLessons({ onNavigate }: { onNavigate: (id: string) => void }) {
  const lessons = [
    ["16:00", "Aisha Rahman", "Standard · Lesson 4", "Confirmed"],
    ["18:00", "Daniel Smith", "Beginner · Lesson 2", "Pending"],
    ["Tomorrow", "Nusrat Jahan", "Intensive · Lesson 7", "Confirmed"],
  ];

  return (
    <article className="adminPanel adminUpcoming">
      <div className="adminPanelHead">
        <div>
          <span className="adminEyebrow">UPCOMING LESSONS</span>
          <h2>Next on the schedule</h2>
          <p>A quick view of the next learner sessions.</p>
        </div>
        <button type="button" className="adminTextButton" onClick={() => onNavigate("bookings")}>
          View all <Icon n="arrow" s={13} />
        </button>
      </div>

      <div className="upcomingList">
        {lessons.map(([time, student, lesson, status]) => (
          <button
            type="button"
            className="upcomingItem"
            key={time + student}
            onClick={() => onNavigate("bookings")}
          >
            <span className="upcomingTime">{time}</span>
            <span className="upcomingInfo">
              <strong>{student}</strong>
              <small>{lesson}</small>
            </span>
            <i className={status.toLowerCase()}>{status}</i>
          </button>
        ))}
      </div>
    </article>
  );
}

function RevenueChart() {
  const revenue = [12.2, 15.1, 13.8, 18.7, 16.9, 22.1, 19.4];
  const bookingsCount = [29, 34, 31, 39, 36, 46, 42];
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  const maxRevenue = 24;
  const width = 640;
  const height = 230;
  const left = 42;
  const right = 12;
  const top = 16;
  const bottom = 34;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const revenuePoints = revenue.map((value, index) => [
    left + (plotWidth / (revenue.length - 1)) * index,
    top + plotHeight - (value / maxRevenue) * plotHeight,
  ]);
  const bookingPoints = bookingsCount.map((value, index) => [
    left + (plotWidth / (bookingsCount.length - 1)) * index,
    top + plotHeight - (value / 50) * plotHeight,
  ]);
  const revenueLine = revenuePoints.map(([x, y]) => `${x},${y}`).join(" ");
  const bookingLine = bookingPoints.map(([x, y]) => `${x},${y}`).join(" ");
  const areaPath = `M ${revenuePoints[0][0]} ${top + plotHeight} L ${revenuePoints.map(([x, y]) => `${x} ${y}`).join(" L ")} L ${revenuePoints[revenuePoints.length - 1][0]} ${top + plotHeight} Z`;

  return (
    <div className="revenueChart">
      <div className="chartSummary">
        <div><strong>£19.4K</strong><span>October revenue</span></div>
        <div><strong>42</strong><span>Bookings</span></div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly BSDA revenue and bookings trend">
        <defs>
          <linearGradient id="adminRevenueFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(213,31,42,.16)" />
            <stop offset="100%" stopColor="rgba(213,31,42,0)" />
          </linearGradient>
        </defs>
        <g className="chartGrid">
          {[0, 6, 12, 18, 24].map((value) => {
            const y = top + plotHeight - (value / maxRevenue) * plotHeight;
            return <g key={value}><line x1={left} x2={width - right} y1={y} y2={y} /><text x="0" y={y + 3}>{value === 0 ? "£0" : `£${value}K`}</text></g>;
          })}
        </g>
        <path className="chartArea" d={areaPath} />
        <polyline className="chartBookings" points={bookingLine} />
        <polyline className="chartRevenue" points={revenueLine} />
        {revenuePoints.map(([x, y], index) => (
          <circle key={months[index]} className={index === revenuePoints.length - 1 ? "chartDot active" : "chartDot"} cx={x} cy={y} r={index === revenuePoints.length - 1 ? 5 : 3.5} />
        ))}
      </svg>
      <div className="chartMonths">
        {months.map((month) => <span key={month}>{month}</span>)}
      </div>
      <div className="chartLegend">
        <span><i className="legendRevenue" /> Revenue</span>
        <span><i className="legendBookings" /> Bookings</span>
      </div>
    </div>
  );
}

function CalendarPanel({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [selectedDay, setSelectedDay] = useState(7);
  const [month, setMonth] = useState("oct");
  const days = useMemo(() => month === "oct" ? Array.from({ length: 31 }, (_, index) => index + 1) : [], [month]);
  const firstDay = month === "oct" ? 4 : 0;
  const selectedMonthLabel = monthOptions.find((option) => option.value === month)?.label ?? "October 2026";

  return (
    <article className="adminPanel adminCalendar">
      <div className="adminPanelHead">
        <div>
          <span className="adminEyebrow">SCHEDULE</span>
          <h2>Bookings calendar</h2>
          <p>Lessons and reminders for the selected month.</p>
        </div>
        <button type="button" className="adminPanelAction" onClick={() => onNavigate("bookings")}>
          View bookings <Icon n="arrow" s={13} />
        </button>
      </div>

      <div className="calendarToolbar">
        <CustomSelect value={month} options={monthOptions} onChange={setMonth} />
      </div>

      <div className="calendarWeek">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="calendarGrid">
        {Array.from({ length: firstDay }).map((_, index) => <span className="calendarEmpty" key={"empty-" + index} />)}
        {days.map((day) => {
          const booking = bookingDates[day];
          const reminder = reminderDates[day];
          return (
            <button
              type="button"
              key={day}
              className={[
                day === selectedDay ? "selected" : "",
                day === 7 ? "today" : "",
                booking ? "hasBooking" : "",
                reminder ? "hasReminder" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => setSelectedDay(day)}
              title={[booking?.label, reminder].filter(Boolean).join(" · ")}
            >
              <b>{day}</b>
              {booking && <i>{booking.count}</i>}
              {reminder && <span className="calendarReminderDot" aria-label={reminder} />}
            </button>
          );
        })}
      </div>

      <div className="calendarSelection">
        <div>
          <span>Selected date</span>
          <strong>{month === "oct" ? `${selectedDay} October 2026` : selectedMonthLabel}</strong>
        </div>
        <span className="calendarCount">
          {month === "oct" ? bookingDates[selectedDay]?.label ?? "No bookings" : "No mock bookings"}
          {month === "oct" && reminderDates[selectedDay] && <small> · Reminder</small>}
        </span>
      </div>

      <div className="reminderList">
        {reminders.map((item) => (
          <button type="button" className="reminderItem" key={item.time + item.title} onClick={() => onNavigate("bookings")}>
            <span className={"reminderDot " + item.tone} />
            <time>{item.time}</time>
            <div><strong>{item.title}</strong><small>{item.detail}</small></div>
          </button>
        ))}
      </div>
    </article>
  );
}