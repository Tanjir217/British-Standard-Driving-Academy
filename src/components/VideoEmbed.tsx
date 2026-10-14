import { useEffect, useMemo, useRef, useState } from "react";

function getYouTubeId(value: string) {
  try {
    const url = new URL(value);
    if (["youtu.be", "www.youtu.be"].includes(url.hostname)) return url.pathname.slice(1).split("/")[0];
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(url.hostname)) {
      if (url.pathname === "/watch") return url.searchParams.get("v") || "";
      if (url.pathname.startsWith("/embed/")) return url.pathname.split("/embed/")[1]?.split("/")[0] || "";
      if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/shorts/")[1]?.split("/")[0] || "";
      if (url.pathname.startsWith("/live/")) return url.pathname.split("/live/")[1]?.split("/")[0] || "";
    }
  } catch {}
  return "";
}

function getTikTokId(value: string) {
  const match = value.match(/\/video\/(\d+)/);
  return match?.[1] || "";
}

function getInstagramEmbed(value: string) {
  const match = value.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
  if (!match) return "";
  return `https://www.instagram.com/${match[1]}/${match[2]}/embed/`;
}

export function getVideoEmbedUrl(value: string) {
  const input = value.trim();
  if (!input) return "";

  const youtubeId = getYouTubeId(input);
  if (youtubeId) return `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&playsinline=1`;

  const tikTokId = getTikTokId(input);
  if (tikTokId) return `https://www.tiktok.com/player/v1/${tikTokId}?controls=1&description=0&music_info=0`;

  const instagramEmbed = getInstagramEmbed(input);
  if (instagramEmbed) return instagramEmbed;

  if (input.includes("facebook.com/") || input.includes("fb.watch/")) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(input)}&show_text=false&autoplay=false`;
  }

  return "";
}

export function getVideoProvider(value: string) {
  const input = value.toLowerCase();
  if (input.includes("youtube.com") || input.includes("youtu.be")) return "YouTube";
  if (input.includes("tiktok.com")) return "TikTok";
  if (input.includes("instagram.com")) return "Instagram";
  if (input.includes("facebook.com") || input.includes("fb.watch")) return "Facebook";
  return "Video";
}

export function VideoEmbed({
  url,
  title,
  className = "",
  autoPlayWhenVisible = false,
  onEnded,
}: {
  url: string;
  title: string;
  className?: string;
  /** Automatically play muted YouTube embeds while the iframe is in view. */
  autoPlayWhenVisible?: boolean;
  /** Called when the embedded YouTube video reaches its natural end. */
  onEnded?: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const embedUrl = getVideoEmbedUrl(url);
  const isYouTube = Boolean(getYouTubeId(url));

  useEffect(() => {
    if (!autoPlayWhenVisible) return;
    const iframe = iframeRef.current;
    if (!iframe || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.35),
      { threshold: [0, 0.35, 0.6] },
    );
    observer.observe(iframe);
    return () => observer.disconnect();
  }, [autoPlayWhenVisible, url]);

  const effectiveEmbedUrl = useMemo(() => {
    if (!embedUrl || !autoPlayWhenVisible || !isYouTube) return embedUrl;
    const target = new URL(embedUrl);
    target.searchParams.set("autoplay", isVisible ? "1" : "0");
    target.searchParams.set("mute", "1");
    target.searchParams.set("playsinline", "1");
    target.searchParams.set("controls", "0");
    target.searchParams.set("enablejsapi", "1");
    if (typeof window !== "undefined") target.searchParams.set("origin", window.location.origin);
    return target.toString();
  }, [embedUrl, autoPlayWhenVisible, isYouTube, isVisible]);

  useEffect(() => {
    if (!isYouTube || !onEnded) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const subscribeToPlayerState = () => {
      iframe.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "addEventListener",
          args: ["onStateChange"],
        }),
        "*",
      );
    };

    const handlePlayerMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow || typeof event.data !== "string") return;
      try {
        const message = JSON.parse(event.data) as { event?: string; info?: number | string };
        if (message.event === "onStateChange" && Number(message.info) === 0) onEnded();
      } catch {
        // Ignore unrelated YouTube player messages.
      }
    };

    iframe.addEventListener("load", subscribeToPlayerState);
    window.addEventListener("message", handlePlayerMessage);
    subscribeToPlayerState();

    return () => {
      iframe.removeEventListener("load", subscribeToPlayerState);
      window.removeEventListener("message", handlePlayerMessage);
    };
  }, [isYouTube, onEnded, effectiveEmbedUrl]);

  if (!embedUrl) {
    return (
      <div className={`managedVideoEmpty ${className}`}>
        <span>VIDEO</span>
        <p>Paste a YouTube, TikTok, Facebook or Instagram video URL.</p>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      className={className}
      src={effectiveEmbedUrl}
      title={title}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
      allowFullScreen
    />
  );
}
