import { Suspense, lazy, useEffect, useLayoutEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from "react-router-dom";

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
import HomeVideos from "./components/HomeVideos";
import Footer from "./components/Footer";
import WhatsAppButton from "./components/WhatsAppButton";
import { usePageMeta } from "./usePageMeta";

// ==========================================
// PUBLIC WEBSITE PAGES
// ==========================================

// Pages people land on from ads load straight away; the rest load when
// first opened, so the home and product pages open faster.
import Shop from "./Pages/Shop";
import { ToastHost } from "./components/Toast";
import ProductDetails from "./Pages/ProductDetails";
import Cart from "./Pages/Cart";

const About = lazy(() => import("./Pages/About"));
const CustomerCare = lazy(() => import("./Pages/CustomerCare"));
const TrackOrder = lazy(() => import("./Pages/TrackOrder"));
const Checkout = lazy(() => import("./Pages/Checkout"));
const OrderSuccess = lazy(() => import("./Pages/OrderSuccess"));
const OrderResult = lazy(() => import("./Pages/OrderResult"));
const legal = (name) => lazy(() => import("./Pages/Legal").then((module) => ({ default: module[name] })));
const PrivacyPolicy = legal("PrivacyPolicy");
const Terms = legal("Terms");
const RefundPolicy = legal("RefundPolicy");
const ShippingPolicy = legal("ShippingPolicy");
const CancellationPolicy = legal("CancellationPolicy");

// ==========================================
// ADMIN (loaded only when you open /admin)
// ==========================================

const AdminLayout = lazy(() => import("./Admin/AdminLayout"));
const AdminLogin = lazy(() => import("./Admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./Admin/AdminDashboard"));
const AdminOrders = lazy(() => import("./Admin/AdminOrders"));
const AdminProducts = lazy(() => import("./Admin/AdminProducts"));
const AdminCoupons = lazy(() => import("./Admin/AdminCoupons"));
const AdminReviews = lazy(() => import("./Admin/AdminReviews"));
const AdminAbandoned = lazy(() => import("./Admin/AdminAbandoned"));

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

const SCROLL_KEY = "gadgete_scroll_positions";
const scrollPositions = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "{}");
  } catch {
    return {};
  }
})();

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

  // Remember how far down each visited page was scrolled, so pressing Back
  // returns to the same spot instead of the top.
  const navigationType = useNavigationType();
  const currentKey = useRef(location.key);

  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";

    let frame = 0;
    const save = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        scrollPositions[currentKey.current] = window.scrollY;
        try {
          sessionStorage.setItem(SCROLL_KEY, JSON.stringify(scrollPositions));
        } catch {
          /* storage full or blocked — positions still kept in memory */
        }
      });
    };

    window.addEventListener("scroll", save, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", save);
    };
  }, []);

  useLayoutEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;

    currentKey.current = location.key;

    let firstFrame;
    let secondFrame;
    let retryTimer;

    // Back / forward: go back to where this page was left.
    const saved = scrollPositions[location.key];
    if (navigationType === "POP" && typeof saved === "number" && saved > 0 && !location.hash) {
      let tries = 0;
      const restore = () => {
        const reachable = document.documentElement.scrollHeight - window.innerHeight >= saved - 4;
        if (reachable || tries >= 40) {
          lenis.scrollTo(saved, { immediate: true, force: true });
          ScrollTrigger.refresh();
          return;
        }
        // Page content (e.g. products) still loading — wait a moment.
        tries += 1;
        retryTimer = setTimeout(restore, 50);
      };
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(restore);
      });
      return () => {
        if (firstFrame) cancelAnimationFrame(firstFrame);
        if (secondFrame) cancelAnimationFrame(secondFrame);
        clearTimeout(retryTimer);
      };
    }

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
  }, [location.pathname, location.hash, location.key, navigationType]);

  return null;
}

// ==========================================
// PUBLIC WEBSITE PAGE WRAPPERS
// ==========================================

function Home() {
  usePageMeta("", "");
  return (
    <div className="gadgete-app">
      <Navbar />
      <main>
        <Hero />
        <HomeVideos />
        <HomeSections />
      </main>
      <Footer />
    </div>
  );
}

function ShopPage() {
  // A new ?q= / ?category= link re-opens the shop with that filter.
  const { search } = useLocation();
  usePageMeta("Shop All Gadgets", "Browse every gadget we sell — lamps, terrariums, colour-changing mugs, bike lights and more. Cash on Delivery available.");
  return (
    <div className="gadgete-app">
      <Navbar />
      <main>
        <Shop key={search} />
      </main>
      <Footer />
    </div>
  );
}

function OrderSuccessPage() {
  usePageMeta("Order Confirmed", "");
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
  usePageMeta("About Us", "");
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
  usePageMeta("Customer Care", "");
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

function LegalPage({ children }) {
  return (
    <div className="gadgete-app">
      <Navbar />
      <main>{children}</main>
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
  usePageMeta("Track Your Order", "");
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
  usePageMeta("Your Cart", "");
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
  usePageMeta("Checkout", "");
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

function NotFoundPage() {
  usePageMeta("Page not found", "");
  return (
    <div className="gadgete-app">
      <Navbar />
      <main className="not-found-page">
        <span>ERROR 404</span>
        <h1>
          PAGE NOT <em>FOUND.</em>
        </h1>
        <p>The page you're looking for has moved or doesn't exist.</p>
        <a href="/shop">BROWSE ALL GADGETS →</a>
      </main>
      <Footer />
    </div>
  );
}

// ==========================================
// MAIN APP
// ==========================================

function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <PageLoader />
      <ToastHost />

      <WhatsAppButton />

      <Suspense fallback={<div className="route-loading" aria-busy="true" />}>
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
        <Route path="/privacy-policy" element={<LegalPage><PrivacyPolicy /></LegalPage>} />
        <Route path="/terms" element={<LegalPage><Terms /></LegalPage>} />
        <Route path="/refund-policy" element={<LegalPage><RefundPolicy /></LegalPage>} />
        <Route path="/shipping-policy" element={<LegalPage><ShippingPolicy /></LegalPage>} />
        <Route path="/cancellation-policy" element={<LegalPage><CancellationPolicy /></LegalPage>} />

        {/* ORDER SUCCESS - KEEP OUTSIDE ADMIN */}

        <Route
          path="/order-success"
          element={<OrderSuccessPage />}
        />

        <Route
          path="/order-failed"
          element={
            <div className="gadgete-app">
              <Navbar />
              <main>
                <OrderResult />
              </main>
              <Footer />
            </div>
          }
        />

        {/* ADMIN ROUTES */}

        <Route path="/admin/login" element={<AdminLogin />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="abandoned" element={<AdminAbandoned />} />
          <Route path="reviews" element={<AdminReviews />} />
        </Route>

        {/* ANYTHING ELSE */}
        <Route path="*" element={<NotFoundPage />} />

      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
