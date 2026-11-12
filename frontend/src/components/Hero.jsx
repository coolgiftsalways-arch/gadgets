import { useLayoutEffect, useRef, useState } from "react";

import { gsap } from "gsap";

import { ScrollTrigger } from "gsap/ScrollTrigger";

import { ArrowUpRight, Headphones, Watch, Plus, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

import "../Style/Hero.css";

gsap.registerPlugin(ScrollTrigger);

const PRODUCTS = [
  {
    id: "01",

    slug: "air-pods-pro",

    number: "01",

    name: "AIR PODS PRO",

    description: "A different perspective on everyday objects.",

    price: 2499,

    category: "DIGITAL CULTURE",

    className: "crypto-card",
  },

  {
    id: "02",

    slug: "power-core",

    number: "02",

    name: "POWER CORE",

    description: "Sound without compromise.",

    price: 4999,

    category: "PERSONAL AUDIO",

    className: "headphone-card",
  },

  {
    id: "03",

    slug: "digital-camera",

    number: "03",

    name: "DIGITAL CAMERA",

    description: "Designed to keep up with you.",

    price: 5999,

    category: "SMART ESSENTIALS",

    className: "watch-card",
  },
];

const Hero = () => {
  const navigate = useNavigate();

  const rootRef = useRef(null);

  const placeholderRef = useRef(null);

  const stageRef = useRef(null);

  const productsRef = useRef(null);

  const firstVisualRef = useRef(null);

  const [toast, setToast] = useState("");

  const toastTimer = useRef(null);

  const addToCart = (product) => {
    try {
      const cart = JSON.parse(localStorage.getItem("gadgete_cart") || "[]");

      const existing = cart.find((item) => item.id === product.id);

      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({
          ...product,

          quantity: 1,
        });
      }

      localStorage.setItem("gadgete_cart", JSON.stringify(cart));

      window.dispatchEvent(new Event("gadgete-cart-updated"));

      setToast(`${product.name} ADDED TO YOUR BAG`);

      clearTimeout(toastTimer.current);

      toastTimer.current = setTimeout(() => {
        setToast("");
      }, 2500);
    } catch (error) {
      console.error("Cart error:", error);
    }
  };

  const buyNow = (product) => {
    addToCart(product);
  };

  useLayoutEffect(() => {
    const root = rootRef.current;

    const placeholder = placeholderRef.current;

    const stage = stageRef.current;

    const products = productsRef.current;

    const firstVisual = firstVisualRef.current;

    if (!root || !placeholder || !stage || !products || !firstVisual) {
      return;
    }

    const glass = stage.querySelector(".travelling-glass");

    const coin = stage.querySelector(".travelling-coin");

    if (!glass || !coin) return;

    let startRect;

    let endRect;

    let entrance;

    let travelTrigger;

    const getViewportRect = (element) => {
      const rect = element.getBoundingClientRect();

      return {
        left: rect.left,

        top: rect.top,

        width: rect.width,

        height: rect.height,
      };
    };

    const measurePositions = () => {
      startRect = getViewportRect(placeholder);

      endRect = getViewportRect(firstVisual);
    };

    const updateTravel = (progress) => {
      if (!startRect || !endRect) return;

      const eased = gsap.parseEase("power2.inOut")(progress);

      const x = gsap.utils.interpolate(startRect.left, endRect.left, eased);

      const y = gsap.utils.interpolate(startRect.top, endRect.top, eased);

      const width = gsap.utils.interpolate(
        startRect.width,

        endRect.width,

        eased,
      );

      const height = gsap.utils.interpolate(
        startRect.height,

        endRect.height,

        eased,
      );

      gsap.set(stage, {
        x,

        y,

        width,

        height,

        rotation: gsap.utils.interpolate(0, -3, eased),
      });

      gsap.set(glass, {
        rotation: gsap.utils.interpolate(0, 8, eased),

        rotationY: gsap.utils.interpolate(0, 25, eased),

        scale: gsap.utils.interpolate(1, 0.9, eased),
      });

      gsap.set(coin, {
        rotation: gsap.utils.interpolate(0, 360, eased),

        rotationY: gsap.utils.interpolate(0, 180, eased),

        scale: gsap.utils.interpolate(1, 0.9, eased),
      });

      const reveal = gsap.utils.clamp(0, 1, (progress - 0.78) / 0.22);

      gsap.set(stage, {
        opacity: 1 - reveal,

        visibility: "visible",
      });

      const cardPlaceholder = firstVisual.querySelector(
        ".first-card-placeholder",
      );

      if (cardPlaceholder) {
        gsap.set(cardPlaceholder, {
          opacity: reveal,

          visibility: reveal > 0.01 ? "visible" : "hidden",

          scale: gsap.utils.interpolate(0.85, 1, reveal),
        });
      }
    };

    const ctx = gsap.context(() => {
      measurePositions();

      // Initial travelling stage position.

      gsap.set(stage, {
        position: "fixed",

        left: 0,

        top: 0,

        width: startRect.width,

        height: startRect.height,

        x: startRect.left,

        y: startRect.top,

        zIndex: 100,

        opacity: 1,

        visibility: "visible",

        transformOrigin: "top left",

        force3D: true,
      });

      // Initial glass position.

      gsap.set(glass, {
        y: window.innerHeight * 0.8,

        rotation: 12,

        rotationY: -15,

        scale: 0.85,

        opacity: 0,

        transformPerspective: 1200,
      });

      // Initial coin position.

      gsap.set(coin, {
        y: -window.innerHeight,

        rotation: -540,

        rotationY: 0,

        scale: 0.55,

        opacity: 0,

        transformPerspective: 1200,
      });

      gsap.set(
        [
          ".hero-label",

          ".hero-title",

          ".hero-copy",

          ".hero-categories",

          ".hero-description",

          ".hero-right-small",

          ".hero-cta",
        ],

        {
          opacity: 0,

          y: 30,
        },
      );

      gsap.set(".hero-decoration", {
        scale: 0,

        rotation: -90,
      });

      gsap.set(".hero-yellow-line", {
        scaleX: 0,

        transformOrigin: "left center",
      });

      gsap.set(".first-card-placeholder", {
        opacity: 0,

        visibility: "hidden",

        scale: 0.85,
      });

      // ======================================

      // HERO ENTRANCE

      // ======================================

      entrance = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
      });

      entrance

        .from(
          ".hero-background-title",

          {
            opacity: 0,

            scale: 0.8,

            rotation: -5,

            duration: 1.3,
          },

          0,
        )

        .to(
          glass,

          {
            y: 0,

            rotation: -2,

            rotationY: 0,

            scale: 1,

            opacity: 1,

            duration: 1.9,

            ease: "power4.out",
          },

          0.2,
        )

        .to(
          coin,

          {
            y: 0,

            rotation: 0,

            rotationY: 720,

            scale: 1,

            opacity: 1,

            duration: 1.8,

            ease: "power3.in",
          },

          0.7,
        )

        .to(coin, {
          y: -8,

          duration: 0.15,
        })

        .to(coin, {
          y: 0,

          duration: 0.35,

          ease: "bounce.out",
        })

        .to(
          glass,

          {
            rotation: 1.5,

            x: 5,

            duration: 0.13,
          },

          "<",
        )

        .to(glass, {
          rotation: -1,

          x: -3,

          duration: 0.13,
        })

        .to(glass, {
          rotation: 0,

          x: 0,

          duration: 0.4,

          ease: "elastic.out(1, 0.5)",
        })

        .to(
          [".hero-label", ".hero-title"],

          {
            opacity: 1,

            y: 0,

            duration: 0.7,

            stagger: 0.15,
          },

          "-=0.5",
        )

        .to(
          ".hero-yellow-line",

          {
            scaleX: 1,

            duration: 0.6,
          },

          "-=0.4",
        )

        .to(
          ".hero-copy",

          {
            opacity: 1,

            y: 0,

            duration: 0.6,
          },

          "-=0.3",
        )

        .to(
          ".hero-categories",

          {
            opacity: 1,

            y: 0,

            duration: 0.6,
          },

          "-=0.3",
        )

        .to(
          ".hero-description",

          {
            opacity: 1,

            y: 0,

            duration: 0.6,
          },

          "-=0.3",
        )

        .to(
          ".hero-right-small",

          {
            opacity: 1,

            y: 0,

            duration: 0.6,
          },

          "-=0.3",
        )

        .to(
          ".hero-cta",

          {
            opacity: 1,

            y: 0,

            duration: 0.7,
          },

          "-=0.3",
        )

        .to(
          ".hero-decoration",

          {
            scale: 1,

            rotation: 0,

            duration: 0.8,

            ease: "back.out(1.7)",
          },

          "-=0.5",
        );

      // Floating effects.

      entrance.call(() => {
        gsap.to(glass, {
          y: -4,

          duration: 2.2,

          repeat: -1,

          yoyo: true,

          ease: "sine.inOut",
        });

        gsap.to(coin, {
          y: -5,

          duration: 1.8,

          repeat: -1,

          yoyo: true,

          ease: "sine.inOut",
        });
      });

      // ======================================

      // PRODUCT CARD ANIMATIONS

      // ======================================

      const cards = gsap.utils.toArray(root.querySelectorAll(".product-card"));

      cards.forEach((card, index) => {
        const direction = index % 2 === 0 ? -1 : 1;

        gsap.fromTo(
          card,

          {
            autoAlpha: 0,

            y: 100,

            rotationY: direction * 22,

            rotationX: 12,

            scale: 0.88,
          },

          {
            autoAlpha: 1,

            y: 0,

            rotationY: 0,

            rotationX: 0,

            scale: 1,

            ease: "power3.out",

            scrollTrigger: {
              trigger: card,

              start: "top 90%",

              end: "top 45%",

              scrub: 1.5,
            },
          },
        );
      });

      // ======================================

      // HERO TO FIRST PRODUCT CARD

      // ======================================

      travelTrigger = ScrollTrigger.create({
        trigger: products,

        start: "top bottom",

        end: "top 25%",

        scrub: 2,

        invalidateOnRefresh: true,

        onRefreshInit: () => {
          measurePositions();
        },

        onUpdate: (self) => {
          updateTravel(self.progress);
        },

        onLeaveBack: () => {
          measurePositions();

          gsap.set(stage, {
            opacity: 1,

            visibility: "visible",
          });

          gsap.set(".first-card-placeholder", {
            opacity: 0,

            visibility: "hidden",

            scale: 0.85,
          });

          updateTravel(0);
        },

        onRefresh: () => {
          measurePositions();
        },
      });

      // Resize and image loading refresh.

      const handleResize = () => {
        measurePositions();

        ScrollTrigger.refresh();
      };

      window.addEventListener("resize", handleResize);

      window.addEventListener("load", handleResize);

      ScrollTrigger.refresh();

      return () => {
        window.removeEventListener("resize", handleResize);

        window.removeEventListener("load", handleResize);
      };
    }, root);

    return () => {
      ctx.revert();

      clearTimeout(toastTimer.current);
    };
  }, []);

  return (
    <div className="gadgete-experience" ref={rootRef}>
      <section className="gadgete-hero">
        <div className="hero-grain" />

        <div className="hero-background-title">GADGETÉ</div>

        <div className="hero-left-content">
          <div className="hero-label">
            <span className="hero-label-dot" />
            THE FUTURE IS HERE / 001
          </div>

          <h1 className="hero-title">
            THE NEXT
            <br />
            GENERATION
            <br />
            OF <span>TECH.</span>
          </h1>

          <div className="hero-yellow-line" />

          <p className="hero-copy">
            Technology isn't just what you use.
            <br />
            It's how you express yourself.
          </p>

          <div className="hero-categories">
            <span>[01] AUDIO</span>

            <span>[02] WEARABLES</span>

            <span>[03] ACCESSORIES</span>

            <span>[04] ESSENTIALS</span>
          </div>
        </div>

        <div className="hero-product-placeholder" ref={placeholderRef} />

        <div className="hero-decoration">✳</div>

        <div className="hero-right-content">
          <div className="hero-description">
            <span>CURATED</span>

            <span>OBJECTS</span>

            <span>FOR EVERYDAY</span>

            <span>LIFE.</span>
          </div>

          <div className="hero-right-small">
            DESIGNED FOR THE NEXT GENERATION.
          </div>

          <a href="#products" className="hero-cta">
            EXPLORE COLLECTION
            <ArrowUpRight size={22} />
          </a>
        </div>

        <div className="hero-bottom-left">GADGETÉ® — THINK DIFFERENT.</div>

        <div className="hero-bottom-right">
          EST. 2026 / MADE FOR WHAT'S NEXT
        </div>
      </section>

      {/* Shared animated glass and coin */}

      <div className="travelling-product-stage" ref={stageRef}>
        <img
          src="/Images/bitcoin-coin.png"
          className="travelling-coin"
          alt="Gold Bitcoin coin"
          draggable="false"
        />

        <img
          src="/Images/hero-glass.png"
          className="travelling-glass"
          alt="Transparent sculpted glass"
          draggable="false"
        />
      </div>

      <section className="gadgete-products" id="products" ref={productsRef}>
        <div className="products-grain" />

        <div className="products-topline">
          <span>GADGETÉ® / PRODUCT INDEX</span>

          <span>001 — 003 / 2026</span>
        </div>

        <div className="products-heading">
          <div>
            <span className="products-eyebrow">DISCOVER THE COLLECTION</span>

            <h2>
              OUR <span>PRODUCTS.</span>
            </h2>
          </div>

          <div className="products-heading-right">
            <span className="products-slash" />

            <p>
              CURATED TECH
              <br />
              FOR A MODERN LIFE.
            </p>
          </div>
        </div>

        <div className="products-grid">
          {PRODUCTS.map((product, index) => (
            <article
              className={`product-card ${product.className}`}
              key={product.id}
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/product/${product.slug}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(`/product/${product.slug}`);
                }
              }}
            >
              <div className="product-card-top">
                <span>{product.number}</span>

                <span className="product-card-category">
                  {product.category}
                </span>

                <ArrowUpRight size={20} />
              </div>

              <div
                className="product-card-visual"
                ref={index === 0 ? firstVisualRef : null}
              >
                {index === 0 ? (
                  <div className="first-card-placeholder">
                    <img
                      className="card-glass-image"
                      src="/Images/hero-glass.png"
                      alt="Crypto glass product"
                      draggable="false"
                    />

                    <img
                      className="card-coin-image"
                      src="/Images/bitcoin-coin.png"
                      alt="Gold Bitcoin coin"
                      draggable="false"
                    />
                  </div>
                ) : index === 1 ? (
                  <div className="product-icon-art headphone-art">
                    <Headphones strokeWidth={1.1} />

                    <span>G</span>
                  </div>
                ) : (
                  <div className="product-icon-art watch-art">
                    <Watch strokeWidth={1.1} />

                    <span>10:09</span>
                  </div>
                )}

                <span className="product-visual-index">G / 0{index + 1}</span>
              </div>

              <div className="product-card-details">
                <div>
                  <h3>{product.name}</h3>

                  <p>{product.description}</p>
                </div>

                <span className="product-price">
                  ₹{product.price.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="product-card-actions">
                <button
                  type="button"
                  className="product-add-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    addToCart(product);
                  }}
                >
                  <Plus size={16} />
                  ADD TO CART
                </button>

                <button
                  type="button"
                  className="product-buy-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    buyNow(product);
                  }}
                >
                  BUY NOW
                  <ArrowUpRight size={17} />
                </button>
              </div>

              <div className="product-card-bottom">
                <span>GADGETÉ® / 2026</span>

                <span>OBJECT NO. {product.number}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="products-footer">
          <span>GOOD DESIGN. BETTER TECHNOLOGY.</span>

          <a href="#top">
            BACK TO TOP
            <ArrowUpRight size={16} />
          </a>
        </div>
      </section>

      <div className={`gadgete-toast ${toast ? "show" : ""}`}>
        <Check size={17} />

        {toast}
      </div>
    </div>
  );
};

export default Hero;
