import { useState } from "react";
import { Link } from "react-router-dom";
import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";
import { AdminContentManager } from "./AdminContentManager";
import "./adminDashboard.css";

const nav = [
  ["overview", "Overview", "car"],
  ["bookings", "Bookings", "calendar"],
  ["students", "Students", "book"],
  ["instructors", "Instructors", "car"],
  ["payments", "Payments", "check"],
  ["content", "Content", "book"],
];

const stats = [
  { label: "Active Students", value: "128", change: "+12.4%", note: "vs last month" },
  { label: "Lessons This Month", value: "246", change: "+8.7%", note: "vs last month" },
  { label: "Revenue", value: "£18,640", change: "+14.2%", note: "vs last month" },
  { label: "Pending Bookings", value: "17", change: "Needs action", note: "next 48 hours" },
];

const bookings = [
  ["BSDA-1048", "Aisha Rahman", "Standard · 10h", "Today · 16:00", "Confirmed"],
  ["BSDA-1047", "Daniel Smith", "Beginner · 5h", "Today · 18:00", "Pending"],
  ["BSDA-1046", "Nusrat Jahan", "Intensive · 20h", "Tomorrow · 10:00", "Confirmed"],
  ["BSDA-1045", "Omar Khan", "Mock Practical", "Tomorrow · 14:30", "Confirmed"],
  ["BSDA-1044", "Sadia Islam", "Automatic · 10h", "Wed · 11:00", "Pending"],
];

const activity = [
  ["08:42", "New booking received", "Aisha Rahman selected Standard 10h."],
  ["08:15", "Payment verified", "BSDA-1043 · £390 bank transfer."],
  ["Yesterday", "Student progress updated", "Samir marked Daniel's lesson as complete."],
  ["Yesterday", "Instructor availability changed", "Nabila opened Thursday afternoon slots."],
];

export function AdminDashboard() {
  const [active, setActive] = useState("overview");

  return (
    <div className="adminApp">
      <aside className="adminSidebar">
        <Link className="adminBrand" to="/" aria-label="Back to public site">
          <Brand />
        </Link>
        <div className="adminWorkspace">
          <span>ADMINISTRATION</span>
          <strong>BSDA Academy</strong>
        </div>
        <nav className="adminNav" aria-label="Admin navigation">
          {nav.map(([id, label, icon]) => (
            <button
              key={id}
              className={active === id ? "active" : ""}
              onClick={() => setActive(id)}
            >
              <Icon n={icon} s={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="adminSidebarBottom">
          <div className="adminUser">
            <div className="adminAvatar">AD</div>
            <div>
              <strong>Academy Admin</strong>
              <span>Administrator</span>
            </div>
          </div>
          <Link to="/" className="adminBack">← View public website</Link>
        </div>
      </aside>

      <main className="adminMain">
        <header className="adminHeader">
          <div>
            <span className="adminEyebrow">DASHBOARD / {active.toUpperCase()}</span>
            <h1>{active === "overview" ? "Good morning, Admin." : nav.find(([id]) => id === active)?.[1]}</h1>
          </div>
          <div className="adminHeaderActions">
            <span className="adminStatus"><i /> System ready</span>
            <button className="adminProfile">AD</button>
          </div>
        </header>

        {active === "overview" ? (
          <Overview />
        ) : active === "content" ? (
          <AdminContentManager />
        ) : (
          <section className="adminPlaceholder">
            <span className="adminEyebrow">MODULE READY</span>
            <h2>{nav.find(([id]) => id === active)?.[1]} will connect to the BSDA backend next.</h2>
            <p>
              The dashboard shell is intentionally separated from the public website.
              This module will become data-driven when Wix CMS, Members, Bookings and Payments are connected.
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
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small><b>{stat.change}</b> {stat.note}</small>
          </article>
        ))}
      </section>

      <section className="adminGridTop">
        <article className="adminPanel adminRevenue">
          <div className="adminPanelHead">
            <div>
              <span className="adminEyebrow">REVENUE</span>
              <h2>Monthly performance</h2>
            </div>
            <button className="adminSelect">Last 6 months <Icon n="chevron" s={13} /></button>
          </div>
          <div className="revenueFigure">
            <strong>£18,640</strong>
            <span>+14.2% from previous period</span>
          </div>
          <div className="barChart" aria-label="Revenue trend">
            {[48, 62, 54, 76, 70, 94].map((height, index) => (
              <div className="barColumn" key={index}>
                <div className="barTrack"><i style={{ height: `${height}%` }} /></div>
                <span>{["May", "Jun", "Jul", "Aug", "Sep", "Oct"][index]}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="adminPanel adminQuick">
          <div className="adminPanelHead">
            <div>
              <span className="adminEyebrow">QUICK ACTIONS</span>
              <h2>Keep the academy moving.</h2>
            </div>
          </div>
          <div className="quickGrid">
            <button><Icon n="calendar" s={19} /><span>New booking</span><b>+</b></button>
            <button><Icon n="book" s={19} /><span>Add student</span><b>+</b></button>
            <button><Icon n="car" s={19} /><span>Add instructor</span><b>+</b></button>
            <button><Icon n="check" s={19} /><span>Record payment</span><b>+</b></button>
          </div>
        </article>
      </section>

      <section className="adminGridBottom">
        <article className="adminPanel">
          <div className="adminPanelHead">
            <div>
              <span className="adminEyebrow">BOOKINGS</span>
              <h2>Recent bookings</h2>
            </div>
            <button className="adminTextButton">View all →</button>
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
