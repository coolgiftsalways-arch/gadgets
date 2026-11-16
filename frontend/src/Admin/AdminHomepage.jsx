import { useEffect, useRef, useState } from "react";
import { Film, Plus, Save, X, ArrowUp, ArrowDown } from "lucide-react";
import { adminFetch, uploadToCloudinary } from "./api";
import "../Admincss/AdminProducts.css";

const MAX_VIDEOS = 12;

const field = {
  width: "100%",
  height: 44,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid currentColor",
  background: "transparent",
  color: "inherit",
  fontSize: 15,
};

const AdminHomepage = () => {
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [progress, setProgress] = useState(null); // null = not uploading
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    adminFetch("/homepage").then(setData).catch((err) => setError(err.message));
    adminFetch("/products").then((res) => setProducts(res.products)).catch(() => {});
  }, []);

  const set = (patch) => {
    setData((current) => ({ ...current, ...patch }));
    setMessage("");
  };

  const setVideo = (index, patch) =>
    set({ videos: data.videos.map((video, i) => (i === index ? { ...video, ...patch } : video)) });

  const move = (index, step) => {
    const videos = [...data.videos];
    const target = index + step;
    if (target < 0 || target >= videos.length) return;
    [videos[index], videos[target]] = [videos[target], videos[index]];
    set({ videos });
  };

  const upload = async (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    if (!files.length) return;
    setError("");

    let videos = [...data.videos];
    try {
      for (const [index, file] of files.entries()) {
        if (videos.length >= MAX_VIDEOS) break;
        if (!file.type.startsWith("video/")) throw new Error(`${file.name} isn't a video.`);
        if (file.size > 100 * 1024 * 1024) throw new Error(`${file.name} is over 100 MB.`);
        setProgress(`${index + 1}/${files.length} · 0`);
        const url = await uploadToCloudinary(file, "video", (pct) =>
          setProgress(`${index + 1}/${files.length} · ${pct}`),
        );
        if (!url) throw new Error("Video upload needs Cloudinary — add the CLOUDINARY_* settings to the server.");
        videos = [...videos, { url, caption: "", productSlug: "" }];
        set({ videos });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProgress(null);
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      setData(await adminFetch("/homepage", { method: "PUT", body: data }));
      setMessage("Saved — the homepage is updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <div className="gad-products-page"><p>{error || "Loading…"}</p></div>;

  return (
    <div className="gad-products-page">
      <header className="gad-products-header">
        <div>
          <span className="gad-products-eyebrow">GADGETÉ / STOREFRONT</span>
          <h1>HOMEPAGE<span>.</span></h1>
          <p>Videos that play in a row on the front page.</p>
        </div>
        <div className="gad-products-header-actions">
          <button type="button" className="gad-products-add" onClick={save} disabled={saving || progress !== null}>
            <Save size={17} /> {saving ? "SAVING…" : "SAVE"}
          </button>
        </div>
      </header>

      {message && <p className="gad-products-note">{message}</p>}
      {error && <p className="gad-product-form-error">{error}</p>}

      <section className="gad-products-panel" style={{ display: "grid", gap: 14 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
          <input type="checkbox" checked={data.enabled} onChange={(e) => set({ enabled: e.target.checked })} style={{ width: 20, height: 20 }} />
          SHOW THE VIDEO SECTION ON THE HOMEPAGE
        </label>
        <label>SMALL HEADING<input style={field} value={data.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} /></label>
        <label>TITLE<input style={field} value={data.title} onChange={(e) => set({ title: e.target.value })} /></label>
        <label>SUBTITLE<input style={field} value={data.subtitle} onChange={(e) => set({ subtitle: e.target.value })} /></label>
      </section>

      <section className="gad-products-panel">
        <div className="gad-products-panel-heading">
          <div>
            <span className="gad-products-eyebrow">VIDEOS ({data.videos.length}/{MAX_VIDEOS})</span>
            <h2>HOMEPAGE <span>VIDEOS.</span></h2>
            <p>Vertical phone videos (9:16) look best. MP4, up to 100 MB each. Only upload videos you own or have permission to use.</p>
          </div>
          <button type="button" className="gad-products-add" disabled={progress !== null || data.videos.length >= MAX_VIDEOS} onClick={() => inputRef.current?.click()}>
            <Plus size={17} /> {progress !== null ? `UPLOADING ${progress}%` : "ADD VIDEOS"}
          </button>
          <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm" multiple hidden onChange={upload} />
        </div>

        {data.videos.length === 0 ? (
          <div className="gad-products-empty">
            <Film size={28} />
            <strong>No videos yet</strong>
            <span>Click “Add videos” — you can pick several at once.</span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            {data.videos.map((video, index) => (
              <div key={video.url} style={{ display: "grid", gap: 8 }}>
                <div style={{ position: "relative" }}>
                  <video src={video.url} muted loop playsInline autoPlay preload="metadata"
                    style={{ width: "100%", aspectRatio: "9 / 16", objectFit: "cover", borderRadius: 10, background: "#000" }} />
                  <button type="button" aria-label="Remove video" onClick={() => set({ videos: data.videos.filter((_, i) => i !== index) })}
                    style={{ position: "absolute", top: 6, right: 6, width: 28, height: 28, borderRadius: "50%", border: 0, background: "#c0392b", color: "#fff" }}>
                    <X size={15} />
                  </button>
                </div>
                <input style={field} placeholder="Caption (optional)" value={video.caption} onChange={(e) => setVideo(index, { caption: e.target.value })} />
                <select style={field} value={video.productSlug} onChange={(e) => setVideo(index, { productSlug: e.target.value })}>
                  <option value="">Link to product (optional)</option>
                  {products.map((product) => (
                    <option key={product._id} value={product.slug}>{product.name}</option>
                  ))}
                </select>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" className="gad-products-export" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></button>
                  <button type="button" className="gad-products-export" disabled={index === data.videos.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="gad-products-note">Remember to click SAVE after adding, removing or reordering videos.</p>
    </div>
  );
};

export default AdminHomepage;
