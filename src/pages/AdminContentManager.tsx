import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { getSiteContent, saveSiteContent, SiteContentMap } from "../services/siteContentService";
import { getVideoProvider } from "../components/VideoEmbed";

type Section = "home" | "reels" | "portal";

const sections: Array<{ id: Section; label: string; description: string }> = [
  {
    id: "home",
    label: "Home Video",
    description: "Control the large featured video shown on the Home page.",
  },
  {
    id: "reels",
    label: "Social Reels",
    description: "Choose the video URL shown in each of the six short-video boxes.",
  },
  {
    id: "portal",
    label: "Student Portal",
    description: "Publish learning videos that signed-in students can watch.",
  },
];

const keys = {
  home: ["home-featured-video"],
  reels: ["reel-1", "reel-2", "reel-3", "reel-4", "reel-5", "reel-6"],
  portal: ["portal-video-1", "portal-video-2", "portal-video-3", "portal-video-4", "portal-video-5", "portal-video-6"],
} satisfies Record<Section, string[]>;

export function AdminContentManager() {
  const [section, setSection] = useState<Section>("home");
  const [content, setContent] = useState<SiteContentMap>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getSiteContent()
      .then((items) => {
        if (!active) return;
        setContent(items);
        setDrafts(
          Object.fromEntries(
            Object.values(items).map((item) => [item.key, item.url || ""]),
          ),
        );
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "We could not load content.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const activeSection = useMemo(
    () => sections.find((item) => item.id === section) || sections[0],
    [section],
  );

  const updateDraft = (key: string, value: string) => {
    setDrafts((current) => ({ ...current, [key]: value }));
    setMessage("");
    setError("");
  };

  const save = async (key: string, index: number) => {
    setSaving(key);
    setMessage("");
    setError("");

    try {
      const item = await saveSiteContent({
        key,
        url: drafts[key]?.trim() || "",
        title:
          section === "home"
            ? "Home featured video"
            : section === "reels"
              ? "Social reel " + (index + 1)
              : "Student learning video " + (index + 1),
        type: "video",
        enabled: Boolean(drafts[key]?.trim()),
      });

      setContent((current) => ({ ...current, [key]: item }));
      setDrafts((current) => ({ ...current, [key]: item.url || "" }));
      setMessage(
        drafts[key]?.trim()
          ? "Saved successfully. The public site will use the new URL."
          : "Video removed from this slot.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not save this video.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="adminContent">
      <div className="contentManagerIntro">
        <div>
          <span className="adminEyebrow">CONTENT CONTROL</span>
          <h2>Manage what visitors and students see.</h2>
          <p>
            Paste a supported video URL into a slot, save it, and the connected
            page will load the new content without changing the code.
          </p>
        </div>
        <div className="contentManagerBadge">
          <Icon n="check" s={17} />
          CMS connected
        </div>
      </div>

      <div className="contentSectionTabs">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            className={section === item.id ? "active" : ""}
            onClick={() => {
              setSection(item.id);
              setMessage("");
              setError("");
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="contentManagerPanel">
        <div className="adminPanelHead">
          <div>
            <span className="adminEyebrow">{activeSection.label}</span>
            <h2>{activeSection.description}</h2>
          </div>
        </div>

        {loading ? (
          <div className="contentManagerEmpty">Loading managed content...</div>
        ) : (
          <div className="contentSlots">
            {keys[section].map((key, index) => {
              const value = drafts[key] || "";
              const saved = content[key]?.url || "";

              return (
                <article className="contentSlot" key={key}>
                  <div className="contentSlotHead">
                    <div>
                      <span>{section === "home" ? "FEATURED VIDEO" : "VIDEO SLOT " + String(index + 1).padStart(2, "0")}</span>
                      <strong>
                        {saved ? getVideoProvider(saved) + " video" : "No video assigned"}
                      </strong>
                    </div>
                    {saved && <i className="contentSaved">LIVE</i>}
                  </div>

                  <label>
                    Video URL
                    <input
                      type="url"
                      value={value}
                      placeholder="https://www.youtube.com/watch?v=..."
                      onChange={(event) => updateDraft(key, event.target.value)}
                    />
                  </label>

                  <div className="contentSlotActions">
                    <small>
                      YouTube, TikTok, Facebook and Instagram URLs are supported.
                    </small>
                    <button
                      type="button"
                      className="btn red"
                      disabled={saving === key}
                      onClick={() => void save(key, index)}
                    >
                      {saving === key ? "Saving..." : value.trim() ? "Save video" : "Remove video"}
                      <Icon n="check" s={15} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {message && <div className="contentManagerNotice success">{message}</div>}
        {error && <div className="contentManagerNotice error">{error}</div>}
      </div>

      <div className="contentManagerNote">
        <strong>Important:</strong> content changes are stored in the Wix
        <code>SiteContent</code> collection. The collection should be created
        with read access for the site and admin-only write access.
      </div>
    </section>
  );
}
