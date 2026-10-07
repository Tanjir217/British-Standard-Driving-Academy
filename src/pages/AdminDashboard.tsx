import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";
import "./adminDashboard.css";

type NavItem = [string, string, string];

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
  { label: "Active Students", value: "128", change: "+12.4%", note: "vs last month", icon: "users" },
  { label: "Lessons This Month", value: "246", change: "+8.7%", note: "vs last month", icon: "car" },
  { label: "Revenue", value: "£18,640", change: "+14.2%", note: "vs last month", icon: "wallet" },
  { label: "Pending Bookings", value: "17", change: "Needs action", note: "next 48 hours", icon: "calendar" },
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

export function AdminDashboard() {
  const [active, setActive] = useState("overview");
  const pageTitle = nav.find(([id]) => id === active)?.[1] ?? "Overview";

  return (
    <div className="adminApp">
      <header className="adminTopbar">
        <div className="adminTopbarInner">
          <Link className="adminBrand" to="/" aria-label="Back to public BSDA website">
            <Brand />
          </Link>

          <nav className="adminNav" aria-label="Admin navigation">
            {nav.map(([id, label, icon]) => (
              <button
                key={id}
                className={active === id ? "active" : ""}
                onClick={() => setActive(id)}
              >
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="adminTopActions">
            <button aria-label="Settings"><Icon n="settings" s={18} /></button>
            <button aria-label="Messages"><Icon n="mail" s={18} /></button>
            <button aria-label="Notifications" className="hasDot"><Icon n="bell" s={18} /></button>
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
              <button className="adminFilter">Showing: <b>This month</b><Icon n="chevron" s={14} /></button>
              <button className="adminExport"><Icon n="download" s={15} /> Export data</button>
            </div>
          </div>
        </section>

        {active === "overview" ? (
          <Overview />
        ) : (
          <section className="adminPlaceholder">
            <span className="adminEyebrow">MODULE READY</span>
            <h2>{pageTitle}</h2>
            <p>
              This section is part of the redesigned BSDA admin architecture.
              Its Wix-backed data layer can be connected without changing the dashboard shell.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function Overview() {
  return (
    <div className="adminContent">
      <section className="adminStats">
        {stats.map((stat) => (
          <article className="adminStat" key={stat.label}>
            <div className="adminStatTop">
              <span className="adminStatIcon"><Icon n={stat.icon} s={18} /></span>
              <span className="adminStatChange">{stat.change}</span>
            </div>
            <strong>{stat.value}</strong>
            <small>{stat.label}</small>
            <em>{stat.note}</em>
          </article>
        ))}
      </section>

      <section className="adminDashboardGrid">
        <article className="adminPanel adminRevenue">
          <div className="adminPanelHead">
            <div>
              <span className="adminEyebrow">ACADEMY PERFORMANCE</span>
              <h2>Bookings & revenue</h2>
              <p>Monthly performance across BSDA lessons and packages.</p>
            </div>
            <button className="adminMore" aria-label="More revenue options"><Icon n="more" s={18} /></button>
          </div>

          <div className="adminLegend">
            <span><i className="legendRevenue" /> Revenue</span>
            <span><i className="legendBookings" /> Bookings</span>
          </div>

          <RevenueChart />
        </article>

        <CalendarPanel />
      </section>

      <section className="adminBottomGrid">
        <article className="adminPanel adminBookings">
          <div className="adminPanelHead">
            <div>
              <span className="adminEyebrow">BOOKINGS</span>
              <h2>Recent bookings</h2>
            </div>
            <button className="adminTextButton">View all <Icon n="arrow" s={13} /></button>
          </div>

          <div className="bookingTable">
            <div className="bookingRow bookingHead">
              <span>Reference</span><span>Student</span><span>Package</span><span>Schedule</span><span>Status</span>
            </div>
            {bookings.map((booking) => (
              <div className="bookingRow" key={booking[0]}>
                <strong>{booking[0]}</strong>
                <span>{booking[1]}</span>
                <span>{booking[2]}</span>
                <span>{booking[3]}</span>
                <span><i className={booking[4].toLowerCase()}>{booking[4]}</i></span>
              </div>
            ))}
          </div>
        </article>

        <article className="adminPanel adminActivity">
          <div className="adminPanelHead">
            <div>
              <span className="adminEyebrow">ACTIVITY</span>
              <h2>Latest updates</h2>
            </div>
          </div>
          <div className="activityList">
            {activity.map(([time, title, detail]) => (
              <div className="activityItem" key={title}>
                <span>{time}</span>
                <div><strong>{title}</strong><p>{detail}</p></div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function RevenueChart() {
  const points = "22,174 112,132 202,150 292,92 382,118 472,55 562,84";
  const bookingPoints = "22,155 112,168 202,139 292,145 382,128 472,102 562,118";
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];

  return (
    <div className="revenueChart">
      <svg viewBox="0 0 584 215" role="img" aria-label="Monthly revenue and bookings trend">
        <g className="chartGrid">
          {[28, 69, 110, 151, 192].map((y) => <line key={y} x1="22" x2="562" y1={y} y2={y} />)}
        </g>
        <polyline className="chartBookings" points={bookingPoints} />
        <polyline className="chartRevenue" points={points} />
        {points.split(" ").map((point, index) => {
          const [x, y] = point.split(",");
          return <circle key={point} className="chartDot" cx={x} cy={y} r={index === 5 ? 5 : 3.5} />;
        })}
        <line className="chartGuide" x1="472" x2="472" y1="25" y2="194" />
      </svg>
      <div className="chartMonths">
        {months.map((month) => <span key={month}>{month}</span>)}
      </div>
      <div className="chartTooltip">
        <small>September</small>
        <strong>£18.6K</strong>
        <span>46 bookings</span>
      </div>
    </div>
  );
}

function CalendarPanel() {
  const [selectedDay, setSelectedDay] = useState(7);
  const firstDay = 4; // October 2026 starts on Thursday when Sunday is 0.
  const days = useMemo(() => Array.from({ length: 31 }, (_, index) => index + 1), []);

  return (
    <article className="adminPanel adminCalendar">
      <div className="adminPanelHead">
        <div>
          <span className="adminEyebrow">SCHEDULE</span>
          <h2>Bookings calendar</h2>
          <p>Lessons and reminders for October.</p>
        </div>
        <button className="adminMore" aria-label="More calendar options"><Icon n="more" s={18} /></button>
      </div>

      <div className="calendarToolbar">
        <button aria-label="Previous month">‹</button>
        <strong>October 2026</strong>
        <button aria-label="Next month">›</button>
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
          <strong>{selectedDay} October 2026</strong>
        </div>
        <span className="calendarCount">
          {bookingDates[selectedDay]?.label ?? "No bookings"}
          {reminderDates[selectedDay] && <small> · Reminder</small>}
        </span>
      </div>

      <div className="reminderList">
        {reminders.map((item) => (
          <div className="reminderItem" key={item.time + item.title}>
            <span className={"reminderDot " + item.tone} />
            <time>{item.time}</time>
            <div><strong>{item.title}</strong><small>{item.detail}</small></div>
          </div>
        ))}
      </div>
    </article>
  );
}