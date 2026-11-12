import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  LockKeyhole,
  Truck,
  ShieldCheck,
  RefreshCw,
  Trash2,
  X,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";

import "../Style/Cart.css";

const CART_KEY = "gadgete_cart";

const getCart = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const getItemName = (item) =>
  item.name || item.title || item.productName || "GADGETÉ Product";

const getItemImage = (item) => {
  const image =
    item.image || item.images?.[0] || item.thumbnail || item.productImage || "";

  return typeof image === "string" ? image : image?.url || "";
};

const getItemPrice = (item) => {
  const value = item.price ?? item.salePrice ?? item.amount ?? 0;

  if (typeof value === "number") return value;

  const parsed = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatPrice = (price) =>
  `₹${Number(price || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState(getCart);

  const saveCart = (updatedCart) => {
    setCart(updatedCart);
    localStorage.setItem(CART_KEY, JSON.stringify(updatedCart));

    window.dispatchEvent(
      new CustomEvent("gadgete-cart-updated", {
        detail: updatedCart,
      }),
    );
  };

  useEffect(() => {
    const updateCart = () => setCart(getCart());

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
        (total, item) =>
          total + getItemPrice(item) * (Number(item.quantity) || 1),
        0,
      ),
    [cart],
  );

  const updateQuantity = (index, change) => {
    const updated = [...cart];
    const currentQuantity = Number(updated[index].quantity) || 1;
    const nextQuantity = currentQuantity + change;

    if (nextQuantity < 1) return;

    updated[index] = {
      ...updated[index],
      quantity: nextQuantity,
    };

    saveCart(updated);
  };

  const removeItem = (index) => {
    const updated = cart.filter((_, i) => i !== index);
    saveCart(updated);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const handleCheckout = () => {
    navigate("/checkout");
  };

  return (
    <main className="ge-cart-page">
      {/* Breadcrumb */}
      <div className="ge-cart-breadcrumb">
        <Link to="/">HOME</Link>
        <span>›</span>
        <span>CART</span>
      </div>

      {/* Page Heading */}
      <section className="ge-cart-heading">
        <h1>
          YOUR <span>CART.</span>
        </h1>

        <div className="ge-cart-heading-description">
          REVIEW YOUR ITEMS AND
          <br />
          GET READY TO CHECKOUT.
        </div>

        <div className="ge-cart-item-total">
          <span></span>
          <strong>{String(itemCount).padStart(2, "0")}</strong>
          ITEMS
        </div>
      </section>

      {/* Cart Content */}
      {cart.length > 0 ? (
        <>
          <section className="ge-cart-layout">
            {/* Product List */}
            <div className="ge-cart-products">
              {cart.map((item, index) => {
                const name = getItemName(item);
                const image = getItemImage(item);
                const price = getItemPrice(item);
                const quantity = Number(item.quantity) || 1;

                return (
                  <article
                    className="ge-cart-product"
                    key={`${item.id || name}-${item.color || ""}-${index}`}
                  >
                    <div className="ge-cart-product-image">
                      {image ? (
                        <img src={image} alt={name} />
                      ) : (
                        <div className="ge-cart-image-placeholder">
                          <ShoppingBag size={38} />
                        </div>
                      )}
                    </div>

                    <div className="ge-cart-product-info">
                      <span className="ge-cart-category">
                        {item.category || item.type || "GADGETÉ"} / G-
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <h2>{name}</h2>

                      <p>
                        {item.description ||
                          item.shortDescription ||
                          "Designed for your everyday lifestyle."}
                      </p>

                      {item.color && (
                        <div className="ge-cart-color">
                          <span
                            className="ge-cart-color-dot"
                            style={{
                              background:
                                item.color.toLowerCase() === "white"
                                  ? "#fff"
                                  : item.color.toLowerCase() === "blue"
                                    ? "#3185a9"
                                    : item.color.toLowerCase() === "black"
                                      ? "#10100e"
                                      : item.color.toLowerCase(),
                            }}
                          />
                          Color: {item.color}
                        </div>
                      )}
                    </div>

                    <div className="ge-cart-quantity">
                      <button
                        type="button"
                        onClick={() => updateQuantity(index, -1)}
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={15} />
                      </button>

                      <strong>{quantity}</strong>

                      <button
                        type="button"
                        onClick={() => updateQuantity(index, 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    <div className="ge-cart-product-price">
                      {formatPrice(price * quantity)}
                    </div>

                    <button
                      className="ge-cart-remove"
                      type="button"
                      onClick={() => removeItem(index)}
                      aria-label={`Remove ${name}`}
                    >
                      <X size={22} />
                    </button>
                  </article>
                );
              })}
            </div>

            {/* Order Summary */}
            <aside className="ge-cart-summary">
              <h2>
                ORDER <span>SUMMARY.</span>
              </h2>

              <div className="ge-summary-row">
                <span>Subtotal ({itemCount} items)</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>

              <div className="ge-summary-row">
                <span>Shipping</span>
                <strong className="ge-cart-free">FREE</strong>
              </div>

              <div className="ge-summary-divider" />

              <div className="ge-summary-total">
                <span>Total</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>

              <button
                className="ge-checkout-button"
                type="button"
                onClick={handleCheckout}
              >
                <LockKeyhole size={19} />
                PROCEED TO CHECKOUT
                <ArrowUpRight size={21} />
              </button>

              <div className="ge-cart-benefits">
                <div>
                  <Truck />
                  <span>
                    FREE
                    <br />
                    SHIPPING
                  </span>
                </div>

                <div>
                  <ShieldCheck />
                  <span>
                    SECURE
                    <br />
                    PAYMENT
                  </span>
                </div>

                <div>
                  <RefreshCw />
                  <span>
                    EASY
                    <br />
                    RETURNS
                  </span>
                </div>
              </div>
            </aside>
          </section>

          {/* Bottom Actions */}
          <div className="ge-cart-bottom-actions">
            <Link to="/shop" className="ge-continue-shopping">
              <ArrowLeft size={24} />
              <span>CONTINUE SHOPPING</span>
            </Link>

            <button type="button" className="ge-clear-cart" onClick={clearCart}>
              <Trash2 size={20} />
              CLEAR CART
            </button>
          </div>
        </>
      ) : (
        <section className="ge-cart-empty">
          <div className="ge-cart-empty-icon">
            <ShoppingBag size={48} />
          </div>

          <h2>
            YOUR CART IS <span>EMPTY.</span>
          </h2>

          <p>
            Looks like you haven't added anything to your bag yet. Discover
            something worth owning.
          </p>

          <Link to="/shop" className="ge-checkout-button">
            EXPLORE PRODUCTS
            <ArrowUpRight size={20} />
          </Link>
        </section>
      )}
    </main>
  );
};

export default Cart;
