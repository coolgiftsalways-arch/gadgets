import { useState, useEffect } from "react";

import {
  Search,
  ShoppingBag,
  Menu,
  X,
  ArrowUpRight,
  Heart,
} from "lucide-react";

import { Link, useLocation } from "react-router-dom";
import "../Style/Navbar.css";

const CART_KEY = "gadgete_cart";

const getCartCount = () => {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");

    if (!Array.isArray(cart)) return 0;

    return cart.reduce(
      (total, item) => total + Math.max(0, Number(item.quantity) || 0),
      0,
    );
  } catch (error) {
    console.error("Unable to read cart:", error);
    return 0;
  }
};

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [cartCount, setCartCount] = useState(getCartCount);

  const location = useLocation();

  // NAVIGATION DATA
  const navigation = [
    { name: "HOME", path: "/" },
    { name: "SHOP", path: "/shop" },
    { name: "ABOUT", path: "/about" },
    { name: "TRACK ORDER", path: "/track-order" },
    { name: "CONTACT", path: "/contact" },
  ];

  // ACTIVE LINK
  const isActiveLink = (item) => {
    if (item.path === "/") {
      return location.pathname === "/";
    }

    return (
      location.pathname === item.path ||
      location.pathname.startsWith(`${item.path}/`)
    );
  };

  // UPDATE CART COUNT
  useEffect(() => {
    const updateCartCount = () => {
      setCartCount(getCartCount());
    };

    // Listen for cart updates within this tab
    window.addEventListener("gadgete-cart-updated", updateCartCount);

    // Listen for changes from other tabs
    window.addEventListener("storage", updateCartCount);

    // Initial update
    updateCartCount();

    return () => {
      window.removeEventListener("gadgete-cart-updated", updateCartCount);

      window.removeEventListener("storage", updateCartCount);
    };
  }, []);

  // CLOSE MENUS WHEN ROUTE CHANGES
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.hash]);

  // PREVENT BACKGROUND SCROLL ON MOBILE MENU
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // SEARCH
  const handleSearch = (e) => {
    e.preventDefault();

    const value = searchValue.trim();

    if (!value) return;

    window.location.href = `/shop?search=${encodeURIComponent(value)}`;
  };

  return (
    <header className="ge-navbar">
      {/* TOP ANNOUNCEMENT BAR */}
      <div className="ge-top-strip">
        <span className="ge-top-message">
          GADGETÉ® — OBJECTS FOR THE NEXT GENERATION
        </span>

        <span className="ge-top-right">
          EST. 2026
          <span className="ge-live-dot"></span>
          ONLINE
        </span>
      </div>

      {/* MAIN NAVBAR */}
      <div className="ge-nav-main">
        {/* LOGO */}
        <Link to="/" className="ge-logo">
          GADGET<span>É</span>
          <sup>®</sup>
        </Link>

        {/* DESKTOP NAVIGATION */}
        <nav className="ge-nav-links">
          {navigation.map((item, index) => (
            <Link
              key={item.name}
              to={item.path}
              className={`ge-nav-link ${isActiveLink(item) ? "active" : ""}`}
            >
              <span className="ge-link-number">0{index + 1}</span>

              <span className="ge-link-text">{item.name}</span>

              <ArrowUpRight size={13} className="ge-link-arrow" />
            </Link>
          ))}
        </nav>

        {/* RIGHT ACTIONS */}
        <div className="ge-nav-actions">
          {/* SEARCH */}
          <button
            type="button"
            className={`ge-icon-button ${searchOpen ? "selected" : ""}`}
            onClick={() => {
              setSearchOpen(!searchOpen);
              setMenuOpen(false);
            }}
            aria-label="Search"
          >
            {searchOpen ? <X size={20} /> : <Search size={20} />}
          </button>

          {/* SHOPPING BAG WITH LIVE COUNT */}
          <Link
            to="/cart"
            className="ge-icon-button ge-bag-button"
            aria-label={`Shopping bag, ${cartCount} items`}
          >
            <ShoppingBag size={20} />

            <span
              className={`ge-bag-count ${cartCount > 0 ? "has-items" : ""}`}
              aria-live="polite"
            >
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          </Link>

          {/* MOBILE MENU */}
          <button
            type="button"
            className="ge-menu-toggle"
            onClick={() => {
              setMenuOpen(!menuOpen);
              setSearchOpen(false);
            }}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* SEARCH PANEL */}
      <div className={`ge-search-panel ${searchOpen ? "open" : ""}`}>
        <form onSubmit={handleSearch}>
          <Search size={22} />

          <input
            type="text"
            placeholder="SEARCH YOUR NEXT OBSESSION..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            autoFocus={searchOpen}
          />

          <button type="submit">
            SEARCH
            <ArrowUpRight size={16} />
          </button>
        </form>
      </div>

      {/* MOBILE NAVIGATION */}
      <div className={`ge-mobile-menu ${menuOpen ? "open" : ""}`}>
        <div className="ge-mobile-menu-heading">
          <span>EXPLORE THE UNORDINARY</span>
          <span>MENU / 001</span>
        </div>

        <nav>
          {navigation.map((item, index) => (
            <Link
              key={item.name}
              to={item.path}
              className={`ge-mobile-link ${isActiveLink(item) ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="ge-mobile-number">0{index + 1}</span>

              <span className="ge-mobile-link-text">{item.name}</span>

              <ArrowUpRight size={24} />
            </Link>
          ))}
        </nav>

        <div className="ge-mobile-bottom">
          <span>GADGETÉ® — THINK DIFFERENT.</span>
          <Heart size={18} />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
