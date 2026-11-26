import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import gsap from "gsap";
import {
  AlertCircle,
  ArrowUpRight,
  Box,
  Check,
  Copy,
  ExternalLink,
  MapPin,
  MessageCircle,
  Package,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";

import "../Style/TrackOrder.css";

const API_URL = import.meta.env.VITE_API_URL || "/api";
const WHATSAPP = "917039235169";

// ==========================================
// HELPERS
// ==========================================

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDay = (value) => {
  const date = toDate(value);
  return date
    ? date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
    : "";
};

const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) return value ? String(value) : "";
  return `${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ${date
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    .toLowerCase()}`;
};

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(price) || 0,
  );

const STEPS = [
  { key: "pending", title: "Order placed", icon: Package },
  { key: "processing", title: "Packed", icon: Box },
  { key: "shipped", title: "Shipped", icon: Truck },
  { key: "out_for_delivery", title: "Out for delivery", icon: MapPin },
  { key: "delivered", title: "Delivered", icon: PackageCheck },
];

const HEADLINES = {
  pending: { title: "Order confirmed", text: "We've got your order and will start packing it soon." },
  processing: { title: "Being packed", text: "Your order is being packed and will be handed to the courier shortly." },
  shipped: { title: "On its way", text: "Your parcel is with the courier and moving towards you." },
  out_for_delivery: { title: "Out for delivery", text: "Your parcel will reach you today. Please keep your phone handy." },
  delivered: { title: "Delivered", text: "Your order has been delivered. Enjoy your new gadget!" },
  cancelled: { title: "Cancelled", text: "This order was cancelled. If you have questions, we're happy to help." },
};

// Courier couldn't hand the parcel over on this attempt (they usually retry next day).
const FAILED_ATTEMPT =
  /consignee unavailable|not available|door locked|premises closed|refused|address (issue|incomplete|not found)|not reachable|undelivered|delivery attempt/i;

const ATTEMPT_HEADLINE = {
  title: "Delivery attempted",
  text: "The courier tried to deliver today but couldn't reach you. They'll try again - please keep your phone handy, or message us to rearrange.",
};

const paymentText = (payment = {}) =>
  payment.label || (payment.method === "cod" ? "Cash on Delivery" : payment.method === "upi" ? "Paid online" : "—");

// ==========================================
// PAGE
// ==========================================

