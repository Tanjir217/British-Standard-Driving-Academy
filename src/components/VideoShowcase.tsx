import { useMemo } from "react";

function getYouTubeId(value: string) {
  const input = value.trim();
  if (!input) return "";

  try {
    const url = new URL(input);

    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1).split("/")[0];
    }

    if (url.hostname === "youtube.com" || url.hostname === "www.youtube.com" || url.hostname === "m.youtube.com") {
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
  const youtubeId = useMemo(
    () => getYouTubeId(import.meta.env.VITE_BSDA_YOUTUBE_VIDEO_URL || ""),
    [],
  );

  if (!youtubeId) {
    return (
      <div className="video videoYoutube videoYoutubeEmpty">
        <div className="videoYoutubeMessage">
          <span>YOUTUBE VIDEO</span>
          <h3>Add the BSDA YouTube video URL</h3>
          <p>
            Set <code>VITE_BSDA_YOUTUBE_VIDEO_URL</code> in the site environment
            and the player will load automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="video videoYoutube">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`}
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
