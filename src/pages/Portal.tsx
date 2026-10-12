import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import "../styles/portal-profile.css";
import {
  getCurrentMember,
  signOutMember,
  beginManagedMemberLogin,
} from "../services/auth/authService";
import {
  createStudentProfile,
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
          },
        };
        setMember(summary);

        // Profile data comes only from the protected server endpoint. If no
        // profile exists, provision it from the authenticated member's contact
        // details; the endpoint derives the actual member ID from the session.
        try {
          let response = await getStudentProfile();
          if (response.profileState === "missing" || !response.profile) {
            const firstName = summary.contact?.firstName?.trim() || "";
            const lastName = summary.contact?.lastName?.trim() || "";
            if (firstName && lastName) {
              response = await createStudentProfile({
                firstName,
                lastName,
                phone: summary.contact?.phones?.[0] || "",
              });
            }
          }

          if (!active) return;
          if (response.profile) {
            setStudentProfile(response.profile);
            setProfileMessage("Your student profile is saved in the academy system.");
          } else {
            setProfileMessage("Your account is signed in, but profile setup is pending. Please contact the academy if this continues.");
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
    return (
      <section className="page portal">
        <div className="container authloading">
          <span className="ey">Student portal</span>
          <h1>Loading your account...</h1>
          <p>Please wait while we securely restore your session.</p>
        </div>
      </section>
    );
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
            <p>{profileMessage || "Checking your saved student profile."}</p>
          </div>

          <PortalCard
            icon="calendar"
            title="Lessons & bookings"
            text="Your upcoming and completed lessons will be connected to the BSDA booking system here."
          />

          <div className="dash">
            <Icon n="car" s={24} />
            <h3>Learning progress</h3>
            {studentProfile ? (
              <>
                <p>{studentProfile.lessonsCompleted} lessons completed · {studentProfile.lessonsRemaining} remaining</p>
                <div className="portalprogress" role="progressbar" aria-valuenow={studentProfile.progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Learning progress">
                  <span style={{ width: `${studentProfile.progressPercent}%` }} />
                </div>
                <span className="portalstatus">{studentProfile.progressPercent}% complete</span>
              </>
            ) : (
              <>
                <p>Your instructor progress, completed lessons and next learning targets will appear here.</p>
                <span className="portalstatus">Waiting for learner profile</span>
              </>
            )}
          </div>

          <PortalCard
            icon="book"
            title="Learning materials"
            text="Theory practice, preparation resources and training videos will be available here."
          />
        </div>

        {studentProfile && (
          <div className="panel dashboardpanel">
            <div>
              <span className="ey">Learner profile</span>
              <h2>{studentProfile.fullName}</h2>
              <p>
                {studentProfile.phone || "No phone number saved"}
                {" · "}
                {studentProfile.transmission === "either"
                  ? "Manual or automatic"
                  : studentProfile.transmission === "manual" ? "Manual" : "Automatic"}
              </p>
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
