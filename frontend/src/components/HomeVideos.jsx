import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Volume2, VolumeX } from "lucide-react";
import "../Style/HomeVideos.css";

const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

// One video card: plays only while on screen (saves data on phones).
function VideoCard({ video }) {
  const ref = useRef(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || !("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) element.play().catch(() => {});
        else element.pause();
      },
      { threshold: 0.35 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const body = (
    <>
      <video ref={ref} src={video.url} muted={muted} loop playsInline preload="metadata" />
      <button
        type="button"
        className="hv-sound"
        aria-label={muted ? "Turn sound on" : "Turn sound off"}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setMuted((value) => !value);
        }}
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
      {(video.caption || video.productSlug) && (
        <span className="hv-caption">
          {video.caption || "SHOP THIS"}
          {video.productSlug && <ArrowUpRight size={15} />}
        </span>
      )}
    </>
  );

  return video.productSlug ? (
    <Link to={`/product/${video.productSlug}`} className="hv-card">{body}</Link>
  ) : (
    <div className="hv-card">{body}</div>
  );
}

export default function HomeVideos() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/store/homepage`)
      .then((response) => (response.ok ? response.json() : null))
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data?.enabled || !data.videos?.length) return null;

  return (
    <section className="hv-section">
      <div className="hv-heading">
        <div>
          <span className="hv-eyebrow"><i /> {data.eyebrow}</span>
          <h2>{data.title}</h2>
        </div>
        <p>{data.subtitle}</p>
      </div>
      <div className="hv-row">
        {data.videos.map((video) => (
          <VideoCard key={video.url} video={video} />
        ))}
      </div>
    </section>
  );
}
