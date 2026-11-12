import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, ArrowUpRight, Check } from "lucide-react";
import "../Style/Footer.css";

// Replace with your actual WhatsApp number.
// Include country code, without + or spaces.
const WHATSAPP_NUMBER = "919876543210";

const SocialIcons = {
  Instagram: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  ),

  Youtube: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
    </svg>
  ),

  Linkedin: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5.2 3a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4ZM3.3 9h3.8v12H3.3V9Zm6.2 0h3.6v1.6h.1a4 4 0 0 1 3.6-2c3.9 0 4.6 2.5 4.6 5.7V21h-3.8v-5.9c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1V21H9.5V9Z" />
    </svg>
  ),

  WhatsApp: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.7a8.5 8.5 0 1 1 16.3-3.8Z" />
      <path d="M8.5 8.5c.5 3 3 5.5 6 6l1.2-1.3-2-1-1 1c-1.2-.5-2.2-1.5-2.7-2.7l1-1-1-2-1.5 1Z" />
    </svg>
  ),
};

function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState("");

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("PLEASE ENTER YOUR EMAIL.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setError("PLEASE ENTER A VALID EMAIL.");
      return;
    }

    // Connect your backend newsletter API here.
    // This currently provides frontend-only feedback.
    setSubscribed(true);
    setEmail("");

    window.setTimeout(() => setSubscribed(false), 4000);
  };

  const socialLinks = [
    {
      name: "Instagram",
      url: "https://www.instagram.com/",
      icon: <SocialIcons.Instagram />,
    },
    {
      name: "YouTube",
      url: "https://www.youtube.com/",
      icon: <SocialIcons.Youtube />,
    },
    {
      name: "X",
      url: "https://x.com/",
      icon: <span className="footer-x-icon">𝕏</span>,
    },
    {
      name: "WhatsApp",
      url: `https://wa.me/${WHATSAPP_NUMBER}`,
      icon: <SocialIcons.WhatsApp />,
    },
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/",
      icon: <SocialIcons.Linkedin />,
    },
  ];

  return (
    <footer className="ge-footer">
      <div className="footer-grain" aria-hidden="true" />

      <div className="footer-topbar">
        <div className="footer-tagline">
          <span className="footer-live-dot" />
          <span>GOOD TECH. BETTER LIFE.</span>
        </div>

        <button
          className="footer-back-top"
          onClick={handleBackToTop}
          aria-label="Back to top"
          type="button"
        >
          BACK TO TOP
          <span>
            <ArrowUp size={19} />
          </span>
        </button>
      </div>

      <div className="footer-main">
        <div className="footer-newsletter-title">
          <h2>
            LET'S
            <br />
            STAY
            <br />
            <span>CONNECTED.</span>
          </h2>
          <div className="footer-title-line" />
        </div>

        <div className="footer-newsletter">
          <p>
            Get the latest drops, exclusive offers and stories from Gadgeté.
          </p>

          <form className="footer-subscribe-form" onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              required
              aria-label="Enter your email"
            />
            <button type="submit" aria-label="Subscribe to newsletter">
              {subscribed ? <Check size={24} /> : <ArrowUpRight size={27} />}
            </button>
          </form>

          <span
            className={`footer-success ${subscribed ? "active" : ""}`}
            role="status"
          >
            {subscribed
              ? "THANK YOU FOR JOINING GADGETÉ!"
              : error || "NO SPAM. JUST GOOD TECH."}
          </span>
        </div>

        <nav className="footer-links" aria-label="Shop links">
          <h3>SHOP</h3>
          <Link to="/shop">All Products</Link>
          <Link to="/shop">Smartwatches</Link>
          <Link to="/shop">Audio</Link>
          <Link to="/shop">Accessories</Link>
        </nav>

        <nav className="footer-links" aria-label="Support links">
          <h3>SUPPORT</h3>
          <Link to="/contact">Customer Care</Link>
          <Link to="/track-order">Track Order</Link>
          <Link to="/contact">Returns &amp; Refunds</Link>
          <Link to="/contact">FAQs</Link>
        </nav>

        <nav className="footer-links" aria-label="About links">
          <h3>ABOUT</h3>
          <Link to="/about">Our Story</Link>
          <Link to="/about">Tech Culture</Link>
          <Link to="/about">Careers</Link>
          <Link to="/contact">Contact Us</Link>
        </nav>
      </div>

      <div className="footer-bottom">
        <div className="footer-copyright">
          © {new Date().getFullYear()} GADGETÉ. ALL RIGHTS RESERVED.
        </div>

        <div className="footer-socials">
          <span>FOLLOW US</span>
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.name}
              title={social.name}
            >
              {social.icon}
            </a>
          ))}
        </div>
      </div>

      <div className="footer-legal">
        <Link to="/privacy-policy">PRIVACY POLICY</Link>
        <Link to="/terms">TERMS &amp; CONDITIONS</Link>
        <span>MADE FOR THE NEXT GENERATION.</span>
      </div>
    </footer>
  );
}

export default Footer;
