import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  ArrowUpRight,
  Check,
  ChevronRight,
  Heart,
  Minus,
  Package,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Truck,
} from "lucide-react";
import { getProductById, products } from "../data/products";
import "../Style/ProductDetails.css";
import { swatchStyle } from "../utils/colorSwatch";
import ProductReviews, { Stars } from "../components/ProductReviews";
import { loadStoreConfig } from "../storeConfig";
import { deliveryWindow } from "../shopApi";
import { usePageMeta } from "../usePageMeta";
import { BUSINESS } from "../data/business";

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

const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
const mediaUrl = (path) =>
  !path || /^https?:\/\//i.test(path) || !/^https?:\/\//i.test(API_URL)
    ? path
    : `${new URL(API_URL).origin}${path}`;
const rupees = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

// The live product from the backend, in the shape this page already uses.
function fromApi(live, fallback) {
  return {
    ...(fallback || {}),
    id: fallback?.id || live.sku,
    slug: live.slug,
    name: live.name,
    category: fallback?.category || live.category.toUpperCase(),
    icon: fallback?.icon || Package,
    label: live.label || fallback?.label || "",
    longDescription: live.description || fallback?.longDescription || "",
    price: rupees(live.price),
    numericPrice: live.price,
    oldPrice: live.compareAtPrice ? rupees(live.compareAtPrice) : "",
    discount: live.discountPercent ? `${live.discountPercent}% OFF` : "",
    colors: live.colors?.length ? live.colors : fallback?.colors || [],
    features: live.features?.length ? live.features : fallback?.features || [],
    specs: live.specs?.length ? live.specs.map((spec) => [spec.label, spec.value]) : fallback?.specs || [],
    images: (live.images || []).map(mediaUrl),
    videos: live.videos || [],
    inStock: live.inStock,
    stock: live.stock,
  };
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const staticProduct = getProductById(id);
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setActiveMedia(0);
    fetch(`${API_URL}/products/${encodeURIComponent(id)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => alive && setLive(data?.product || null))
      .catch(() => alive && setLive(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const product = live ? fromApi(live, staticProduct) : staticProduct;
  // Photos first (the first photo is what shoppers see), then videos.
  const media = [
    ...(product?.images || []).map((src) => ({ type: "image", src })),
    ...(product?.videos || []).map((src) => ({ type: "video", src })),
  ];
  const current = media[activeMedia];

  // Real reviews and store settings (COD, UPI discount, delivery days).
  const slug = live?.slug || id;
  const [reviewData, setReviewData] = useState(null);
  const [store, setStore] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(`${API_URL}/products/${encodeURIComponent(slug)}/reviews`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => alive && setReviewData(data))
      .catch(() => alive && setReviewData(null));
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    let alive = true;
    loadStoreConfig().then((config) => alive && setStore(config));
    return () => {
      alive = false;
    };
  }, []);

  usePageMeta(
    product ? `${product.name} – Buy Online` : "",
    product?.shortDescription || product?.label || "",
  );

  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState(staticProduct?.colors?.[0] || "");
  const [tab, setTab] = useState("overview");
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);

  // "You may also like": your real products from the database —
  // same category first, then the rest (up to 8).
  const [catalogue, setCatalogue] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(`${API_URL}/products`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => alive && setCatalogue(Array.isArray(data?.products) ? data.products : []))
      .catch(() => alive && setCatalogue([]));
    return () => {
      alive = false;
    };
  }, []);

  const related = useMemo(() => {
    if (!catalogue?.length) {
      return products.filter((item) => item.id !== product?.id).slice(0, 8);
    }
    const currentSlug = live?.slug || product?.slug;
    const currentCategory = live?.category;
    return catalogue
      .filter((item) => item.slug !== currentSlug)
      .sort((a, b) => (b.category === currentCategory) - (a.category === currentCategory))
      .slice(0, 8)
      .map((item) => ({
        slug: item.slug,
        name: item.name,
        category: String(item.category || "").toUpperCase(),
        price: rupees(item.price),
        image: mediaUrl(item.images?.[0] || ""),
        video: item.videos?.[0] || "",
      }));
  }, [catalogue, live, product?.id, product?.slug]);

  // Keep the chosen colour valid once the live product loads.
  useEffect(() => {
    if (product?.colors?.length && !product.colors.includes(color)) setColor(product.colors[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  if (!product && loading) {
    return (
      <main className="pd-not-found">
        <span className="pd-eyebrow">GADGETÉ® / LOADING</span>
      </main>
    );
  }

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
            image: product.images?.[0] || "",
            category: product.category,
            description: live?.shortDescription || product.description || "",
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
              <span className="pd-gallery-count">
                {String(media.length ? activeMedia + 1 : 1).padStart(2, "0")} /{" "}
                {String(media.length || 1).padStart(2, "0")}
              </span>
              {media.length ? (
                media.map((item, index) => (
                  <button
                    type="button"
                    key={item.src}
                    className="pd-thumb"
                    onClick={() => setActiveMedia(index)}
                    aria-label={`Show ${item.type} ${index + 1}`}
                    style={{ padding: 0, overflow: "hidden", outline: index === activeMedia ? "2px solid #164e74" : "none", cursor: "pointer" }}
                  >
                    {item.type === "image" ? (
                      <img src={item.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Play size={22} />
                    )}
                  </button>
                ))
              ) : (
                <div className="pd-thumb">
                  <product.icon size={25} strokeWidth={1.3} />
                </div>
              )}
              <span className="pd-rail-note">OBJECT / DETAIL</span>
            </div>
            {current?.type === "image" ? (
              <div className="pd-artwork pd-artwork-large" style={{ display: "grid", placeItems: "center", overflow: "hidden" }}>
                <img src={current.src} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            ) : current?.type === "video" ? (
              <div className="pd-artwork pd-artwork-large" style={{ display: "grid", placeItems: "center", overflow: "hidden", background: "#000" }}>
                <video key={current.src} src={current.src} controls playsInline autoPlay muted loop style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            ) : (
              <ProductArtwork product={product} large />
            )}
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
            {reviewData?.summary?.count > 0 && (
              <a href="#reviews" className="pd-rating-link">
                <Stars value={reviewData.summary.average} />
                <strong>{reviewData.summary.average.toFixed(1)}</strong>
                <span>
                  {reviewData.summary.count} review{reviewData.summary.count === 1 ? "" : "s"}
                </span>
              </a>
            )}
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
                    className={`pd-swatch ${color === item ? "selected" : ""}`}
                    style={swatchStyle(item)}
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

            {store && (
              <div className="pd-promise">
                {store.payment?.upi?.enabled && (
                  <p>
                    <Truck />
                    <span>
                      <strong>
                        {store.shipping?.fee ? "Delivery" : "Free delivery"} by {deliveryWindow(store.payment.upi.delivery)}
                      </strong>{" "}
                      with UPI
                    </span>
                  </p>
                )}
                {store.payment?.cod?.enabled && (
                  <p>
                    <Banknote />
                    <span>
                      <strong>Cash on Delivery available</strong> across India
                    </span>
                  </p>
                )}
                {store.payment?.upi?.enabled && store.payment.upi.discountPercent > 0 && (
                  <p>
                    <Smartphone />
                    <span>
                      <strong>Extra {store.payment.upi.discountPercent}% off</strong> when you pay by UPI
                    </span>
                  </p>
                )}
              </div>
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
                  SECURE CHECKOUT<small>UPI, cards &amp; COD</small>
                </span>
              </div>
              <div>
                <RotateCcw />
                <span>
                  EASY REPLACEMENT<small>Damaged or wrong item</small>
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
                    {store?.payment?.upi?.enabled
                      ? `Arrives ${deliveryWindow(store.payment.upi.delivery)} when you pay by UPI` +
                        (store.payment.cod?.enabled ? `, or ${deliveryWindow(store.payment.cod.delivery)} with Cash on Delivery.` : ".")
                      : "Delivery timelines are confirmed at checkout based on your PIN code."}
                  </p>
                  <Link to="/shipping-policy">
                    SHIPPING POLICY <ArrowUpRight size={14} />
                  </Link>
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
                    Got a damaged, faulty or wrong item? Tell us within{" "}
                    {BUSINESS.reportDays} days of delivery with an unboxing
                    photo or video and we'll replace or refund it.
                  </p>
                  <Link to="/refund-policy">
                    RETURNS &amp; REFUNDS <ArrowUpRight size={14} />
                  </Link>
                </article>
              </div>
            )}
          </div>
        </section>

        <ProductReviews slug={slug} productName={product.name} data={reviewData} />

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
            {related.map((item, index) => {
              const Icon = item.icon || Package;
              const thumb = item.video || item.image;
              return (
                <Link
                  to={`/product/${item.slug}`}
                  className="pd-related-card"
                  key={item.slug}
                >
                  <div className="pd-related-visual">
                    <span style={{ zIndex: 2 }}>G / {String(index + 1).padStart(2, "0")}</span>
                    {item.video ? (
                      <video src={item.video} poster={item.image || undefined} muted loop autoPlay playsInline preload="metadata" className="pd-related-media" />
                    ) : item.image ? (
                      <img src={item.image} alt={item.name} loading="lazy" className="pd-related-media" />
                    ) : (
                      <Icon />
                    )}
                    <ArrowUpRight className="pd-related-arrow" style={thumb ? { zIndex: 2 } : undefined} />
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
