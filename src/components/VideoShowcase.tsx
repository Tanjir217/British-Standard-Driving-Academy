import { useEffect, useMemo, useState } from "react";
import { getSiteContent } from "../services/siteContentService";

function getYouTubeId(value: string) {
  const input = value.trim();
  if (!input) return "";

  try {
    const url = new URL(input);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      if (url.pathname === "/watch") return url.searchParams.get("v") || "";
      if (url.pathname.startsWith("/embed/")) return url.pathname.split("/embed/")[1]?.split("/")[0] || "";
      if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/shorts/")[1]?.split("/")[0] || "";
      if (url.pathname.startsWith("/live/")) return url.pathname.split("/live/")[1]?.split("/")[0] || "";
    }
  } catch {
    return input;
  }

  return input;
}

export function VideoShowcase() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getSiteContent()
      .then((content) => {
        if (active) setUrl(content["home-featured-video"]?.url || "");
      })
      .catch(() => {
        if (active) setUrl(import.meta.env.VITE_BSDA_YOUTUBE_VIDEO_URL || "");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const youtubeId = useMemo(() => getYouTubeId(url), [url]);

  if (loading) {
    return (
      <div className="video videoYoutube videoYoutubeEmpty">
        <div className="videoYoutubeMessage">
          <span>BSDA VIDEO</span>
          <h3>Loading academy video...</h3>
        </div>
      </div>
    );
  }

  if (!youtubeId) {
    return (
      <div className="video videoYoutube videoYoutubeEmpty">
        <div className="videoYoutubeMessage">
          <span>BSDA VIDEO</span>
          <h3>Add the academy video from Admin → Content.</h3>
          <p>
            Choose <b>Home featured video</b> in the admin panel and paste the
            YouTube URL. The homepage updates from the saved content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="video videoYoutube">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&playsinline=1`}
        title="BSDA driving lessons video"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
      <div className="videoYoutubeLabel">
        <span>BSDA VIDEO</span>
        <b>Inside the learning journey</b>
      </div>
    </div>
  );
}
