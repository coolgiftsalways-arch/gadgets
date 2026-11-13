import { useState, useEffect, useRef } from "react";
import gsap from "gsap";

import {
  Search,
  ArrowUpRight,
  Package,
  PackageCheck,
  Truck,
  MapPin,
  Clock3,
  Check,
  Radio,
  Box,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import "../Style/TrackOrder.css";

// ==========================================
// API CONFIGURATION
// ==========================================

const API_URL = import.meta.env.VITE_API_URL || "/api";

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const formatDate = (date) => {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatPrice = (price) => {
  if (price === undefined || price === null) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(price) || 0);
};

const getStatus = (status = "") => {
  const value = String(status).toLowerCase();

  if (value.includes("deliver")) {
    return "delivered";
  }

  if (value.includes("out for delivery")) {
    return "out-for-delivery";
  }

  if (
    value.includes("transit") ||
    value.includes("shipped") ||
    value.includes("dispatched")
  ) {
    return "shipped";
  }

  if (value.includes("cancel")) {
    return "cancelled";
  }

  if (value.includes("pickup")) {
    return "picked-up";
  }

  return "processing";
};

const getStatusLabel = (status = "") => {
  const labels = {
    delivered: "Delivered",
    "out-for-delivery": "Out for delivery",
    shipped: "In transit",
    cancelled: "Cancelled",
    "picked-up": "Picked up",
    processing: "Processing",
  };

  return labels[getStatus(status)] || status || "Processing";
};

// ==========================================
// TRACK ORDER COMPONENT
// ==========================================

export default function TrackOrder() {
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pageRef = useRef(null);
  const resultRef = useRef(null);

  // ==========================================
  // GSAP ANIMATIONS
  // ==========================================

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".track-hero-content > *", {
        y: 45,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: "power4.out",
      });

      gsap.from(".track-search-card", {
        y: 35,
        opacity: 0,
        duration: 0.9,
        delay: 0.25,
        ease: "power3.out",
      });

      gsap.from(".track-decoration", {
        scale: 0.7,
        opacity: 0,
        duration: 1.2,
        delay: 0.3,
        ease: "power3.out",
      });
    }, pageRef);

    return () => ctx.revert();
  }, []);

  // ==========================================
  // FETCH ORDER TRACKING
  // ==========================================

  const handleTrackOrder = async (event) => {
    event.preventDefault();

    const formattedId = orderId.trim();

    if (!formattedId) {
      setError("Please enter your order ID.");
      return;
    }

    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const response = await fetch(
        `${API_URL}/orders/${encodeURIComponent(formattedId)}/tracking`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Unable to find your order. Please check your order ID.",
        );
      }

      // Support common API response structures.
      const orderData = data.order || data.data?.order || data.data || data;

      if (!orderData || typeof orderData !== "object") {
        throw new Error("Invalid tracking information received.");
      }

      setOrder(orderData);

      // Animate tracking results.
      requestAnimationFrame(() => {
        if (resultRef.current) {
          gsap.fromTo(
            resultRef.current,
            {
              opacity: 0,
              y: 40,
            },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: "power3.out",
            },
          );
        }
      });
    } catch (err) {
      console.error("Tracking error:", err);

      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ORDER DATA
  // ==========================================

  const tracking =
    order?.tracking || order?.shipment || order?.shiprocket || {};

  const status =
    tracking.current_status ||
    tracking.status ||
    order?.orderStatus ||
    order?.status ||
    "Processing";

  const normalizedStatus = getStatus(status);

  const timeline =
    tracking.activities ||
    tracking.tracking_data?.shipment_track_activities ||
    tracking.tracking_data?.track_activities ||
    order?.timeline ||
    order?.history ||
    [];

  const items = order?.items || order?.products || order?.orderItems || [];

  const courier =
    tracking.courier_name ||
    tracking.courier ||
    tracking.courierName ||
    order?.courier ||
    "Courier details pending";

  const awb =
    tracking.awb_code || tracking.awb || tracking.awbCode || order?.awb || "";

  const trackingUrl =
    tracking.tracking_url || tracking.trackingUrl || order?.trackingUrl || "";

  const deliveryDate =
    tracking.edd ||
    tracking.estimated_delivery_date ||
    tracking.expected_delivery ||
    order?.estimatedDelivery ||
    order?.deliveryDate;

  const orderNumber =
    order?.orderId ||
    order?.order_id ||
    order?.orderNumber ||
    order?._id ||
    order?.id ||
    orderId;

  const total =
    order?.totalAmount ?? order?.total ?? order?.grandTotal ?? order?.amount;

  const paymentMethod =
    order?.paymentMethod ||
    order?.payment_method ||
    order?.payment?.method ||
    "Not available";

  // ==========================================
  // TRACKING STEPS
  // ==========================================

  const steps = [
    {
      title: "Order placed",
      description: "Your order has been received.",
      icon: Package,
    },
    {
      title: "Processing",
      description: "Your order is being prepared.",
      icon: Box,
    },
    {
      title: "Shipped",
      description: "Your package is on its way.",
      icon: Truck,
    },
    {
      title: "Out for delivery",
      description: "Your package is almost there.",
      icon: MapPin,
    },
    {
      title: "Delivered",
      description: "Your order has arrived.",
      icon: PackageCheck,
    },
  ];

  const getActiveStep = () => {
    switch (normalizedStatus) {
      case "delivered":
        return 5;

      case "out-for-delivery":
        return 4;

      case "shipped":
        return 3;

      case "picked-up":
        return 3;

      case "cancelled":
        return 0;

      default:
        return 2;
    }
  };

  const activeStep = getActiveStep();

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="track-page" ref={pageRef}>
      {/* HERO */}

      <section className="track-hero">
        <div className="track-grid" />

        <div className="track-decoration">
          <div className="track-orbit orbit-one" />
          <div className="track-orbit orbit-two" />

          <div className="track-orbit-center">
            <PackageCheck size={75} strokeWidth={1} />
            <span>G</span>
          </div>

          <div className="track-floating-icon floating-one">
            <Truck size={23} />
          </div>

          <div className="track-floating-icon floating-two">
            <MapPin size={23} />
          </div>
        </div>

        <div className="track-hero-content">
          <div className="track-eyebrow">
            <span className="track-live-dot" />
            GADGETÉ DELIVERY SYSTEM
          </div>

          <h1>
            YOUR ORDER.
            <br />
            <span>YOUR JOURNEY.</span>
          </h1>

          <p>
            Every great delivery has a story. Follow yours, from our hands to
            yours.
          </p>

          <div className="track-hero-bottom">
            <span>01 — TRACKING EXPERIENCE</span>
            <span>GADGETÉ® INDIA</span>
          </div>
        </div>

        <div className="track-hero-index">
          <span>SCROLL TO</span>
          <ArrowUpRight size={18} />
        </div>
      </section>

      {/* SEARCH SECTION */}

      <section className="track-search-section">
        <div className="track-section-label">
          <span>01 / FIND YOUR ORDER</span>
          <span>ORDER TRACKING</span>
        </div>

        <div className="track-search-card">
          <div className="track-search-heading">
            <div>
              <span className="track-small-label">WHERE IS YOUR PACKAGE?</span>

              <h2>
                Let's find <span>it.</span>
              </h2>
            </div>

            <div className="track-search-icon">
              <Search size={30} />
            </div>
          </div>

          <form className="track-search-form" onSubmit={handleTrackOrder}>
            <div className="track-input-wrap">
              <Search size={19} />

              <input
                type="text"
                placeholder="Enter your order ID..."
                value={orderId}
                onChange={(e) => {
                  setOrderId(e.target.value);
                  setError("");
                }}
              />

              {orderId && (
                <button
                  type="button"
                  className="track-clear"
                  onClick={() => setOrderId("")}
                  aria-label="Clear order ID"
                >
                  ×
                </button>
              )}
            </div>

            <button type="submit" className="track-submit" disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="track-spin" size={18} />
                  TRACKING...
                </>
              ) : (
                <>
                  TRACK ORDER
                  <ArrowUpRight size={20} />
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="track-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="track-search-footer">
            <span>
              <ShieldCheck size={15} />
              SECURE ORDER LOOKUP
            </span>

            <span>ENTER YOUR ORDER NUMBER TO BEGIN ↗</span>
          </div>
        </div>
      </section>

      {/* TRACKING RESULTS */}

      {order && (
        <section className="track-results" ref={resultRef}>
          <div className="track-section-label">
            <span>02 / YOUR SHIPMENT</span>
            <span>LIVE ORDER DETAILS</span>
          </div>

          {/* STATUS HEADER */}

          <div className="track-status-card">
            <div className="track-status-main">
              <div className="track-status-icon">
                {normalizedStatus === "delivered" ? (
                  <PackageCheck size={34} />
                ) : (
                  <Truck size={34} />
                )}
              </div>

              <div>
                <span className="track-small-label">
                  CURRENT SHIPMENT STATUS
                </span>

                <h2>
                  {getStatusLabel(status)}
                  <span>.</span>
                </h2>

                <p>Order #{String(orderNumber).slice(-12)}</p>
              </div>
            </div>

            <div className="track-status-badge">
              <span className="track-live-dot" />
              {normalizedStatus === "delivered"
                ? "COMPLETED"
                : normalizedStatus === "cancelled"
                  ? "CANCELLED"
                  : "IN PROGRESS"}
            </div>
          </div>

          {/* DELIVERY INFORMATION */}

          <div className="track-info-grid">
            <div className="track-info-card">
              <Clock3 size={21} />

              <span>ESTIMATED DELIVERY</span>

              <strong>
                {deliveryDate ? formatDate(deliveryDate) : "Awaiting update"}
              </strong>
            </div>

            <div className="track-info-card">
              <Truck size={21} />

              <span>COURIER PARTNER</span>

              <strong>{courier}</strong>
            </div>

            <div className="track-info-card">
              <Radio size={21} />

              <span>AWB / TRACKING ID</span>

              <strong>{awb || "Not assigned yet"}</strong>
            </div>
          </div>

          {/* PROGRESS */}

          <div className="track-progress-card">
            <div className="track-card-heading">
              <div>
                <span className="track-small-label">DELIVERY PROGRESS</span>

                <h3>On its way.</h3>
              </div>

              <span className="track-progress-count">
                {Math.round((activeStep / 5) * 100)}%
              </span>
            </div>

            <div className="track-progress-line">
              <div
                className="track-progress-active"
                style={{
                  width: `${(activeStep / 5) * 100}%`,
                }}
              />
            </div>

            <div className="track-steps">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const completed = index < activeStep;
                const active = index === activeStep - 1;

                return (
                  <div
                    className={`track-step ${
                      completed ? "completed" : ""
                    } ${active ? "active" : ""}`}
                    key={step.title}
                  >
                    <div className="track-step-icon">
                      {completed ? <Check size={17} /> : <Icon size={17} />}
                    </div>

                    <div className="track-step-text">
                      <strong>{step.title}</strong>
                      <span>{step.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TRACKING TIMELINE */}

          <div className="track-timeline-card">
            <div className="track-card-heading">
              <div>
                <span className="track-small-label">SHIPMENT ACTIVITY</span>

                <h3>Journey log.</h3>
              </div>

              <Radio size={22} />
            </div>

            {timeline.length > 0 ? (
              <div className="track-timeline">
                {timeline.map((activity, index) => {
                  const activityDate =
                    activity.date ||
                    activity.timestamp ||
                    activity.activity_date;

                  const activityStatus =
                    activity.activity ||
                    activity.status ||
                    activity.description ||
                    "Shipment updated";

                  const location =
                    activity.location ||
                    activity.city ||
                    activity.current_location ||
                    "";

                  return (
                    <div className="track-timeline-item" key={index}>
                      <div className="track-timeline-marker">
                        <span />
                      </div>

                      <div className="track-timeline-content">
                        <div className="track-timeline-top">
                          <strong>{activityStatus}</strong>

                          <span>{formatDate(activityDate)}</span>
                        </div>

                        {location && (
                          <p>
                            <MapPin size={14} />
                            {location}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="track-empty-timeline">
                <Clock3 size={27} />

                <p>
                  Shipment activity will appear here once your order is updated.
                </p>
              </div>
            )}
          </div>

          {/* ORDER MANIFEST */}

          <div className="track-manifest-card">
            <div className="track-card-heading">
              <div>
                <span className="track-small-label">YOUR PURCHASE</span>

                <h3>Order manifest.</h3>
              </div>

              <Package size={25} />
            </div>

            {items.length > 0 ? (
              <div className="track-items">
                {items.map((item, index) => {
                  const product = item.product || item;

                  const name =
                    product.name ||
                    product.title ||
                    item.productName ||
                    "Product";

                  const image =
                    product.image || product.images?.[0] || item.image;

                  const quantity = item.quantity || 1;

                  const price = item.price || product.price || 0;

                  return (
                    <div className="track-product" key={item._id || index}>
                      <div className="track-product-image">
                        {image ? (
                          <img src={image} alt={name} />
                        ) : (
                          <Package size={26} />
                        )}
                      </div>

                      <div className="track-product-info">
                        <strong>{name}</strong>

                        <span>QUANTITY: {quantity}</span>
                      </div>

                      <strong className="track-product-price">
                        {formatPrice(price * quantity)}
                      </strong>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="track-no-items">
                Product details are not available.
              </p>
            )}

            <div className="track-order-total">
              <div>
                <span>PAYMENT METHOD</span>
                <strong>{paymentMethod}</strong>
              </div>

              <div className="track-total-price">
                <span>ORDER TOTAL</span>
                <strong>{formatPrice(total)}</strong>
              </div>
            </div>
          </div>

          {/* TRACKING LINK */}

          {trackingUrl && (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="track-external-link"
            >
              TRACK WITH COURIER PARTNER
              <ExternalLink size={18} />
            </a>
          )}
        </section>
      )}

      {/* BOTTOM CTA */}

      <section className="track-bottom">
        <div className="track-bottom-left">
          <span>GADGETÉ® — THE FUTURE IN YOUR HANDS</span>

          <h2>
            GOOD THINGS
            <br />
            ARE <span>ON THEIR WAY.</span>
          </h2>
        </div>

        <div className="track-bottom-right">
          <p>
            Need a little help with your order? Our customer care team is here
            for you.
          </p>

          <a href="/contact">
            CONTACT SUPPORT
            <ArrowUpRight size={19} />
          </a>
        </div>
      </section>

      {/* FOOTER STRIP */}

      <div className="track-footer-strip">
        <span>GADGETÉ®</span>
        <span>GOOD TECH. BETTER LIFE.</span>
        <span>MADE TO MOVE ↗</span>
      </div>
    </div>
  );
}