export default function TrackOrder() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get("order") || "");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const pageRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".track-hero-copy > *", { y: 30, opacity: 0, duration: 0.8, stagger: 0.08, ease: "power3.out" });
      gsap.from(".track-how", { y: 30, opacity: 0, duration: 0.8, delay: 0.2, ease: "power3.out" });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  const lookUp = async (rawId) => {
    const id = String(rawId || "").trim().toUpperCase();
    if (!id) {
      setError("Please enter your order number.");
      return;
    }

    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const response = await fetch(`${API_URL}/orders/${encodeURIComponent(id)}/tracking`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "We couldn't find that order. Please check the number.");
      if (!data.order) throw new Error("Tracking details are not available right now. Please try again.");

      setOrder(data.order);
      setSearchParams({ order: id }, { replace: true });

      requestAnimationFrame(() => {
        if (!resultRef.current) return;
        resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        gsap.fromTo(resultRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" });
      });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Links in order emails open /track-order?order=GAD-… — look it up straight away.
  useEffect(() => {
    const fromLink = searchParams.get("order");
    if (fromLink) lookUp(fromLink);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (event) => {
    event.preventDefault();
    lookUp(orderId);
  };

  const copyAwb = async (awb) => {
    try {
      await navigator.clipboard.writeText(awb);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  // ---------- order data ----------
  const status = order?.status || "pending";
  const cancelled = status === "cancelled";
  const stepIndex = Math.max(0, STEPS.findIndex((step) => step.key === status));
  const tracking = order?.tracking || {};
  // Newest courier scan is the most reliable "latest" status; Shipway's summary
  // field sometimes holds things like "Exchange".
  const latestScan = order?.courierEvents?.[0]?.message || "";
  const courierLatest = latestScan || tracking.status;
  const attempted = !cancelled && status !== "delivered" && FAILED_ATTEMPT.test(latestScan);
  const headline = attempted ? ATTEMPT_HEADLINE : HEADLINES[status] || HEADLINES.pending;
  const eta = order?.estimatedDelivery;
  const etaText =
    status === "delivered"
      ? formatDay(tracking.deliveredAt) || "Delivered"
      : eta
        ? formatDay(eta.from) === formatDay(eta.to)
          ? formatDay(eta.to)
          : `${formatDay(eta.from)} – ${formatDay(eta.to)}`
        : "Awaiting update";
  const events = [...(order?.courierEvents || []), ...(order?.timeline || [])];
  const items = order?.items || [];

  return (
    <div className="track-page" ref={pageRef}>
      {/* ---------- HERO + SEARCH ---------- */}
      <section className="track-hero">
        <div className="track-grid" aria-hidden="true" />

        <div className="track-hero-copy">
          <span className="track-eyebrow">
            <span className="track-live-dot" /> LIVE ORDER TRACKING
          </span>

          <h1>
            TRACK YOUR <span>ORDER.</span>
          </h1>

          <p className="track-lead">See where your parcel is, who's delivering it and when it will arrive.</p>

          <form className="track-search" onSubmit={submit}>
            <label className="track-input" htmlFor="track-order-id">
              <Search size={19} />
              <input
                id="track-order-id"
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck="false"
                placeholder="Order number, e.g. GAD-7K3M9QX2"
                value={orderId}
                onChange={(event) => {
                  setOrderId(event.target.value);
                  setError("");
                }}
              />
              {orderId && (
                <button type="button" className="track-clear" onClick={() => setOrderId("")} aria-label="Clear">
                  ×
                </button>
              )}
            </label>

            <button type="submit" className="track-submit" disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="track-spin" size={18} /> TRACKING…
                </>
              ) : (
                <>
                  TRACK <ArrowUpRight size={19} />
                </>
              )}
            </button>
          </form>

          {error ? (
            <p className="track-error" role="alert">
              <AlertCircle size={17} /> {error}
            </p>
          ) : (
            <p className="track-hint">
              <ShieldCheck size={15} /> Your order number is in your confirmation email.
            </p>
          )}
        </div>

        <aside className="track-how" aria-label="How delivery works">
          <span className="track-label">FROM US TO YOU</span>
          <ol>
            {STEPS.map(({ key, title, icon: Icon }, index) => (
              <li key={key}>
                <span className="track-how-icon">
                  <Icon size={18} />
                </span>
                <span className="track-how-text">
                  <strong>{title}</strong>
                  <small>
                    {
                      [
                        "We confirm your order",
                        "Packed with care",
                        "Handed to our courier",
                        "Arriving today",
                        "In your hands",
                      ][index]
                    }
                  </small>
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </section>

      {/* ---------- RESULTS ---------- */}
      {order && (
        <section className="track-results" ref={resultRef}>
          <div className={`track-status ${cancelled ? "is-cancelled" : ""}`}>
            <div className="track-status-top">
              <div>
                <span className="track-label">ORDER {order.orderNumber}</span>
                <h2>
                  {headline.title}
                  <span>.</span>
                </h2>
                <p>{headline.text}</p>
                {courierLatest && !cancelled && status !== "delivered" && (
                  <span className="track-courier-status">
                    <span className="track-live-dot" /> Latest from courier: {courierLatest}
                  </span>
                )}
              </div>

              <div className="track-eta">
                <span>{status === "delivered" ? "DELIVERED ON" : cancelled ? "STATUS" : "EXPECTED BY"}</span>
                <strong>{cancelled ? "Cancelled" : etaText}</strong>
                {order.shipTo && (
                  <small>
                    <MapPin size={13} /> {order.shipTo}
                  </small>
                )}
              </div>
            </div>

            {cancelled ? (
              <p className="track-cancel-note">
                <XCircle size={18} /> Paid online? Your refund goes back to the original payment method within 5–7 working
                days.
              </p>
            ) : (
              <ol className="track-steps" style={{ "--progress": `${(stepIndex / (STEPS.length - 1)) * 100}%` }}>
                {STEPS.map(({ key, title, icon: Icon }, index) => (
                  <li
                    key={key}
                    className={`${index < stepIndex ? "is-done" : ""} ${index === stepIndex ? "is-current" : ""}`}
                  >
                    <span className="track-step-dot">{index < stepIndex ? <Check size={16} /> : <Icon size={16} />}</span>
                    <span className="track-step-title">{title}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* courier strip */}
          <div className="track-courier">
            <div>
              <span className="track-label">COURIER</span>
              <strong>{tracking.courier || "Assigned when your order ships"}</strong>
            </div>
            <div>
              <span className="track-label">TRACKING NUMBER (AWB)</span>
              {tracking.awb ? (
                <button type="button" className="track-awb" onClick={() => copyAwb(tracking.awb)}>
                  {tracking.awb} {copied ? <Check size={15} /> : <Copy size={15} />}
                  <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
                </button>
              ) : (
                <strong>Not assigned yet</strong>
              )}
            </div>
            {tracking.trackingUrl && (
              <a className="track-courier-link" href={tracking.trackingUrl} target="_blank" rel="noopener noreferrer">
                TRACK ON COURIER SITE <ExternalLink size={16} />
              </a>
            )}
          </div>

          <div className="track-columns">
            {/* journey */}
            <article className="track-card">
              <header className="track-card-head">
                <span className="track-label">SHIPMENT UPDATES</span>
                <h3>Journey log.</h3>
              </header>

              {events.length ? (
                <ol className="track-timeline">
                  {events.map((event, index) => (
                    <li key={index} className={index === 0 ? "is-latest" : ""}>
                      <span className="track-timeline-dot" />
                      <div>
                        <strong>{event.message || event.status || "Shipment updated"}</strong>
                        <small>
                          {formatDateTime(event.date)}
                          {event.location ? ` · ${event.location}` : ""}
                        </small>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="track-empty">Updates will appear here as your order moves.</p>
              )}
            </article>

            {/* summary */}
            <article className="track-card">
              <header className="track-card-head">
                <span className="track-label">YOUR ORDER</span>
                <h3>Summary.</h3>
              </header>

              <ul className="track-items">
                {items.map((item, index) => (
                  <li key={index}>
                    <span className="track-item-image">
                      {item.image ? <img src={item.image} alt="" loading="lazy" /> : <Package size={22} />}
                    </span>
                    <span className="track-item-info">
                      <strong>{item.name}</strong>
                      <small>
                        Qty {item.quantity}
                        {item.color ? ` · ${item.color}` : ""}
                      </small>
                    </span>
                    <span className="track-item-price">{formatPrice((item.price || 0) * (item.quantity || 1))}</span>
                  </li>
                ))}
              </ul>

              <dl className="track-totals">
                <div>
                  <dt>Payment</dt>
                  <dd>{paymentText(order.payment)}</dd>
                </div>
                {order.placedAt && (
                  <div>
                    <dt>Ordered on</dt>
                    <dd>{formatDateTime(order.placedAt)}</dd>
                  </div>
                )}
                <div className="track-total">
                  <dt>Total</dt>
                  <dd>{formatPrice(order.total)}</dd>
                </div>
                {order.payment?.dueOnDelivery > 0 && order.payment?.advancePaid > 0 && (
                  <div>
                    <dt>To pay on delivery</dt>
                    <dd>{formatPrice(order.payment.dueOnDelivery)}</dd>
                  </div>
                )}
              </dl>
            </article>
          </div>
        </section>
      )}

      {/* ---------- HELP ---------- */}
      <section className="track-help">
        <div>
          <span className="track-label">NEED HELP?</span>
          <h2>
            Questions about your <span>delivery?</span>
          </h2>
          <p>Message us with your order number — we usually reply within a few hours.</p>
        </div>
        <div className="track-help-actions">
          <a
            className="track-help-primary"
            href={`https://wa.me/${WHATSAPP}${order ? `?text=${encodeURIComponent(`Hi, I need help with order ${order.orderNumber}`)}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={18} /> WHATSAPP US
          </a>
          <Link className="track-help-secondary" to="/contact">
            CONTACT SUPPORT <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
    </div>
  );
}
