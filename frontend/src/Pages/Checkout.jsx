
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  ArrowRight,
  LockKeyhole,
  CreditCard,
  Banknote,
  ChevronDown,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
  QrCode,
  Clock,
  CheckCircle2,
} from "lucide-react";

import "../Style/Checkout.css";

const CART_KEY = "gadgete_cart";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

// ==========================================
// CART HELPERS
// ==========================================

const getCart = () => {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
};

const getName = (item) =>
  item.name || item.title || item.productName || "GADGETÉ Product";

const getImage = (item) => {
  const image =
    item.image ||
    item.images?.[0] ||
    item.thumbnail ||
    item.productImage ||
    "";

  return typeof image === "string" ? image : image?.url || "";
};

const getPrice = (item) => {
  const value = item.price ?? item.salePrice ?? item.amount ?? 0;

  if (typeof value === "number") return value;

  return Number(String(value).replace(/[^\d.]/g, "")) || 0;
};

const formatPrice = (price) =>
  `₹${Number(price || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

// ==========================================
// API REQUEST
// ==========================================

async function createOrder(payload) {
  const response = await fetch(`${API_URL}/orders/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || "Unable to place your order. Please try again."
    );
  }

  return data;
}

// ==========================================
// CHECKOUT COMPONENT
// ==========================================

