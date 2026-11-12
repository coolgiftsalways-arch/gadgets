import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import { getProductById, products } from "../data/products";
import "../Style/ProductDetails.css";

const CART_KEY = "gadgete_cart";

function getCart() {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

function ProductArtwork({ product, large = false }) {
  const Icon = product.icon;
  return (
    <div className={`pd-artwork ${large ? "pd-artwork-large" : ""}`}>
      <div className="pd-artwork-grid" />
      <div className="pd-orbit pd-orbit-one" />
      <div className="pd-orbit pd-orbit-two" />
      <span className="pd-art-index">G / {product.id}</span>
      <div className="pd-art-disc">
        <Icon strokeWidth={1.05} />
      </div>
      <span className="pd-art-caption">GADGETÉ® / OBJECT STUDY</span>
      <span className="pd-art-spark">✳</span>
    </div>
  );
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = getProductById(id);
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState(product?.colors?.[0] || "");
  const [tab, setTab] = useState("overview");
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);

  const related = useMemo(
    () => products.filter((item) => item.id !== product?.id),
    [product],
  );

  if (!product) {
    return (
      <main className="pd-not-found">
        <span className="pd-eyebrow">GADGETÉ® / 404</span>
        <h1>
          OBJECT NOT FOUND<span>.</span>
        </h1>
        <p>This product may have moved or is no longer available.</p>
        <Link to="/shop" className="pd-primary-button">
          BACK TO SHOP <ArrowUpRight size={18} />
        </Link>
      </main>
    );
  }

  const addToCart = () => {
    const cart = getCart();
    const match = cart.find(
      (item) => String(item.id) === String(product.id) && item.color === color,
    );
    const updated = match
      ? cart.map((item) =>
          String(item.id) === String(product.id) && item.color === color
            ? { ...item, quantity: (Number(item.quantity) || 1) + quantity }
            : item,
        )
      : [
          ...cart,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            numericPrice: product.numericPrice,
            quantity,
            color,
            slug: product.slug,
          },
        ];

    localStorage.setItem(CART_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("gadgete-cart-updated"));
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  };

  const buyNow = () => {
    addToCart();
    navigate("/cart");
  };

  return (
    <main className="pd-page">
      <div className="pd-shell">
        <nav className="pd-breadcrumb">
          <Link to="/">HOME</Link>
          <ChevronRight size={13} />
          <Link to="/shop">SHOP</Link>
          <ChevronRight size={13} />
          <span>{product.name}</span>
        </nav>

        <section className="pd-product-layout">
          <div className="pd-gallery">
            <div className="pd-gallery-rail">
              <span className="pd-gallery-count">01 / 01</span>
              <div className="pd-thumb">
                <product.icon size={25} strokeWidth={1.3} />
              </div>
              <span className="pd-rail-note">OBJECT / DETAIL</span>
            </div>
            <ProductArtwork product={product} large />
            <div className="pd-gallery-bottom">
              <span>DESIGNED FOR EVERYDAY</span>
              <span>GADGETÉ® — 2026</span>
            </div>
          </div>

          <div className="pd-info">
            <div className="pd-info-topline">
              <span className="pd-eyebrow">
                <i />
                {product.category}
              </span>
              <button
                className={`pd-wishlist ${saved ? "active" : ""}`}
                onClick={() => setSaved(!saved)}
                aria-label="Save product"
                type="button"
              >
                <Heart size={19} fill={saved ? "currentColor" : "none"} />
              </button>
            </div>
            <span className="pd-index">
              OBJECT NO. {product.id} / GADGETÉ SELECT
            </span>
            <h1>
              {product.name}
              <span>.</span>
            </h1>
            <p className="pd-tagline">{product.label}</p>
            <div className="pd-rating">
              <span className="pd-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={14} fill="currentColor" />
                ))}
              </span>
              <strong>4.9</strong>
              <span>Customer favourite</span>
            </div>
            <div className="pd-price-row">
              <strong>{product.price}</strong>
              <del>{product.oldPrice}</del>
              <span className="pd-discount">{product.discount}</span>
            </div>
            <p className="pd-description">{product.longDescription}</p>

            <div className="pd-option-block">
              <div className="pd-option-heading">
                <span>SELECT COLOUR</span>
                <strong>{color}</strong>
              </div>
              <div className="pd-color-options">
                {product.colors.map((item) => (
                  <button
                    key={item}
                    type="button"
                    title={item}
                    aria-label={`Select ${item}`}
                    className={`pd-swatch pd-${item.toLowerCase()} ${color === item ? "selected" : ""}`}
                    onClick={() => setColor(item)}
                  >
                    {color === item && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pd-quantity-row">
              <span className="pd-option-heading">QUANTITY</span>
              <div className="pd-quantity">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus size={14} />
                </button>
                <strong>{String(quantity).padStart(2, "0")}</strong>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="pd-actions">
              <button
                className="pd-add-button"
                type="button"
                onClick={addToCart}
              >
                {added ? <Check size={18} /> : <ShoppingBag size={18} />}
                {added ? "ADDED TO BAG" : "ADD TO BAG"}
              </button>
              <button className="pd-buy-button" type="button" onClick={buyNow}>
                BUY NOW <ArrowUpRight size={19} />
              </button>
            </div>
            {added && (
              <p className="pd-added">
                <Check size={14} /> Added to your GADGETÉ bag.
              </p>
            )}

            <div className="pd-service-points">
              <div>
                <Truck />
                <span>
                  FAST DELIVERY<small>Across India</small>
                </span>
              </div>
              <div>
                <ShieldCheck />
                <span>
                  SECURE CHECKOUT<small>Protected payments</small>
                </span>
              </div>
              <div>
                <RotateCcw />
                <span>
                  CUSTOMER CARE<small>We're here to help</small>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="pd-details">
          <div className="pd-details-title">
            <span className="pd-eyebrow">
              <i />
              THE DETAILS
            </span>
            <h2>
              GOOD DESIGN.
              <br />
              <em>BETTER EVERYDAY.</em>
            </h2>
          </div>
          <div className="pd-details-main">
            <div className="pd-tabs">
              {[
                ["overview", "OVERVIEW"],
                ["specifications", "SPECIFICATIONS"],
                ["delivery", "DELIVERY & CARE"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={tab === key ? "active" : ""}
                  onClick={() => setTab(key)}
                >
                  {label}
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <div className="pd-overview">
                <ProductArtwork product={product} />
                <div>
                  <span className="pd-overline">
                    01 / MADE TO FIT YOUR WORLD
                  </span>
                  <h3>
                    {product.label}
                    <em>.</em>
                  </h3>
                  <p>{product.longDescription}</p>
                  <ul>
                    {product.features.map((feature) => (
                      <li key={feature}>
                        <Sparkles size={15} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {tab === "specifications" && (
              <div className="pd-spec-grid">
                {product.specs.map(([label, value]) => (
                  <div className="pd-spec-row" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            )}
            {tab === "delivery" && (
              <div className="pd-delivery-grid">
                <article>
                  <Truck />
                  <h3>DELIVERY</h3>
                  <p>
                    Delivery timelines and availability are confirmed at
                    checkout based on your delivery location.
                  </p>
                </article>
                <article>
                  <ShieldCheck />
                  <h3>PRODUCT SUPPORT</h3>
                  <p>
                    For product questions, setup help or after-sales support,
                    visit Customer Care.
                  </p>
                  <Link to="/contact">
                    CONTACT SUPPORT <ArrowUpRight size={14} />
                  </Link>
                </article>
                <article>
                  <RotateCcw />
                  <h3>RETURNS</h3>
                  <p>
                    Please review the store's published return policy before
                    placing your order.
                  </p>
                </article>
              </div>
            )}
          </div>
        </section>

        <section className="pd-related">
          <div className="pd-related-heading">
            <div>
              <span className="pd-eyebrow">
                <i />
                KEEP EXPLORING
              </span>
              <h2>
                YOU MAY ALSO <em>LIKE.</em>
              </h2>
            </div>
            <Link to="/shop">
              VIEW SHOP <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="pd-related-grid">
            {related.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  to={`/product/${item.slug}`}
                  className="pd-related-card"
                  key={item.id}
                >
                  <div className="pd-related-visual">
                    <span>G / {item.id}</span>
                    <Icon />
                    <ArrowUpRight className="pd-related-arrow" />
                  </div>
                  <div className="pd-related-meta">
                    <div>
                      <small>{item.category}</small>
                      <h3>{item.name}</h3>
                    </div>
                    <strong>{item.price}</strong>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="pd-back-row">
          <Link to="/shop">
            <ArrowLeft size={16} /> BACK TO ALL PRODUCTS
          </Link>
          <span>GADGETÉ® / THE FUTURE IN YOUR HANDS</span>
        </div>
      </div>
    </main>
  );
}
