import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "../Style/CustomerCare.css";

gsap.registerPlugin(ScrollTrigger);

// Replace these with your actual business contact details.
const SUPPORT = {
  whatsapp: "919876543210",
  phone: "+919876543210",
  email: "support@yourdomain.com",
  hours: "MON – SAT  |  10:00 AM – 8:00 PM",
};

const Icon = ({ name, size = 42 }) => {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const icons = {
    whatsapp: (
      <>
        <path d="M24 5.5a18 18 0 0 0-15.5 27.2L6 42l9.7-2.5A18 18 0 1 0 24 5.5Z" />
        <path d="M17 15.5c.7-1 1.8-1 2.5-.2l2.2 3c.5.7.4 1.4-.2 2l-1.2 1.2c1.2 2.4 3.1 4.3 5.5 5.5l1.2-1.2c.6-.6 1.3-.7 2-.2l3 2.2c.8.6.8 1.8-.2 2.5-1.7 1.5-4.1 1.8-6.2.9-5.4-2.2-9.5-6.3-11.7-11.7-.9-2.1-.6-4.5.9-6Z" />
      </>
    ),
    phone: (
      <path d="M15 7h5l3 9-4 3c2 4 5 7 9 9l3-4 9 3v5c0 3-2 5-5 5C20 35 13 28 11 13c0-3 1-6 4-6Z" />
    ),
    email: (
      <>
        <rect x="5" y="9" width="38" height="30" rx="2" />
        <path d="m6 12 18 14 18-14" />
      </>
    ),
    order: (
      <>
        <path d="M8 16 24 7l16 9v20l-16 9-16-9V16Z" />
        <path d="m8 16 16 9 16-9M24 25v20M16 12l16 9" />
      </>
    ),
    truck: (
      <>
        <path d="M4 12h25v22H4zM29 20h8l7 8v6H29z" />
        <circle cx="13" cy="36" r="4" />
        <circle cx="36" cy="36" r="4" />
      </>
    ),
    shield: (
      <>
        <path d="M24 5 40 11v12c0 10-7 16-16 20C15 39 8 33 8 23V11l16-6Z" />
        <path d="m17 24 5 5 10-11" />
      </>
    ),
    return: (
      <>
        <path d="M8 16h29l-7-7M40 32H11l7 7" />
        <path d="m32 9 7 7-7 7M16 25l-7 7 7 7" />
      </>
    ),
    settings: (
      <>
        <circle cx="24" cy="24" r="8" />
        <path d="m20 5 8 0 1 5 4 2 4-2 5 7-3 4v5l3 4-5 7-4-2-4 2-1 5h-8l-1-5-4-2-4 2-5-7 3-4v-5l-3-4 5-7 4 2 4-2 1-5Z" />
      </>
    ),
    arrow: (
      <>
        <path d="M8 24h30M26 11l13 13-13 13" />
      </>
    ),
    headset: (
      <>
        <path d="M7 26v-5a17 17 0 0 1 34 0v5" />
        <rect x="5" y="23" width="9" height="16" rx="4" />
        <rect x="34" y="23" width="9" height="16" rx="4" />
        <path d="M38 39c-2 4-7 5-13 5" />
      </>
    ),
  };

  return <svg {...common}>{icons[name]}</svg>;
};

const contactOptions = [
  {
    id: "whatsapp",
    title: "WHATSAPP SUPPORT",
    description: "Chat with our team instantly.",
    icon: "whatsapp",
    link: `https://wa.me/${SUPPORT.whatsapp}`,
    className: "cc-whatsapp",
    external: true,
  },
  {
    id: "phone",
    title: "CALL US",
    description: SUPPORT.phone,
    icon: "phone",
    link: `tel:${SUPPORT.phone}`,
    className: "cc-phone",
  },
  {
    id: "email",
    title: "EMAIL US",
    description: SUPPORT.email,
    icon: "email",
    link: `mailto:${SUPPORT.email}`,
    className: "cc-email",
  },
  {
    id: "order",
    title: "ORDER SUPPORT",
    description: "Get help with your orders & delivery.",
    icon: "order",
    link: `mailto:${SUPPORT.email}?subject=Order%20Support`,
    className: "cc-order",
  },
];

const supportLinks = [
  { title: "ORDER HELP", icon: "truck", href: "/track-order" },
  { title: "WARRANTY SUPPORT", icon: "shield", href: "/warranty" },
  { title: "RETURNS & EXCHANGES", icon: "return", href: "/returns" },
  { title: "PRODUCT SUPPORT", icon: "settings", href: "/shop" },
];

