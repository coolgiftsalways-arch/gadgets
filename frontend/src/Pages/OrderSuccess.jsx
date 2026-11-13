
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Package,
  Truck,
  ShoppingBag,
  ArrowRight,
  MapPin,
  Clock,
} from "lucide-react";

import "../Style/OrderSuccess.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "/api"
).replace(/\/+$/, "");

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("order");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchOrder() {
      if (!token) {
        setError("Order reference is missing.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/orders/${encodeURIComponent(token)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to retrieve your order.");
        }

        if (!cancelled) {
          setOrder(data.order);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchOrder();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const formatPrice = (price) =>
    `₹${Number(price || 0).toLocaleString("en-IN")}`;

  if (loading) {
    return (
      <main className="os-page">
        <div className="os-loading">
          <div className="os-spinner" />
          <h2>CONFIRMING YOUR ORDER...</h2>
          <p>Please wait while we retrieve your order details.</p>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="os-page">
        <div className="os-card os-error">
          <Package size={55} />
          <h1>ORDER DETAILS UNAVAILABLE.</h1>
          <p>{error || "We couldn't find this order."}</p>
          <Link to="/track-order" className="os-button">
            TRACK YOUR ORDER <ArrowRight size={18} />
          </Link>
        </div>
      </main>
    );
  }

  const isPaid = order.payment?.status === "paid";
  const isCod = order.payment?.method === "cod";

  return (
    <main className="os-page">

      <div className="os-card">

        {/* SUCCESS ICON */}

        <div className="os-success-icon">
          <CheckCircle2 size={55} strokeWidth={1.5} />
        </div>

        <span className="os-eyebrow">
          GADGETÉ / ORDER CONFIRMATION
        </span>

        <h1>
          {isCod ? (
            <>ORDER <span>CONFIRMED.</span></>
          ) : isPaid ? (
            <>PAYMENT <span>SUCCESSFUL.</span></>
          ) : (
            <>ORDER <span>RECEIVED.</span></>
          )}
        </h1>

        <p className="os-description">
          Thank you for shopping with GADGETÉ!
          {isCod
            ? " Your Cash on Delivery order has been successfully placed. Pay when your order arrives."
            : isPaid
              ? " Your payment has been received successfully."
              : " Your order has been received and is awaiting payment confirmation."}
        </p>

        {/* ORDER NUMBER */}

        <div className="os-order-number">
          <span>YOUR ORDER NUMBER</span>
          <strong>{order.orderNumber}</strong>
        </div>

        {/* STATUS */}

        <div className="os-status">
          <CheckCircle2 size={19} />
          <span>
            {isCod
              ? "COD ORDER PLACED"
              : isPaid
                ? "PAYMENT VERIFIED"
                : "PAYMENT PENDING"}
          </span>
        </div>

        {/* ORDER DETAILS */}

        <div className="os-section">

          <div className="os-section-heading">
            <h2>ORDER <span>DETAILS.</span></h2>
            <ShoppingBag size={20} />
          </div>

          {order.items?.map((item, index) => (
            <div className="os-product" key={index}>

              <div className="os-product-image">
                {item.image ? (
                  <img src={item.image} alt={item.name} />
                ) : (
                  <Package size={25} />
                )}
              </div>

              <div className="os-product-info">
                <strong>{item.name}</strong>
                <span>Color: {item.color || "Standard"}</span>
                <span>Quantity: {item.quantity}</span>
              </div>

              <strong>
                {formatPrice(item.price * item.quantity)}
              </strong>

            </div>
          ))}

          <div className="os-divider" />

          <div className="os-total">
            <span>TOTAL AMOUNT</span>
            <strong>{formatPrice(order.total)}</strong>
          </div>

          <div className="os-payment-info">
            <span>PAYMENT METHOD</span>
            <strong>
              {isCod ? "Cash on Delivery" : "Online Payment"}
            </strong>
          </div>

          <div className="os-payment-info">
            <span>PAYMENT STATUS</span>
            <strong>
              {isPaid ? "Paid" : isCod ? "Pay on Delivery" : "Pending"}
            </strong>
          </div>

        </div>

        {/* DELIVERY DETAILS */}

        <div className="os-delivery">

          <div className="os-delivery-icon">
            <Truck size={24} />
          </div>

          <div>
            <h3>DELIVERY INFORMATION</h3>

            <p>
              <MapPin size={15} />
              {order.shipTo || "Address saved successfully"}
            </p>

            <p>
              <Clock size={15} />
              {order.estimatedDelivery
                ? "Estimated delivery information available in tracking."
                : "Delivery details will be updated as your order progresses."}
            </p>
          </div>

        </div>

        {/* ACTIONS */}

        <div className="os-actions">

          <Link to="/track-order" className="os-button os-primary">
            TRACK YOUR ORDER
            <ArrowRight size={18} />
          </Link>

          <Link to="/shop" className="os-button os-secondary">
            CONTINUE SHOPPING
          </Link>

        </div>

        <p className="os-footer">
          THANK YOU FOR CHOOSING GADGETÉ.
          <br />
          GOOD TECH. BETTER LIFE.
        </p>

      </div>

    </main>
  );
}
