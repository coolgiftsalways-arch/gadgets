import { useState } from "react";
import { BadgeCheck, Star, X } from "lucide-react";
import { api, imageUrl } from "../shopApi";
import "../Style/ProductReviews.css";

export function Stars({ value, size = 16 }) {
  return (
    <span className="pr-stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} fill={n <= Math.round(value) ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

const emptyForm = { name: "", city: "", phone: "", rating: 0, text: "", website: "" };

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Real customer reviews for one product, plus the "write a review" form. */
export default function ProductReviews({ slug, productName, data }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [thanks, setThanks] = useState("");
  const [photo, setPhoto] = useState(null);

  const summary = data?.summary || { count: 0, average: 0 };
  const reviews = data?.reviews || [];
  const breakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((review) => review.rating === stars).length,
  }));

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.rating) return setError("Please tap the stars to give a rating.");
    setSending(true);
    setError("");
    try {
      const result = await api(`/products/${encodeURIComponent(slug)}/reviews`, { body: form });
      setThanks(result.message);
      setForm(emptyForm);
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="pr-section" id="reviews">
      <div className="pr-heading">
        <div>
          <span className="pd-eyebrow">CUSTOMER REVIEWS</span>
          <h2>
            WHAT BUYERS <span>SAY.</span>
          </h2>
        </div>
        {!open && (
          <button type="button" className="pr-write" onClick={() => { setOpen(true); setThanks(""); }}>
            WRITE A REVIEW
          </button>
        )}
      </div>

      {thanks && <p className="pr-thanks">✅ {thanks}</p>}

      {open && (
        <form className="pr-form" onSubmit={submit}>
          <div className="pr-form-top">
            <strong>Review {productName}</strong>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="pr-rate" role="radiogroup" aria-label="Your rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={form.rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                className={n <= form.rating ? "on" : ""}
                onClick={() => setForm((current) => ({ ...current, rating: n }))}
              >
                <Star size={30} fill={n <= form.rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <div className="pr-form-grid">
            <label>
              Your name *
              <input name="name" value={form.name} onChange={update} maxLength={60} required />
            </label>
            <label>
              City
              <input name="city" value={form.city} onChange={update} maxLength={60} />
            </label>
          </div>
          <label>
            Your review *
            <textarea
              name="text"
              value={form.text}
              onChange={update}
              rows={4}
              maxLength={1500}
              required
              placeholder="How do you like it? How was delivery?"
            />
          </label>
          <label>
            Mobile number used for your order (optional)
            <input
              name="phone"
              value={form.phone}
              onChange={update}
              inputMode="numeric"
              maxLength={14}
              placeholder="Adds a “Verified buyer” badge — never shown"
            />
          </label>
          {/* Hidden from people; bots fill it in. */}
          <input className="pr-trap" name="website" value={form.website} onChange={update} tabIndex={-1} autoComplete="off" aria-hidden="true" />
          {error && <p className="pr-error">{error}</p>}
          <button type="submit" className="pr-submit" disabled={sending}>
            {sending ? "SENDING…" : "SUBMIT REVIEW"}
          </button>
          <small className="pr-note">Reviews appear after a quick check by our team.</small>
        </form>
      )}

      {summary.count > 0 ? (
        <div className="pr-body">
          <div className="pr-summary">
            <strong>{summary.average.toFixed(1)}</strong>
            <Stars value={summary.average} size={20} />
            <span>
              Based on {summary.count} review{summary.count === 1 ? "" : "s"}
            </span>
            <ul>
              {breakdown.map(({ stars, count }) => (
                <li key={stars}>
                  <span>{stars}★</span>
                  <i>
                    <b style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%` }} />
                  </i>
                  <span>{count}</span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="pr-list">
            {reviews.map((review) => (
              <li key={review.id} className="pr-card">
                <div className="pr-card-top">
                  <Stars value={review.rating} />
                  <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
                </div>
                {review.text && <p>{review.text}</p>}
                {review.photos?.length > 0 && (
                  <div className="pr-photos">
                    {review.photos.map((src) => (
                      <button key={src} type="button" onClick={() => setPhoto(imageUrl(src))} aria-label="View photo">
                        <img src={imageUrl(src)} alt={`Photo from ${review.name}`} loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="pr-author">
                  <strong>{review.name}</strong>
                  {review.city && <span>{review.city}</span>}
                  {review.verified && (
                    <em>
                      <BadgeCheck size={14} /> Verified buyer
                    </em>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        !open && <p className="pr-empty">No reviews yet. Bought this? Be the first to share what you think!</p>
      )}

      {photo && (
        <div className="pr-lightbox" onClick={() => setPhoto(null)} role="dialog" aria-label="Review photo">
          <img src={photo} alt="" />
        </div>
      )}
    </section>
  );
}
