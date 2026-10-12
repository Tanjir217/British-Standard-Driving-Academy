import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { VideoEmbed } from "../components/VideoEmbed";
import { getSiteContent, type SiteContentMap } from "../services/siteContentService";

import "../styles/portal-profile.css";
import {
  getCurrentMember,
  signOutMember,
  beginManagedMemberLogin,
} from "../services/auth/authService";
import { studentService } from "../services/students/studentService";
import type { Student } from "../services/domain/types";

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
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [learningVideos, setLearningVideos] = useState<string[]>([]);

  const [studentProfile, setStudentProfile] = useState<StudentProfileApiRecord | null>(null);
  const [profileMessage, setProfileMessage] = useState("");
  const [managedLoginRequired, setManagedLoginRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullDataDebug, setFullDataDebug] = useState<{
    ok: boolean;
    collectionId?: string;
    returnedRecords?: number;
    matchedBy?: string | null;
    matched?: boolean;
    records?: Array<Record<string, unknown>>;
    message?: string;
    errorMessage?: string;
  } | null>(null);
  const [fullDataDebugLoading, setFullDataDebugLoading] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      getCurrentMember(),
      getSiteContent().catch(() => ({} as SiteContentMap)),
      studentService.getCurrent(),
    ])
      .then(([currentMember, content, studentResult]) => {
    async function loadPortal() {
      try {
        const currentMember = await getCurrentMember();
        if (!active) return;

        if (!currentMember) {
          navigate("/login?returnTo=" + encodeURIComponent("/portal"), { replace: true });
          return;
        }

        setMember({
          loginEmail: currentMember.loginEmail,
          contact: currentMember.contact
            ? {
                firstName: currentMember.contact.firstName ?? undefined,
                lastName: currentMember.contact.lastName ?? undefined,
              }
            : undefined,
        });

        if (studentResult.ok) {
          setStudentProfile(studentResult.data);

          // Log only in development, after the protected Wix endpoint returns
          // the current member's own profile. Avoid logging contact details.
          if (import.meta.env.DEV) {
            console.info("[BSDA] Backend student profile loaded", {
              id: studentResult.data.id,
              memberId: studentResult.data.memberId,
              fullName: studentResult.data.fullName,
              status: studentResult.data.status,
              transmission: studentResult.data.transmission,
              lessonsCompleted: studentResult.data.lessonsCompleted,
              lessonsRemaining: studentResult.data.lessonsRemaining,
              progressPercent: studentResult.data.progressPercent,
            });
          }
        } else if (import.meta.env.DEV) {
          console.warn("[BSDA] Backend student profile unavailable", {
            code: studentResult.error.code,
            message: studentResult.error.message,
          });
        }
        setLearningVideos(
          Array.from(
            { length: 6 },
            (_, index) => content["portal-video-" + (index + 1)]?.url || "",
          ).filter(Boolean),
        );
      })
      .catch((err) => {

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

        // Temporary local diagnostic: use the contactId attached to the current
        // Wix member profile. This path deliberately does not use member IDs.
        const memberWithContactId = currentMember as typeof currentMember & {
          contactId?: string | null;
          contact?: { contactId?: string | null; firstName?: string; lastName?: string; phones?: string[] } | null;
        };
        const contactId = String(
          memberWithContactId.contactId ?? memberWithContactId.contact?.contactId ?? "",
        ).trim();

        if (import.meta.env.DEV) {
          setFullDataDebugLoading(true);
          if (!contactId) {
            setFullDataDebug({
              ok: false,
              errorMessage: "The current Wix member response does not contain contactId. No member ID or email fallback was used.",
              message: "CONTACT_ID_MISSING",
            });
            setFullDataDebugLoading(false);
          } else {
            fetch("/api/debug/full-data?contactId=" + encodeURIComponent(contactId), {
              cache: "no-store",
            })
              .then(async (response) => {
                const data = await response.json();
                if (active) setFullDataDebug(data);
              })
              .catch((debugError) => {
                if (active) {
                  setFullDataDebug({
                    ok: false,
                    errorMessage: debugError instanceof Error ? debugError.message : "Diagnostic request failed",
                  });
                }
              })
              .finally(() => {
                if (active) setFullDataDebugLoading(false);
              });
          }
        }

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

  const firstName = member?.contact?.firstName?.trim();
  const displayName = studentProfile?.fullName?.trim() || firstName || "learner";
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

        {import.meta.env.DEV && (
          <section
            aria-label="Temporary FullData CMS diagnostic"
            style={{
              marginTop: 24,
              padding: 20,
              border: "2px dashed #d97706",
              borderRadius: 12,
              background: "#fffaf0",
              color: "#1f2937",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <span className="ey" style={{ color: "#92400e" }}>Temporary developer diagnostic</span>
                <h2 style={{ margin: "6px 0" }}>Raw Wix FullData CMS values</h2>
                <p style={{ margin: 0, fontSize: 14 }}>
                  Local development only. This panel independently queries FullData and displays only the row matched to your signed-in Wix account.
                </p>
              </div>
              <button
                className="btn light"
                onClick={() => {
                  setFullDataDebug(null);
                  setFullDataDebugLoading(true);
                  const currentContactId = String(
                    (member as MemberSummary & {
                      contactId?: string | null;
                      contact?: { contactId?: string | null };
                    } | null)?.contactId ?? member?.contact?.contactId ?? "",
                  ).trim();
                  if (!currentContactId) {
                    setFullDataDebug({
                      ok: false,
                      errorMessage: "The current Wix member response does not contain contactId.",
                    });
                    setFullDataDebugLoading(false);
                    return;
                  }
                  fetch("/api/debug/full-data?contactId=" + encodeURIComponent(currentContactId), {
                    cache: "no-store",
                  })
                    .then(async (response) => {
                      const data = await response.json();
                      setFullDataDebug(data);
                    })
                    .catch((debugError) => setFullDataDebug({
                      ok: false,
                      errorMessage: debugError instanceof Error ? debugError.message : "Diagnostic request failed",
                    }))
                    .finally(() => setFullDataDebugLoading(false));
                }}
              >
                Refresh CMS data
              </button>
            </div>
            {fullDataDebugLoading ? (
              <p>Loading FullData CMS records…</p>
            ) : fullDataDebug?.ok ? (
              <>
                <p style={{ margin: "12px 0", fontSize: 13 }}>
                  Collection: <strong>{fullDataDebug.collectionId}</strong> · Your matching records: <strong>{fullDataDebug.returnedRecords}</strong> · Matched by: <strong>{String((fullDataDebug as typeof fullDataDebug & { matchedBy?: string | null })?.matchedBy || "not found")}</strong>
                </p>
                <pre
                  style={{
                    margin: 0,
                    padding: 16,
                    maxHeight: 520,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    background: "#111827",
                    color: "#e5e7eb",
                    borderRadius: 8,
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >{JSON.stringify(fullDataDebug.records ?? [], null, 2)}</pre>
                <p style={{ margin: "10px 0 0", fontSize: 12, color: "#92400e" }}>
                  This temporary panel is local-development-only and returns only the matched record for your authenticated account. Remove it after diagnosis.
                </p>
              </>
            ) : (
              <p role="alert" style={{ color: "#b91c1c" }}>
                {fullDataDebug?.errorMessage || fullDataDebug?.message || "Could not load the FullData diagnostic response."}
              </p>
            )}
          </section>
        )}

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

        <section className="portalLearningVideos">
          <div className="sectionIntro">
            <div className="heading">
              <span className="ey">Learning resources</span>
              <h2>Training videos from BSDA.</h2>
              <p>Watch the latest learning materials added by the academy team.</p>
            </div>
          </div>
          {learningVideos.length ? (
            <div className="portalVideoGrid">
              {learningVideos.map((url, index) => (
                <article className="portalVideoCard" key={url + index}>
                  <div className="portalVideoFrame">
                    <VideoEmbed url={url} title={"BSDA learning video " + (index + 1)} />
                  </div>
                  <span>LEARNING VIDEO {String(index + 1).padStart(2, "0")}</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="panel portalVideoEmpty">
              <span className="ey">Learning resources</span>
              <h3>Your training videos will appear here.</h3>
              <p>The academy team can add videos from Admin → Content → Student Portal.</p>
            </div>
          )}
        </section>

        <div className="panel dashboardpanel">
          <div>
            <span className="ey">Next stage</span>
            <h2>Your account foundation is ready.</h2>
            <p>
              The next backend layer will connect your Wix member account to
              your Student Profile, bookings, lesson records, progress and
              learning resources.
            </p>
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
