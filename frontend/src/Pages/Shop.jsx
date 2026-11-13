
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
  Package,
  Speaker,
  Smartphone,
  Plug,
  Home,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import { Link } from "react-router-dom";
import gsap from "gsap";
import { apiRequest } from "../api/api";
import "../Style/Shop.css";

// ==========================================
// PRODUCT ICONS FROM DATABASE
// ==========================================

const PRODUCT_ICON_MAP = {
  headphones: Headphones,
  watch: Watch,
  battery: BatteryFull,
  zap: Zap,
  camera: Camera,
  speaker: Speaker,
  smartphone: Smartphone,
  plug: Plug,
  home: Home,
  package: Package,
};

const getProductIcon = (icon) =>
  PRODUCT_ICON_MAP[String(icon || "").toLowerCase()] || Package;

// ==========================================
// CATEGORIES
// ==========================================

const DEFAULT_CATEGORIES = [
  "ALL PRODUCTS",
  "AUDIO",
  "WEARABLES",
  "POWER",
  "CAMERA",
  "ACCESSORIES",
  "SMART HOME",
  "OTHER",
];

// ==========================================
// PRICE FORMATTER
// ==========================================

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);

// ==========================================
// IMAGE HELPER
// ==========================================

const getProductImage = (product) => {
  const image = product.images?.[0];

  if (!image) return "";

  if (/^https?:\/\//i.test(image)) return image;

  return image.startsWith("/") ? image : `/${image}`;
};

// ==========================================
// SHOP COMPONENT
// ==========================================

export default function Shop() {
  const shopRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("ALL PRODUCTS");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState("featured");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // FETCH PRODUCTS FROM MONGODB
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await apiRequest("/products");

        if (!cancelled) {
          const databaseProducts = Array.isArray(data.products)
            ? data.products
            : [];

          setProducts(databaseProducts);
        }
      } catch (err) {
        console.error("Product loading error:", err);

        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load products. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================
  // DYNAMIC CATEGORIES
  // ==========================================

  const categories = useMemo(() => {
    const databaseCategories = products
      .map((product) =>
        String(product.category || "Other").toUpperCase()
      )
      .filter(Boolean);

    const uniqueCategories = [...new Set(databaseCategories)];

    return [
      "ALL PRODUCTS",
      ...uniqueCategories.sort(),
    ];
  }, [products]);

  // ==========================================
  // FILTER AND SORT PRODUCTS
  // ==========================================

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (activeCategory !== "ALL PRODUCTS") {
      result = result.filter(
        (product) =>
          String(product.category || "Other").toUpperCase() ===
          activeCategory
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      result = result.filter((product) => {
        const name = String(product.name || "").toLowerCase();
        const category = String(product.category || "").toLowerCase();
        const description = String(
          product.shortDescription ||
            product.description ||
            ""
        ).toLowerCase();

        const sku = String(product.sku || "").toLowerCase();

        return (
          name.includes(query) ||
          category.includes(query) ||
          description.includes(query) ||
          sku.includes(query)
        );
      });
    }

    if (sortOrder === "low-high") {
      result.sort((a, b) => a.price - b.price);
    }

    if (sortOrder === "high-low") {
      result.sort((a, b) => b.price - a.price);
    }

    if (sortOrder === "name") {
      result.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    }

    if (sortOrder === "featured") {
      result.sort(
        (a, b) => Number(b.featured) - Number(a.featured)
      );
    }

    return result;
  }, [products, activeCategory, searchQuery, sortOrder]);

  // ==========================================
  // GSAP INITIAL ANIMATIONS
  // ==========================================

  useLayoutEffect(() => {
    const root = shopRef.current;

    if (!root) return undefined;

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      timeline
        .from(".shop-eyebrow", {
          y: 20,
          opacity: 0,
          duration: 0.6,
        })
        .from(
          ".shop-hero-title",
          {
            y: 70,
            opacity: 0,
            duration: 0.9,
          },
          "-=0.3"
        )
        .from(
          ".shop-hero-description",
          {
            y: 25,
            opacity: 0,
            duration: 0.6,
          },
          "-=0.5"
        )
        .from(
          ".shop-hero-art",
          {
            scale: 0.8,
            opacity: 0,
            rotation: -10,
            duration: 1,
          },
          "-=0.7"
        )
        .from(
          ".shop-toolbar",
          {
            y: 25,
            opacity: 0,
            duration: 0.6,
          },
          "-=0.3"
        );
    }, root);

    return () => ctx.revert();
  }, []);

  // ==========================================
  // PRODUCT CARD HOVER ANIMATIONS
  // ==========================================

  useEffect(() => {
    const root = shopRef.current;

    if (!root || loading) return undefined;

    const cards = Array.from(
      root.querySelectorAll(".shop-product-card")
    );

    const cleanups = cards.map((card) => {
      const icon = card.querySelector(".shop-product-icon");
      const glow = card.querySelector(".shop-product-glow");

      const enter = () => {
        gsap.to(card, {
          y: -8,
          duration: 0.35,
          ease: "power2.out",
        });

        if (icon) {
          gsap.to(icon, {
            scale: 1.12,
            rotation: 5,
            duration: 0.45,
            ease: "power2.out",
          });
        }

        if (glow) {
          gsap.to(glow, {
            opacity: 1,
            scale: 1.2,
            duration: 0.4,
          });
        }
      };

      const leave = () => {
        gsap.to(card, {
          y: 0,
          duration: 0.4,
          ease: "power2.out",
        });

        if (icon) {
          gsap.to(icon, {
            scale: 1,
            rotation: 0,
            duration: 0.4,
          });
        }

        if (glow) {
          gsap.to(glow, {
            opacity: 0,
            scale: 1,
            duration: 0.4,
          });
        }
      };

      card.addEventListener("mouseenter", enter);
      card.addEventListener("mouseleave", leave);

      return () => {
        card.removeEventListener("mouseenter", enter);
        card.removeEventListener("mouseleave", leave);

        gsap.killTweensOf(
          [card, icon, glow].filter(Boolean)
        );
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [filteredProducts, loading]);

  // ==========================================
  // ADD TO CART
  // ==========================================

  const addToCart = (product) => {
    try {
      const existingCart = JSON.parse(
        localStorage.getItem("gadgete_cart") || "[]"
      );

      const existingProduct = existingCart.find(
        (item) => String(item.id) === String(product.id)
      );

      const updatedCart = existingProduct
        ? existingCart.map((item) =>
            String(item.id) === String(product.id)
              ? {
                  ...item,
                  quantity: (item.quantity || 1) + 1,
                }
              : item
          )
        : [
            ...existingCart,
            {
              ...product,
              quantity: 1,
            },
          ];

      localStorage.setItem(
        "gadgete_cart",
        JSON.stringify(updatedCart)
      );

      window.dispatchEvent(
        new CustomEvent("gadgete-cart-updated", {
          detail: updatedCart,
        })
      );

      window.alert(`${product.name} added to your cart!`);
    } catch (error) {
      console.error("Cart error:", error);
      window.alert("Unable to add product to cart.");
    }
  };

  // ==========================================
  // BUY NOW
  // ==========================================

  const buyNow = (product) => {
    addToCart(product);
    window.location.href = "/cart";
  };

  // ==========================================
  // SEARCH
  // ==========================================

  const toggleSearch = () => {
    setSearchOpen((previous) => {
      if (previous) {
        setSearchQuery("");
      }

      return !previous;
    });
  };

  // ==========================================
  // RETRY PRODUCT LOADING
  // ==========================================

  const retryProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest("/products");

      setProducts(
        Array.isArray(data.products) ? data.products : []
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main className="shop-page" ref={shopRef}>

      {/* HERO SECTION */}

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
            Discover technology that makes everyday life
            extraordinary. Curated essentials. Timeless design.
            Limitless possibilities.
          </p>

          <a href="#shop-products" className="shop-hero-link">
            EXPLORE COLLECTION
            <ArrowUpRight size={17} />
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
          <span>
            {String(products.length).padStart(2, "0")} PRODUCTS
          </span>
        </div>

      </section>

      {/* TOOLBAR */}

      <section className="shop-toolbar">

        <div className="shop-categories">

          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`shop-category ${
                activeCategory === category ? "active" : ""
              }`}
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
            {searchOpen ? (
              <X size={17} />
            ) : (
              <Search size={17} />
            )}
          </button>

          <div className="shop-sort">

            <SlidersHorizontal size={15} />

            <select
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(event.target.value)
              }
              aria-label="Sort products"
            >
              <option value="featured">FEATURED</option>
              <option value="low-high">
                PRICE: LOW TO HIGH
              </option>
              <option value="high-low">
                PRICE: HIGH TO LOW
              </option>
              <option value="name">NAME</option>
            </select>

          </div>

        </div>

      </section>

      {/* SEARCH PANEL */}

      {searchOpen && (
        <div className="shop-search-panel">

          <Search size={19} />

          <input
            type="text"
            placeholder="Search your favourite gadgets..."
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
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

      {/* PRODUCTS SECTION */}

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
            LIVE DATABASE COLLECTION
          </p>

        </div>

        {/* LOADING */}

        {loading && (
          <div className="shop-empty">

            <RefreshCw
              size={35}
              className="shop-loading-icon"
            />

            <h3>LOADING PRODUCTS.</h3>

            <p>
              Connecting to the GADGETÉ collection...
            </p>

          </div>
        )}

        {/* ERROR */}

        {!loading && error && (
          <div className="shop-empty">

            <AlertCircle size={35} />

            <h3>UNABLE TO LOAD PRODUCTS.</h3>

            <p>{error}</p>

            <button
              type="button"
              onClick={retryProducts}
            >
              TRY AGAIN
              <RefreshCw size={15} />
            </button>

          </div>
        )}

        {/* EMPTY DATABASE */}

        {!loading && !error && products.length === 0 && (
          <div className="shop-empty">

            <Package size={35} />

            <h3>NO PRODUCTS AVAILABLE.</h3>

            <p>
              Your database currently has no active products.
              Add products through your admin panel.
            </p>

          </div>
        )}

        {/* PRODUCT GRID */}

        {!loading &&
          !error &&
          filteredProducts.length > 0 && (

            <div className="shop-product-grid">

              {filteredProducts.map((product, index) => {

                const ProductIcon = getProductIcon(product.icon);

                const image = getProductImage(product);

                const productId = product.id || product._id;

                const productName =
                  product.name || "GADGETÉ Product";

                const productSlug =
                  product.slug || productId;

                const description =
                  product.shortDescription ||
                  product.label ||
                  product.description ||
                  "Discover something extraordinary.";

                return (

                  <article
                    className={`shop-product-card ${
                      product.featured
                        ? "shop-product-highlight"
                        : ""
                    }`}
                    key={productId}
                  >

                    {/* CARD NAVIGATION */}

                    <Link
                      to={`/product/${productSlug}`}
                      className="shop-card-navigation"
                      aria-label={`View ${productName} details`}
                      tabIndex={-1}
                    />

                    {/* PRODUCT TOP */}

                    <div className="shop-product-top">

                      <span className="shop-product-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span className="shop-product-top-label">
                        {String(product.category || "OTHER").toUpperCase()}
                      </span>

                      {product.featured ? (
                        <span className="shop-product-badge">
                          ★
                        </span>
                      ) : (
                        <ArrowUpRight size={17} />
                      )}

                    </div>

                    {/* PRODUCT IMAGE / ICON */}

                    <div className="shop-product-visual">

                      <div className="shop-product-glow" />

                      {image ? (
                        <img
                          src={image}
                          alt={productName}
                          className="shop-product-icon"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <ProductIcon
                          className="shop-product-icon"
                          strokeWidth={1.1}
                        />
                      )}

                      <span className="shop-product-index">
                        GADGETÉ / {String(index + 1).padStart(2, "0")}
                      </span>

                    </div>

                    {/* PRODUCT DETAILS */}

                    <div className="shop-product-details">

                      <div className="shop-product-category">
                        {product.label ||
                          String(product.category || "GADGETÉ").toUpperCase()}
                      </div>

                      <div className="shop-product-title-row">

                        <h3>{productName}</h3>

                        <strong>
                          {formatPrice(product.price)}
                        </strong>

                      </div>

                      {product.compareAtPrice > product.price && (
                        <div className="shop-product-original-price">
                          <span>
                            {formatPrice(product.compareAtPrice)}
                          </span>

                          {product.discountPercent > 0 && (
                            <span>
                              {product.discountPercent}% OFF
                            </span>
                          )}
                        </div>
                      )}

                      <p>{description}</p>

                      {/* STOCK STATUS */}

                      <div className="shop-product-stock">
                        {product.inStock ? (
                          <span>
                            <span className="shop-stock-dot" />
                            IN STOCK
                          </span>
                        ) : (
                          <span className="shop-out-of-stock">
                            OUT OF STOCK
                          </span>
                        )}
                      </div>

                      {/* ACTION BUTTONS */}

                      <div className="shop-product-actions">

                        <button
                          type="button"
                          className="shop-add-button"
                          disabled={!product.inStock}
                          onClick={() => addToCart(product)}
                        >
                          <Plus size={14} />
                          ADD TO CART
                        </button>

                        <button
                          type="button"
                          className="shop-buy-button"
                          disabled={!product.inStock}
                          onClick={() => buyNow(product)}
                        >
                          BUY NOW
                          <ArrowUpRight size={14} />
                        </button>

                      </div>

                    </div>

                    {/* CARD FOOTER */}

                    <div className="shop-product-footer">
                      <span>GADGETÉ ORIGINALS</span>

                      <span>
                        #{String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                  </article>

                );
              })}

            </div>
          )}

        {/* FILTERED EMPTY */}

        {!loading &&
          !error &&
          products.length > 0 &&
          filteredProducts.length === 0 && (

            <div className="shop-empty">

              <Search size={35} />

              <h3>NO PRODUCTS FOUND.</h3>

              <p>
                Try searching for something else.
              </p>

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

      {/* BOTTOM STRIP */}

      <section className="shop-bottom-strip">

        <span>
          GOOD TECHNOLOGY. BETTER EVERYDAY.
        </span>

        <a href="#shop-products">
          BACK TO COLLECTION
          <ArrowUpRight size={18} />
        </a>

      </section>

    </main>
  );
}
