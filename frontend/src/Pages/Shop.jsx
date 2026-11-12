import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowUpRight,
  Plus,
  Search,
  SlidersHorizontal,
  Headphones,
  BatteryFull,
  Camera,
  Watch,
  X,
  Zap,
} from "lucide-react";

import { Link } from "react-router-dom";
import gsap from "gsap";
import "../Style/Shop.css";

const products = [
  {
    id: "01",
    slug: "air-pods-pro",
    name: "AIR PODS PRO",
    category: "AUDIO",
    categoryLabel: "PERSONAL AUDIO",
    price: 3499,
    description: "Premium sound. Zero distractions.",
    icon: Headphones,
    highlight: true,
  },
  {
    id: "02",
    slug: "power-core",
    name: "POWER CORE",
    category: "POWER",
    categoryLabel: "POWER ESSENTIALS",
    price: 1999,
    description: "High capacity. All day power.",
    icon: BatteryFull,
  },
  {
    id: "03",
    slug: "digital-camera",
    name: "DIGITAL CAMERA",
    category: "CAMERA",
    categoryLabel: "CREATIVE GEAR",
    price: 8999,
    description: "Capture every moment.",
    icon: Camera,
  },
  {
    id: "04",
    slug: "smart-watch",
    name: "SMART WATCH",
    category: "WEARABLES",
    categoryLabel: "SMART ESSENTIALS",
    price: 5999,
    description: "Stay connected. Stay ahead.",
    icon: Watch,
  },
  {
    id: "05",
    slug: "studio-headphones",
    name: "STUDIO HEADPHONES",
    category: "AUDIO",
    categoryLabel: "PERSONAL AUDIO",
    price: 4499,
    description: "Experience every detail.",
    icon: Headphones,
  },
  {
    id: "06",
    slug: "fast-charger",
    name: "FAST CHARGER",
    category: "POWER",
    categoryLabel: "POWER ESSENTIALS",
    price: 1299,
    description: "Fast charging. Less waiting.",
    icon: Zap,
  },
  {
    id: "07",
    slug: "action-camera",
    name: "ACTION CAMERA",
    category: "CAMERA",
    categoryLabel: "CREATIVE GEAR",
    price: 7499,
    description: "Adventure without limits.",
    icon: Camera,
  },
  {
    id: "08",
    slug: "fitness-watch",
    name: "FITNESS WATCH",
    category: "WEARABLES",
    categoryLabel: "SMART ESSENTIALS",
    price: 3999,
    description: "Track your everyday movement.",
    icon: Watch,
  },
  {
    id: "09",
    slug: "wireless-buds",
    name: "WIRELESS BUDS",
    category: "AUDIO",
    categoryLabel: "PERSONAL AUDIO",
    price: 2499,
    description: "Freedom in every beat.",
    icon: Headphones,
  },
  {
    id: "10",
    slug: "power-bank",
    name: "POWER BANK",
    category: "POWER",
    categoryLabel: "POWER ESSENTIALS",
    price: 1799,
    description: "Power wherever you go.",
    icon: BatteryFull,
  },
  {
    id: "11",
    slug: "mini-camera",
    name: "MINI CAMERA",
    category: "CAMERA",
    categoryLabel: "CREATIVE GEAR",
    price: 5499,
    description: "Small design. Big moments.",
    icon: Camera,
  },
  {
    id: "12",
    slug: "smart-band",
    name: "SMART BAND",
    category: "WEARABLES",
    categoryLabel: "SMART ESSENTIALS",
    price: 2299,
    description: "Your daily health companion.",
    icon: Watch,
  },
  {
    id: "13",
    slug: "bass-headphones",
    name: "BASS HEADPHONES",
    category: "AUDIO",
    categoryLabel: "PERSONAL AUDIO",
    price: 3299,
    description: "Feel the rhythm.",
    icon: Headphones,
  },
  {
    id: "14",
    slug: "usb-c-hub",
    name: "USB-C HUB",
    category: "POWER",
    categoryLabel: "POWER ESSENTIALS",
    price: 1499,
    description: "More connections. More possibilities.",
    icon: Zap,
  },
  {
    id: "15",
    slug: "pocket-camera",
    name: "POCKET CAMERA",
    category: "CAMERA",
    categoryLabel: "CREATIVE GEAR",
    price: 9999,
    description: "Your world, your perspective.",
    icon: Camera,
  },
  {
    id: "16",
    slug: "active-watch",
    name: "ACTIVE WATCH",
    category: "WEARABLES",
    categoryLabel: "SMART ESSENTIALS",
    price: 6999,
    description: "Made for your active lifestyle.",
    icon: Watch,
  },
  {
    id: "17",
    slug: "sound-pods",
    name: "SOUND PODS",
    category: "AUDIO",
    categoryLabel: "PERSONAL AUDIO",
    price: 1899,
    description: "Compact sound. Big energy.",
    icon: Headphones,
  },
  {
    id: "18",
    slug: "wireless-charger",
    name: "WIRELESS CHARGER",
    category: "POWER",
    categoryLabel: "POWER ESSENTIALS",
    price: 1599,
    description: "Simply place and power up.",
    icon: BatteryFull,
  },
  {
    id: "19",
    slug: "creator-camera",
    name: "CREATOR CAMERA",
    category: "CAMERA",
    categoryLabel: "CREATIVE GEAR",
    price: 11999,
    description: "Create something unforgettable.",
    icon: Camera,
  },
  {
    id: "20",
    slug: "digital-watch",
    name: "DIGITAL WATCH",
    category: "WEARABLES",
    categoryLabel: "SMART ESSENTIALS",
    price: 4999,
    description: "A smarter way to live.",
    icon: Watch,
  },
];

