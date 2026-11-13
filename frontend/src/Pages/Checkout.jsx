import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRight,
  LockKeyhole,
  Smartphone,
  Banknote,
  ChevronDown,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import {
  api,
  cartToApiItems,
  deliveryWindow,
  formatPrice,
  getCart,
  imageUrl,
} from "../shopApi";
import "../Style/Checkout.css";

const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];

const newKey = () =>
  (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9_-]/g, "");

const Checkout = () => {
  const navigate = useNavigate();
  const [cart] = useState(getCart);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [upiOrder, setUpiOrder] = useState(null);
  const checkoutKey = useRef(newKey());

  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", email: "",
    address1: "", address2: "", city: "", state: "", pincode: "",
  });

  const items = useMemo(() => cartToApiItems(cart), [cart]);

  // Real prices and stock from the server.
  useEffect(() => {
    if (!items.length) return;
    api("/orders/quote", { body: { items } })
      .then((data) => {
        setQuote(data);
        if (!data.options.upi.enabled) setPaymentMethod("cod");
      })
      .catch((err) => setQuoteError(err.message));
  }, [items]);

  const option = quote?.options?.[paymentMethod];

  const handleChange = (event) => {
    const { name } = event.target;
    let { value } = event.target;
    if (name === "phone") value = value.replace(/\D/g, "").slice(0, 10);
    if (name === "pincode") {
      value = value.replace(/\D/g, "").slice(0, 6);
      // Fill in city and state from the PIN code.
      if (/^[1-9]\d{5}$/.test(value)) {
        api(`/store/pincode/${value}`)
          .then(({ city, state }) =>
            setForm((f) => ({
              ...f,
              city: f.city || city,
              state: f.state || STATES.find((s) => s.toLowerCase() === String(state).toLowerCase()) || f.state,
            })),
          )
          .catch(() => {});
      }
    }
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!/^[6-9]\d{9}$/.test(form.phone)) return setError("Please enter a valid 10-digit Indian mobile number.");
    if (!/^[1-9]\d{5}$/.test(form.pincode)) return setError("Please enter a valid 6-digit PIN code.");

    setLoading(true);
    try {
      const order = await api("/orders/checkout", {
        body: {
          items,
          paymentMethod,
          checkoutKey: checkoutKey.current,
          customer: { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone },
          shippingAddress: {
            line1: form.address1, line2: form.address2, city: form.city, state: form.state, pincode: form.pincode,
          },
        },
      });

      if (order.paymentMethod === "cod") {
        navigate(`/order-success?order=${order.orderId}`);
      } else {
        setUpiOrder(order);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setError(err.message);
      checkoutKey.current = newKey();
    } finally {
      setLoading(false);
    }
  };

  if (!cart.length) {
    return (
      <main className="ge-checkout-page">
        <div className="ge-checkout-empty">
          <ShoppingBag size={55} />
          <h1>YOUR CART IS <span>EMPTY.</span></h1>
          <p>Add some products before proceeding to checkout.</p>
          <Link to="/shop" className="ge-place-order">EXPLORE PRODUCTS <ArrowRight size={20} /></Link>
        </div>
      </main>
    );
  }

  if (upiOrder) {
    return (
      <UpiPayment
        order={upiOrder}
        onCancel={() => {
          api(`/orders/${upiOrder.orderId}/cancel-payment`, { method: "POST" }).catch(() => {});
          checkoutKey.current = newKey();
          setUpiOrder(null);
        }}
      />
    );
  }

  const field = (name, label, props = {}) => (
    <div className={`ge-form-group ${props.wrapClass || ""}`}>
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} value={form[name]} onChange={handleChange} {...props} wrapClass={undefined} />
    </div>
  );

  return (
    <main className="ge-checkout-page">
      <div className="ge-checkout-breadcrumb">
        <Link to="/">HOME</Link><span>›</span><Link to="/cart">CART</Link><span>›</span><strong>CHECKOUT</strong>
      </div>

      <section className="ge-checkout-heading">
        <h1>CHECK<span>OUT.</span></h1>
        <div className="ge-checkout-heading-description">COMPLETE YOUR ORDER<br />IN A FEW SIMPLE STEPS.</div>
        <div className="ge-checkout-steps">
          <div className="ge-step active"><span>1</span>DETAILS</div><i />
          <div className="ge-step"><span>2</span>PAYMENT</div><i />
          <div className="ge-step"><span>3</span>CONFIRM</div>
        </div>
      </section>

      <form className="ge-checkout-layout" onSubmit={handleSubmit}>
        <section className="ge-shipping-card">
          <h2>SHIPPING <span>DETAILS.</span></h2>
          <p className="ge-shipping-subtitle">ENTER YOUR INFORMATION FOR DELIVERY.</p>

          <div className="ge-form-grid">
            {field("firstName", "First Name *", { required: true, autoComplete: "given-name" })}
            {field("lastName", "Last Name *", { required: true, autoComplete: "family-name" })}
            <div className="ge-form-group">
              <label htmlFor="phone">Phone Number *</label>
              <div className="ge-phone-input">
                <span>+91</span>
                <input id="phone" name="phone" type="tel" inputMode="numeric" placeholder="98765 43210"
                  value={form.phone} onChange={handleChange} required autoComplete="tel-national" />
              </div>
            </div>
            {field("email", "Email Address *", { type: "email", required: true, autoComplete: "email", placeholder: "Order confirmation is sent here" })}
            {field("pincode", "PIN Code *", { inputMode: "numeric", required: true, autoComplete: "postal-code", placeholder: "400001" })}
            {field("address1", "Address Line 1 *", { required: true, autoComplete: "address-line1", placeholder: "House number, street name" })}
            {field("address2", "Address Line 2", { autoComplete: "address-line2", placeholder: "Apartment, landmark, area" })}
            {field("city", "City *", { required: true, autoComplete: "address-level2" })}
            <div className="ge-form-group">
              <label htmlFor="state">State *</label>
              <div className="ge-select-wrapper">
                <select id="state" name="state" value={form.state} onChange={handleChange} required>
                  <option value="">Select State</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={19} />
              </div>
            </div>
          </div>
        </section>

        <aside className="ge-checkout-right">
          <section className="ge-order-summary">
            <div className="ge-summary-heading">
              <h2>ORDER <span>SUMMARY.</span></h2>
              <strong>{String(quote?.itemCount ?? 0).padStart(2, "0")} <small>ITEMS</small></strong>
            </div>

            {quoteError && <p>{quoteError}</p>}
            {quote?.problems?.map((p, i) => <p key={i} style={{ color: "#eff04c", fontSize: 13 }}>⚠ {p.message}</p>)}

            <div className="ge-checkout-products">
              {(quote?.items || []).map((item) => (
                <div className="ge-checkout-product" key={`${item.slug}-${item.color}`}>
                  <div className="ge-checkout-product-image">
                    {item.image ? <img src={imageUrl(item.image)} alt={item.name} /> : <ShoppingBag size={25} />}
                  </div>
                  <div className="ge-checkout-product-info">
                    <h3>{item.name}</h3>
                    <p>Color: {item.color || "Standard"}</p>
                  </div>
                  <span className="ge-checkout-quantity">× {item.quantity}</span>
                  <strong className="ge-checkout-price">{formatPrice(item.lineTotal)}</strong>
                </div>
              ))}
            </div>

            <div className="ge-checkout-summary-divider" />
            <div className="ge-checkout-summary-row"><span>Subtotal</span><strong>{formatPrice(option?.subtotal)}</strong></div>
            {option?.discount > 0 && (
              <div className="ge-checkout-summary-row">
                <span>UPI discount ({option.discountPercent}%)</span>
                <strong className="ge-free-shipping">−{formatPrice(option.discount)}</strong>
              </div>
            )}
            <div className="ge-checkout-summary-row">
              <span>Shipping</span>
              <strong className="ge-free-shipping">{option?.shippingFee ? formatPrice(option.shippingFee) : "FREE"}</strong>
            </div>
            <div className="ge-checkout-summary-divider" />
            <div className="ge-checkout-total"><span>Total</span><strong>{formatPrice(option?.total)}</strong></div>
            {option?.delivery && (
              <p style={{ fontSize: 12, marginTop: 8 }}>Estimated delivery: {deliveryWindow(option.delivery)}</p>
            )}
          </section>

          <section className="ge-payment-card">
            <div className="ge-payment-heading">
              <h2>PAYMENT <span>METHOD.</span></h2>
              <small>CHOOSE HOW YOU'D LIKE TO PAY.</small>
            </div>

            {quote?.options?.upi?.enabled && (
              <label className={`ge-payment-option ${paymentMethod === "upi" ? "selected" : ""}`}>
                <input type="radio" name="paymentMethod" checked={paymentMethod === "upi"} onChange={() => setPaymentMethod("upi")} />
                <span className="ge-custom-radio" />
                <Smartphone size={30} />
                <span className="ge-payment-option-text">
                  <strong>
                    Pay Online (UPI) {quote.options.upi.discountPercent > 0 && `— SAVE ${quote.options.upi.discountPercent}%`}
                  </strong>
                  <small>
                    {formatPrice(quote.options.upi.total)} · GPay, PhonePe, Paytm, cards · Faster delivery
                  </small>
                </span>
              </label>
            )}

            {quote?.options?.cod?.enabled && (
              <label className={`ge-payment-option ${paymentMethod === "cod" ? "selected" : ""}`}>
                <input type="radio" name="paymentMethod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                <span className="ge-custom-radio" />
                <Banknote size={30} />
                <span className="ge-payment-option-text">
                  <strong>Cash on Delivery (COD)</strong>
                  <small>{formatPrice(quote.options.cod.total)} · Pay in cash when your order is delivered</small>
                </span>
              </label>
            )}

            {error && <p style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "#fde2e1", color: "#9b1c1c", fontSize: 13 }}>{error}</p>}

            <button type="submit" className="ge-place-order" disabled={loading || !quote || !quote.items.length}>
              <LockKeyhole size={21} />
              {loading
                ? "PLEASE WAIT..."
                : paymentMethod === "cod"
                  ? `PLACE ORDER · ${formatPrice(option?.total)}`
                  : `PAY ${formatPrice(option?.total)}`}
              <ArrowRight size={21} />
            </button>
          </section>
        </aside>
      </form>
    </main>
  );
};

