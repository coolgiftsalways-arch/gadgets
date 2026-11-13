import { useLayoutEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

// ==========================================
// PUBLIC WEBSITE COMPONENTS
// ==========================================

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import HomeSections from "./components/HomeSections";
import Footer from "./components/Footer";
import OrderSuccess from "./Pages/OrderSuccess";

// ==========================================
// PUBLIC WEBSITE PAGES
// ==========================================

import Shop from "./Pages/Shop";
import About from "./Pages/About";
import CustomerCare from "./Pages/CustomerCare";
import ProductDetails from "./Pages/ProductDetails";
import TrackOrder from "./Pages/TrackOrder";
import Cart from "./Pages/Cart";
import Checkout from "./Pages/Checkout";

// ==========================================
// ADMIN
// ==========================================

import AdminLayout from "./Admin/AdminLayout";
import AdminLogin from "./Admin/AdminLogin";
import AdminDashboard from "./Admin/AdminDashboard";
import AdminCustomers from "./Admin/AdminCustomers";
import AdminOrders from "./Admin/AdminOrders";
import AdminProducts from "./Admin/AdminProducts";

// ==========================================
// GLOBAL CSS
// ==========================================

import "./App.css";
import "./Style/PageTransition.css";

// ==========================================
// INITIAL PAGE LOADER
// ==========================================

function PageLoader() {
  const loaderRef = useRef(null);
  const counterRef = useRef(null);
  const progressRef = useRef(null);

  useLayoutEffect(() => {
    const loader = loaderRef.current;
    const counter = counterRef.current;
    const progress = progressRef.current;

    if (!loader || !counter || !progress) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const counterValue = { value: 0 };

    const timeline = gsap.timeline({
      defaults: {
        ease: "power3.out",
      },
    });

    // The loader should never block clicks.
    gsap.set(loader, {
      xPercent: 0,
      autoAlpha: 1,
      display: "flex",
      pointerEvents: "none",
    });

    gsap.set(progress, {
      scaleX: 0,
      transformOrigin: "left center",
    });

    counter.textContent = "000";

    gsap.set(counter, {
      opacity: 1,
      y: 0,
    });

    if (reducedMotion) {
      timeline
        .set(counter, { textContent: "100" })
        .set(progress, { scaleX: 1 })
        .to(loader, {
          xPercent: -105,
          duration: 0.35,
          ease: "power2.inOut",
        })
        .set(loader, {
          autoAlpha: 0,
          display: "none",
        });

      return () => timeline.kill();
    }

    timeline.to(
      counterValue,
      {
        value: 100,
        duration: 1.05,
        ease: "power2.inOut",
        onUpdate: () => {
          counter.textContent = String(Math.round(counterValue.value)).padStart(
            3,
            "0",
          );
        },
      },
      0,
    );

    timeline.to(
      progress,
      {
        scaleX: 1,
        duration: 1.05,
        ease: "power2.inOut",
      },
      0,
    );

    timeline.to({}, { duration: 0.12 });

    timeline.to(loader, {
      xPercent: -105,
      duration: 0.85,
      ease: "power4.inOut",
    });

    timeline.set(loader, {
      autoAlpha: 0,
      display: "none",
    });

    return () => {
      timeline.kill();
      gsap.killTweensOf([loader, counter, progress]);
    };
  }, []);

  return (
    <div
      className="gadgete-loader"
      ref={loaderRef}
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      <div className="loader-grid" />

      <div className="loader-circle loader-circle-one" />
      <div className="loader-circle loader-circle-two" />

      <div className="loader-top">
        <span>GADGETÉ®</span>
        <span>INDEPENDENT TECH CULTURE</span>
        <span>INDIA — 2026</span>
      </div>

      <div className="loader-main">
        <div className="loader-small-text">
          <span className="loader-dot" />
          PREPARING YOUR EXPERIENCE
        </div>

        <div className="loader-title">
          <span>GOOD TECH.</span>
          <span className="loader-title-outline">BETTER LIFE.</span>
        </div>

        <div className="loader-counter-area">
          <span className="loader-counter" ref={counterRef}>
            000
          </span>
          <span className="loader-percent">%</span>
        </div>
      </div>

      <div className="loader-bottom">
        <div className="loader-progress-info">
          <span>LOADING EXPERIENCE</span>
          <span>PLEASE WAIT</span>
        </div>

        <div className="loader-progress-track">
          <div className="loader-progress-fill" ref={progressRef} />
        </div>

        <div className="loader-footer">
          <span>GADGETÉ — THE FUTURE IN YOUR HANDS</span>
          <span>DESIGNED TO MOVE ↗</span>
        </div>
      </div>

      <div className="loader-streaks">
        {Array.from({ length: 10 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>

      <div className="loader-yellow-block" />
    </div>
  );
}

// ==========================================
// LENIS SMOOTH SCROLL + SCROLL MANAGER
// ==========================================

function ScrollManager() {
  const location = useLocation();
  const lenisRef = useRef(null);

  useLayoutEffect(() => {
    const lenis = new Lenis({
      duration: 1.5,
      lerp: 0.075,
      smoothWheel: true,
      wheelMultiplier: 0.8,
      touchMultiplier: 1.5,
      infinite: false,
      autoRaf: false,
    });

    lenisRef.current = lenis;

    const handleScroll = () => {
      ScrollTrigger.update();
    };

    lenis.on("scroll", handleScroll);

    const updateScroll = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateScroll);
    gsap.ticker.lagSmoothing(0);

    const refreshFrame = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });

    return () => {
      cancelAnimationFrame(refreshFrame);
      lenis.off("scroll", handleScroll);
      gsap.ticker.remove(updateScroll);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;

    let firstFrame;
    let secondFrame;

    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (location.hash) {
          const targetId = decodeURIComponent(location.hash.substring(1));

          const target = document.getElementById(targetId);

          if (target) {
            lenis.scrollTo(target, {
              offset: -80,
              duration: 1.8,
              easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            });
          } else {
            lenis.scrollTo(0, { immediate: true });
          }
        } else {
          lenis.scrollTo(0, { immediate: true });
        }

        ScrollTrigger.refresh();
      });
    });

    return () => {
      if (firstFrame) cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, [location.pathname, location.hash, location.key]);

  return null;
}

