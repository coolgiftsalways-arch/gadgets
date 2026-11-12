import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  ArrowRight,
  LockKeyhole,
  CreditCard,
  Banknote,
  ChevronDown,
  ShoppingBag,
} from "lucide-react";

import "../Style/Checkout.css";

const CART_KEY = "gadgete_cart";

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
    item.image || item.images?.[0] || item.thumbnail || item.productImage || "";

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

const Checkout = () => {
  const navigate = useNavigate();

  const [cart, setCart] = useState(getCart);
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [loading, setLoading] = useState(false);

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

  const itemCount = useMemo(
    () =>
      cart.reduce(
        (total, item) => total + Math.max(0, Number(item.quantity) || 0),
        0,
      ),
    [cart],
  );

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (total, item) => total + getPrice(item) * (Number(item.quantity) || 1),
        0,
      ),
    [cart],
  );

  const shipping = 0;
  const total = subtotal + shipping;

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!cart.length) {
      alert("Your cart is empty.");
      navigate("/shop");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      alert("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!/^\d{6}$/.test(form.pincode)) {
      alert("Please enter a valid 6-digit PIN code.");
      return;
    }

    setLoading(true);

    const orderDetails = {
      customer: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone,
        email: form.email.trim(),
        address1: form.address1.trim(),
        address2: form.address2.trim(),
        city: form.city.trim(),
        state: form.state,
        pincode: form.pincode,
      },
      items: cart,
      subtotal,
      shipping,
      total,
      paymentMethod,
    };

    /*
      FRONTEND CHECKOUT

      Connect this payload to your existing order API
      and payment gateway before accepting real orders.

      Online payment should create a payment order on
      your backend and open your payment gateway.

      COD should create a COD order on your backend.
    */

    try {
      console.log("Checkout order details:", orderDetails);

      // Replace this section with your backend API integration.
      alert(
        paymentMethod === "online"
          ? "Please connect your online payment gateway to complete payment."
          : "Please connect your COD order API to place your order.",
      );
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

        {/* STEP INDICATOR */}

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
        {/* LEFT SIDE - SHIPPING DETAILS */}

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
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                  <option value="Assam">Assam</option>
                  <option value="Bihar">Bihar</option>
                  <option value="Chhattisgarh">Chhattisgarh</option>
                  <option value="Goa">Goa</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Haryana">Haryana</option>
                  <option value="Himachal Pradesh">Himachal Pradesh</option>
                  <option value="Jharkhand">Jharkhand</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Manipur">Manipur</option>
                  <option value="Meghalaya">Meghalaya</option>
                  <option value="Mizoram">Mizoram</option>
                  <option value="Nagaland">Nagaland</option>
                  <option value="Odisha">Odisha</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Sikkim">Sikkim</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Telangana">Telangana</option>
                  <option value="Tripura">Tripura</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Uttarakhand">Uttarakhand</option>
                  <option value="West Bengal">West Bengal</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                  <option value="Ladakh">Ladakh</option>
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
                {String(itemCount).padStart(2, "0")} <small>ITEMS</small>
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
                    key={`${item.id || name}-${index}`}
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

                    <span className="ge-checkout-quantity">× {quantity}</span>

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
              <span>Total</span>
              <strong>{formatPrice(total)}</strong>
            </div>
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

                <small>Credit / Debit Card, UPI, Net Banking, Wallets</small>
              </span>
            </label>

            {/* CASH ON DELIVERY */}

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

                <small>Pay in cash when your order is delivered</small>
              </span>
            </label>

            {/* PLACE ORDER */}

            <button type="submit" className="ge-place-order" disabled={loading}>
              <LockKeyhole size={21} />

              {loading ? "PROCESSING..." : "PLACE ORDER"}

              <ArrowRight size={21} />
            </button>
          </section>
        </aside>
      </form>
    </main>
  );
};

export default Checkout;
