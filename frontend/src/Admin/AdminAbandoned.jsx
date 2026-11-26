import { useCallback, useEffect, useState } from "react";
import { Check, MessageCircle, RotateCcw, Send, ShoppingBag, X } from "lucide-react";
import { adminFetch, formatDateTime, money } from "./api";
import { BUSINESS } from "../data/business";
import "../Admincss/AdminProducts.css";

const FILTERS = [
  ["open", "To follow up"],
  ["contacted", "Contacted"],
  ["dismissed", "Dismissed"],
];

// Keep messages to plain text. Emojis and "smart" punctuation get mangled into broken
// "?" boxes by some WhatsApp clients, so strip them out of every message we send.
function plainText(text) {
  return String(text || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00D7/g, "x")
    .replace(/\uFFFD|\uFE0F|\u200D/g, "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

// "MahendRa jadhav" -> "Mahendra". Numbers / junk names fall back to "there".
function firstName(name) {
  const first = (name || "").trim().split(/\s+/)[0] || "";
  if (!/^[A-Za-z][A-Za-z.'-]{1,}$/.test(first)) return "there";
  const clean = first.replace(/\.+$/, "").split(".").pop() || first;
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

// Default reminder text for one shopper (the admin reviews / edits it before sending).
function draftMessage(row) {
  const items = row.items || [];
  const item = items[0];
  const extra = items.length - 1;
  const what = item ? `the ${item.name}${extra > 0 ? ` and ${extra} more item${extra > 1 ? "s" : ""}` : ""}` : "some items";
  const link =
    item && extra === 0 ? `https://${BUSINESS.website}/product/${item.slug}` : `https://${BUSINESS.website}/cart`;
  return plainText(
    `Hi ${firstName(row.name)}, this is ${BUSINESS.tradeName}. ` +
      `You left ${what} in your cart and it's still available.\n` +
      `Complete your order here: ${link}\n` +
      `Cash on Delivery is available. Any questions? Just reply to this message.`
  );
}

function whatsappUrl(phone, message) {
  return `https://wa.me/91${phone}?text=${encodeURIComponent(plainText(message))}`;
}

const AdminAbandoned = () => {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Message being reviewed before it goes out: { row, text } or null.
  const [review, setReview] = useState(null);

  const load = useCallback(() => {
    adminFetch("/abandoned")
      .then((data) => {
        setRows(data.rows);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (row, status) => {
    setRows((current) => current.map((r) => (r.phone === row.phone ? { ...r, status } : r)));
    await adminFetch(`/abandoned/${row.phone}`, { method: "PATCH", body: { status } }).catch((e) => {
      alert(e.message);
      load();
    });
  };

  const openReview = (row) => setReview({ row, text: draftMessage(row) });

  // Send the reviewed message, mark the shopper contacted and (optionally) move
  // straight on to reviewing the next shopper in the list.
  const sendReviewed = (goNext) => {
    if (!review) return;
    const text = plainText(review.text);
    if (!text) return;
    const { row } = review;
    window.open(whatsappUrl(row.phone, text), "_blank", "noopener,noreferrer");
    if (row.status === "open") setStatus(row, "contacted");
    const list = rows.filter((r) => r.status === filter);
    const next = goNext ? list[list.findIndex((r) => r.phone === row.phone) + 1] : null;
    setReview(next ? { row: next, text: draftMessage(next) } : null);
  };

  const shown = rows.filter((row) => row.status === filter);
  const openRows = rows.filter((row) => row.status === "open");
  const openValue = openRows.reduce((sum, row) => sum + (row.value || 0), 0);

  return (
    <div className="gad-products-page">
      <header className="gad-products-header">
        <div>
          <span className="gad-products-eyebrow">GADGETÉ / RECOVER SALES</span>
          <h1>ABANDONED CARTS<span>.</span></h1>
          <p>
            People who reached checkout in the last 30 days but didn't order. Tap WhatsApp to review and send a friendly reminder,
            then mark them as contacted.
          </p>
        </div>
      </header>

      <section className="gad-products-stats">
        <article className="gad-product-stat-card">
          <span className="gad-product-stat-icon"><ShoppingBag size={19} /></span>
          <small>TO FOLLOW UP</small>
          <strong>{openRows.length}</strong>
          <em>Shoppers who didn't order</em>
        </article>
        <article className="gad-product-stat-card">
          <span className="gad-product-stat-icon"><ShoppingBag size={19} /></span>
          <small>LEFT IN CARTS</small>
          <strong>{money(openValue)}</strong>
          <em>Sales you can still win</em>
        </article>
        <article className="gad-product-stat-card">
          <span className="gad-product-stat-icon"><MessageCircle size={19} /></span>
          <small>CONTACTED</small>
          <strong>{rows.filter((row) => row.status === "contacted").length}</strong>
          <em>Already messaged</em>
        </article>
      </section>

      <section className="gad-products-panel">
        <div className="gad-products-toolbar" style={{ gap: 8, flexWrap: "wrap" }}>
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                border: "1px solid currentColor",
                background: filter === key ? "#164e74" : "transparent",
                color: filter === key ? "#fff" : "inherit",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {label} ({rows.filter((row) => row.status === key).length})
            </button>
          ))}
        </div>

        {error && <p className="gad-product-form-error">{error}</p>}

        <div className="gad-products-table-wrap">
          <table className="gad-products-table">
            <thead>
              <tr>
                <th>SHOPPER</th>
                <th>CART</th>
                <th>VALUE</th>
                <th>WHEN</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.phone}>
                  <td>
                    <strong>{row.name || "No name yet"}</strong>
                    <small className="gad-product-category">+91 {row.phone}</small>
                    {row.city && <small className="gad-product-category">{row.city}</small>}
                  </td>
                  <td style={{ maxWidth: 320 }}>
                    {row.items.map((item) => (
                      <div key={item.slug}>
                        {item.quantity} × {item.name}
                      </div>
                    ))}
                    <small className="gad-product-category">
                      {row.stage}
                      {row.orderNumber ? ` · ${row.orderNumber}` : ""}
                    </small>
                  </td>
                  <td>{money(row.value)}</td>
                  <td>{formatDateTime(row.at)}</td>
                  <td>
                    <div className="gad-product-actions">
                      <button
                        type="button"
                        onClick={() => openReview(row)}
                        title="Review and send a WhatsApp reminder"
                        aria-label={`WhatsApp ${row.name || row.phone}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, width: "auto", padding: "6px 10px", borderRadius: 8, border: 0, background: "#25d366", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                      >
                        <MessageCircle size={15} /> WhatsApp
                      </button>
                      {row.status === "open" ? (
                        <>
                          <button type="button" onClick={() => setStatus(row, "contacted")} title="Mark as contacted" aria-label="Mark as contacted">
                            <Check size={15} />
                          </button>
                          <button type="button" className="delete" onClick={() => setStatus(row, "dismissed")} title="Dismiss" aria-label="Dismiss">
                            <X size={15} />
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setStatus(row, "open")} title="Move back to follow up" aria-label="Move back to follow up">
                          <RotateCcw size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && shown.length === 0 && (
            <div className="gad-products-empty">
              <ShoppingBag size={28} />
              <strong>{filter === "open" ? "Nobody to follow up right now" : "Nothing here yet"}</strong>
              <span>Shoppers who type their mobile number at checkout but don't order will show up here.</span>
            </div>
          )}
        </div>
      </section>

      {review && (
        <div className="gad-product-modal-backdrop" onMouseDown={() => setReview(null)}>
          <section className="gad-product-modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <header className="gad-product-modal-header">
              <div>
                <span className="gad-products-eyebrow">REVIEW BEFORE SENDING</span>
                <h2>WHATSAPP REMINDER<span>.</span></h2>
              </div>
              <button type="button" onClick={() => setReview(null)} aria-label="Close"><X size={20} /></button>
            </header>

            <form
              className="gad-product-form"
              onSubmit={(e) => {
                e.preventDefault();
                sendReviewed(false);
              }}
            >
              <p style={{ margin: 0 }}>
                To <strong>{review.row.name || "No name yet"}</strong> · +91 {review.row.phone}
                {review.row.items?.length ? ` · ${review.row.items.map((i) => `${i.quantity} x ${i.name}`).join(", ")}` : ""}
              </p>
              <div className="gad-product-fields">
                <label>
                  MESSAGE
                  <textarea
                    rows={7}
                    value={review.text}
                    onChange={(e) => setReview({ ...review, text: e.target.value })}
                    autoFocus
                  />
                </label>
              </div>
              <small className="gad-product-category">
                Plain text only - emojis and special symbols are removed automatically so the shopper never sees broken "?" symbols.
              </small>
              <div className="gad-product-form-actions">
                <button type="button" className="secondary" onClick={() => setReview({ ...review, text: draftMessage(review.row) })}>
                  RESET
                </button>
                <button type="button" className="secondary" onClick={() => sendReviewed(true)} disabled={!plainText(review.text)}>
                  SEND & NEXT
                </button>
                <button type="submit" className="primary" disabled={!plainText(review.text)}>
                  <Send size={15} /> SEND ON WHATSAPP
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminAbandoned;
