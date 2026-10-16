import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import "../styles/portal-profile.css";
import { lessonService, type StudentLessonRecord } from "../services/lessons/lessonService";
import {
  getCurrentMember,
  signOutMember,
  beginManagedMemberLogin,
} from "../services/auth/authService";
import {
  getStudentProfile,
  type StudentProfileApiRecord,
  StudentProfileApiError,
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

type PendingIdentity = { email?: string; firstName?: string; lastName?: string; phone?: string };

function readPendingIdentity(): PendingIdentity {
  try {
    const raw = sessionStorage.getItem("bsda.pending.member.identity");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PendingIdentity;
    return {
      email: typeof parsed.email === "string" ? parsed.email : "",
      firstName: typeof parsed.firstName === "string" ? parsed.firstName : "",
      lastName: typeof parsed.lastName === "string" ? parsed.lastName : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
    };
  } catch {
    return {};
  }
}

export function Portal() {
  const navigate = useNavigate();
  const [member, setMember] = useState<MemberSummary | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfileApiRecord | null>(null);
  const [profileMessage, setProfileMessage] = useState("");
  const [managedLoginRequired, setManagedLoginRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lessons, setLessons] = useState<StudentLessonRecord[]>([]);
  const [lessonsMessage, setLessonsMessage] = useState("Loading lesson records…");

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

        const pendingIdentity = readPendingIdentity();
        const memberRecord = currentMember as typeof currentMember & {
          email?: string | null;
          profile?: { nickname?: string | null; photo?: { url?: string | null } | null };
          contact?: (typeof currentMember.contact & { contactId?: string | null }) | null;
          contactId?: string | null;
        };
        const summary: MemberSummary = {
          loginEmail: currentMember.loginEmail || memberRecord.email || pendingIdentity.email || null,
          email: memberRecord.email || pendingIdentity.email || null,
          profile: memberRecord.profile,
          contact: {
            firstName: currentMember.contact?.firstName || pendingIdentity.firstName || undefined,
            lastName: currentMember.contact?.lastName || pendingIdentity.lastName || undefined,
            phones: currentMember.contact?.phones?.length
              ? currentMember.contact.phones
              : pendingIdentity.phone ? [pendingIdentity.phone] : undefined,
            contactId: memberRecord.contact?.contactId ?? memberRecord.contactId ?? null,
          },
        };
        setMember(summary);

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
            setProfileMessage("Your Wix member profile was loaded from FullData.");
          } else {
            setProfileMessage("Your Wix account is signed in, but no matching FullData record was found. Please check the CMS collection and the loginEmail/contactId field values.");
          }
        } catch (profileError) {
          if (!active) return;
          if (profileError instanceof StudentProfileApiError && profileError.status === 401) {
            setManagedLoginRequired(true);
            setProfileMessage("Your current sign-in is not connected to the Wix-managed session required for secure profile access. Continue with Wix secure sign-in to finish connecting your portal.");
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
            <h3>Lesson records</h3>
            {lessonsMessage ? (
              <p role={lessonsMessage.toLowerCase().includes("could not") || lessonsMessage.toLowerCase().includes("failed") ? "alert" : undefined}>{lessonsMessage}</p>
            ) : (
              <ul className="portal-lesson-list">
                {lessons.slice(0, 5).map((lesson) => (
                  <li key={lesson.id}>
                    <strong>{lesson.lessonType || "Driving lesson"}</strong>
                    <span>{lesson.startedAt && !Number.isNaN(Date.parse(String(lesson.startedAt)))
                      ? new Date(String(lesson.startedAt)).toLocaleDateString()
                      : "Date not recorded"}</span>
                    <span className="portalstatus">{lesson.status || "Status not recorded"}</span>
                    {lesson.instructorName && <span>Instructor: {lesson.instructorName}</span>}
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
          </div>

          <PortalCard
            icon="book"
            title="Learning materials"
            text="No student learning-material source is configured in the current codebase."
            status="Source not configured"
          />
        </div>

        {studentProfile && (
          <div className="panel dashboardpanel">
            <div>
              <span className="ey">Learner profile</span>
              {studentProfile.profilePhotoUrl && (
                <img className="portal-profile-photo" src={studentProfile.profilePhotoUrl} alt="" loading="lazy" />
              )}
              <h2>{studentProfile.fullName || "Student profile"}</h2>
              <p>{studentProfile.phone || "No phone number saved"}</p>
              {studentProfile.transmission && (
                <p>{studentProfile.transmission === "either"
                  ? "Manual or automatic"
                  : studentProfile.transmission === "manual" ? "Manual" : "Automatic"}</p>
              )}
            </div>
            <button className="btn red" onClick={() => navigate("/booking")}>
              Book a lesson <Icon n="arrow" />
            </button>
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
              {managedLoginRequired && (
                <button className="btn light" onClick={() => beginManagedMemberLogin("/portal")}>
                  Continue with Wix secure sign-in
                </button>
              )}
              <button className="btn red" onClick={() => navigate("/booking")}>
                Book a lesson <Icon n="arrow" />
              </button>
            </div>
          </div>
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

function PortalCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="dash">
      <Icon n={icon} s={24} />
      <h3>{title}</h3>
      <p>{text}</p>
      <span className="portalstatus">Coming with your learner profile</span>
    </div>
  );
}
