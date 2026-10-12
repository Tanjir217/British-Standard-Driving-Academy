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
      if (!bookingResponse.ok || bookingResult?.ok !== true) {
        throw new Error(bookingResult?.message || "Booking records could not be loaded.");
      }

      setStudents(Array.isArray(studentResult.students) ? studentResult.students : []);
      setLessons(Array.isArray(lessonResult.lessons) ? lessonResult.lessons : []);
      setBookings(Array.isArray(bookingResult.bookings) ? bookingResult.bookings : []);
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
                {bookings.length === 0 ? <p className="adminLiveEmpty">No booking records were returned.</p> : (
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
              {bookings.length === 0 ? <p className="adminLiveEmpty">No booking records were returned.</p> : (
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
