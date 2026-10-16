import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import "../styles/portal-profile.css";
import { lessonService, type StudentLessonRecord } from "../services/lessons/lessonService";
import { listBookingsForCurrentStudent, type StudentBookingRecord } from "../services/students/studentBookingApi";
import { listEnrollmentsForCurrentStudent, type StudentEnrollment } from "../services/students/studentEnrollmentApi";
import { listStudentLearningVideos, type StudentLearningVideo } from "../services/students/studentLearningMaterialsApi";
import { VideoEmbed } from "../components/VideoEmbed";
import {
  getCurrentMember,
  signOutMember,
} from "../services/auth/authService";
import {
  getStudentProfile,
  type StudentProfileApiRecord,
  StudentProfileApiError,
  updateStudentProfile,
  type StudentProfileUpdate,
} from "../services/students/studentProfileApi";

type MemberSummary = {
  loginEmail?: string | null;
  email?: string | null;
  profile?: { nickname?: string | null; photo?: { url?: string | null } | null };
  contact?: {
    firstName?: string;
    lastName?: string;
    phones?: string[];
    contactId?: string | null;
  };
};

export function Portal() {
  const navigate = useNavigate();
  const [member, setMember] = useState<MemberSummary | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfileApiRecord | null>(null);
  const [profileMessage, setProfileMessage] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<StudentProfileUpdate>({ firstName: "", lastName: "", nickname: "", phone: "", profilePhotoUrl: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lessons, setLessons] = useState<StudentLessonRecord[]>([]);
  const [lessonsMessage, setLessonsMessage] = useState("Loading lesson records…");
  const [bookings, setBookings] = useState<StudentBookingRecord[]>([]);
  const [bookingsMessage, setBookingsMessage] = useState("Loading bookings…");
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [enrollmentMessage, setEnrollmentMessage] = useState("Loading enrollment…");
  const [learningVideos, setLearningVideos] = useState<StudentLearningVideo[]>([]);
  const [learningMaterialsMessage, setLearningMaterialsMessage] = useState("Loading learning materials…");

  useEffect(() => {
    let active = true;

    async function loadPortal() {
      try {
        const currentMember = await getCurrentMember();
        if (!active) return;

        if (!currentMember) {
          navigate("/login?returnTo=" + encodeURIComponent("/portal"), { replace: true });
          return;
        }

        const memberRecord = currentMember as typeof currentMember & {
          email?: string | null;
          profile?: { nickname?: string | null; photo?: { url?: string | null } | null };
          contact?: (typeof currentMember.contact & { contactId?: string | null }) | null;
          contactId?: string | null;
        };
        const summary: MemberSummary = {
          loginEmail: currentMember.loginEmail || memberRecord.email || null,
          email: memberRecord.email || null,
          profile: memberRecord.profile ?? undefined,
          contact: {
            firstName: currentMember.contact?.firstName || undefined,
            lastName: currentMember.contact?.lastName || undefined,
            phones: currentMember.contact?.phones?.length ? currentMember.contact.phones : undefined,
            contactId: memberRecord.contact?.contactId ?? memberRecord.contactId ?? null,
          },
        };
        setMember(summary);
        setProfileDraft({
          firstName: currentMember.contact?.firstName || "",
          lastName: currentMember.contact?.lastName || "",
          nickname: currentMember.profile?.nickname || "",
          phone: currentMember.contact?.phones?.[0] || "",
          profilePhotoUrl: currentMember.profile?.photo?.url || "",
        });

        // Profile data comes only from the protected server endpoint. If no
        // profile exists, provision it from the authenticated member's contact
        // details; the endpoint derives the actual member ID from the session.
        try {
          // The profile endpoint reads the authenticated member's matching
          // record from Wix CMS FullData. Do not create or mutate records in
          // this member-data collection from the student portal.
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
            setProfileMessage("Your profile is saved in FullData.");
          } else {
            setProfileMessage("Complete your profile to create your student record in FullData.");
            setIsEditingProfile(true);
          }
        } catch (profileError) {
          if (!active) return;
          if (profileError instanceof StudentProfileApiError && profileError.status === 401) {
            setError("Your Wix sign-in session could not be verified by the student profile service. Please sign in again.");
            return;
          } else {
            // Keep the portal useful while CMS collections/permissions are
            // being repaired. The authenticated Wix member remains the source
            // for basic identity fields; academy-specific data stays pending.
            setProfileMessage(
              "Your Wix member details are available. Academy profile data is temporarily unavailable and will appear when the student records service is restored.",
            );
          }
        }
        const lessonResult = await lessonService.listForCurrentStudent();
        if (!active) return;
        if (lessonResult.ok) {
          setLessons(lessonResult.data);
          setLessonsMessage(lessonResult.data.length ? "" : "No lesson records are available yet.");
        } else {
          setLessonsMessage(lessonResult.error.message);
        }

        const bookingResult = await listBookingsForCurrentStudent();
        if (!active) return;
        if (bookingResult.ok) {
          setBookings(bookingResult.data);
          setBookingsMessage(bookingResult.data.length ? "" : "No bookings are associated with this account yet.");
        } else {
          setBookingsMessage(bookingResult.error.message);
        }

        const enrollmentResult = await listEnrollmentsForCurrentStudent();
        if (!active) return;
        if (enrollmentResult.ok) {
          setEnrollments(enrollmentResult.data);
          setEnrollmentMessage(enrollmentResult.data.length ? "" : "No Wix Pricing Plans orders were found for this account.");
        } else {
          setEnrollmentMessage(enrollmentResult.error.message);
        }

        try {
          const videos = await listStudentLearningVideos();
          if (!active) return;
          setLearningVideos(videos);
          setLearningMaterialsMessage(videos.length ? "" : "No learning videos have been published yet.");
        } catch (contentError) {
          if (!active) return;
          setLearningMaterialsMessage(contentError instanceof Error ? contentError.message : "Learning materials could not be loaded.");
        }
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "We couldn't load your account.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPortal();
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingProfile) return;
    setIsSavingProfile(true);
    setProfileMessage("");
    try {
      const response = await updateStudentProfile(profileDraft);
      if (!response.profile) throw new Error("The profile service did not return the saved profile.");
      setStudentProfile(response.profile);
      setProfileDraft({
        firstName: response.profile.firstName || "",
        lastName: response.profile.lastName || "",
        nickname: response.profile.nickname || "",
        phone: response.profile.phone || "",
        profilePhotoUrl: response.profile.profilePhotoUrl || "",
      });
      setProfileMessage("Your profile has been saved to FullData.");
      setIsEditingProfile(false);
    } catch (saveError) {
      setProfileMessage(saveError instanceof Error ? saveError.message : "Your profile could not be saved.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  if (loading) {
    return <StudentPortalSkeleton />;
  }

  if (error) {
    return (
      <section className="page portal">
        <div className="container authloading">
          <span className="ey">Student portal</span>
          <h1>We couldn't load your account.</h1>
          <p>{error}</p>
          <button className="btn red" onClick={() => navigate("/login")}>
            Sign in again <Icon n="arrow" />
          </button>
        </div>
      </section>
    );
  }

  const firstName = studentProfile?.fullName?.trim().split(/\s+/)[0] || member?.contact?.firstName?.trim();
  const displayName = firstName || "learner";
  const assignedInstructorName = bookings.find((booking) => booking.instructorName.trim())?.instructorName || "";

  return (
    <section className="page portal">
      <div className="container dashboard">
        <div className="dashhead">
          <div>
            <span className="ey">Student dashboard</span>
            <h1>Good to see you, {displayName}.</h1>
            <p className="dashboardemail">
              {studentProfile?.email || member?.loginEmail || "Your BSDA member account"}
            </p>
          </div>
          <button className="btn light" onClick={() => void signOutMember()}>
            Sign out
          </button>
        </div>

        <div className="dashgrid">
          <div className="dash darkdash">
            <span className="ey">Account status</span>
            <strong>{studentProfile?.status || "Profile pending"}</strong>
          </div>

          <div className="dash">
            <Icon n="calendar" s={24} />
            <h3>Bookings</h3>
            {bookingsMessage ? (
              <p role={bookingsMessage.toLowerCase().includes("could not") || bookingsMessage.toLowerCase().includes("failed") ? "alert" : undefined}>{bookingsMessage}</p>
            ) : (
              <ul className="portal-lesson-list">
                {bookings.slice(0, 5).map((booking) => (
                  <li key={booking.id}>
                    <strong>{booking.serviceName || "Driving appointment"}</strong>
                    <span>{booking.startDate && !Number.isNaN(Date.parse(booking.startDate))
                      ? new Date(booking.startDate).toLocaleString()
                      : "Date not recorded"}</span>
                    <span className="portalstatus">{booking.status.replace(/_/g, " ").toLowerCase()}</span>
                    {booking.instructorName && <span>Instructor: {booking.instructorName}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dash">
            <Icon n="car" s={24} />
            <h3>Learning progress</h3>
            {studentProfile?.lessonsCompleted !== null && studentProfile?.lessonsCompleted !== undefined &&
             studentProfile?.lessonsRemaining !== null && studentProfile?.lessonsRemaining !== undefined &&
             studentProfile?.progressPercent !== null && studentProfile?.progressPercent !== undefined ? (
              <>
                <p>{studentProfile.lessonsCompleted} lessons completed · {studentProfile.lessonsRemaining} remaining</p>
                <div className="portalprogress" role="progressbar" aria-valuenow={studentProfile.progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Learning progress">
                  <span style={{ width: `${studentProfile.progressPercent}%` }} />
                </div>
                <span className="portalstatus">{studentProfile.progressPercent}% complete</span>
              </>
            ) : (
              <>
                <p>Progress is not available yet because verified lesson completion and package entitlement data are not both present.</p>
                <span className="portalstatus">Awaiting verified records</span>
              </>
            )}
            <p>{lessons.length} lesson record{lessons.length === 1 ? "" : "s"} retrieved from Wix CMS.</p>
            <h4>Lesson history</h4>
            {lessonsMessage ? <p>{lessonsMessage}</p> : (
              <ul className="portal-lesson-list">
                {lessons.slice(0, 5).map((lesson) => (
                  <li key={lesson.id}>
                    <strong>{lesson.lessonType || "Driving lesson"}</strong>
                    <span>{lesson.startedAt && !Number.isNaN(Date.parse(String(lesson.startedAt)))
                      ? new Date(String(lesson.startedAt)).toLocaleDateString()
                      : "Date not recorded"}</span>
                    <span className="portalstatus">{lesson.status || "Status not recorded"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dash">
            <Icon n="wallet" s={24} />
            <h3>Packages & enrollment</h3>
            {enrollmentMessage ? <p>{enrollmentMessage}</p> : (
              <ul className="portal-lesson-list">
                {enrollments.slice(0, 3).map((enrollment) => (
                  <li key={enrollment.id}>
                    <strong>{enrollment.planName || "Wix pricing plan"}</strong>
                    <span className="portalstatus">Enrollment: {enrollment.status.replace(/_/g, " ").toLowerCase()} · Payment: {enrollment.paymentStatus.replace(/_/g, " ").toLowerCase()}</span>
                    {enrollment.startDate && <span>Starts: {new Date(enrollment.startDate).toLocaleDateString()}</span>}
                    {enrollment.endDate && <span>Ends: {new Date(enrollment.endDate).toLocaleDateString()}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dash portal-learning-materials">
            <Icon n="book" s={24} />
            <h3>Learning materials</h3>
            {learningMaterialsMessage ? <p>{learningMaterialsMessage}</p> : (
              <div className="portal-learning-video-grid">
                {learningVideos.map((video) => (
                  <article className="portal-learning-video" key={video.key}>
                    <h4>{video.title || "Student learning video"}</h4>
                    <VideoEmbed url={video.url} title={video.title || "Student learning video"} />
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        {studentProfile && (
          <div className="panel dashboardpanel">
            <div>
              <span className="ey">Learner profile</span>
              {studentProfile.coverPhotoUrl && (
                <img className="portal-profile-cover" src={studentProfile.coverPhotoUrl} alt="" loading="lazy" />
              )}
              {studentProfile.profilePhotoUrl && (
                <img className="portal-profile-photo" src={studentProfile.profilePhotoUrl} alt="" loading="lazy" />
              )}
              <h2>{studentProfile.fullName || "Student profile"}</h2>
              {profileMessage && !isEditingProfile && <p className="portal-profile-form-message" role="status">{profileMessage}</p>}
              <p>{studentProfile.phone || "No phone number saved"}</p>
              <p>{assignedInstructorName ? `Instructor: ${assignedInstructorName}` : "Instructor assignment is not available in booking records yet."}</p>
              {studentProfile.transmission && (
                <p>{studentProfile.transmission === "either"
                  ? "Manual or automatic"
                  : studentProfile.transmission === "manual" ? "Manual" : "Automatic"}</p>
              )}
            </div>
            <div className="dashboardpanelactions">
              <button className="btn light" onClick={() => setIsEditingProfile(true)}>Edit profile</button>
              <button className="btn red" onClick={() => navigate("/booking")}>
                Book a lesson <Icon n="arrow" />
              </button>
            </div>
          </div>
        )}

        {!studentProfile && (
          <div className="panel dashboardpanel">
            <div>
              <span className="ey">Next stage</span>
              <h2>Your account is connected.</h2>
              <p>{profileMessage}</p>
            </div>
            <div className="dashboardpanelactions">
              <button className="btn light" onClick={() => setIsEditingProfile(true)}>Complete profile</button>
              <button className="btn red" onClick={() => navigate("/booking")}>
                Book a lesson <Icon n="arrow" />
              </button>
            </div>
          </div>
        )}
        {isEditingProfile && (
          <section className="panel portal-profile-editor" aria-labelledby="portal-profile-editor-title">
            <div className="portal-profile-editor-heading">
              <div>
                <span className="ey">Personal information</span>
                <h2 id="portal-profile-editor-title">{studentProfile ? "Edit your profile" : "Complete your student profile"}</h2>
                <p>These details are saved to your own FullData record. Your sign-in email is managed by Wix and cannot be changed here.</p>
              </div>
              {studentProfile && <button type="button" className="btn light" onClick={() => setIsEditingProfile(false)} disabled={isSavingProfile}>Cancel</button>}
            </div>
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
              <label className="portal-profile-form-wide">
                Profile image URL
                <input type="text" inputMode="url" placeholder="https://… or a Wix image URL" value={profileDraft.profilePhotoUrl} onChange={(event) => setProfileDraft((draft) => ({ ...draft, profilePhotoUrl: event.target.value }))} />
                <small>Use a public HTTPS image URL or a Wix Media image URL. Direct file upload is not enabled in this version.</small>
              </label>
              {profileDraft.profilePhotoUrl.trim() && (
                <div className="portal-profile-preview portal-profile-form-wide">
                  <img src={profileDraft.profilePhotoUrl.trim().startsWith("wix:image://v1/") ? studentProfile?.profilePhotoUrl || "" : profileDraft.profilePhotoUrl} alt="Profile image preview" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
                  <span>Image preview</span>
                </div>
              )}
              {profileMessage && <p className="portal-profile-form-message portal-profile-form-wide" role="status">{profileMessage}</p>}
              <div className="portal-profile-form-actions portal-profile-form-wide">
                <button type="submit" className="btn red" disabled={isSavingProfile}>{isSavingProfile ? "Saving…" : "Save profile"} <Icon n="arrow" /></button>
                {studentProfile && <button type="button" className="btn light" onClick={() => setIsEditingProfile(false)} disabled={isSavingProfile}>Cancel</button>}
              </div>
            </form>
          </section>
        )}
      </div>
    </section>
  );
}


function StudentPortalSkeleton() {
  return (
    <section className="page portal portal-skeleton-page" aria-busy="true" aria-label="Loading student profile">
      <div className="container dashboard portal-skeleton">
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
            <span className="portal-skeleton-line portal-skeleton-copy" />
            <span className="portal-skeleton-line portal-skeleton-copy portal-skeleton-copy-short" />
          </div>
          <div className="portal-skeleton-card">
            <span className="portal-skeleton-icon" />
            <span className="portal-skeleton-line portal-skeleton-card-title" />
            <span className="portal-skeleton-line portal-skeleton-copy" />
            <span className="portal-skeleton-progress" />
            <span className="portal-skeleton-line portal-skeleton-copy portal-skeleton-copy-short" />
          </div>
          <div className="portal-skeleton-card">
            <span className="portal-skeleton-icon" />
            <span className="portal-skeleton-line portal-skeleton-card-title" />
            <span className="portal-skeleton-line portal-skeleton-copy" />
            <span className="portal-skeleton-line portal-skeleton-copy" />
            <span className="portal-skeleton-line portal-skeleton-copy portal-skeleton-copy-short" />
          </div>
        </div>

        <div className="portal-skeleton-profile">
          <div>
            <span className="portal-skeleton-line portal-skeleton-label" />
            <span className="portal-skeleton-line portal-skeleton-profile-title" />
            <span className="portal-skeleton-line portal-skeleton-copy portal-skeleton-copy-medium" />
          </div>
          <span className="portal-skeleton-line portal-skeleton-book-button" />
        </div>
        <span className="portal-skeleton-screen-reader">Loading your BSDA student profile…</span>
      </div>
    </section>
  );
}

