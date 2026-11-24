import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, Check, EyeOff, ImagePlus, Plus, Save, Star, Trash2, X } from "lucide-react";
import { adminFetch, formatDate, imageUrl, uploadPhoto } from "./api";
import "../Admincss/AdminProducts.css";

const TABS = [
  ["pending", "Waiting for approval"],
  ["approved", "Live on site"],
  ["hidden", "Hidden"],
];

const emptyForm = { product: "", name: "", city: "", rating: 5, text: "", photos: [], verified: true };

function StarsRow({ value }) {
  return (
    <span style={{ color: "#e0a800", whiteSpace: "nowrap" }} aria-label={`${value} stars`}>
      {"★".repeat(value)}
      <span style={{ opacity: 0.25 }}>{"★".repeat(5 - value)}</span>
    </span>
  );
}

const AdminReviews = () => {
  const [tab, setTab] = useState("pending");
  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, hidden: 0 });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const fileRef = useRef(null);

  const load = useCallback(() => {
    adminFetch(`/reviews?status=${tab}`)
      .then((data) => {
        setReviews(data.reviews);
        setCounts(data.counts);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminFetch("/products")
      .then((data) => setProducts(data.products))
      .catch(() => setProducts([]));
  }, []);

  const setStatus = async (review, status) => {
    await adminFetch(`/reviews/${review._id}`, { method: "PATCH", body: { status } }).catch((e) => alert(e.message));
    load();
  };

  const remove = async (review) => {
    if (!window.confirm(`Delete ${review.name}'s review? This can't be undone.`)) return;
    await adminFetch(`/reviews/${review._id}`, { method: "DELETE" }).catch((e) => alert(e.message));
    load();
  };

  const openAdd = () => {
    setForm({ ...emptyForm, product: products[0]?._id || products[0]?.id || "" });
    setFormError("");
    setModalOpen(true);
  };

  const update = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const addPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setFormError("");
    try {
      const url = await uploadPhoto(file, "review.jpg");
      setForm((current) => ({ ...current, photos: [...current.photos, url].slice(0, 4) }));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await adminFetch("/reviews", { method: "POST", body: { ...form, rating: Number(form.rating) } });
      setModalOpen(false);
      setTab("approved");
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gad-products-page">
      <header className="gad-products-header">
        <div>
          <span className="gad-products-eyebrow">GADGETÉ / TRUST</span>
          <h1>REVIEWS<span>.</span></h1>
          <p>Approve reviews from your product pages, or add ones customers send you on WhatsApp.</p>
        </div>
        <div className="gad-products-header-actions">
          <button type="button" className="gad-products-add" onClick={openAdd}>
            <Plus size={17} /> ADD REVIEW
          </button>
        </div>
      </header>

      <section className="gad-products-stats">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className="gad-product-stat-card"
            onClick={() => setTab(key)}
            style={{ textAlign: "left", cursor: "pointer", outline: tab === key ? "2px solid currentColor" : "none" }}
          >
            <span className="gad-product-stat-icon"><Star size={19} /></span>
            <small>{label.toUpperCase()}</small>
            <strong>{counts[key] || 0}</strong>
            <em>{tab === key ? "Showing below" : "Tap to show"}</em>
          </button>
        ))}
      </section>

      <section className="gad-products-panel">
        {error && <p className="gad-product-form-error">{error}</p>}
        <div className="gad-products-table-wrap">
          <table className="gad-products-table">
            <thead>
              <tr>
                <th>CUSTOMER</th>
                <th>PRODUCT</th>
                <th>REVIEW</th>
                <th>DATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review._id}>
                  <td>
                    <strong>{review.name}</strong>
                    {review.city && <small className="gad-product-category">{review.city}</small>}
                    {review.verified && (
                      <small className="gad-product-category" style={{ color: "#1d7a3a" }}>
                        <BadgeCheck size={12} /> Verified buyer
                      </small>
                    )}
                    {review.phone && <small className="gad-product-category">{review.phone}</small>}
                  </td>
                  <td>{review.productName}</td>
                  <td style={{ maxWidth: 380 }}>
                    <StarsRow value={review.rating} />
                    {review.text && <p style={{ margin: "6px 0 0", whiteSpace: "pre-line" }}>{review.text}</p>}
                    {review.photos?.length > 0 && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        {review.photos.map((src) => (
                          <img key={src} src={imageUrl(src)} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }} />
                        ))}
                      </div>
                    )}
                  </td>
                  <td>{formatDate(review.createdAt)}</td>
                  <td>
                    <div className="gad-product-actions">
                      {review.status !== "approved" && (
                        <button type="button" onClick={() => setStatus(review, "approved")} title="Approve — show on the site" aria-label="Approve review">
                          <Check size={15} />
                        </button>
                      )}
                      {review.status !== "hidden" && (
                        <button type="button" onClick={() => setStatus(review, "hidden")} title="Hide from the site" aria-label="Hide review">
                          <EyeOff size={15} />
                        </button>
                      )}
                      <button type="button" className="delete" onClick={() => remove(review)} title="Delete" aria-label="Delete review">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && reviews.length === 0 && (
            <div className="gad-products-empty">
              <Star size={28} />
              <strong>{tab === "pending" ? "Nothing waiting for approval" : "No reviews here yet"}</strong>
              <span>Ask happy customers for a photo on WhatsApp, then click “Add review”.</span>
            </div>
          )}
        </div>
      </section>

      {modalOpen && (
        <div className="gad-product-modal-backdrop" onMouseDown={() => setModalOpen(false)}>
          <section className="gad-product-modal" onMouseDown={(e) => e.stopPropagation()}>
            <header className="gad-product-modal-header">
              <div>
                <span className="gad-products-eyebrow">FROM WHATSAPP, INSTAGRAM OR A CALL</span>
                <h2>ADD REVIEW<span>.</span></h2>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close"><X size={20} /></button>
            </header>

            <form className="gad-product-form" onSubmit={save}>
              <div className="gad-product-fields">
                <label>
                  PRODUCT *
                  <select name="product" value={form.product} onChange={update}>
                    {products.map((p) => (
                      <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>
                <label>CUSTOMER NAME *<input name="name" value={form.name} onChange={update} placeholder="e.g. Rahul S." /></label>
                <label>CITY<input name="city" value={form.city} onChange={update} placeholder="e.g. Pune" /></label>
                <label>
                  RATING *
                  <select name="rating" value={form.rating} onChange={update}>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>{"★".repeat(n)} ({n})</option>
                    ))}
                  </select>
                </label>
                <label>
                  WHAT THEY SAID
                  <textarea name="text" rows={4} value={form.text} onChange={update} placeholder="Paste their message here" />
                </label>
                <label style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <input type="checkbox" name="verified" checked={form.verified} onChange={update} style={{ width: 18, height: 18, minHeight: 0 }} />
                  VERIFIED BUYER (they ordered from you)
                </label>
              </div>

              <div>
                <span className="gad-products-eyebrow">PHOTOS (UP TO 4)</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {form.photos.map((src) => (
                    <div key={src} style={{ position: "relative" }}>
                      <img src={imageUrl(src)} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }} />
                      <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() => setForm((c) => ({ ...c, photos: c.photos.filter((p) => p !== src) }))}
                        style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", border: 0, cursor: "pointer" }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {form.photos.length < 4 && (
                    <button type="button" className="gad-product-image-picker" disabled={uploading} onClick={() => fileRef.current?.click()} style={{ width: 72, height: 72 }}>
                      <ImagePlus size={20} />
                      <b style={{ fontSize: 9 }}>{uploading ? "UPLOADING…" : "ADD"}</b>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={addPhoto} />
                </div>
              </div>

              {formError && <p className="gad-product-form-error">{formError}</p>}
              <div className="gad-product-form-actions">
                <button type="button" className="secondary" onClick={() => setModalOpen(false)}>CANCEL</button>
                <button type="submit" className="primary" disabled={saving || uploading}>
                  <Save size={15} /> {saving ? "SAVING…" : "ADD REVIEW"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
