import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
  ArrowUpRight,
  Play,
  Target,
  Eye,
  Gem,
  Headphones,
  Sparkles,
  Camera,
} from "lucide-react";

import "../Style/About.css";

gsap.registerPlugin(ScrollTrigger);

// ==========================================
// REEL PLACEHOLDERS
// Add your videos later
// ==========================================

const reels = [
  {
    id: "01",
    title: "THE GADGETÉ EXPERIENCE",
    category: "BRAND STORY",
    style: "reel-blue",
    label: "YOUR FIRST REEL",
  },
  {
    id: "02",
    title: "TECH MEETS DESIGN",
    category: "PRODUCTS",
    style: "reel-yellow",
    label: "YOUR SECOND REEL",
  },
  {
    id: "03",
    title: "A CLOSER LOOK",
    category: "BEHIND THE SCENES",
    style: "reel-dark",
    label: "YOUR THIRD REEL",
  },
  {
    id: "04",
    title: "MADE FOR EVERYDAY",
    category: "LIFESTYLE",
    style: "reel-cream",
    label: "YOUR FOURTH REEL",
  },
];

// ==========================================
// BRAND VALUES
// ==========================================

const values = [
  {
    icon: Target,
    number: "01",
    title: "OUR MISSION",
    description:
      "Making quality technology accessible, useful and exciting for everyday life.",
  },
  {
    icon: Eye,
    number: "02",
    title: "OUR VISION",
    description:
      "Building a trusted destination for modern technology and lifestyle essentials.",
  },
  {
    icon: Gem,
    number: "03",
    title: "OUR VALUES",
    description:
      "Quality, innovation, reliability and putting our customers first.",
  },
];

// ==========================================
// STATISTICS
// Replace illustrative figures with actual
// business data before publishing.
// ==========================================

const stats = [
  {
    number: "01",
    suffix: "+",
    label: "A PASSION FOR TECH",
  },
  {
    number: "04",
    suffix: "",
    label: "CORE VALUES",
  },
  {
    number: "24",
    suffix: "/7",
    label: "ONLINE ACCESS",
  },
  {
    number: "100",
    suffix: "%",
    label: "CUSTOMER FOCUSED",
  },
];

// ==========================================
// ABOUT PAGE
// ==========================================