// ==========================================
// PUBLIC WEBSITE PAGE WRAPPERS
// ==========================================

function Home() {
  return (
    <div className="gadgete-app">
      <Navbar />
      <main>
        <Hero />
        <HomeSections />
      </main>
      <Footer />
    </div>
  );
}

function ShopPage() {
  return (
    <div className="gadgete-app">
      <Navbar />
      <main>
        <Shop />
      </main>
      <Footer />
    </div>
  );
}

function OrderSuccessPage() {
  return (
    <div className="gadgete-app">
      <Navbar />
      <main>
        <OrderSuccess />
      </main>
      <Footer />
    </div>
  );
}

function AboutPage() {
  return (
    <div className="gadgete-app">
      <Navbar />
      <main>
        <About />
      </main>
      <Footer />
    </div>
  );
}

function Contact() {
  return (
    <div className="gadgete-app">
      <Navbar />
      <main>
        <CustomerCare />
      </main>
      <Footer />
    </div>
  );
}

function ProductPage() {
  return (
    <div className="gadgete-app">
      <Navbar />
      <main>
        <ProductDetails />
      </main>
      <Footer />
    </div>
  );
}

function TrackOrderPage() {
  return (
    <div className="gadgete-app">
      <Navbar />
      <main>
        <TrackOrder />
      </main>
      <Footer />
    </div>
  );
}

function CartPage() {
  return (
    <div className="gadgete-app">
      <Navbar />
      <main>
        <Cart />
      </main>
      <Footer />
    </div>
  );
}

function CheckoutPage() {
  return (
    <div className="gadgete-app">
      <Navbar />
      <main>
        <Checkout />
      </main>
      <Footer />
    </div>
  );
}

// ==========================================
// TEMPORARY ADMIN PAGE CONTENT
// These are placeholders until each section
// is connected to its real admin functionality.
// ==========================================

// ==========================================
// MAIN APP
// ==========================================

function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <PageLoader />

      <Routes>
        {/* PUBLIC WEBSITE ROUTES */}

        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/track-order" element={<TrackOrderPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />

        {/* ORDER SUCCESS - KEEP OUTSIDE ADMIN */}

        <Route
          path="/order-success"
          element={<OrderSuccessPage />}
        />

        {/* ADMIN ROUTES */}

        <Route path="/admin/login" element={<AdminLogin />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