const Checkout = () => {
  const navigate = useNavigate();

  const [cart, setCart] = useState(getCart);
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentExpired, setPaymentExpired] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [clockNow, setClockNow] = useState(Date.now());

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    pincode: "",
  });

  // ==========================================
  // CART UPDATE LISTENERS
  // ==========================================

  useEffect(() => {
    const updateCart = () => {
      setCart(getCart());
    };

    window.addEventListener("gadgete-cart-updated", updateCart);
    window.addEventListener("storage", updateCart);

    return () => {
      window.removeEventListener("gadgete-cart-updated", updateCart);
      window.removeEventListener("storage", updateCart);
    };
  }, []);

  // ==========================================
  // QR PAYMENT STATUS POLLING
  // ==========================================

  useEffect(() => {
    if (!paymentOrder?.orderId) return undefined;

    let active = true;
    let checking = false;

    const checkPayment = async () => {
      if (checking) return;
      checking = true;

      try {
        const response = await fetch(
          `${API_URL}/orders/${encodeURIComponent(paymentOrder.orderId)}/status`,
          { method: "GET", cache: "no-store" }
        );
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Unable to verify payment status.");
        }

        if (!active) return;

        if (data.paymentStatus === "paid") {
          localStorage.removeItem(CART_KEY);
          window.dispatchEvent(
            new CustomEvent("gadgete-cart-updated", { detail: [] })
          );
          navigate(
            `/order-success?order=${encodeURIComponent(paymentOrder.orderId)}`,
            { replace: true }
          );
          return;
        }

        if (
          ["expired", "cancelled", "failed"].includes(data.status) ||
          data.paymentStatus === "failed"
        ) {
          setPaymentExpired(true);
          setPaymentMessage(
            "This payment QR has expired or been cancelled. Please return to checkout and place a new order."
          );
        }
      } catch (err) {
        if (active) {
          setPaymentMessage(
            err.message || "Payment status check failed. We will keep checking."
          );
        }
      } finally {
        checking = false;
      }
    };

    checkPayment();
    const interval = window.setInterval(checkPayment, 2500);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [paymentOrder, navigate]);

  useEffect(() => {
    if (!paymentOrder?.expiresAt || paymentExpired) return undefined;
    const interval = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [paymentOrder, paymentExpired]);

  // ==========================================
  // CART CALCULATIONS
  // ==========================================

  const itemCount = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total + Math.max(0, Number(item.quantity) || 0),
        0
      ),
    [cart]
  );

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total + getPrice(item) * (Number(item.quantity) || 1),
        0
      ),
    [cart]
  );

  // Display estimate only.
  // Backend calculates the actual shipping and discount.

  const shipping = 0;
  const total = subtotal + shipping;

  // ==========================================
  // FORM HANDLING
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  // ==========================================
  // PLACE ORDER
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    if (!cart.length) {
      setError("Your cart is empty.");
      navigate("/shop");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!/^\d{6}$/.test(form.pincode)) {
      setError("Please enter a valid 6-digit PIN code.");
      return;
    }

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!form.address1.trim() || !form.city.trim() || !form.state) {
      setError("Please complete your delivery address.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Backend accepts "upi" or "cod".
      const selectedPayment =
        paymentMethod === "online" ? "upi" : "cod";

      // Never trust browser prices.
      // Backend fetches product prices and stock from MongoDB.

      const orderItems = cart.map((item) => ({
        productId: item.productId || item.id || item._id || "",
        slug: item.slug || "",
        quantity: Math.max(1, Number(item.quantity) || 1),
        color: item.color || "",
      }));

      const payload = {
        checkoutKey: crypto.randomUUID().replace(/-/g, ""),

        paymentMethod: selectedPayment,

        items: orderItems,

        customer: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone,
          email: form.email.trim(),
        },

        shippingAddress: {
          line1: form.address1.trim(),
          line2: form.address2.trim(),
          city: form.city.trim(),
          state: form.state,
          pincode: form.pincode,
        },
      };

      // Send order to existing Express backend.

      const data = await createOrder(payload);

      console.log("Checkout response:", data);

      // ======================================
      // ONLINE PAYMENT - RAZORPAY
      // ======================================

      if (selectedPayment === "upi") {
        if (!data.orderId || !data.qrImageUrl) {
          throw new Error(
            "The server did not return a payment QR code. Please try again or contact support."
          );
        }

        // Keep the cart until the backend confirms that the payment is captured.
        setPaymentExpired(false);
        setPaymentMessage("");
        setPaymentOrder({
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          qrId: data.qrId,
          qrImageUrl: data.qrImageUrl,
          expiresAt: data.expiresAt,
          total: data.total,
        });
        return;
      }

      // ======================================
      // CASH ON DELIVERY
      // ======================================

      if (selectedPayment === "cod") {
        if (!data.orderId) {
          throw new Error(
            "Order was created but the confirmation token was not returned."
          );
        }

        localStorage.removeItem(CART_KEY);

        window.dispatchEvent(
          new CustomEvent("gadgete-cart-updated", {
            detail: [],
          })
        );

        navigate(
          `/order-success?order=${encodeURIComponent(data.orderId)}`
        );

        return;
      }
    } catch (err) {
      console.error("Checkout error:", err);

      setError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // QR PAYMENT SCREEN
  // ==========================================

  if (paymentOrder) {
    const expiresAtMs = paymentOrder.expiresAt
      ? new Date(paymentOrder.expiresAt).getTime()
      : null;
    const secondsLeft = expiresAtMs
      ? Math.max(0, Math.floor((expiresAtMs - clockNow) / 1000))
      : null;
    const countdown =
      secondsLeft === null
        ? "Waiting for payment"
        : `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(
            secondsLeft % 60
          ).padStart(2, "0")}`;

    const cancelQrPayment = async () => {
      setLoading(true);
      setPaymentMessage("");
      try {
        const response = await fetch(
          `${API_URL}/orders/${encodeURIComponent(paymentOrder.orderId)}/cancel-payment`,
          { method: "POST", cache: "no-store" }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || "Unable to cancel this payment.");
        }
        if (data.paymentStatus === "paid") {
          navigate(
            `/order-success?order=${encodeURIComponent(paymentOrder.orderId)}`,
            { replace: true }
          );
          return;
        }
        setPaymentOrder(null);
        setPaymentExpired(false);
        setPaymentMessage("");
        setError("Payment cancelled. You can place a new order.");
      } catch (err) {
        setPaymentMessage(err.message || "Unable to cancel payment.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <main className="ge-checkout-page">
        <section
          className="ge-payment-card"
          style={{
            maxWidth: "560px",
            margin: "50px auto",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
            {paymentExpired ? (
              <AlertCircle size={34} color="#d32f2f" />
            ) : (
              <QrCode size={34} />
            )}
          </div>

          <h1 style={{ marginBottom: "8px" }}>
            {paymentExpired ? "PAYMENT QR EXPIRED." : "SCAN TO PAY."}
          </h1>
          <p>
            Order <strong>{paymentOrder.orderNumber || ""}</strong>
          </p>

          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              padding: "16px",
              display: "inline-flex",
              justifyContent: "center",
              margin: "18px auto",
            }}
          >
            <img
              src={paymentOrder.qrImageUrl}
              alt="Razorpay payment QR code"
              style={{
                display: "block",
                width: "min(280px, 65vw)",
                height: "auto",
                objectFit: "contain",
              }}
            />
          </div>

          <h2 style={{ margin: "4px 0 12px" }}>
            {formatPrice(paymentOrder.total)}
          </h2>

          {!paymentExpired && (
            <p style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center" }}>
              <Clock size={18} />
              QR expires in <strong>{countdown}</strong>
            </p>
          )}

          <p style={{ marginTop: "12px" }}>
            {paymentExpired
              ? paymentMessage || "This QR code is no longer valid."
              : "Open any supported UPI app, scan this QR code, and pay the exact amount shown. Keep this page open while we verify your payment."}
          </p>

          {!paymentExpired && (
            <p style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", marginTop: "14px" }}>
              <RefreshCw size={16} className="ge-checkout-spinner" />
              Waiting for payment confirmation…
            </p>
          )}

          {paymentMessage && !paymentExpired && (
            <p role="status" style={{ color: "#b45309", marginTop: "10px" }}>
              {paymentMessage}
            </p>
          )}

          {paymentExpired && (
            <button
              type="button"
              className="ge-place-order"
              onClick={() => {
                setPaymentOrder(null);
                setPaymentExpired(false);
                setPaymentMessage("");
              }}
              style={{ marginTop: "18px" }}
            >
              RETURN TO CHECKOUT <ArrowRight size={20} />
            </button>
          )}

          {!paymentExpired && (
            <button
              type="button"
              className="ge-place-order"
              onClick={cancelQrPayment}
              disabled={loading}
              style={{ marginTop: "18px" }}
            >
              {loading ? "CANCELLING..." : "CANCEL PAYMENT"}
            </button>
          )}
        </section>
      </main>
    );
  }

  // ==========================================
  // EMPTY CART
  // ==========================================

  if (!cart.length) {
    return (
      <main className="ge-checkout-page">
        <div className="ge-checkout-empty">
          <ShoppingBag size={55} />

          <h1>
            YOUR CART IS <span>EMPTY.</span>
          </h1>

          <p>Add some products before proceeding to checkout.</p>

          <Link to="/shop" className="ge-place-order">
            EXPLORE PRODUCTS <ArrowRight size={20} />
          </Link>
        </div>
      </main>
    );
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main className="ge-checkout-page">

      {/* BREADCRUMB */}

      <div className="ge-checkout-breadcrumb">
        <Link to="/">HOME</Link>
        <span>›</span>
        <Link to="/cart">CART</Link>
        <span>›</span>
        <strong>CHECKOUT</strong>
      </div>

      {/* PAGE HEADING */}

      <section className="ge-checkout-heading">
        <h1>
          CHECK<span>OUT.</span>
        </h1>

        <div className="ge-checkout-heading-description">
          COMPLETE YOUR ORDER
          <br />
          IN A FEW SIMPLE STEPS.
        </div>

        <div className="ge-checkout-steps">
          <div className="ge-step active">
            <span>1</span>
            DETAILS
          </div>

          <i />

          <div className="ge-step">
            <span>2</span>
            PAYMENT
          </div>

          <i />

          <div className="ge-step">
            <span>3</span>
            CONFIRM
          </div>
        </div>
      </section>

      <form className="ge-checkout-layout" onSubmit={handleSubmit}>

        {/* SHIPPING DETAILS */}

        <section className="ge-shipping-card">

          <h2>
            SHIPPING <span>DETAILS.</span>
          </h2>

          <p className="ge-shipping-subtitle">
            ENTER YOUR INFORMATION FOR DELIVERY.
          </p>

          <div className="ge-form-grid">

            {/* FIRST NAME */}

            <div className="ge-form-group">
              <label htmlFor="firstName">First Name *</label>

              <input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="Enter first name"
                value={form.firstName}
                onChange={handleChange}
                required
                autoComplete="given-name"
              />
            </div>

            {/* LAST NAME */}

            <div className="ge-form-group">
              <label htmlFor="lastName">Last Name *</label>

              <input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Enter last name"
                value={form.lastName}
                onChange={handleChange}
                required
                autoComplete="family-name"
              />
            </div>

            {/* PHONE */}

            <div className="ge-form-group">
              <label htmlFor="phone">Phone Number *</label>

              <div className="ge-phone-input">
                <span>+91</span>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  value={form.phone}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "phone",
                        value: e.target.value.replace(/\D/g, "").slice(0, 10),
                      },
                    })
                  }
                  required
                  autoComplete="tel-national"
                />
              </div>
            </div>

            {/* EMAIL */}

            <div className="ge-form-group">
              <label htmlFor="email">Email Address *</label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="yourname@gmail.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            {/* ADDRESS 1 */}

            <div className="ge-form-group">
              <label htmlFor="address1">Address Line 1 *</label>

              <input
                id="address1"
                name="address1"
                type="text"
                placeholder="House number, street name"
                value={form.address1}
                onChange={handleChange}
                required
                autoComplete="address-line1"
              />
            </div>

            {/* ADDRESS 2 */}

            <div className="ge-form-group">
              <label htmlFor="address2">Address Line 2</label>

              <input
                id="address2"
                name="address2"
                type="text"
                placeholder="Apartment, landmark, area"
                value={form.address2}
                onChange={handleChange}
                autoComplete="address-line2"
              />
            </div>

            {/* CITY */}

            <div className="ge-form-group ge-city">
              <label htmlFor="city">City *</label>

              <input
                id="city"
                name="city"
                type="text"
                placeholder="Enter city"
                value={form.city}
                onChange={handleChange}
                required
                autoComplete="address-level2"
              />
            </div>

            {/* STATE */}

            <div className="ge-form-group ge-state">
              <label htmlFor="state">State *</label>

              <div className="ge-select-wrapper">
                <select
                  id="state"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  required
                  autoComplete="address-level1"
                >
                  <option value="">Select State</option>

                  {[
                    "Andaman and Nicobar Islands",
                    "Andhra Pradesh",
                    "Arunachal Pradesh",
                    "Assam",
                    "Bihar",
                    "Chandigarh",
                    "Chhattisgarh",
                    "Dadra and Nagar Haveli and Daman and Diu",
                    "Delhi",
                    "Goa",
                    "Gujarat",
                    "Haryana",
                    "Himachal Pradesh",
                    "Jammu and Kashmir",
                    "Jharkhand",
                    "Karnataka",
                    "Kerala",
                    "Ladakh",
                    "Lakshadweep",
                    "Madhya Pradesh",
                    "Maharashtra",
                    "Manipur",
                    "Meghalaya",
                    "Mizoram",
                    "Nagaland",
                    "Odisha",
                    "Puducherry",
                    "Punjab",
                    "Rajasthan",
                    "Sikkim",
                    "Tamil Nadu",
                    "Telangana",
                    "Tripura",
                    "Uttar Pradesh",
                    "Uttarakhand",
                    "West Bengal",
                  ].map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>

                <ChevronDown size={19} />
              </div>
            </div>

            {/* PIN CODE */}

            <div className="ge-form-group ge-pincode">
              <label htmlFor="pincode">PIN Code *</label>

              <input
                id="pincode"
                name="pincode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="400001"
                value={form.pincode}
                onChange={(e) =>
                  handleChange({
                    target: {
                      name: "pincode",
                      value: e.target.value.replace(/\D/g, "").slice(0, 6),
                    },
                  })
                }
                required
                autoComplete="postal-code"
              />
            </div>

          </div>

        </section>

        {/* RIGHT SIDE */}

        <aside className="ge-checkout-right">

          {/* ORDER SUMMARY */}

          <section className="ge-order-summary">

            <div className="ge-summary-heading">
              <h2>
                ORDER <span>SUMMARY.</span>
              </h2>

              <strong>
                {String(itemCount).padStart(2, "0")}
                <small> ITEMS</small>
              </strong>
            </div>

            <div className="ge-checkout-products">

              {cart.map((item, index) => {
                const image = getImage(item);
                const name = getName(item);
                const quantity = Number(item.quantity) || 1;
                const price = getPrice(item);

                return (
                  <div
                    className="ge-checkout-product"
                    key={`${item.id || item.slug || name}-${index}`}
                  >

                    <div className="ge-checkout-product-image">
                      {image ? (
                        <img src={image} alt={name} />
                      ) : (
                        <ShoppingBag size={25} />
                      )}
                    </div>

                    <div className="ge-checkout-product-info">
                      <h3>{name}</h3>
                      <p>Color: {item.color || "Standard"}</p>
                    </div>

                    <span className="ge-checkout-quantity">
                      × {quantity}
                    </span>

                    <strong className="ge-checkout-price">
                      {formatPrice(price * quantity)}
                    </strong>

                  </div>
                );
              })}

            </div>

            <div className="ge-checkout-summary-divider" />

            <div className="ge-checkout-summary-row">
              <span>Subtotal ({itemCount} items)</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <div className="ge-checkout-summary-row">
              <span>Shipping</span>
              <strong className="ge-free-shipping">FREE</strong>
            </div>

            <div className="ge-checkout-summary-divider" />

            <div className="ge-checkout-total">
              <span>Total*</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            <small>*Final total and applicable discounts are calculated by the server.</small>

          </section>

          {/* PAYMENT METHOD */}

          <section className="ge-payment-card">

            <div className="ge-payment-heading">
              <h2>
                PAYMENT <span>METHOD.</span>
              </h2>

              <small>CHOOSE HOW YOU'D LIKE TO PAY.</small>
            </div>

            {/* ONLINE PAYMENT */}

            <label
              className={`ge-payment-option ${
                paymentMethod === "online" ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="online"
                checked={paymentMethod === "online"}
                onChange={() => setPaymentMethod("online")}
              />

              <span className="ge-custom-radio" />

              <CreditCard size={30} />

              <span className="ge-payment-option-text">
                <strong>Pay Online</strong>

                <small>
                  UPI, Cards, Net Banking and Wallets
                </small>
              </span>
            </label>

            {/* COD */}

            <label
              className={`ge-payment-option ${
                paymentMethod === "cod" ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="cod"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
              />

              <span className="ge-custom-radio" />

              <Banknote size={30} />

              <span className="ge-payment-option-text">
                <strong>Cash on Delivery (COD)</strong>

                <small>
                  Pay in cash when your order is delivered
                </small>
              </span>
            </label>

            {/* ERROR */}

            {error && (
              <div
                className="ge-checkout-error"
                role="alert"
                style={{
                  padding: "12px",
                  marginTop: "12px",
                  borderRadius: "8px",
                  background: "#fff0f0",
                  color: "#c62828",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  fontSize: "13px",
                }}
              >
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* PLACE ORDER */}

            <button
              type="submit"
              className="ge-place-order"
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw
                    size={20}
                    className="ge-checkout-spinner"
                  />
                  PROCESSING...
                </>
              ) : (
                <>
                  <LockKeyhole size={21} />
                  PLACE ORDER
                  <ArrowRight size={21} />
                </>
              )}
            </button>

          </section>

        </aside>

      </form>

    </main>
  );
};

export default Checkout;
