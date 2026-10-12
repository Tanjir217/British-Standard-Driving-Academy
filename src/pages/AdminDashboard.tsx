import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";
import { adminDashboardService, type AdminDashboardSnapshot } from "../services/adminDashboardService";
import { packageService } from "../services/packages/packageService";
import type { Package } from "../services/domain/types";
import { studentService, type WixStudentSummary } from "../services/students/studentService";
import { AdminContentManager } from "./AdminContentManager";
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
  const [liveData, setLiveData] = useState<AdminDashboardSnapshot | null>(null);
  const [dataError, setDataError] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [packages, setPackages] = useState<Package[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState("");
  const [students, setStudents] = useState<WixStudentSummary[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState("");
  const pageTitle = nav.find(([id]) => id === active)?.[1] ?? "Overview";

  useEffect(() => {
    let cancelled = false;

    async function loadAdminData() {
      setLoadingData(true);
      setDataError("");

      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      try {
        const snapshot = await adminDashboardService.loadSnapshot(
          from.toISOString(),
          to.toISOString(),
        );
        if (!cancelled) setLiveData(snapshot);
      } catch (error) {
        if (!cancelled) {
          setDataError(
            error instanceof Error
              ? error.message
              : "Unable to connect to Wix dashboard data.",
          );
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    loadAdminData();

    let packageActive = true;
    setPackagesLoading(true);
    packageService.list().then((result) => {
      if (!packageActive) return;
      if (result.ok) {
        setPackages(result.data);
        setPackagesError("");
      } else {
        setPackages([]);
        setPackagesError(result.error.message);
      }
      setPackagesLoading(false);
    });

    let studentActive = true;
    setStudentsLoading(true);
    studentService.list().then((result) => {
      if (!studentActive) return;
      if (result.ok) {
        setStudents(result.data);
        setStudentsError("");
      } else {
        setStudents([]);
        setStudentsError(result.error.message);
      }
      setStudentsLoading(false);
    });

    return () => {
      packageActive = false;
      studentActive = false;
      cancelled = true;
    };
  }, []);

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

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { httpClient } from "@wix/essentials";
import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";
import { beginManagedMemberLogin, signOutMember } from "../services/auth/authService";
import "./adminDashboard.css";
import "./admin-dashboard-live.css";

type StudentRecord = {
  id: string;
  memberId: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  profilePhotoUrl: string;
};

type LessonRecord = {
  id: string;
  bookingId: string;
  studentId: string;
  instructorId: string;
  lessonType: string;
  startedAt: string;
  durationMinutes: number;
  instructorNotes?: string;
  progressScore?: number | null;
};

type BookingRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  serviceId: string;
  instructorId: string;
  startDate: string;
  endDate: string;
  status: string;
  paymentStatus: string;
};

type Tab = "overview" | "students" | "lessons" | "bookings";

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [query, setQuery] = useState("");
  const [updatingStudentId, setUpdatingStudentId] = useState("");

  async function loadDashboard(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const authResponse = await httpClient.fetchWithAuth("/api/admin/authorization", {
        headers: { Accept: "application/json" },
      });
      const authResult = await authResponse.json().catch(() => null) as
        | { authorized?: boolean; access?: string; code?: string }
        | null;

      if (!authResponse.ok || authResult?.authorized !== true) {
        setAuthorized(false);
        setStudents([]);
        setLessons([]);
        setBookings([]);
        setError(
          authResult?.code === "UNAUTHENTICATED"
            ? "Sign in with an approved academy staff account to continue."
            : "This Wix member account is not approved for admin access.",
        );
        return;
      }

      setAuthorized(true);
      const [studentResponse, lessonResponse, bookingResponse] = await Promise.all([
        httpClient.fetchWithAuth("/api/admin/students", { headers: { Accept: "application/json" } }),
        httpClient.fetchWithAuth("/api/admin/lessons", { headers: { Accept: "application/json" } }),
        httpClient.fetchWithAuth("/api/admin/bookings", { headers: { Accept: "application/json" } }),
      ]);
      const [studentResult, lessonResult, bookingResult] = await Promise.all([
        studentResponse.json().catch(() => null) as Promise<{ ok?: boolean; students?: StudentRecord[]; message?: string } | null>,
        lessonResponse.json().catch(() => null) as Promise<{ ok?: boolean; lessons?: LessonRecord[]; message?: string } | null>,
        bookingResponse.json().catch(() => null) as Promise<{ ok?: boolean; bookings?: BookingRecord[]; message?: string } | null>,
      ]);

      if (!studentResponse.ok || studentResult?.ok !== true) {
        throw new Error(studentResult?.message || "Student records could not be loaded.");
      }
      if (!lessonResponse.ok || lessonResult?.ok !== true) {
        throw new Error(lessonResult?.message || "Lesson records could not be loaded.");
      }
      setStudents(Array.isArray(studentResult.students) ? studentResult.students : []);
      setLessons(Array.isArray(lessonResult.lessons) ? lessonResult.lessons : []);
      if (bookingResponse.ok && bookingResult?.ok === true) {
        setBookings(Array.isArray(bookingResult.bookings) ? bookingResult.bookings : []);
        setBookingError("");
      } else {
        // Booking API schema/runtime failures should not hide student and
        // lesson records from staff; surface the booking module error locally.
        setBookings([]);
        setBookingError(bookingResult?.message || "Booking records could not be loaded.");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The admin dashboard could not load.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function updateStudentStatus(student: StudentRecord) {
    if (student.status.toLowerCase() !== "active" && student.status.toLowerCase() !== "inactive") return;
    setUpdatingStudentId(student.id);
    setError("");
    try {
      const response = await httpClient.fetchWithAuth("/api/admin/students", {
        method: "PATCH",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: student.id,
          status: student.status.toLowerCase() === "active" ? "inactive" : "active",
        }),
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      if (!response.ok || result?.ok !== true) {
        throw new Error(result?.message || "The student status could not be updated.");
      }
      await loadDashboard(true);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "The student status could not be updated.");
    } finally {
      setUpdatingStudentId("");
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const filteredStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((student) =>
      [student.fullName, student.email, student.phone, student.memberId]
        .some((value) => value.toLowerCase().includes(needle)),
    );
  }, [students, query]);

  const pageTitle = tab === "overview" ? "Overview" : tab === "students" ? "Students" : tab === "lessons" ? "Lessons" : "Bookings";

  if (loading) {
    return (
      <div className="adminApp">
        <main className="adminPlaceholder adminLiveLoading">
          <span className="adminEyebrow">BSDA ADMIN</span>
          <h2>Verifying your access...</h2>
          <p>Checking the Wix session and protected staff access record.</p>
        </main>
      </div>
    );
  }

  if (authorized !== true) {
    return (
      <div className="adminApp">
        <main className="adminPlaceholder adminLiveDenied">
          <span className="adminEyebrow">RESTRICTED AREA</span>
          <h1>Admin access required</h1>
          <p>{error || "This account has not been authorized for academy administration."}</p>
          <div className="adminLiveActions">
            <button className="adminPrimaryButton" onClick={() => beginManagedMemberLogin("/admin")}>
              Sign in with Wix <Icon n="arrow" s={14} />
            </button>
            <Link className="adminLiveBackLink" to="/">Back to website</Link>
          </div>
        </main>
      </div>
    );
  }

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

          <Link className="adminBrand" to="/" aria-label="Back to public BSDA website"><Brand /></Link>
          <nav className="adminNav" aria-label="Admin navigation">
            {(["overview", "students", "lessons", "bookings"] as Tab[]).map((item) => (
              <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)} type="button">
                <span>{item === "overview" ? "Overview" : item === "students" ? "Students" : item === "lessons" ? "Lessons" : "Bookings"}</span>
              </button>
            ))}
          </nav>
          <div className="adminTopActions">
            <button type="button" onClick={() => void loadDashboard(true)} aria-label="Refresh data" title="Refresh data">
              <Icon n="arrow" s={18} />
            </button>
            <div className="adminUserMini">
              <span>BS</span>
              <div><strong>Academy staff</strong><small>Approved access</small></div>
            </div>
            <button type="button" className="adminLiveSignOut" onClick={() => void signOutMember()}>Sign out</button>
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
            {loadingData && <span className="adminDataStatus">Connecting to Wix data…</span>}
            {!loadingData && !dataError && liveData && (
              <span className="adminDataStatus live">● Live Wix data</span>
            )}
            {dataError && <span className="adminDataStatus error">{dataError}</span>}
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

      <main className="adminMain">
        <section className="adminHero">
          <div>
            <div className="adminBreadcrumb">ADMIN <span>/</span> {pageTitle.toUpperCase()}</div>
            <h1>{tab === "overview" ? "Academy overview" : pageTitle}</h1>
            <p>Live records loaded from protected Wix CMS endpoints. No demo counts are shown.</p>
          </div>
          <div className="adminHeroSide">
            <span className="adminDate">Wix-managed data</span>
            <div className="adminHeroActions">
              <button type="button" className="adminExport" disabled={refreshing} onClick={() => void loadDashboard(true)}>
                <Icon n="arrow" s={15} /> {refreshing ? "Refreshing..." : "Refresh data"}
              </button>
            </div>
          </div>
        </section>

 
        {active === "overview" ? (
          <Overview onNavigate={setActive} liveData={liveData} />
        ) : active === "packages" ? (
          <PackagesPanel packages={packages} loading={packagesLoading} error={packagesError} />
        ) : active === "students" ? (
          <StudentsPanel students={students} loading={studentsLoading} error={studentsError} />
        ) : active === "content" ? (
          <AdminContentManager />
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


function PackagesPanel({
  packages,
  loading,
  error,
}: {
  packages: Package[];
  loading: boolean;
  error: string;
}) {
  const formatMoney = (amountMinor: number, currency: string) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);

  return (
    <section className="adminPackagesPanel">
      <div className="adminPanel adminPackagesHeader">
        <div>
          <span className="adminEyebrow">WIX PRICING PLANS</span>
          <h2>Available packages</h2>
          <p>Live active public packages fetched directly from Wix Pricing Plans.</p>
        </div>
        {!loading && !error && (
          <span className="adminPackageCount">{packages.length} available</span>
        )}
      </div>

      {loading && (
        <div className="adminPanel adminPackageState">
          <span className="adminEyebrow">LIVE WIX DATA</span>
          <h3>Loading packages…</h3>
          <p>Fetching the current pricing plans from Wix.</p>
        </div>
      )}

      {!loading && error && (
        <div className="adminPanel adminPackageState error">
          <span className="adminEyebrow">WIX DATA ERROR</span>
          <h3>Packages could not be loaded.</h3>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && packages.length === 0 && (
        <div className="adminPanel adminPackageState">
          <span className="adminEyebrow">NO AVAILABLE PACKAGES</span>
          <h3>No active public pricing plans were found.</h3>
          <p>The dashboard is connected to Wix, but Wix currently returned no available packages.</p>
        </div>
      )}

      {!loading && !error && packages.length > 0 && (
        <div className="adminPackageGrid">
          {packages.map((plan) => (
            <article className="adminPackageCard" key={plan.id}>
              <div className="adminPackageCardTop">
                <span>{plan.lessonHours > 0 ? plan.lessonHours + " Hours" : "Driving package"}</span>
                <b>{formatMoney(plan.priceMinor, plan.currency)}</b>
              </div>
              <h3>{plan.name}</h3>
              <p>
                {plan.features.length > 0
                  ? plan.features.join(" · ")
                  : "Structured driving tuition package."}
              </p>
              <div className="adminPackageMeta">
                <span>{plan.transmission === "either" ? "Manual / Automatic" : plan.transmission}</span>
                <span className="adminPackageStatus">Active</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}


function StudentsPanel({
  students,
  loading,
  error,
}: {
  students: WixStudentSummary[];
  loading: boolean;
  error: string;
}) {
  const formatDate = (value: string) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <section className="adminStudentsPanel">
      <div className="adminPanel adminStudentsHeader">
        <div>
          <span className="adminEyebrow">WIX MEMBERS</span>
          <h2>Students</h2>
          <p>Member records fetched directly from the Wix Members API.</p>
        </div>
        {!loading && !error && (
          <span className="adminStudentCount">{students.length} returned</span>
        )}
      </div>

      {loading && (
        <div className="adminPanel adminStudentState">
          <span className="adminEyebrow">LIVE WIX DATA</span>
          <h3>Loading students…</h3>
          <p>Fetching member records from Wix.</p>
        </div>
      )}

      {!loading && error && (
        <div className="adminPanel adminStudentState error">
          <span className="adminEyebrow">WIX DATA ERROR</span>
          <h3>Students could not be loaded.</h3>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && students.length === 0 && (
        <div className="adminPanel adminStudentState">
          <span className="adminEyebrow">NO MEMBERS RETURNED</span>
          <h3>Wix returned no member records.</h3>
          <p>The dashboard is connected to Wix, but there are no member records available to this Wix account.</p>
        </div>
      )}

      {!loading && !error && students.length > 0 && (
        <div className="adminPanel adminStudentTablePanel">
          <div className="adminStudentTable">
            <div className="adminStudentRow adminStudentHead">
              <span>Student</span>
              <span>Email</span>
              <span>Phone</span>
              <span>Status</span>
              <span>Joined</span>
              <span>Last login</span>
            </div>

            {students.map((student) => (
              <div className="adminStudentRow" key={student.id}>
                <div className="adminStudentIdentity">
                  {student.profilePhotoUrl ? (
                    <img src={student.profilePhotoUrl} alt="" />
                  ) : (
                    <span>{student.name.slice(0, 2).toUpperCase()}</span>
                  )}
                  <strong>{student.name}</strong>
                </div>
                <span>{student.email || "—"}</span>
                <span>{student.phone || "—"}</span>
                <span>
                  <i className="adminStudentStatus">
                    {student.status.replaceAll("_", " ")}
                  </i>
                </span>
                <span>{formatDate(student.createdDate)}</span>
                <span>{formatDate(student.lastLoginDate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Overview({
  onNavigate,
  liveData,
}: {
  onNavigate: (id: string) => void;
  liveData: AdminDashboardSnapshot | null;
}) {
  const liveBookings = liveData?.bookings ?? [];
  const pendingCount = liveBookings.filter((booking) =>
    ["PENDING", "PENDING_APPROVAL", "PENDING_CHECKOUT"].includes(booking.status),
  ).length;
  const uniqueStudents = new Set(
    liveBookings.map((booking) => booking.contactId).filter(Boolean),
  ).size;

  const dashboardStats = liveData
    ? [
        {
          id: "students",
          label: "Active Students",
          value: String(uniqueStudents),
          change: "Wix",
          note: "students with bookings",
          icon: "users",
        },
        {
          id: "bookings",
          label: "Lessons This Month",
          value: String(liveBookings.length),
          change: "Wix",
          note: "scheduled bookings",
          icon: "car",
        },
        {
          id: "payments",
          label: "Booking Value",
          value: new Intl.NumberFormat("en-GB", {
            style: "currency",
            currency: liveData.currency || "GBP",
            maximumFractionDigits: 0,
          }).format(liveData.bookingValue),
          change: "Wix",
          note: "current service pricing",
          icon: "wallet",
        },
        {
          id: "bookings",
          label: "Pending Bookings",
          value: String(pendingCount),
          change: "Wix",
          note: "awaiting action",
          icon: "calendar",
        },
      ]
    : stats;
  return (
    <div className="adminContent">
      <section className="adminStats">
        {dashboardStats.map((stat) => (
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

          <UpcomingLessons onNavigate={onNavigate} bookings={liveBookings} />
        </div>

        <CalendarPanel onNavigate={onNavigate} bookings={liveBookings} />
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
            {(liveData
              ? liveBookings.slice(0, 5).map((booking) => {
                  const start = new Date(booking.startDate);
                  const schedule = start.toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return [
                    booking.id.slice(0, 8).toUpperCase(),
                    booking.studentName,
                    booking.serviceName,
                    schedule,
                    booking.status.replaceAll("_", " "),
                  ];
                })
              : bookings
            ).map((booking) => (
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
                <span><i className={booking[4].toLowerCase().includes("confirm") ? "confirmed" : "pending"}>{booking[4]}</i></span>
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

function UpcomingLessons({
  onNavigate,
  bookings: liveBookings,
}: {
  onNavigate: (id: string) => void;
  bookings: AdminDashboardSnapshot["bookings"];
}) {
  const lessons = liveBookings.length
    ? liveBookings.slice(0, 3).map((booking) => [
        new Date(booking.startDate).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        booking.studentName,
        booking.serviceName,
        booking.status.replaceAll("_", " "),
      ])
    : [
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

function CalendarPanel({
  onNavigate,
  bookings: liveBookings,
}: {
  onNavigate: (id: string) => void;
  bookings: AdminDashboardSnapshot["bookings"];
}) {
  const [selectedDay, setSelectedDay] = useState(7);
  const [month, setMonth] = useState("oct");
  const days = useMemo(() => month === "oct" ? Array.from({ length: 31 }, (_, index) => index + 1) : [], [month]);
  const firstDay = month === "oct" ? 4 : 0;
  const liveBookingDates = useMemo(() => {
    const counts: Record<number, { count: number; label: string }> = {};
    liveBookings.forEach((booking) => {
      const date = new Date(booking.startDate);
      if (date.getMonth() !== 9 || date.getFullYear() !== 2026) return;
      const day = date.getDate();
      counts[day] = {
        count: (counts[day]?.count ?? 0) + 1,
        label: `${(counts[day]?.count ?? 0) + 1} bookings`,
      };
    });
    return counts;
  }, [liveBookings]);
  const calendarBookings = liveBookings.length ? liveBookingDates : bookingDates;
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
          const booking = calendarBookings[day];
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
          {month === "oct" ? calendarBookings[selectedDay]?.label ?? "No bookings" : "No bookings"}
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
        {error && <div className="adminLiveError" role="alert">{error}</div>}

        {tab === "overview" && (
          <section className="adminLiveContent">
            <div className="adminLiveStats">
              <article className="adminLiveStat"><span>Student profiles loaded</span><strong>{students.length}</strong><small>Maximum 100 records per request</small></article>
              <article className="adminLiveStat"><span>Lesson records loaded</span><strong>{lessons.length}</strong><small>Maximum 100 records per request</small></article>
              <article className="adminLiveStat"><span>Booking records loaded</span><strong>{bookings.length}</strong><small>Live Wix Bookings response</small></article>
              <article className="adminLiveStat"><span>Active profiles</span><strong>{students.filter((student) => student.status.toLowerCase() === "active").length}</strong><small>Based on CMS status field</small></article>
              <article className="adminLiveStat"><span>Lessons with progress scores</span><strong>{lessons.filter((lesson) => lesson.progressScore !== null && lesson.progressScore !== undefined).length}</strong><small>Based on saved lesson records</small></article>
            </div>
            <div className="adminLiveGrid">
              <section className="adminLivePanel">
                <div className="adminLivePanelHead"><div><span className="adminEyebrow">WIX CMS</span><h2>Recent student profiles</h2></div><button type="button" onClick={() => setTab("students")}>View all <Icon n="arrow" s={13} /></button></div>
                {students.length === 0 ? <p className="adminLiveEmpty">No student profile records were returned.</p> : (
                  <div className="adminLiveTableWrap"><table className="adminLiveTable"><thead><tr><th>Student</th><th>Email</th><th>Status</th></tr></thead><tbody>
                    {students.slice(0, 6).map((student) => <tr key={student.id}><td>{student.fullName || "Unnamed student"}</td><td>{student.email || "—"}</td><td><span className="adminLiveStatus">{student.status || "unknown"}</span></td></tr>)}
                  </tbody></table></div>
                )}
              </section>
              <section className="adminLivePanel">
                <div className="adminLivePanelHead"><div><span className="adminEyebrow">LESSON RECORDS</span><h2>Recent lessons</h2></div><button type="button" onClick={() => setTab("lessons")}>View all <Icon n="arrow" s={13} /></button></div>
                {lessons.length === 0 ? <p className="adminLiveEmpty">No lesson records were returned.</p> : (
                  <div className="adminLiveTableWrap"><table className="adminLiveTable"><thead><tr><th>Lesson</th><th>Start time</th><th>Duration</th></tr></thead><tbody>
                    {lessons.slice(0, 6).map((lesson) => <tr key={lesson.id}><td>{lesson.lessonType || "Lesson"}<small>{lesson.studentId}</small></td><td>{lesson.startedAt ? new Date(lesson.startedAt).toLocaleString("en-GB") : "—"}</td><td>{lesson.durationMinutes || 0} min</td></tr>)}
                  </tbody></table></div>
                )}
              </section>
              <section className="adminLivePanel">
                <div className="adminLivePanelHead"><div><span className="adminEyebrow">WIX BOOKINGS</span><h2>Recent bookings</h2></div><button type="button" onClick={() => setTab("bookings")}>View all <Icon n="arrow" s={13} /></button></div>
                {bookingError ? <p className="adminLiveEmpty">{bookingError}</p> : bookings.length === 0 ? <p className="adminLiveEmpty">No booking records were returned.</p> : (
                  <div className="adminLiveTableWrap"><table className="adminLiveTable"><thead><tr><th>Customer</th><th>Start</th><th>Status</th></tr></thead><tbody>
                    {bookings.slice(0, 6).map((booking) => <tr key={booking.id}><td>{[booking.firstName, booking.lastName].filter(Boolean).join(" ") || booking.email || "Booking"}<small>{booking.serviceId}</small></td><td>{booking.startDate ? new Date(booking.startDate).toLocaleString("en-GB") : "—"}</td><td><span className="adminLiveStatus">{booking.status.toLowerCase().replaceAll("_", " ")}</span></td></tr>)}
                  </tbody></table></div>
                )}
              </section>
            </div>
          </section>
        )}

        {tab === "students" && (
          <section className="adminLiveContent">
            <div className="adminLivePanel">
              <div className="adminLivePanelHead"><div><span className="adminEyebrow">WIX CMS</span><h2>Student profiles</h2></div><span>{filteredStudents.length} loaded</span></div>
              <label className="adminLiveSearch">Search student records<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, phone or member ID" /></label>
              {filteredStudents.length === 0 ? <p className="adminLiveEmpty">No matching student profiles were returned.</p> : (
                <div className="adminLiveTableWrap"><table className="adminLiveTable"><thead><tr><th>Student</th><th>Email</th><th>Phone</th><th>Member ID</th><th>Status</th><th>Action</th></tr></thead><tbody>
                  {filteredStudents.map((student) => <tr key={student.id}><td>{student.fullName || "Unnamed student"}</td><td>{student.email || "—"}</td><td>{student.phone || "—"}</td><td className="adminLiveMono">{student.memberId || "—"}</td><td><span className="adminLiveStatus">{student.status || "unknown"}</span></td><td><button type="button" className="adminLiveActionButton" disabled={updatingStudentId === student.id || !["active", "inactive"].includes(student.status.toLowerCase())} onClick={() => void updateStudentStatus(student)}>{updatingStudentId === student.id ? "Saving..." : student.status.toLowerCase() === "active" ? "Deactivate" : student.status.toLowerCase() === "inactive" ? "Activate" : "Managed"}</button></td></tr>)}
                </tbody></table></div>
              )}
            </div>
          </section>
        )}

        {tab === "lessons" && (
          <section className="adminLiveContent">
            <div className="adminLivePanel">
              <div className="adminLivePanelHead"><div><span className="adminEyebrow">WIX CMS</span><h2>Lesson records</h2></div><span>{lessons.length} loaded</span></div>
              {lessons.length === 0 ? <p className="adminLiveEmpty">No lesson records were returned.</p> : (
                <div className="adminLiveTableWrap"><table className="adminLiveTable"><thead><tr><th>Lesson</th><th>Student</th><th>Instructor</th><th>Started</th><th>Duration</th><th>Progress</th></tr></thead><tbody>
                  {lessons.map((lesson) => <tr key={lesson.id}><td>{lesson.lessonType || "Lesson"}</td><td>{lesson.studentId || "—"}</td><td>{lesson.instructorId || "—"}</td><td>{lesson.startedAt ? new Date(lesson.startedAt).toLocaleString("en-GB") : "—"}</td><td>{lesson.durationMinutes || 0} min</td><td>{lesson.progressScore ?? "—"}</td></tr>)}
                </tbody></table></div>
              )}
            </div>
          </section>
        )}

        {tab === "bookings" && (
          <section className="adminLiveContent">
            <div className="adminLivePanel">
              <div className="adminLivePanelHead"><div><span className="adminEyebrow">WIX BOOKINGS</span><h2>Booking records</h2></div><span>{bookings.length} loaded</span></div>
              {bookingError ? <p className="adminLiveEmpty">{bookingError}</p> : bookings.length === 0 ? <p className="adminLiveEmpty">No booking records were returned.</p> : (
                <div className="adminLiveTableWrap"><table className="adminLiveTable"><thead><tr><th>Customer</th><th>Email</th><th>Service</th><th>Start</th><th>Status</th><th>Payment</th></tr></thead><tbody>
                  {bookings.map((booking) => <tr key={booking.id}><td>{[booking.firstName, booking.lastName].filter(Boolean).join(" ") || "Booking"}<small>{booking.id}</small></td><td>{booking.email || "—"}</td><td>{booking.serviceId || "—"}</td><td>{booking.startDate ? new Date(booking.startDate).toLocaleString("en-GB") : "—"}</td><td><span className="adminLiveStatus">{booking.status.toLowerCase().replaceAll("_", " ")}</span></td><td>{booking.paymentStatus.toLowerCase().replaceAll("_", " ")}</td></tr>)}
                </tbody></table></div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
