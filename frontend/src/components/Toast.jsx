import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import "../Style/Toast.css";

// Small "added to cart" style notice, shown at the bottom of the screen.
// Call showToast("Sunlight Lamp added to your cart", { link: "/cart", linkText: "VIEW CART" }).
export function showToast(message, options = {}) {
  window.dispatchEvent(new CustomEvent("gadgete-toast", { detail: { message, ...options } }));
}

export function ToastHost() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    const onToast = (event) => {
      window.clearTimeout(timer.current);
      setToast({ ...event.detail, key: Date.now() });
      timer.current = window.setTimeout(() => setToast(null), event.detail?.duration || 2800);
    };
    window.addEventListener("gadgete-toast", onToast);
    return () => {
      window.removeEventListener("gadgete-toast", onToast);
      window.clearTimeout(timer.current);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className={`ge-toast ${toast.error ? "is-error" : ""}`} role="status" aria-live="polite" key={toast.key}>
      <span className="ge-toast-icon">{toast.error ? <X size={15} /> : <Check size={15} />}</span>
      <span className="ge-toast-text">{toast.message}</span>
      {toast.link && (
        <Link className="ge-toast-link" to={toast.link} onClick={() => setToast(null)}>
          {toast.linkText || "VIEW"}
        </Link>
      )}
    </div>
  );
}