// Step 2 for UPI: QR code of the Razorpay payment link + a Pay button.
function UpiPayment({ order, onCancel }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  const check = async (manual) => {
    try {
      if (manual) setChecking(true);
      const status = await api(`/orders/${order.orderId}/status`);
      if (status.placed) navigate(`/order-success?order=${order.orderId}`);
      else if (status.status === "expired") navigate(`/order-failed?order=${order.orderId}`);
      else if (manual) setMessage("We haven't received the payment yet. If you paid, wait a few seconds.");
    } catch {
      /* try again next time */
    } finally {
      if (manual) setChecking(false);
    }
  };

  // Ask the server every 4 seconds whether the payment came through.
  useEffect(() => {
    const timer = setInterval(() => check(false), 4000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.orderId]);

  return (
    <main className="ge-checkout-page">
      <section className="ge-checkout-heading">
        <h1>PAY<span>NOW.</span></h1>
        <div className="ge-checkout-heading-description">ORDER {order.orderNumber}<br />{formatPrice(order.total)}</div>
      </section>

      <section className="ge-payment-card" style={{ maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
        <p style={{ marginBottom: 14 }}>Scan with your phone camera or any UPI app, or tap the button below.</p>
        <div style={{ display: "inline-block", padding: 14, background: "#fff", borderRadius: 12 }}>
          <QRCodeSVG value={order.paymentUrl} size={230} level="M" />
        </div>
        <a className="ge-place-order" href={order.paymentUrl}>
          PAY {formatPrice(order.total)} WITH UPI / RAZORPAY <ArrowRight size={20} />
        </a>
        <p style={{ marginTop: 14, fontSize: 13 }}>⏳ Waiting for payment… this page updates automatically.</p>
        {message && <p style={{ fontSize: 13, color: "#eff04c" }}>{message}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
          <button type="button" className="ge-place-order" style={{ width: "auto", minHeight: 44, background: "transparent", color: "#fff", border: "1px solid #fff" }} disabled={checking} onClick={() => check(true)}>
            <RefreshCw size={16} /> {checking ? "CHECKING…" : "I'VE PAID — CHECK NOW"}
          </button>
          <button type="button" className="ge-place-order" style={{ width: "auto", minHeight: 44, background: "transparent", color: "#fff", border: "1px solid #fff" }} onClick={onCancel}>
            ← CHANGE DETAILS
          </button>
        </div>
      </section>
    </main>
  );
}

export default Checkout;