export default function About() {
  const pageRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // HERO ANIMATION

      const intro = gsap.timeline({
        defaults: {
          ease: "power4.out",
        },
      });

      intro
        .from(".about-eyebrow", {
          y: 25,
          opacity: 0,
          duration: 0.7,
        })
        .from(
          ".about-title-line",
          {
            yPercent: 110,
            duration: 1,
            stagger: 0.15,
          },
          "-=0.3",
        )
        .from(
          ".about-hero-description",
          {
            y: 30,
            opacity: 0,
            duration: 0.8,
          },
          "-=0.5",
        )
        .from(
          ".about-product-visual",
          {
            scale: 0.8,
            opacity: 0,
            rotate: 5,
            duration: 1.2,
          },
          "-=0.8",
        );

      // SCROLL REVEAL

      gsap.utils.toArray(".about-reveal").forEach((element) => {
        gsap.from(element, {
          y: 55,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 88%",
            once: true,
          },
        });
      });

      // REEL CARDS

      gsap.from(".about-reel-card", {
        y: 65,
        opacity: 0,
        stagger: 0.13,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".about-reels-grid",
          start: "top 85%",
          once: true,
        },
      });

      // VALUE CARDS

      gsap.from(".about-value-card", {
        y: 45,
        opacity: 0,
        stagger: 0.15,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".about-values-grid",
          start: "top 85%",
          once: true,
        },
      });

      // ORBIT ANIMATION

      gsap.to(".about-hero-orbit", {
        rotate: 360,
        duration: 35,
        repeat: -1,
        ease: "none",
      });
    }, pageRef);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <main className="about-page" ref={pageRef}>
      {/* =====================================
          HERO SECTION
      ===================================== */}

      <section className="about-hero">
        <div className="about-hero-inner">
          <div className="about-hero-content">
            <div className="about-eyebrow">
              <span>/</span>
              <span>GET TO KNOW US</span>
              <i />
            </div>

            <h1 className="about-heading">
              <span className="about-heading-mask">
                <span className="about-title-line">ABOUT</span>
              </span>

              <span className="about-heading-mask">
                <span className="about-title-line about-title-blue">
                  GADGETÉ.
                </span>
              </span>
            </h1>

            <div className="about-hero-description">
              <span>TECH THAT FITS YOUR LIFESTYLE.</span>

              <p>
                We're here for people who love technology. Discover thoughtfully
                selected gadgets that make everyday life smarter, simpler and
                better.
              </p>

              <a href="/shop" className="about-story-button">
                DISCOVER OUR COLLECTION
                <ArrowUpRight size={19} />
              </a>
            </div>
          </div>

          {/* HERO PRODUCT VISUAL */}

          <div className="about-hero-visual">
            <div className="about-hero-yellow" />

            <div className="about-hero-orbit" />

            <div className="about-product-visual">
              <img
                src="/images/about-headphones.png"
                alt="GADGETÉ headphones"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />

              <div className="about-product-fallback">
                <Headphones size={145} strokeWidth={1} />

                <span>GADGETÉ</span>
              </div>
            </div>

            <div className="about-visual-label">
              <span>DESIGN.</span>
              <span>TECH.</span>
              <span>LIFESTYLE.</span>
              <i />
            </div>

            <span className="about-star">✳</span>

            <span className="about-visual-number">01 / 04</span>
          </div>
        </div>

        <div className="about-hero-footer">
          <span>GADGETÉ — MORE THAN JUST GADGETS</span>

          <span>SCROLL TO EXPLORE ↓</span>
        </div>
      </section>

      {/* =====================================
          OUR STORY + REELS
      ===================================== */}

      <section className="about-story-section" id="our-story">
        {/* STORY */}

        <div className="about-story-left about-reveal">
          <div className="about-section-label">
            <span />
            01 / OUR STORY
          </div>

          <h2>
            A LITTLE
            <br />
            ABOUT
            <br />
            <span>WHO WE ARE.</span>
          </h2>

          <p>
            GADGETÉ is built around a simple idea: technology should feel
            exciting, accessible and useful.
          </p>

          <p>
            From everyday essentials to modern tech accessories, our goal is to
            bring together products that combine thoughtful design with everyday
            functionality.
          </p>

          <a href="/shop" className="about-shop-link">
            EXPLORE OUR COLLECTION
            <ArrowUpRight size={19} />
          </a>

          <div className="about-story-decoration">G.</div>
        </div>

        {/* REEL PLACEHOLDERS */}

        <div className="about-reels-area">
          <div className="about-reels-heading">
            <div>
              <span className="about-reel-heading-icon">
                <Camera size={22} />
              </span>

              <div>
                <span>02 / BEHIND THE SCENES</span>

                <h3>THE GADGETÉ REELS.</h3>
              </div>
            </div>

            <span className="about-reels-count">COMING SOON ↗</span>
          </div>

          <div className="about-reels-grid">
            {reels.map((reel) => (
              <article
                className={`about-reel-card ${reel.style}`}
                key={reel.id}
              >
                <div className="about-reel-image">
                  <div className="about-reel-number">{reel.id}</div>

                  <div className="about-reel-placeholder-content">
                    <div className="about-reel-placeholder-icon">
                      <Play size={24} fill="currentColor" />
                    </div>

                    <span>{reel.label}</span>

                    <Sparkles className="about-reel-sparkle" size={25} />
                  </div>

                  <span className="about-reel-coming">COMING SOON</span>
                </div>

                <div className="about-reel-caption">
                  <span>{reel.category}</span>

                  <h4>{reel.title}</h4>
                </div>
              </article>
            ))}
          </div>

          <div className="about-reels-bottom">
            <span>SMALL DETAILS. BIG EXPERIENCES.</span>

            <span>OUR STORIES ARE COMING ↗</span>
          </div>
        </div>
      </section>

      {/* =====================================
          MISSION / VISION / VALUES
      ===================================== */}

      <section className="about-values-section">
        <div className="about-values-heading about-reveal">
          <span>03 / WHAT DRIVES US</span>

          <h2>
            BUILT ON
            <span> GOOD VALUES.</span>
          </h2>
        </div>

        <div className="about-values-grid">
          {values.map((value) => {
            const Icon = value.icon;

            return (
              <article className="about-value-card" key={value.number}>
                <div className="about-value-top">
                  <span>{value.number}</span>

                  <Icon size={42} strokeWidth={1.4} />
                </div>

                <div>
                  <h3>{value.title}</h3>

                  <p>{value.description}</p>
                </div>

                <span className="about-value-arrow">↗</span>
              </article>
            );
          })}
        </div>
      </section>

      {/* =====================================
          STATISTICS
      ===================================== */}

      <section className="about-stats-section">
        <div className="about-stats-heading about-reveal">
          <span>04 / THE GADGETÉ WAY</span>

          <h2>SMALL BRAND. BIG ENERGY.</h2>
        </div>

        <div className="about-stats-grid">
          {stats.map((stat) => (
            <div className="about-stat" key={stat.label}>
              <h3>
                {stat.number}
                <span>{stat.suffix}</span>
              </h3>

              <p>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================
          FINAL CTA
      ===================================== */}

      <section className="about-cta-section">
        <div className="about-cta-content">
          <span>READY TO EXPLORE?</span>

          <h2>
            FIND YOUR
            <br />
            NEXT FAVOURITE
            <br />
            <span>GADGET.</span>
          </h2>

          <a href="/shop" className="about-cta-button">
            SHOP THE COLLECTION
            <ArrowUpRight size={21} />
          </a>
        </div>

        <div className="about-cta-decoration">G.</div>

        <div className="about-cta-footer">
          <span>GADGETÉ © {new Date().getFullYear()}</span>

          <span>MADE FOR YOUR EVERYDAY.</span>
        </div>
      </section>
    </main>
  );
}
