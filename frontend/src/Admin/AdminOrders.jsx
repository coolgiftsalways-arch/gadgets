import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  ShoppingBag,
  IndianRupee,
  Clock3,
  PackageCheck,
  Truck,
  CheckCircle2,
  Download,
  SlidersHorizontal,
  ChevronDown,
  X,
  Eye,
  MapPin,
  CalendarDays,
  CreditCard,
  Phone,
  Mail,
  UserRound,
  Send,
  Save,
  AlertTriangle,
} from "lucide-react";
import {
  STATUS_OPTIONS,
  adminDownload,
  adminFetch,
  customerName,
  formatDate,
  formatDateTime,
  formatTime,
  imageUrl,
  initials,
  money,
  paymentLabel,
  statusClass,
  statusLabel,
} from "./api";
import "../Admincss/AdminOrders.css";

const AdminOrders = () => {
  const [params, setParams] = useSearchParams();
  const openId = params.get("open");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const filters = useCallback(() => {
    const qs = new URLSearchParams({ sort: sortBy });
    if (query.trim()) qs.set("q", query.trim());
    if (statusFilter) qs.set("status", statusFilter);
    if (paymentFilter) qs.set("payment", paymentFilter);
    return qs;
  }, [query, statusFilter, paymentFilter, sortBy]);

  const load = useCallback(() => {
    const qs = filters();
    qs.set("page", page);
    adminFetch(`/orders?${qs}`)
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, [filters, page]);

  // Small delay while typing in the search box.
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const openOrder = (id) => setParams(id ? { open: id } : {});

  const exportOrders = () =>
    adminDownload(`/orders/export.csv?${filters()}`, "gadgete-orders.csv").catch((err) =>
      alert(err.message),
    );

  const summary = data?.summary || {};
  const orders = data?.items || [];

  const statCards = [
    ["TOTAL ORDERS", summary.total, "All received orders", ShoppingBag, ""],
    ["PENDING", summary.pending, "Awaiting confirmation", Clock3, "pending"],
    ["PROCESSING", summary.processing, "Being prepared", PackageCheck, "processing"],
    ["SHIPPED", summary.shipped, "On the way", Truck, "shipped"],
    ["DELIVERED", summary.delivered, "Successfully delivered", CheckCircle2, "delivered"],
    ["PAID REVENUE", money(summary.revenue), "Money received", IndianRupee, "revenue"],
  ];

  return (
    <div className="gad-orders-page">
      <header className="gad-orders-header">
        <div>
          <span className="gad-orders-eyebrow">GADGETÉ / SALES & FULFILMENT</span>
          <h1>ORDERS<span>.</span></h1>
          <p>Every order, every detail — all in one place.</p>
        </div>
        <button type="button" className="gad-orders-export" onClick={exportOrders}>
          <Download size={16} /> EXPORT ORDERS
        </button>
      </header>

      <section className="gad-orders-stats">
        {statCards.map(([label, value, note, Icon, tone]) => (
          <article className="gad-orders-stat" key={label}>
            <span className={`gad-orders-stat-icon ${tone}`}><Icon size={19} /></span>
            <small>{label}</small>
            <strong>{value ?? "—"}</strong>
            <em>{note}</em>
          </article>
        ))}
      </section>

      <section className="gad-orders-panel">
        <div className="gad-orders-panel-heading">
          <div>
            <span className="gad-orders-eyebrow">ORDER MANAGEMENT</span>
            <h2>ALL <span>ORDERS.</span></h2>
            <p>Search orders, review customer details and update fulfilment status.</p>
          </div>
          <span className="gad-orders-record-count">
            {String(data?.total ?? 0).padStart(2, "0")} RECORDS
          </span>
        </div>

        <div className="gad-orders-toolbar">
          <label className="gad-orders-search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search order no., name, email, phone or city..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                <X size={15} />
              </button>
            )}
          </label>

          <label className="gad-orders-filter">
            <SlidersHorizontal size={15} />
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
              <option value="">All orders</option>
              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
              <option value="unpaid">Unpaid UPI checkouts</option>
            </select>
            <ChevronDown size={14} />
          </label>

          <label className="gad-orders-filter">
            <select value={paymentFilter} onChange={(event) => { setPaymentFilter(event.target.value); setPage(1); }}>
              <option value="">All payments</option>
              <option value="upi">Online (UPI)</option>
              <option value="cod">Cash on Delivery</option>
            </select>
            <ChevronDown size={14} />
          </label>

          <label className="gad-orders-filter gad-orders-sort">
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest amount</option>
              <option value="lowest">Lowest amount</option>
            </select>
            <ChevronDown size={14} />
          </label>
        </div>

        {error && <p className="gad-orders-note"><AlertTriangle size={14} /> {error}</p>}

        <div className="gad-orders-table-wrap">
          <table className="gad-orders-table">
            <thead>
              <tr>
                <th>ORDER ID</th>
                <th>CUSTOMER</th>
                <th>DATE & TIME</th>
                <th>ITEMS</th>
                <th>TOTAL</th>
                <th>PAYMENT</th>
                <th>STATUS</th>
                <th>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const name = customerName(order.customer);
                const when = order.placedAt || order.createdAt;
                return (
                  <tr key={order._id} onClick={() => openOrder(order._id)} style={{ cursor: "pointer" }}>
                    <td className="gad-order-id-cell">
                      {order.orderNumber}
                      {order.seenByAdmin === false && <b style={{ color: "#c0392b" }}> • NEW</b>}
                    </td>
                    <td>
                      <div className="gad-order-customer">
                        <span>{initials(name)}</span>
                        <strong>{name}</strong>
                      </div>
                    </td>
                    <td className="gad-order-date-cell">
                      <strong>{formatDate(when)}</strong>
                      <small>{formatTime(when)}</small>
                    </td>
                    <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)</td>
                    <td className="gad-order-total-cell">{money(order.total)}</td>
                    <td>
                      <span className={`gad-order-payment ${order.payment.method === "cod" ? "cod" : "online"}`}>
                        {paymentLabel(order.payment)}
                      </span>
                    </td>
                    <td>
                      <span className={`gad-order-status-pill ${statusClass(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="gad-order-view-button" aria-label={`View ${order.orderNumber}`}>
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data && orders.length === 0 && (
            <div className="gad-orders-empty">
              <ShoppingBag size={28} />
              <strong>No orders found</strong>
              <span>Orders placed on the website will appear here.</span>
            </div>
          )}
          {!data && !error && <div className="gad-orders-empty"><strong>Loading orders…</strong></div>}
        </div>

        <div className="gad-orders-table-footer">
          <span>
            Page <strong>{data?.page ?? 1}</strong> of <strong>{data?.pages ?? 1}</strong> ·{" "}
            <strong>{data?.total ?? 0}</strong> orders
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            <button type="button" className="gad-orders-export" disabled={page <= 1} onClick={() => setPage(page - 1)}>PREV</button>
            <button type="button" className="gad-orders-export" disabled={!data || page >= data.pages} onClick={() => setPage(page + 1)}>NEXT</button>
          </span>
        </div>
      </section>

      {openId && <OrderDrawer id={openId} onClose={() => openOrder(null)} onChanged={load} />}
    </div>
  );
};

function OrderDrawer({ id, onClose, onChanged }) {
  const [order, setOrder] = useState(null);
  const [shipping, setShipping] = useState({ courier: "", awb: "", trackingUrl: "" });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const apply = (fresh) => {
    setOrder(fresh);
    setShipping({
      courier: fresh.shipping?.courier || "",
      awb: fresh.shipping?.awb || "",
      trackingUrl: fresh.shipping?.trackingUrl || "",
    });
    setNote(fresh.adminNote || "");
  };

  useEffect(() => {
    adminFetch(`/orders/${id}`)
      .then((result) => {
        apply(result.order);
        window.dispatchEvent(new Event("gadgete-admin-refresh")); // opening marks it as seen
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const save = async (body, success) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await adminFetch(`/orders/${id}`, { method: "PATCH", body });
      apply(result.order);
      setMessage(success);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = (status) => {
    let cancelReason = "";
    if (status === "cancelled") {
      const answer = window.prompt("Cancel this order? Stock goes back and the customer is emailed.\n\nReason (optional):", "");
      if (answer === null) return;
      cancelReason = answer;
    }
    // Shipping details are saved together, so the "shipped" email includes them.
    save({ status, cancelReason, shipping }, `Status changed to ${statusLabel(status)}. Customer emailed.`);
  };

  const resend = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await adminFetch(`/orders/${id}/email`, { method: "POST", body: { type: "confirmation" } });
      apply(result.order);
      setMessage(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const recheck = async () => {
    setBusy(true);
    try {
      const result = await adminFetch(`/orders/${id}/recheck-payment`, { method: "POST" });
      apply(result.order);
      setMessage(result.message);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const a = order?.shippingAddress;
  const placed = order && !["awaiting_payment", "expired"].includes(order.status);

  return (
    <div className="gad-order-drawer-backdrop" onMouseDown={onClose}>
      <aside className="gad-order-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <div className="gad-order-drawer-header">
          <div>
            <span className="gad-orders-eyebrow">ORDER DETAILS</span>
            <h2>{order?.orderNumber || "…"}<span>.</span></h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close order details"><X size={20} /></button>
        </div>

        {!order ? (
          <p>{error || "Loading order…"}</p>
        ) : (
          <>
            <div className="gad-order-drawer-status-row">
              <span className={`gad-order-status-pill ${statusClass(order.status)}`}>{statusLabel(order.status)}</span>
              <span><CalendarDays size={14} /> {formatDateTime(order.placedAt || order.createdAt)}</span>
            </div>

            {order.attention && (
              <p className="gad-orders-note" style={{ color: "#9b1c1c" }}><AlertTriangle size={14} /> {order.attention}</p>
            )}
            {message && <p className="gad-orders-note">{message}</p>}
            {error && <p className="gad-orders-note" style={{ color: "#9b1c1c" }}>{error}</p>}

            {placed ? (
              <section className="gad-order-update-section">
                <label htmlFor="gad-order-status-select">UPDATE ORDER STATUS</label>
                <select
                  id="gad-order-status-select"
                  value={order.status}
                  disabled={busy}
                  onChange={(event) => changeStatus(event.target.value)}
                >
                  {STATUS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <p>The customer gets an email when an order is shipped, out for delivery, delivered or cancelled.</p>
              </section>
            ) : (
              <section className="gad-order-update-section">
                <p>This UPI checkout was never paid, so it isn't a real order yet.</p>
                <button type="button" className="gad-orders-export" disabled={busy} onClick={recheck}>
                  CHECK PAYMENT WITH RAZORPAY
                </button>
              </section>
            )}

            {placed && <ShiprocketSection order={order} onUpdated={(fresh) => { apply(fresh); onChanged(); }} />}

            <section className="gad-order-detail-section">
              <h3><Truck size={16} /> SHIPPING / TRACKING (MANUAL)</h3>
              {[
                ["courier", "Courier (e.g. Delhivery)"],
                ["awb", "Tracking number / AWB"],
                ["trackingUrl", "Tracking link (https://…)"],
              ].map(([key, label]) => (
                <input
                  key={key}
                  placeholder={label}
                  value={shipping[key]}
                  onChange={(event) => setShipping({ ...shipping, [key]: event.target.value })}
                  style={{ width: "100%", height: 42, margin: "4px 0", padding: "0 12px", borderRadius: 8, border: "1px solid currentColor", background: "transparent", color: "inherit", fontSize: 15 }}
                />
              ))}
              <button type="button" className="gad-orders-export" disabled={busy} onClick={() => save({ shipping }, "Shipping details saved.")}>
                <Save size={15} /> SAVE TRACKING
              </button>
              <p style={{ fontSize: 12, opacity: 0.7 }}>Tip: fill these in first, then set the status to Shipped — the email will include them.</p>
            </section>

            <section className="gad-order-detail-section">
              <h3><UserRound size={16} /> CUSTOMER INFORMATION</h3>
              <div className="gad-order-customer-detail"><strong>{customerName(order.customer)}</strong></div>
              <p><Mail size={15} /> <a href={`mailto:${order.customer.email}`}>{order.customer.email}</a></p>
              <p><Phone size={15} /> <a href={`tel:+91${order.customer.phone}`}>+91 {order.customer.phone}</a></p>
              <p>
                <MapPin size={15} /> {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} – {a.pincode}
              </p>
            </section>

            <section className="gad-order-detail-section">
              <h3><ShoppingBag size={16} /> ITEMS ORDERED</h3>
              <div className="gad-order-item-list">
                {order.items.map((item, index) => (
                  <div className="gad-order-item" key={`${item.sku}-${index}`}>
                    {item.image ? <img src={imageUrl(item.image)} alt={item.name} /> : <span />}
                    <div className="gad-order-item-copy">
                      <strong>{item.name}</strong>
                      <span>SKU / {item.sku}{item.color ? ` · ${item.color}` : ""}</span>
                      <small>Qty: {item.quantity} × {money(item.price)}</small>
                    </div>
                    <b>{money(item.price * item.quantity)}</b>
                  </div>
                ))}
              </div>
            </section>

            <section className="gad-order-detail-section">
              <h3><CreditCard size={16} /> PAYMENT & SOURCE</h3>
              <div className="gad-order-meta-row"><span>Payment</span><strong>{paymentLabel(order.payment)}</strong></div>
              {order.payment.paymentId && (
                <div className="gad-order-meta-row"><span>Razorpay ID</span><strong>{order.payment.paymentId}</strong></div>
              )}
              <div className="gad-order-meta-row"><span>Order source</span><strong>{order.source}</strong></div>
              {order.payment.method === "upi" && ["paid", "refunded"].includes(order.payment.status) && (
                <button
                  type="button"
                  className="gad-orders-export"
                  disabled={busy}
                  onClick={() =>
                    save({ refunded: order.payment.status !== "refunded" }, "Refund status updated.")
                  }
                >
                  {order.payment.status === "refunded" ? "UNDO REFUNDED" : "MARK AS REFUNDED"}
                </button>
              )}
            </section>

            <section className="gad-order-total-breakdown">
              <div><span>Subtotal</span><strong>{money(order.subtotal)}</strong></div>
              {order.couponDiscount > 0 && <div><span>Coupon {order.coupon?.code}</span><strong>−{money(order.couponDiscount)}</strong></div>}
              {order.discount > 0 && <div><span>UPI discount</span><strong>−{money(order.discount)}</strong></div>}
              <div><span>Shipping</span><strong>{order.shippingFee ? money(order.shippingFee) : "FREE"}</strong></div>
              <div className="grand-total"><span>ORDER TOTAL</span><strong>{money(order.total)}</strong></div>
            </section>

            <section className="gad-order-detail-section">
              <h3>INTERNAL NOTE</h3>
              <textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Only visible to you"
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid currentColor", background: "transparent", color: "inherit", fontSize: 15 }}
              />
              <button type="button" className="gad-orders-export" disabled={busy} onClick={() => save({ adminNote: note }, "Note saved.")}>
                <Save size={15} /> SAVE NOTE
              </button>
            </section>

            {placed && (
              <section className="gad-order-detail-section">
                <h3><Send size={16} /> EMAILS</h3>
                {(order.emails || []).slice(-6).reverse().map((entry, index) => (
                  <div className="gad-order-meta-row" key={index}>
                    <span>{entry.type} · {formatDateTime(entry.at)}</span>
                    <strong style={{ color: entry.ok ? "#1d7a3a" : "#9b1c1c" }}>{entry.ok ? "Sent" : "Failed"}</strong>
                  </div>
                ))}
                {!order.emails?.length && <p>No emails sent yet (is SMTP set up in backend/.env?).</p>}
                <button type="button" className="gad-orders-export" disabled={busy} onClick={resend}>
                  <Send size={15} /> RESEND CONFIRMATION EMAIL
                </button>
              </section>
            )}

            <section className="gad-order-detail-section">
              <h3>HISTORY</h3>
              {[...order.timeline].reverse().map((entry, index) => (
                <div className="gad-order-meta-row" key={index}>
                  <span>{formatDateTime(entry.at)}</span>
                  <strong>{entry.message}</strong>
                </div>
              ))}
            </section>
          </>
        )}
      </aside>
    </div>
  );
}

// Shiprocket: create shipment, courier + AWB, pickup, label, live tracking.
function ShiprocketSection({ order, onUpdated }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const ship = order.shipping || {};
  const shippable = ["pending", "processing", "shipped"].includes(order.status);
  const done = Boolean(ship.awb && ship.pickupDate && !ship.testMode);

  const run = async (kind) => {
    if (kind === "ship" && !window.confirm("Send this order to Shiprocket?\n\nThis books a courier (charged to your Shiprocket wallet) and schedules a pickup.")) return;
    setBusy(kind);
    setError("");
    try {
      const result = await adminFetch(`/orders/${order._id}/${kind === "ship" ? "ship" : "tracking"}`, { method: "POST" });
      onUpdated(result.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const row = (label, value) =>
    value ? (
      <div className="gad-order-meta-row">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    ) : null;

  return (
    <section className="gad-order-detail-section">
      <h3><Truck size={16} /> SHIPROCKET</h3>
      {ship.testMode && (
        <p className="gad-orders-note">
          {ship.testMode === "mock" ? "TEST shipment — nothing was sent to Shiprocket." : "TEST — created in Shiprocket only, no courier booked."}
        </p>
      )}
      {ship.shipmentId ? (
        <>
          {row("Status", ship.srStatus)}
          {row("Courier", ship.courier)}
          {row("AWB", ship.awb)}
          {row("Pickup", ship.pickupDate)}
          {row("Expected", ship.etd)}
          {row("Shiprocket ID", ship.srOrderId)}
        </>
      ) : (
        <p>{shippable ? "Not sent to Shiprocket yet." : "Only Pending or Processing orders can be shipped."}</p>
      )}
      {ship.lastError && <p className="gad-orders-note" style={{ color: "#9b1c1c" }}>{ship.lastError}</p>}
      {error && <p className="gad-orders-note" style={{ color: "#9b1c1c" }}>{error}</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {shippable && !done && (
          <button type="button" className="gad-orders-export" disabled={!!busy} onClick={() => run("ship")}>
            <Truck size={15} /> {busy === "ship" ? "SENDING…" : ship.shipmentId ? "CONTINUE / RETRY" : "SHIP WITH SHIPROCKET"}
          </button>
        )}
        {ship.awb && ship.testMode !== "mock" && (
          <button type="button" className="gad-orders-export" disabled={!!busy} onClick={() => run("track")}>
            {busy === "track" ? "REFRESHING…" : "REFRESH TRACKING"}
          </button>
        )}
        {ship.labelUrl && <a className="gad-orders-export" href={ship.labelUrl} target="_blank" rel="noreferrer">PRINT LABEL</a>}
        {ship.trackingUrl && <a className="gad-orders-export" href={ship.trackingUrl} target="_blank" rel="noreferrer">TRACK</a>}
      </div>

      {ship.events?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {ship.events.slice(0, 6).map((event, index) => (
            <div className="gad-order-meta-row" key={index}>
              <span>{event.date}{event.location ? ` · ${event.location}` : ""}</span>
              <strong>{event.status}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default AdminOrders;
