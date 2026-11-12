import { useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Zap,
  Activity,
  ShieldCheck,
  BatteryFull,
  Sparkles,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { products as trendingProducts } from "../data/products";
import "../Style/HomeSections.css";

gsap.registerPlugin(ScrollTrigger);

export default function HomeSections() {
  const sectionRef = useRef(null);
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray(".hs-reveal").forEach((element) => {
        gsap.fromTo(
          element,
          { opacity: 0, y: 75 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });
      gsap.fromTo(
        ".hs-feature-visual",
        { scale: 0.7, rotation: -12 },
        {
          scale: 1,
          rotation: 0,
          duration: 1.4,
          ease: "power3.out",
          scrollTrigger: { trigger: ".hs-feature", start: "top 75%" },
        },
      );
      gsap.to(".hs-marquee-track", {
        xPercent: -50,
        duration: 25,
        ease: "none",
        repeat: -1,
      });
      gsap.utils.toArray(".hs-trend-card").forEach((card, index) => {
        gsap.fromTo(
          card,
          { y: 100, opacity: 0, rotate: index % 2 === 0 ? -5 : 5 },
          {
            y: 0,
            opacity: 1,
            rotate: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: card, start: "top 90%" },
          },
        );
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const handleAddToCart = (product, event) => {
    event.stopPropagation();
    const cart = JSON.parse(localStorage.getItem("gadgete_cart") || "[]");
    const existing = cart.find(
      (item) => String(item.id) === String(product.id),
    );
    const updated = existing
      ? cart.map((item) =>
          String(item.id) === String(product.id)
            ? { ...item, quantity: (Number(item.quantity) || 1) + 1 }
            : item,
        )
      : [
          ...cart,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            numericPrice: product.numericPrice,
            quantity: 1,
          },
        ];
    localStorage.setItem("gadgete_cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("gadgete-cart-updated"));
    window.alert(`${product.name} added to cart!`);
  };

  const handleBuyNow = (product, event) => {
    event.stopPropagation();
    handleAddToCart(product, { stopPropagation() {} });
    navigate("/cart");
  };

  return (
    <div className="hs-home-sections" ref={sectionRef}>
      <section className="hs-marquee">
        <div className="hs-marquee-track">
          {[1, 2].map((item) => (
            <div className="hs-marquee-content" key={item}>
              <span>TECHNOLOGY</span>
              <Sparkles />
              <span>MEETS</span>
              <Sparkles />
              <span>DESIGN</span>
              <Sparkles />
              <span>EVERYDAY</span>
              <Sparkles />
              <span>GADGETÉ®</span>
              <Sparkles />
            </div>
          ))}
        </div>
      </section>

      <section className="hs-feature">
        <div className="hs-feature-left hs-reveal">
          <span className="hs-eyebrow">
            <span className="hs-dot" />
            002 / FEATURED COLLECTION
          </span>
          <h2>
            BUILT
            <br />
            FOR THE
            <br />
            <span>NEXT.</span>
          </h2>
          <p>
            Technology should never be ordinary. Discover objects that combine
            powerful performance with unmistakable design.
          </p>
          <a href="/shop" className="hs-outline-button">
            EXPLORE THE COLLECTION <ArrowUpRight size={20} />
          </a>
        </div>
        <div className="hs-feature-visual">
          <div className="hs-feature-orbit" />
          <div className="hs-watch-object">
            <div className="hs-watch-strap" />
            <div className="hs-watch-face">
              <span>10:09</span>
              <small>GADGETÉ</small>
            </div>
          </div>
          <span className="hs-visual-index">OBJECT / 002</span>
          <span className="hs-visual-star">✳</span>
        </div>
        <div className="hs-feature-specs hs-reveal">
          <span>ENGINEERED FOR LIFE</span>
          <div>
            <Activity />
            <p>ADVANCED PERFORMANCE</p>
          </div>
          <div>
            <Zap />
            <p>ALL DAY ENERGY</p>
          </div>
          <div>
            <ShieldCheck />
            <p>PREMIUM BUILD</p>
          </div>
          <div>
            <BatteryFull />
            <p>LONG LASTING POWER</p>
          </div>
        </div>
      </section>

      <section className="hs-story">
        <div className="hs-story-top hs-reveal">
          <span>003 / THE GADGETÉ PHILOSOPHY</span>
          <span>DESIGNED FOR WHAT'S NEXT ↗</span>
        </div>
        <div className="hs-story-content">
          <div className="hs-story-heading hs-reveal">
            <span>NOT JUST TECHNOLOGY.</span>
            <h2>
              A NEW
              <br />
              WAY TO
              <br />
              <span>EXIST.</span>
            </h2>
          </div>
          <div className="hs-story-right hs-reveal">
            <div className="hs-story-symbol">✳</div>
            <p>
              We believe technology should be more than something you own. It
              should be something you experience.
            </p>
            <p>
              From everyday essentials to statement pieces, GADGETÉ brings
              together thoughtful design and modern innovation.
            </p>
            <a href="/about">
              DISCOVER OUR STORY <ArrowUpRight size={19} />
            </a>
          </div>
        </div>
        <div className="hs-story-bottom">
          <span>GOOD DESIGN.</span>
          <span>BETTER TECHNOLOGY.</span>
          <span>NO ORDINARY OBJECTS.</span>
        </div>
      </section>

      <section className="hs-trending">
        <div className="hs-trending-heading hs-reveal">
          <div>
            <span className="hs-eyebrow">
              <span className="hs-dot" />
              004 / WHAT'S HOT
            </span>
            <h2>
              TRENDING
              <br />
              <span>NOW.</span>
            </h2>
          </div>
          <a href="/shop" className="hs-view-all">
            VIEW ALL PRODUCTS <ArrowUpRight size={20} />
          </a>
        </div>
        <div className="hs-trending-grid">
          {trendingProducts.map((product) => {
            const Icon = product.icon;
            return (
              <article
                className={`hs-trend-card ${product.id === "01" ? "hs-trend-card-highlight" : ""}`}
                key={product.id}
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/product/${product.slug}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter")
                    navigate(`/product/${product.slug}`);
                }}
                aria-label={`View ${product.name} details`}
              >
                <div className="hs-trend-top">
                  <span>{product.id}</span>
                  <span className="hs-trend-category">{product.category}</span>
                  <ArrowUpRight size={21} />
                </div>
                <div className="hs-trend-visual">
                  <div className="hs-trend-glow" />
                  <Icon strokeWidth={1.4} />
                </div>
                <div className="hs-trend-info">
                  <span>G / {product.id}</span>
                  <h3>{product.name}</h3>
                  <div className="hs-trend-description">
                    <p>{product.description}</p>
                    <strong>{product.price}</strong>
                  </div>
                  <div className="hs-trend-actions">
                    <button
                      type="button"
                      className="hs-add-cart"
                      onClick={(event) => handleAddToCart(product, event)}
                    >
                      <Plus size={18} />
                      ADD TO CART
                    </button>
                    <button
                      type="button"
                      className="hs-buy-now"
                      onClick={(event) => handleBuyNow(product, event)}
                    >
                      BUY NOW <ArrowUpRight size={19} />
                    </button>
                  </div>
                </div>
                <div className="hs-trend-footer">
                  <span>GADGETÉ® / 2026</span>
                  <span>OBJECT NO. {product.id}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="hs-final">
        <div className="hs-final-grain" />
        <span className="hs-final-index">GADGETÉ® / END OF INDEX</span>
        <h2>
          THINK
          <br />
          <span>DIFFERENT.</span>
        </h2>
        <a href="/shop">
          ENTER THE WORLD OF GADGETÉ <ArrowRight size={22} />
        </a>
        <div className="hs-final-bottom">
          <span>EST. 2026</span>
          <span>MADE FOR WHAT'S NEXT.</span>
        </div>
      </section>
    </div>
  );
}
