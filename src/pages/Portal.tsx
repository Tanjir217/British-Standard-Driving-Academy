import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import "../styles/portal-profile.css";
import { lessonService, type StudentLessonRecord } from "../services/lessons/lessonService";
import { listBookingsForCurrentStudent, type StudentBookingRecord } from "../services/students/studentBookingApi";
import { listEnrollmentsForCurrentStudent, type StudentEnrollment } from "../services/students/studentEnrollmentApi";
import { listStudentLearningVideos, type StudentLearningVideo } from "../services/students/studentLearningMaterialsApi";
import { VideoEmbed } from "../components/VideoEmbed";
import { signOutMember } from "../services/auth/authService";
import {
  getStudentProfile,
  StudentProfileApiError,
  type StudentProfileApiRecord,
  updateStudentProfile,
  type StudentProfileUpdate,
} from "../services/students/studentProfileApi";

function profileImagePreviewUrl(value: string, fallback = ""): string {
  const candidate = value.trim();
  if (/^https:\/\//i.test(candidate)) return candidate;
  if (candidate.startsWith("wix:image://v1/")) {
    const mediaId = candidate.slice("wix:image://v1/".length).split(/[\\/#?]/)[0];
    return mediaId ? `https://static.wixstatic.com/media/${mediaId}` : fallback;
  }
  return fallback;
}

export function Portal() {
  const navigate = useNavigate();
  const [studentProfile, setStudentProfile] = useState<StudentProfileApiRecord | null>(null);
  const [profileMessage, setProfileMessage] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<StudentProfileUpdate>({ firstName: "", lastName: "", nickname: "", phone: "", profilePhotoUrl: "" });
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<StudentLessonRecord[]>([]);
  const [lessonsMessage, setLessonsMessage] = useState("");
  const [bookings, setBookings] = useState<StudentBookingRecord[]>([]);
  const [bookingsMessage, setBookingsMessage] = useState("");
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [enrollmentMessage, setEnrollmentMessage] = useState("");
  const [learningVideos, setLearningVideos] = useState<StudentLearningVideo[]>([]);
  const [learningMaterialsMessage, setLearningMaterialsMessage] = useState("");
  const [activeSection, setActiveSection] = useState<"profile" | "bookings" | "progress" | "enrollment" | "materials">("profile");
  const [sectionLoading, setSectionLoading] = useState(false);
  const [loadedSections, setLoadedSections] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      if (profilePhotoPreview.startsWith("blob:")) URL.revokeObjectURL(profilePhotoPreview);
    };
  }, [profilePhotoPreview]);

  // Initial portal entry performs one data request: the protected profile endpoint.
  // That endpoint also verifies the Wix member session and returns 401 when signed out.
  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const response = await getStudentProfile();
        if (!active) return;
        if (response.profile) {
          setStudentProfile(response.profile);
          setProfileDraft({
            firstName: response.profile.firstName || "",
            lastName: response.profile.lastName || "",
            nickname: response.profile.nickname || "",
            phone: response.profile.phone || "",
            profilePhotoUrl: response.profile.profilePhotoUrl || "",
          });
          setProfileMessage("Your profile is saved in StudentProfiles.");
        } else {
          setProfileMessage("Complete your profile to finish setting up your StudentProfiles record.");
        }
      } catch (profileError) {
        if (!active) return;
        // Only an explicit unauthenticated response should start the login flow.
        // CMS or profile-storage failures must not be mistaken for a signed-out user.
        if (profileError instanceof StudentProfileApiError &&
            (profileError.status === 401 || profileError.code === "UNAUTHENTICATED")) {
          navigate("/login?returnTo=" + encodeURIComponent("/portal") + "&force=1", { replace: true });
          return;
        }
        setProfileMessage(
          profileError instanceof Error
            ? profileError.message
            : "We couldn't load your student profile. Please retry in a moment.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, [navigate]);

  // Each dashboard section requests its own data only when opened. Successfully
  // loaded sections are cached in component state to avoid repeat requests on tab changes.
  useEffect(() => {
    if (activeSection === "profile" || loadedSections.includes(activeSection)) return;
    let active = true;
    setSectionLoading(true);

    async function loadSection() {
      try {
        if (activeSection === "bookings") {
          const result = await listBookingsForCurrentStudent();
          if (!active) return;
          if (result.ok) {
            setBookings(result.data);
            setBookingsMessage(result.data.length ? "" : "No bookings are associated with this account yet.");
          } else setBookingsMessage(result.error.message);
        } else if (activeSection === "progress") {
          const result = await lessonService.listForCurrentStudent();
          if (!active) return;
          if (result.ok) {
            setLessons(result.data);
            setLessonsMessage(result.data.length ? "" : "No lesson records are available yet.");
          } else setLessonsMessage(result.error.message);
        } else if (activeSection === "enrollment") {
          const result = await listEnrollmentsForCurrentStudent();
          if (!active) return;
          if (result.ok) {
            setEnrollments(result.data);
            setEnrollmentMessage(result.data.length ? "" : "No Wix Pricing Plans orders were found for this account.");
          } else setEnrollmentMessage(result.error.message);
        } else if (activeSection === "materials") {
          try {
            const videos = await listStudentLearningVideos();
            if (!active) return;
            setLearningVideos(videos);
            setLearningMaterialsMessage(videos.length ? "" : "No learning videos have been published yet.");
          } catch (contentError) {
            if (!active) return;
            setLearningMaterialsMessage(contentError instanceof Error ? contentError.message : "Learning materials could not be loaded.");
          }
        }
        if (active) setLoadedSections((current) => current.includes(activeSection) ? current : [...current, activeSection]);
      } catch {
        if (!active) return;
        if (activeSection === "bookings") setBookingsMessage("Bookings could not be loaded. Please try again later.");
        else if (activeSection === "progress") setLessonsMessage("Learning progress could not be loaded. Please try again later.");
        else if (activeSection === "enrollment") setEnrollmentMessage("Package and enrollment data could not be loaded. Please try again later.");
        else if (activeSection === "materials") setLearningMaterialsMessage("Learning materials could not be loaded. Please try again later.");
      } finally {
        if (active) setSectionLoading(false);
      }
    }

    void loadSection();
    return () => { active = false; };
  }, [activeSection, loadedSections]);

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingProfile) return;
    setIsSavingProfile(true);
    setProfileMessage("");
    try {
      let profilePhotoUrl = profileDraft.profilePhotoUrl;
      if (profilePhotoFile) {
        if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(profilePhotoFile.type)) {
          throw new Error("Choose a JPG, PNG, WebP, or GIF image.");
        }
        if (profilePhotoFile.size > 5 * 1024 * 1024) {
          throw new Error("The profile image must be 5 MB or smaller.");
        }

        const uploadUrlResponse = await fetch("/api/students/profile-image-upload", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: profilePhotoFile.name,
            mimeType: profilePhotoFile.type,
            sizeInBytes: profilePhotoFile.size,
          }),
        });
        const uploadUrlPayload = await uploadUrlResponse.json().catch(() => null) as {
          ok?: boolean;
          uploadUrl?: string;
          message?: string;
        } | null;
        if (!uploadUrlResponse.ok || !uploadUrlPayload?.ok || !uploadUrlPayload.uploadUrl) {
          throw new Error(uploadUrlPayload?.message || "We could not prepare the image upload.");
        }

        const uploadResponse = await fetch(uploadUrlPayload.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": profilePhotoFile.type },
          body: profilePhotoFile,
        });
        const uploadedPayload = await uploadResponse.json().catch(() => null) as {
          file?: { url?: string; media?: { image?: { image?: { url?: string } } } };
        } | null;
        if (!uploadResponse.ok) throw new Error("Wix Media could not save the selected image.");
        const uploadedUrl = uploadedPayload?.file?.media?.image?.image?.url || uploadedPayload?.file?.url;
        if (!uploadedUrl) throw new Error("Wix Media did not return the uploaded image URL.");
        const parsedUploadedUrl = new URL(uploadedUrl);
        if (parsedUploadedUrl.protocol !== "https:" || parsedUploadedUrl.hostname !== "static.wixstatic.com") {
          throw new Error("Wix Media returned an unexpected image URL.");
        }
        profilePhotoUrl = uploadedUrl;
      }

      const response = await updateStudentProfile({ ...profileDraft, profilePhotoUrl });
      if (!response.profile) throw new Error("The profile service did not return the saved profile.");
      setStudentProfile(response.profile);
      setProfileDraft({
        firstName: response.profile.firstName || "",
        lastName: response.profile.lastName || "",
        nickname: response.profile.nickname || "",
        phone: response.profile.phone || "",
        profilePhotoUrl: response.profile.profilePhotoUrl || "",
      });
      setProfilePhotoFile(null);
      setProfilePhotoPreview("");
      setProfileMessage("Your profile has been saved to StudentProfiles.");
      setIsEditingProfile(false);
    } catch (saveError) {
      setProfileMessage(saveError instanceof Error ? saveError.message : "Your profile could not be saved.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  // Keep the protected portal invisible while its first request is being
  // checked; failures navigate to login rather than showing an account error page.
  if (loading) {
    return (
      <section className="page portal-skeleton-page" aria-busy="true" aria-live="polite">
        <div className="container portal-skeleton">
          <span className="portal-skeleton-screen-reader">Loading your student profile...</span>
          <div className="portal-skeleton-head">
            <div className="portal-skeleton-heading">
              <span className="portal-skeleton-line portal-skeleton-eyebrow" />
              <span className="portal-skeleton-line portal-skeleton-title" />
              <span className="portal-skeleton-line portal-skeleton-email" />
            </div>
            <span className="portal-skeleton-line portal-skeleton-signout" />
          </div>
          <div className="portal-skeleton-grid">
            <div className="portal-skeleton-card portal-skeleton-status-card">
              <span className="portal-skeleton-line portal-skeleton-label" />
              <span className="portal-skeleton-line portal-skeleton-status" />
              <span className="portal-skeleton-line portal-skeleton-copy" />
              <span className="portal-skeleton-line portal-skeleton-copy portal-skeleton-copy-short" />
            </div>
            <div className="portal-skeleton-card">
              <span className="portal-skeleton-icon" />
              <span className="portal-skeleton-line portal-skeleton-card-title" />
              <span className="portal-skeleton-line portal-skeleton-copy" />
              <span className="portal-skeleton-line portal-skeleton-progress" />
            </div>
          </div>
          <div className="portal-skeleton-profile">
            <div className="portal-skeleton-heading">
              <span className="portal-skeleton-line portal-skeleton-label" />
              <span className="portal-skeleton-line portal-skeleton-profile-title" />
              <span className="portal-skeleton-line portal-skeleton-copy portal-skeleton-copy-medium" />
            </div>
            <span className="portal-skeleton-line portal-skeleton-book-button" />
          </div>
        </div>
      </section>
    );
  }

  const firstName = studentProfile?.firstName?.trim() || studentProfile?.fullName?.trim().split(/\s+/)[0] || "Learner";
  const displayName = firstName || "Learner";
  const sectionItems = [
    { id: "profile" as const, label: "Personal profile", icon: "users" },
    { id: "bookings" as const, label: "Bookings", icon: "calendar" },
    { id: "progress" as const, label: "Learning progress / report", icon: "car" },
    { id: "enrollment" as const, label: "Package & enrollment", icon: "wallet" },
    { id: "materials" as const, label: "Learning materials", icon: "book" },
  ];

  return (
    <section className="page portal">
      <div className="container portal-layout">
        <aside className="portal-sidebar" aria-label="Student portal navigation">
          <div className="portal-sidebar-brand">
            <span className="ey">BSDA STUDENT PORTAL</span>
            <h2>My learning</h2>
          </div>
          <nav className="portal-sidebar-nav">
            {sectionItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`portal-nav-item${activeSection === item.id ? " is-active" : ""}`}
                aria-current={activeSection === item.id ? "page" : undefined}
                onClick={() => setActiveSection(item.id)}
              >
                <Icon n={item.icon} s={20} />
                <span>{item.label}</span>
                <span className="portal-nav-chevron" aria-hidden="true">›</span>
              </button>
            ))}
          </nav>
          <button className="portal-sidebar-signout" type="button" onClick={() => void signOutMember()}>
            <Icon n="arrow" s={18} /> Sign out
          </button>
        </aside>

        <main className="portal-main-content">
          <header className="portal-content-header">
            <div className="portal-content-greeting">
              <span className="ey">STUDENT DASHBOARD</span>
              <h1>Hello, {displayName}.</h1>
              <p>{studentProfile?.email || "Your BSDA student account"}</p>
            </div>
            {activeSection === "profile" && (
              <div className="portal-header-avatar" aria-label="Your profile photo">
                {studentProfile?.profilePhotoUrl ? (
                  <img src={profileImagePreviewUrl(studentProfile.profilePhotoUrl)} alt="Your profile" />
                ) : (
                  <span aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
            )}
          </header>

          {activeSection === "profile" && (
            <section className="portal-detail-panel" aria-labelledby="portal-profile-heading">
              <div className="portal-panel-heading">
                <div>
                  <span className="ey">YOUR ACCOUNT</span>
                  <h2 id="portal-profile-heading">Personal information</h2>
                  <p>Review and update the personal details associated with your BSDA student profile.</p>
                </div>
                <span className={`portal-account-status${studentProfile?.status?.toLowerCase() === "active" ? " is-active" : ""}`}>
                  {studentProfile?.status || "Profile pending"}
                </span>
              </div>
              {profileMessage && <p className="portal-section-message" role="status">{profileMessage}</p>}
              {studentProfile?.profilePhotoUrl && (
                <img className="portal-profile-photo" src={profileImagePreviewUrl(studentProfile.profilePhotoUrl)} alt="Your profile" />
              )}
              <dl className="portal-profile-details">
                <div><dt>First name</dt><dd>{studentProfile?.firstName || profileDraft.firstName || "Not provided"}</dd></div>
                <div><dt>Last name</dt><dd>{studentProfile?.lastName || profileDraft.lastName || "Not provided"}</dd></div>
                <div><dt>Preferred name</dt><dd>{studentProfile?.nickname || profileDraft.nickname || "Not provided"}</dd></div>
                <div><dt>Email address</dt><dd>{studentProfile?.email || "Not available"}</dd></div>
                <div><dt>Phone number</dt><dd>{studentProfile?.phone || profileDraft.phone || "Not provided"}</dd></div>
                <div><dt>Transmission preference</dt><dd>{studentProfile?.transmission || "Not set"}</dd></div>
              </dl>
              <div className="portal-profile-detail-actions">
                <button className="btn red" type="button" onClick={() => setIsEditingProfile(true)}>
                  {studentProfile ? "Edit personal information" : "Complete profile"}
                </button>
              </div>
            </section>
          )}

          {activeSection === "bookings" && (
            <section className="portal-detail-panel" aria-labelledby="portal-bookings-heading">
              <div className="portal-panel-heading"><div><span className="ey">YOUR SCHEDULE</span><h2 id="portal-bookings-heading">Bookings</h2><p>Appointments associated with your account.</p></div></div>
              {sectionLoading ? <PortalSectionSkeleton /> : bookingsMessage ? <p className="portal-section-message" role="status">{bookingsMessage}</p> : (
                <ul className="portal-lesson-list">{bookings.map((booking) => (
                  <li key={booking.id}><strong>{booking.serviceName || "Driving appointment"}</strong>
                    <span>{booking.startDate && !Number.isNaN(Date.parse(booking.startDate)) ? new Date(booking.startDate).toLocaleString() : "Date not recorded"}</span>
                    <span className="portalstatus">{booking.status.replace(/_/g, " ").toLowerCase()}</span>
                    {booking.instructorName && <span>Instructor: {booking.instructorName}</span>}
                    {booking.paymentStatus && <span>Payment: {booking.paymentStatus.replace(/_/g, " ").toLowerCase()}</span>}
                  </li>
                ))}</ul>
              )}
            </section>
          )}

          {activeSection === "progress" && (
            <section className="portal-detail-panel" aria-labelledby="portal-progress-heading">
              <div className="portal-panel-heading"><div><span className="ey">LESSON REPORT</span><h2 id="portal-progress-heading">Learning progress</h2><p>Lesson history and progress information recorded by your instructor.</p></div></div>
              {sectionLoading ? <PortalSectionSkeleton /> : lessonsMessage ? <p className="portal-section-message" role="status">{lessonsMessage}</p> : (
                <>
                  {studentProfile?.lessonsCompleted != null && studentProfile?.lessonsRemaining != null && studentProfile?.progressPercent != null ? (
                    <div className="portal-progress-summary">
                      <div><span>Lessons completed</span><strong>{studentProfile.lessonsCompleted}</strong></div>
                      <div><span>Lessons remaining</span><strong>{studentProfile.lessonsRemaining}</strong></div>
                      <div><span>Overall progress</span><strong>{studentProfile.progressPercent}%</strong></div>
                      <div className="portalprogress" role="progressbar" aria-valuenow={studentProfile.progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Learning progress"><span style={{ width: `${studentProfile.progressPercent}%` }} /></div>
                    </div>
                  ) : <p>Verified completion and package entitlement data is not available in your profile yet.</p>}
                  <h3>Lesson report</h3>
                  <ul className="portal-lesson-list">{lessons.map((lesson) => (
                    <li key={lesson.id}><strong>{lesson.lessonType || "Driving lesson"}</strong>
                      <span>{lesson.startedAt && !Number.isNaN(Date.parse(String(lesson.startedAt))) ? new Date(String(lesson.startedAt)).toLocaleDateString() : "Date not recorded"}</span>
                      <span className="portalstatus">{lesson.status || "Status not recorded"}</span>
                      {lesson.instructorName && <span>Instructor: {lesson.instructorName}</span>}
                      {lesson.instructorNotes && <span>Instructor notes: {lesson.instructorNotes}</span>}
                      {lesson.objectives?.length ? <span>Objectives: {lesson.objectives.join(", ")}</span> : null}
                      {lesson.strengths?.length ? <span>Strengths: {lesson.strengths.join(", ")}</span> : null}
                      {lesson.improvements?.length ? <span>Areas to improve: {lesson.improvements.join(", ")}</span> : null}
                    </li>
                  ))}</ul>
                </>
              )}
            </section>
          )}

          {activeSection === "enrollment" && (
            <section className="portal-detail-panel" aria-labelledby="portal-enrollment-heading">
              <div className="portal-panel-heading"><div><span className="ey">YOUR PURCHASES</span><h2 id="portal-enrollment-heading">Packages & enrollment</h2><p>Your Wix Pricing Plans and enrollment details.</p></div></div>
              {sectionLoading ? <PortalSectionSkeleton /> : enrollmentMessage ? <p className="portal-section-message" role="status">{enrollmentMessage}</p> : (
                <ul className="portal-lesson-list">{enrollments.map((enrollment) => (
                  <li key={enrollment.id}><strong>{enrollment.planName || "Wix pricing plan"}</strong>
                    <span className="portalstatus">Enrollment: {enrollment.status.replace(/_/g, " ").toLowerCase()} · Payment: {enrollment.paymentStatus.replace(/_/g, " ").toLowerCase()}</span>
                    {enrollment.startDate && <span>Starts: {new Date(enrollment.startDate).toLocaleDateString()}</span>}
                    {enrollment.endDate && <span>Ends: {new Date(enrollment.endDate).toLocaleDateString()}</span>}
                  </li>
                ))}</ul>
              )}
            </section>
          )}

          {activeSection === "materials" && (
            <section className="portal-detail-panel" aria-labelledby="portal-materials-heading">
              <div className="portal-panel-heading"><div><span className="ey">STUDY RESOURCES</span><h2 id="portal-materials-heading">Learning materials</h2><p>Videos and resources provided by BSDA.</p></div></div>
              {sectionLoading ? <PortalSectionSkeleton /> : learningMaterialsMessage ? <p className="portal-section-message" role="status">{learningMaterialsMessage}</p> : (
                <div className="portal-learning-video-grid">{learningVideos.map((video) => (
                  <article className="portal-learning-video" key={video.key}><h3>{video.title || "Student learning video"} </h3><VideoEmbed url={video.url} title={video.title || "Student learning video"} /></article>
                ))}</div>
              )}
            </section>
          )}
        </main>

        {isEditingProfile && (
          <div
            className="portal-profile-modal-backdrop"
            onClick={() => { if (!isSavingProfile) setIsEditingProfile(false); }}
          >
            <section
              className="panel portal-profile-editor portal-profile-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="portal-profile-editor-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 className="portal-profile-editor-title" id="portal-profile-editor-title">{studentProfile ? "Edit your profile" : "Complete your student profile"}</h2>
              <form className="portal-profile-form" onSubmit={handleSaveProfile}>
                <label>
                  First name
                  <input autoComplete="given-name" required maxLength={80} value={profileDraft.firstName} onChange={(event) => setProfileDraft((draft) => ({ ...draft, firstName: event.target.value }))} />
                </label>
                <label>
                  Last name
                  <input autoComplete="family-name" required maxLength={80} value={profileDraft.lastName} onChange={(event) => setProfileDraft((draft) => ({ ...draft, lastName: event.target.value }))} />
                </label>
                <label>
                  Preferred name
                  <input autoComplete="nickname" maxLength={80} value={profileDraft.nickname} onChange={(event) => setProfileDraft((draft) => ({ ...draft, nickname: event.target.value }))} />
                </label>
                <label>
                  Phone number
                  <input autoComplete="tel" inputMode="tel" maxLength={40} placeholder="+880 1XXXXXXXXX" value={profileDraft.phone} onChange={(event) => setProfileDraft((draft) => ({ ...draft, phone: event.target.value }))} />
                </label>
                {!profilePhotoFile && (
                  <label className="portal-profile-form-wide">
                    Profile image
                    <input
                      key={profilePhotoFile ? "image-selected" : "image-empty"}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      aria-describedby="portal-profile-image-help"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0] || null;
                        setProfilePhotoFile(file);
                        setProfilePhotoPreview(file ? URL.createObjectURL(file) : "");
                        setProfileMessage("");
                      }}
                    />
                    <small id="portal-profile-image-help">Choose a JPG, PNG, WebP, or GIF image up to 5 MB. The image will upload to Wix Media when you save your profile.</small>
                  </label>
                )}
                {(profilePhotoPreview || profileDraft.profilePhotoUrl.trim()) && (
                  <div className="portal-profile-preview portal-profile-form-wide">
                    <img
                      src={profilePhotoPreview || profileImagePreviewUrl(profileDraft.profilePhotoUrl, studentProfile?.profilePhotoUrl || "")}
                      alt="Profile image preview"
                      onError={(event) => { event.currentTarget.style.visibility = "hidden"; }}
                    />
                    <span>{profilePhotoFile ? profilePhotoFile.name : "Current profile image"}</span>
                    {profilePhotoFile && (
                      <button type="button" className="btn light" onClick={() => {
                        setProfilePhotoFile(null);
                        setProfilePhotoPreview("");
                      }}>Remove selected image</button>
                    )}
                  </div>
                )}
                {profileMessage && <p className="portal-profile-form-message portal-profile-form-wide" role="status">{profileMessage}</p>}
                <div className="portal-profile-form-actions portal-profile-form-wide">
                  <button type="submit" className="btn red" disabled={isSavingProfile}>{isSavingProfile ? "Saving…" : "Save profile"} <Icon n="arrow" /></button>
                  <button type="button" className="btn light" onClick={() => setIsEditingProfile(false)} disabled={isSavingProfile}>Cancel</button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}

function PortalSectionSkeleton() {
  return <div className="portal-section-skeleton" role="status" aria-label="Loading section details"><span /><span /><span /><span /></div>;
}
