import { useState } from "react";
import { Icon } from "./Icon";
export function VideoShowcase() {
  const [err, setErr] = useState(false);
  return (
    <div className="video">
      {!err ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          onError={() => setErr(true)}
          src="https://cdn.coverr.co/videos/coverr-a-car-driving-on-a-road-1576/1080p.mp4"
        />
      ) : (
        <div className="animated">
          <div className="animroad">
            <i />
            <i />
          </div>
          <div className="animcar" />
        </div>
      )}
      <div className="videooverlay">
        <span>
          <Icon n="play" s={17} />
        </span>
        <div>
          <small>Inside the learning journey</small>
          <b>Learn with calm, controlled confidence.</b>
        </div>
      </div>
      {err && (
        <a
          href="https://coverr.co/stock-video-footage/car-driving"
          target="_blank"
          rel="noreferrer"
          className="videosource"
        >
          Browse driving footage →
        </a>
      )}
    </div>
  );
}