const categories = ["ALL PRODUCTS", "AUDIO", "WEARABLES", "POWER", "CAMERA"];

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

export default function Shop() {
  const shopRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState("ALL PRODUCTS");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState("featured");

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (activeCategory !== "ALL PRODUCTS") {
      result = result.filter((product) => product.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query),
      );
    }

    if (sortOrder === "low-high") result.sort((a, b) => a.price - b.price);
    if (sortOrder === "high-low") result.sort((a, b) => b.price - a.price);
    if (sortOrder === "name")
      result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [activeCategory, searchQuery, sortOrder]);

  useLayoutEffect(() => {
    const root = shopRef.current;
    if (!root) return undefined;

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      timeline
        .from(".shop-eyebrow", { y: 20, opacity: 0, duration: 0.6 })
        .from(".shop-hero-title", { y: 70, opacity: 0, duration: 0.9 }, "-=0.3")
        .from(
          ".shop-hero-description",
          { y: 25, opacity: 0, duration: 0.6 },
          "-=0.5",
        )
        .from(
          ".shop-hero-art",
          { scale: 0.8, opacity: 0, rotation: -10, duration: 1 },
          "-=0.7",
        )
        .from(".shop-toolbar", { y: 25, opacity: 0, duration: 0.6 }, "-=0.3")
        .from(
          ".shop-product-card",
          { y: 35, opacity: 0, stagger: 0.055, duration: 0.55 },
          "-=0.2",
        );
    }, root);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const root = shopRef.current;
    if (!root) return undefined;

    const cards = Array.from(root.querySelectorAll(".shop-product-card"));

    const cleanups = cards.map((card) => {
      const icon = card.querySelector(".shop-product-icon");
      const glow = card.querySelector(".shop-product-glow");

      const enter = () => {
        gsap.to(card, { y: -8, duration: 0.35, ease: "power2.out" });
        if (icon)
          gsap.to(icon, {
            scale: 1.12,
            rotation: 5,
            duration: 0.45,
            ease: "power2.out",
          });
        if (glow) gsap.to(glow, { opacity: 1, scale: 1.2, duration: 0.4 });
      };

      const leave = () => {
        gsap.to(card, { y: 0, duration: 0.4, ease: "power2.out" });
        if (icon) gsap.to(icon, { scale: 1, rotation: 0, duration: 0.4 });
        if (glow) gsap.to(glow, { opacity: 0, scale: 1, duration: 0.4 });
      };

      card.addEventListener("mouseenter", enter);
      card.addEventListener("mouseleave", leave);

      return () => {
        card.removeEventListener("mouseenter", enter);
        card.removeEventListener("mouseleave", leave);
        gsap.killTweensOf([card, icon, glow].filter(Boolean));
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [filteredProducts]);

  const addToCart = (product) => {
    try {
      const existingCart = JSON.parse(
        localStorage.getItem("gadgete_cart") || "[]",
      );
      const existingProduct = existingCart.find(
        (item) => String(item.id) === String(product.id),
      );

      const updatedCart = existingProduct
        ? existingCart.map((item) =>
            String(item.id) === String(product.id)
              ? { ...item, quantity: (item.quantity || 1) + 1 }
              : item,
          )
        : [...existingCart, { ...product, quantity: 1 }];

      localStorage.setItem("gadgete_cart", JSON.stringify(updatedCart));
      window.dispatchEvent(
        new CustomEvent("gadgete-cart-updated", { detail: updatedCart }),
      );
      window.alert(`${product.name} added to your cart!`);
    } catch (error) {
      console.error("Cart error:", error);
      window.alert("Unable to add product to cart.");
    }
  };

  const buyNow = (product) => {
    addToCart(product);
    window.location.href = "/cart";
  };

  const toggleSearch = () => {
    setSearchOpen((previous) => {
      if (previous) setSearchQuery("");
      return !previous;
    });
  };

  return (
    <main className="shop-page" ref={shopRef}>
      <section className="shop-hero">
        <div className="shop-hero-content">
          <div className="shop-eyebrow">
            <span className="shop-live-dot" />
            THE GADGETÉ COLLECTION
          </div>

          <h1 className="shop-hero-title">
            TECH THAT
            <br />
            <span>MOVES YOU.</span>
          </h1>

          <p className="shop-hero-description">
            Discover technology that makes everyday life extraordinary. Curated
            essentials. Timeless design. Limitless possibilities.
          </p>

          <a href="#shop-products" className="shop-hero-link">
            EXPLORE COLLECTION <ArrowUpRight size={17} />
          </a>
        </div>

        <div className="shop-hero-art">
          <div className="shop-hero-shape" />
          <div className="shop-hero-headphone">
            <Headphones size={155} strokeWidth={1.1} />
          </div>
          <div className="shop-hero-art-label">
            <span>GADGETÉ</span>
            <span>EST. 2026</span>
          </div>
          <div className="shop-hero-art-number">01</div>
        </div>

        <div className="shop-hero-bottom">
          <span>CURATED TECHNOLOGY</span>
          <span>DESIGNED FOR EVERYDAY</span>
          <span>01 — 20 PRODUCTS</span>
        </div>
      </section>

      <section className="shop-toolbar">
        <div className="shop-categories">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`shop-category ${activeCategory === category ? "active" : ""}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="shop-toolbar-right">
          <button
            type="button"
            className="shop-search-toggle"
            onClick={toggleSearch}
            aria-label="Toggle product search"
          >
            {searchOpen ? <X size={17} /> : <Search size={17} />}
          </button>

          <div className="shop-sort">
            <SlidersHorizontal size={15} />
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              aria-label="Sort products"
            >
              <option value="featured">FEATURED</option>
              <option value="low-high">PRICE: LOW TO HIGH</option>
              <option value="high-low">PRICE: HIGH TO LOW</option>
              <option value="name">NAME</option>
            </select>
          </div>
        </div>
      </section>

      {searchOpen && (
        <div className="shop-search-panel">
          <Search size={19} />
          <input
            type="text"
            placeholder="Search your favourite gadgets..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <X size={17} />
            </button>
          )}
        </div>
      )}

      <section className="shop-products" id="shop-products">
        <div className="shop-section-heading">
          <div>
            <span className="shop-section-eyebrow">
              FIND YOUR NEXT FAVOURITE
            </span>
            <h2>
              THE <span>COLLECTION.</span>
            </h2>
          </div>
          <p className="shop-product-count">
            {String(filteredProducts.length).padStart(2, "0")} PRODUCTS
            <br />
            20 CURATED ESSENTIALS
          </p>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="shop-product-grid">
            {filteredProducts.map((product) => {
              const ProductIcon = product.icon;

              return (
                <article
                  className={`shop-product-card ${product.highlight ? "shop-product-highlight" : ""}`}
                  key={product.id}
                >
                  {/* Real router link covers the card content, not the action buttons. */}
                  <Link
                    to={`/product/${product.slug}`}
                    className="shop-card-navigation"
                    aria-label={`View ${product.name} details`}
                    tabIndex={-1}
                  />

                  <div className="shop-product-top">
                    <span className="shop-product-number">{product.id}</span>
                    <span className="shop-product-top-label">
                      {product.category}
                    </span>
                    {product.highlight ? (
                      <span className="shop-product-badge">★</span>
                    ) : (
                      <ArrowUpRight size={17} />
                    )}
                  </div>

                  <div className="shop-product-visual">
                    <div className="shop-product-glow" />
                    <ProductIcon
                      className="shop-product-icon"
                      strokeWidth={1.1}
                    />
                    <span className="shop-product-index">
                      GADGETÉ / {product.id}
                    </span>
                  </div>

                  <div className="shop-product-details">
                    <div className="shop-product-category">
                      {product.categoryLabel}
                    </div>

                    <div className="shop-product-title-row">
                      <h3>{product.name}</h3>
                      <strong>{formatPrice(product.price)}</strong>
                    </div>

                    <p>{product.description}</p>

                    <div className="shop-product-actions">
                      <button
                        type="button"
                        className="shop-add-button"
                        onClick={() => addToCart(product)}
                      >
                        <Plus size={14} />
                        ADD TO CART
                      </button>

                      <button
                        type="button"
                        className="shop-buy-button"
                        onClick={() => buyNow(product)}
                      >
                        BUY NOW
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="shop-product-footer">
                    <span>GADGETÉ ORIGINALS</span>
                    <span>#{product.id}</span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="shop-empty">
            <Search size={35} />
            <h3>NO PRODUCTS FOUND.</h3>
            <p>Try searching for something else.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("ALL PRODUCTS");
              }}
            >
              VIEW ALL PRODUCTS
            </button>
          </div>
        )}
      </section>

      <section className="shop-bottom-strip">
        <span>GOOD TECHNOLOGY. BETTER EVERYDAY.</span>
        <a href="#shop-products">
          BACK TO COLLECTION <ArrowUpRight size={18} />
        </a>
      </section>
    </main>
  );
}
