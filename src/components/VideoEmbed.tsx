function getYouTubeId(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
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
}: {
  url: string;
  title: string;
  className?: string;
}) {
  const embedUrl = getVideoEmbedUrl(url);

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
      className={className}
      src={embedUrl}
      title={title}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
      allowFullScreen
    />
  );
}
