import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, X, ShoppingBag, ArrowRight } from "lucide-react";
import { api, clearCart, formatPrice, imageUrl } from "../shopApi";
import "../Style/Checkout.css";

// /order-success?order=…  and  /order-failed?order=…
export default function OrderResult({ success = false }) {
  const [params] = useSearchParams();
  const token = params.get("order");
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (success) clearCart();
    if (!token) return;
    api(`/orders/${token}`).then((data) => setOrder(data.order)).catch(() => {});
  }, [success, token]);

  const box = { maxWidth: 620, margin: "0 auto" };

  if (!success) {
    return (
      <main className="ge-checkout-page">
        <div className="ge-checkout-empty">
          <X size={55} />
          <h1>PAYMENT NOT <span>COMPLETED.</span></h1>
          <p>No money was taken. Your cart is still saved, so you can try again.</p>
          <Link to="/checkout" className="ge-place-order" style={{ maxWidth: 320 }}>TRY AGAIN <ArrowRight size={20} /></Link>
        </div>
      </main>
    );
  }

  const cod = order?.payment?.method === "cod";

  return (
    <main className="ge-checkout-page">
      <section className="ge-checkout-heading">
        <h1>THANK <span>YOU.</span></h1>
        <div className="ge-checkout-heading-description">
          YOUR ORDER IS CONFIRMED.<br />
          {order ? `ORDER ${order.orderNumber}` : ""}
        </div>
      </section>

      <section className="ge-order-summary" style={box}>
        <div className="ge-summary-heading">
          <h2><Check size={26} /> ORDER <span>PLACED.</span></h2>
        </div>
        {order ? (
          <>
            <p style={{ marginBottom: 12 }}>
              {cod
                ? `Please keep ${formatPrice(order.total)} ready to pay in cash on delivery.`
                : "Your payment was successful."}{" "}
              A confirmation email has been sent to {order.customer.email}.
            </p>
            <div className="ge-checkout-products">
              {order.items.map((item, index) => (
                <div className="ge-checkout-product" key={index}>
                  <div className="ge-checkout-product-image">
                    {item.image ? <img src={imageUrl(item.image)} alt={item.name} /> : <ShoppingBag size={25} />}
                  </div>
                  <div className="ge-checkout-product-info"><h3>{item.name}</h3><p>{item.color || "Standard"}</p></div>
                  <span className="ge-checkout-quantity">× {item.quantity}</span>
                  <strong className="ge-checkout-price">{formatPrice(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="ge-checkout-summary-divider" />
            {order.discount > 0 && (
              <div className="ge-checkout-summary-row"><span>UPI discount</span><strong>−{formatPrice(order.discount)}</strong></div>
            )}
            <div className="ge-checkout-total"><span>{cod ? "To pay on delivery" : "Total paid"}</span><strong>{formatPrice(order.total)}</strong></div>
            {order.estimatedDelivery && (
              <p style={{ marginTop: 10, fontSize: 13 }}>
                Estimated delivery: {new Date(order.estimatedDelivery.from).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} –{" "}
                {new Date(order.estimatedDelivery.to).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </p>
            )}
          </>
        ) : (
          <p>Loading your order…</p>
        )}
      </section>

      <div style={{ ...box, display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        {order && (
          <Link to={`/track-order?order=${order.orderNumber}`} className="ge-place-order" style={{ flex: 1 }}>
            TRACK ORDER <ArrowRight size={20} />
          </Link>
        )}
        <Link to="/shop" className="ge-place-order" style={{ flex: 1 }}>CONTINUE SHOPPING <ArrowRight size={20} /></Link>
      </div>
    </main>
  );
}
