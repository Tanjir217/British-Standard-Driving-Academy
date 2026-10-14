import { useEffect, useMemo, useRef, useState } from "react";
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
  const [inViewport, setInViewport] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    let active = true;

    getHomeFeaturedVideo()
      .then((video) => {
        if (!active) return;
        setUrl(video?.videoUrl?.trim() || "");
        setVideoTitle(video?.title?.trim() || "Inside the learning journey");
      })
      .catch((error) => {
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

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setInViewport(entry.isIntersecting && entry.intersectionRatio >= 0.35),
      { threshold: [0, 0.35, 0.6] },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const youtubeId = useMemo(() => getYouTubeId(url), [url]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !youtubeId) return;

    // The iframe API accepts these commands from the embedding page.
    // Autoplay is muted for browser autoplay-policy compatibility.
    const command = inViewport ? "playVideo" : "pauseVideo";
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: command, args: [] }),
      "https://www.youtube-nocookie.com",
    );
  }, [inViewport, youtubeId]);

  const embedUrl = youtubeId
    ? `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=${inViewport ? 1 : 0}&mute=1&controls=0&playsinline=1&rel=0&iv_load_policy=3&disablekb=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}`
    : "";

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
    <div ref={sectionRef} className="video videoYoutube">
      {inViewport ? (
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title={videoTitle}
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen={false}
        />
      ) : (
        <div className="videoYoutubeAutoplayPlaceholder" aria-label={videoTitle} />
      )}
      <div className="videoYoutubeLabel">
        <span>BSDA VIDEO</span>
        <b>{videoTitle}</b>
      </div>
    </div>
  );
}
