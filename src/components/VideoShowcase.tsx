import { useEffect, useMemo, useState } from "react";
import { getHomeFeaturedVideo } from "../services/videoLibraryService";

function getYouTubeId(value: string) {
  const input = value.trim();
  if (!input) return "";

  try {
    const url = new URL(input);
    let id = "";

    if (url.hostname === "youtu.be" || url.hostname === "www.youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (
      ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(
        url.hostname,
      )
    ) {
      if (url.pathname === "/watch") {
        id = url.searchParams.get("v") || "";
      } else if (
        url.pathname.startsWith("/embed/") ||
        url.pathname.startsWith("/shorts/") ||
        url.pathname.startsWith("/live/")
      ) {
        id = url.pathname.split("/").filter(Boolean)[1] || "";
      }
    }

    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
  } catch {
    return "";
  }
}

export function VideoShowcase() {
  const [url, setUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("Inside the learning journey");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;

    getHomeFeaturedVideo()
      .then((video) => {
        if (!active) return;
        setUrl(video?.videoUrl?.trim() || "");
        setVideoTitle(video?.title?.trim() || "Inside the learning journey");
      })
      .catch((error) => {
        // Keep details in the developer console; don't expose request metadata.
        console.error("Unable to load the BSDA featured video from Wix CMS.", error);
        if (active) {
          setUrl("");
          setLoadError(true);
        }
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
          <h3>
            {loadError
              ? "We couldn't load the academy video."
              : "The academy video is coming soon."}
          </h3>
          <p>
            {loadError
              ? "Please try again later. If this continues, check the browser console and Wix VideoLibrary collection permissions."
              : "Add an active, featured full video to the VideoLibrary collection with the section key home-featured."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="video videoYoutube">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&playsinline=1`}
        title={videoTitle}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
      <div className="videoYoutubeLabel">
        <span>BSDA VIDEO</span>
        <b>{videoTitle}</b>
      </div>
    </div>
  );
}
