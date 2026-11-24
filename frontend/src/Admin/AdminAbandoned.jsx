import { useCallback, useEffect, useState } from "react";
import { Check, MessageCircle, RotateCcw, ShoppingBag, X } from "lucide-react";
import { adminFetch, formatDateTime, money } from "./api";
import { BUSINESS } from "../data/business";
import "../Admincss/AdminProducts.css";

const FILTERS = [
  ["open", "To follow up"],
  ["contacted", "Contacted"],
  ["dismissed", "Dismissed"],
];

// Pre-filled WhatsApp follow-up for one shopper.
function whatsappLink(row) {
  const first = (row.name || "").split(" ")[0] || "there";
  const item = row.items?.[0];
  const what = item ? `the ${item.name}` : "your items";
  const link = item ? `https://${BUSINESS.website}/product/${item.slug}` : `https://${BUSINESS.website}/cart`;
  const message =
    `Hi ${first}! 👋 This is ${BUSINESS.tradeName}. You left ${what} in your cart — ` +
    `it's still available. Complete your order here: ${link}\n` +
    `Cash on Delivery available 🚚 Any questions? Just reply here 🙂`;
  return `https://wa.me/91${row.phone}?text=${encodeURIComponent(message)}`;
}

const AdminAbandoned = () => {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
            People who reached checkout in the last 30 days but didn't order. Tap WhatsApp to send a friendly reminder,
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
                      <a
                        href={whatsappLink(row)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => row.status === "open" && setStatus(row, "contacted")}
                        title="Send a WhatsApp reminder"
                        aria-label={`WhatsApp ${row.name || row.phone}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: "#25d366", color: "#fff", fontWeight: 700, fontSize: 12, textDecoration: "none" }}
                      >
                        <MessageCircle size={15} /> WhatsApp
                      </a>
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
    </div>
  );
};

export default AdminAbandoned;
