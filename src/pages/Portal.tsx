import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { VideoEmbed } from "../components/VideoEmbed";
import { getSiteContent, type SiteContentMap } from "../services/siteContentService";
import {
  getCurrentMember,
  signOutMember,
} from "../services/auth/authService";

type MemberSummary = {
  loginEmail?: string | null;
  contact?: {
    firstName?: string;
    lastName?: string;
  };
};

export function Portal() {
  const navigate = useNavigate();
  const [member, setMember] = useState<MemberSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [learningVideos, setLearningVideos] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    Promise.all([
      getCurrentMember(),
      getSiteContent().catch(() => ({} as SiteContentMap)),
    ])
      .then(([currentMember, content]) => {
        if (!active) return;

        if (!currentMember) {
          navigate(
            "/login?returnTo=" +
              encodeURIComponent("/portal"),
            { replace: true },
          );
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
        setLearningVideos(
          Array.from(
            { length: 6 },
            (_, index) => content["portal-video-" + (index + 1)]?.url || "",
          ).filter(Boolean),
        );
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "We couldn't load your account.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

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
  const displayName = firstName || "learner";

  return (
    <section className="page portal">
      <div className="container dashboard">
        <div className="dashhead">
          <div>
            <span className="ey">Student dashboard</span>
            <h1>Good to see you, {displayName}.</h1>
            <p className="dashboardemail">
              {member?.loginEmail || "Your BSDA member account"}
            </p>
          </div>
          <button
            className="btn light"
            onClick={() => void signOutMember()}
          >
            Sign out
          </button>
        </div>

        <div className="dashgrid">
          <div className="dash darkdash">
            <span className="ey">Account status</span>
            <strong>Active</strong>
            <p>
              Your BSDA member account is connected. Student training data will
              appear here once your learner profile is linked.
            </p>
          </div>

          <PortalCard
            icon="calendar"
            title="Lessons & bookings"
            text="Your upcoming and completed lessons will be connected to the BSDA booking system here."
          />

          <PortalCard
            icon="car"
            title="Learning progress"
            text="Your instructor progress, completed lessons and next learning targets will appear here."
          />

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
          </div>
          <button className="btn red" onClick={() => navigate("/booking")}>
            Book a lesson <Icon n="arrow" />
          </button>
        </div>
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