export default function CustomerCare() {
  const pageRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const intro = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      intro
        .from(".cc-eyebrow", {
          y: 25,
          opacity: 0,
          duration: 0.7,
        })
        .from(
          ".cc-heading-line",
          {
            yPercent: 110,
            opacity: 0,
            duration: 1,
            stagger: 0.15,
          },
          "-=0.35",
        )
        .from(
          ".cc-hero-copy",
          {
            y: 25,
            opacity: 0,
            duration: 0.7,
          },
          "-=0.5",
        )
        .from(
          ".cc-hero-product",
          {
            scale: 0.8,
            opacity: 0,
            rotate: 8,
            duration: 1.2,
          },
          "-=0.8",
        )
        .from(
          ".cc-contact-card",
          {
            y: 70,
            opacity: 0,
            duration: 0.8,
            stagger: 0.12,
          },
          "-=0.45",
        );

      gsap.from(".cc-support-item", {
        scrollTrigger: {
          trigger: ".cc-support-strip",
          start: "top 85%",
        },
        y: 20,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
      });

      gsap.to(".cc-yellow-orbit", {
        rotate: 360,
        duration: 35,
        repeat: -1,
        ease: "none",
      });
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <main className="customer-care-page" ref={pageRef}>
      {/* HERO */}
      <section className="cc-hero">
        <div className="cc-hero-grid">
          <div className="cc-hero-content">
            <div className="cc-eyebrow">
              <span>/</span>
              <span>CUSTOMER CARE</span>
              <i />
            </div>

            <h1 className="cc-heading">
              <span className="cc-heading-mask">
                <span className="cc-heading-line">CUSTOMER</span>
              </span>
              <span className="cc-heading-mask cc-highlight-mask">
                <span className="cc-heading-line">CARE</span>
              </span>
            </h1>

            <div className="cc-hero-copy">
              <span className="cc-copy-label">WE'RE HERE FOR YOU.</span>
              <p>
                Need help with an order, product, payment or anything else? Our
                support team is ready to assist you.
              </p>
            </div>
          </div>

          <div className="cc-hero-visual">
            <div className="cc-yellow-orbit" />
            <div className="cc-product-stage">
              <div className="cc-product-image">
                <div className="cc-headphone-symbol">
                  <svg viewBox="0 0 360 360" aria-hidden="true">
                    <defs>
                      <linearGradient id="ccMetal" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="45%" stopColor="#9ba7ae" />
                        <stop offset="100%" stopColor="#26343d" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M75 195v-35a105 105 0 0 1 210 0v35"
                      fill="none"
                      stroke="url(#ccMetal)"
                      strokeWidth="35"
                      strokeLinecap="round"
                    />
                    <rect
                      x="46"
                      y="175"
                      width="72"
                      height="130"
                      rx="30"
                      fill="#10100e"
                    />
                    <rect
                      x="242"
                      y="175"
                      width="72"
                      height="130"
                      rx="30"
                      fill="#10100e"
                    />
                    <rect
                      x="58"
                      y="185"
                      width="48"
                      height="110"
                      rx="22"
                      fill="#26343d"
                    />
                    <rect
                      x="254"
                      y="185"
                      width="48"
                      height="110"
                      rx="22"
                      fill="#26343d"
                    />
                    <path
                      d="M100 70 Q180 -5 260 70"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="5"
                      opacity=".7"
                    />
                    <text
                      x="180"
                      y="254"
                      textAnchor="middle"
                      fontSize="42"
                      fontWeight="900"
                      fill="#eff04c"
                    >
                      G
                    </text>
                  </svg>
                </div>
              </div>
              <div className="cc-stage-platform" />
            </div>

            <div className="cc-floating-label">
              <span>REAL PEOPLE.</span>
              <span>REAL SUPPORT.</span>
              <i />
            </div>

            <div className="cc-floating-star">✳</div>
          </div>
        </div>

        <div className="cc-hero-bottom">
          <span>GADGETÉ CUSTOMER EXPERIENCE</span>
          <span>GOOD TECH. BETTER SUPPORT. ↗</span>
        </div>
      </section>

      {/* CONTACT OPTIONS */}
      <section className="cc-contact-section">
        <div className="cc-section-heading">
          <span>01 / GET IN TOUCH</span>
          <p>CHOOSE HOW YOU'D LIKE TO CONNECT WITH US.</p>
        </div>

        <div className="cc-contact-grid">
          {contactOptions.map((option, index) => (
            <a
              href={option.link}
              key={option.id}
              target={option.external ? "_blank" : undefined}
              rel={option.external ? "noreferrer" : undefined}
              className={`cc-contact-card ${option.className}`}
            >
              <div className="cc-card-top">
                <span>0{index + 1}</span>
                <span className="cc-card-arrow">
                  <Icon name="arrow" size={24} />
                </span>
              </div>

              <div className="cc-icon-tile">
                <Icon name={option.icon} size={58} />
              </div>

              <div className="cc-card-text">
                <h2>{option.title}</h2>
                <p>{option.description}</p>
              </div>

              <div className="cc-card-bottom">
                <span>CONNECT WITH US</span>
                <span>↗</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* SUPPORT CATEGORIES */}
      <section className="cc-support-strip">
        {supportLinks.map((item) => (
          <Link to={item.href} className="cc-support-item" key={item.title}>
            <Icon name={item.icon} size={32} />
            <span>{item.title}</span>
            <span className="cc-support-arrow">↗</span>
          </Link>
        ))}
      </section>

      {/* SUPPORT HOURS */}
      <section className="cc-bottom-section">
        <div className="cc-bottom-decoration">
          <span>G</span>
        </div>

        <div className="cc-hours-panel">
          <div className="cc-hours-icon">
            <Icon name="headset" size={48} />
          </div>

          <div className="cc-hours-text">
            <span>WE'RE ALWAYS HAPPY TO HELP</span>
            <h2>SUPPORT HOURS</h2>
            <p>{SUPPORT.hours}</p>
          </div>

          <a
            href={`https://wa.me/${SUPPORT.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="cc-talk-button"
          >
            <Icon name="whatsapp" size={27} />
            <span>TALK TO US NOW</span>
            <Icon name="arrow" size={23} />
          </a>
        </div>

        <div className="cc-footer-note">
          <span>GADGETÉ © {new Date().getFullYear()}</span>
          <span>HERE FOR EVERY LITTLE TECH TROUBLE.</span>
          <span>BACK TO TOP ↑</span>
        </div>
      </section>
    </main>
  );
}
