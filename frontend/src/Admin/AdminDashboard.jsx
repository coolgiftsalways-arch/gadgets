import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  TrendingUp,
  ShoppingBag,
  Users,
  Package,
  IndianRupee,
  ArrowUpRight,
  Clock3,
  CheckCircle2,
  Truck,
  X,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  adminFetch,
  customerName,
  formatDateTime,
  money,
  statusClass,
  statusLabel,
} from "./api";
import "../Admincss/AdminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [notes, setNotes] = useState({ unread: 0, items: [] });
  const [days, setDays] = useState(7);
  const [error, setError] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [statsData, notesData] = await Promise.all([
        adminFetch(`/stats?days=${days}`),
        adminFetch("/notifications"),
      ]);
      setStats(statsData);
      setNotes(notesData);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [days]);

  // Load now, then refresh every 20 seconds so new orders show up.
  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) setBellOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const markAllRead = async () => {
    await adminFetch("/notifications/read-all", { method: "POST" }).catch(() => {});
    window.dispatchEvent(new Event("gadgete-admin-refresh"));
    load();
  };

  const openOrder = (id) => {
    setBellOpen(false);
    navigate(`/admin/orders?open=${id}`);
  };

  const unseen = notes.items.filter((item) => item.seenByAdmin === false);
  const maxSales = useMemo(
    () => Math.max(1, ...(stats?.chart || []).map((day) => day.sales)),
    [stats],
  );

  const counts = stats?.statusCounts || {};

  const cards = [
    {
      label: "TOTAL REVENUE",
      value: money(stats?.revenue),
      note: `Money received · ${money(stats?.pendingCod)} COD to collect`,
      icon: IndianRupee,
    },
    {
      label: "TOTAL ORDERS",
      value: stats?.totalOrders ?? "—",
      note: `${stats?.toFulfil ?? 0} waiting to be shipped`,
      icon: ShoppingBag,
    },
    {
      label: "TOTAL CUSTOMERS",
      value: stats?.customerCount ?? "—",
      note: `${stats?.subscriberCount ?? 0} newsletter subscribers`,
      icon: Users,
    },
    {
      label: "TOTAL PRODUCTS",
      value: stats?.productCount ?? "—",
      note: `${stats?.activeProductCount ?? 0} live in the shop`,
      icon: Package,
    },
  ];

  const statusRows = [
    ["pending", "Pending", Clock3],
    ["processing", "Processing", ShoppingBag],
    ["shipped", "Shipped", Truck],
    ["delivered", "Delivered", CheckCircle2],
  ];

  return (
    <div className="gad-dashboard">
      <header className="gad-dashboard-header">
        <div className="gad-dashboard-title">
          <span className="gad-dashboard-eyebrow">GADGETÉ / CONTROL CENTRE</span>
          <h1>
            DASHBOARD<span>.</span>
          </h1>
          <p>Here’s what’s happening with your store.</p>
        </div>

        <div className="gad-dashboard-header-actions">
          <div className="gad-dashboard-date">
            <span className="gad-live-dot" />
            LIVE
          </div>

          <div className="gad-notification-wrap" ref={bellRef}>
            <button
              type="button"
              className={`gad-notification-button ${bellOpen ? "is-open" : ""}`}
              onClick={() => setBellOpen((open) => !open)}
              aria-label={`Notifications, ${notes.unread} new orders`}
            >
              <Bell size={21} />
              {notes.unread > 0 && (
                <span className="gad-notification-count">{notes.unread > 99 ? "99+" : notes.unread}</span>
              )}
            </button>

            {bellOpen && (
              <section className="gad-notification-popover">
                <div className="gad-notification-popover-head">
                  <div>
                    <span className="gad-dashboard-eyebrow">LIVE UPDATES</span>
                    <h2>Notifications</h2>
                    <p>{notes.unread} new {notes.unread === 1 ? "order" : "orders"}</p>
                  </div>
                  <button type="button" className="gad-popover-close" onClick={() => setBellOpen(false)} aria-label="Close">
                    <X size={18} />
                  </button>
                </div>

                {unseen.length > 0 && (
                  <div className="gad-notification-tools">
                    <button type="button" onClick={markAllRead}>Mark all as read</button>
                  </div>
                )}

                <div className="gad-notification-list">
                  {notes.items.length ? (
                    notes.items.slice(0, 12).map((item) => (
                      <button
                        type="button"
                        className={`gad-notification-item ${item.seenByAdmin === false ? "unread" : "read"}`}
                        key={item._id}
                        onClick={() => openOrder(item._id)}
                      >
                        <span className="gad-notification-item-icon"><ShoppingBag size={17} /></span>
                        <span className="gad-notification-item-copy">
                          <strong>{item.seenByAdmin === false ? "New order received" : "Order"}</strong>
                          <span>{item.orderNumber} · {customerName(item.customer)}</span>
                          <small>{formatDateTime(item.placedAt)} · {item.payment?.method === "cod" ? "COD" : "Paid online"}</small>
                        </span>
                        <span className="gad-notification-item-right">
                          <b>{money(item.total)}</b>
                          {item.seenByAdmin === false && <i />}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="gad-notification-empty">
                      <Bell size={25} />
                      <strong>No orders yet</strong>
                      <span>New order alerts will appear here.</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="gad-notification-footer"
                  onClick={() => {
                    setBellOpen(false);
                    navigate("/admin/orders");
                  }}
                >
                  VIEW ALL ORDERS <ExternalLink size={15} />
                </button>
              </section>
            )}
          </div>
        </div>
      </header>

      {error && <div className="gad-dashboard-disclaimer"><AlertTriangle size={15} /> {error}</div>}

      <section className="gad-dashboard-welcome">
        <div>
          <span className="gad-dashboard-eyebrow">TODAY</span>
          <h2>
            {money(stats?.today?.sales)} <em>sales today.</em>
          </h2>
          <p>
            {stats?.today?.orders ?? 0} order(s) today
            {stats?.attentionCount ? ` · ${stats.attentionCount} order(s) need attention` : ""}
            {stats?.unreadMessages ? ` · ${stats.unreadMessages} unread customer message(s)` : ""}
          </p>
        </div>
        <div className="gad-welcome-mark">
          G<span>É</span>
        </div>
      </section>

      <section className="gad-dashboard-stats">
        {cards.map(({ label, value, note, icon: Icon }) => (
          <article className="gad-stat-card" key={label}>
            <div className="gad-stat-top">
              <span>{label}</span>
              <span className="gad-stat-icon"><Icon size={19} /></span>
            </div>
            <strong className="gad-stat-value">{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>

      <section className="gad-dashboard-main-grid">
        <article className="gad-dashboard-panel gad-sales-panel">
          <div className="gad-panel-heading">
            <div>
              <span className="gad-dashboard-eyebrow">PERFORMANCE</span>
              <h2>Sales overview<span>.</span></h2>
            </div>
            <select
              className="gad-panel-period"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              aria-label="Chart period"
            >
              <option value={7}>LAST 7 DAYS</option>
              <option value={14}>LAST 14 DAYS</option>
              <option value={30}>LAST 30 DAYS</option>
            </select>
          </div>

          <div className="gad-sales-empty-chart">
            <div className="gad-chart-y-labels">
              <span>{money(maxSales)}</span>
              <span>{money(maxSales / 2)}</span>
              <span>₹ 0</span>
            </div>
            <div className="gad-chart-area" style={{ overflowX: "auto" }}>
              {(stats?.chart || []).map((day) => (
                <div className="gad-chart-column" key={day.date} title={`${day.date}: ${money(day.sales)} · ${day.orders} order(s)`}>
                  <div className="gad-chart-gridline" />
                  <div
                    className="gad-chart-bar-empty"
                    style={{
                      height: `${Math.max(2, (day.sales / maxSales) * 100)}%`,
                      background: day.sales ? "#eff04c" : undefined,
                      border: day.sales ? "1px solid #10100e" : undefined,
                    }}
                  />
                  <span>{days > 7 ? day.date.slice(8) : day.label}</span>
                </div>
              ))}
              {stats && stats.period.sales === 0 && (
                <div className="gad-chart-no-data">NO SALES IN THIS PERIOD YET</div>
              )}
            </div>
          </div>
          <p className="gad-panel-footnote">
            {money(stats?.period?.sales)} from {stats?.period?.orders ?? 0} order(s) in the last {days} days
            {typeof stats?.period?.salesChange === "number" ? ` (${stats.period.salesChange >= 0 ? "+" : ""}${stats.period.salesChange}% vs previous period)` : ""}.
          </p>
        </article>

        <article className="gad-dashboard-panel gad-order-status-panel">
          <div className="gad-panel-heading">
            <div>
              <span className="gad-dashboard-eyebrow">FULFILMENT</span>
              <h2>Order status<span>.</span></h2>
            </div>
          </div>

          {statusRows.map(([key, label, Icon]) => (
            <div className="gad-status-row" key={key}>
              <span className={`gad-status-icon ${key}`}><Icon size={17} /></span>
              <span>{label}</span>
              <strong>{key === "shipped" ? (counts.shipped || 0) + (counts.out_for_delivery || 0) : counts[key] || 0}</strong>
            </div>
          ))}
          <button type="button" className="gad-text-link" onClick={() => navigate("/admin/orders")}>
            MANAGE ORDERS <ArrowUpRight size={16} />
          </button>
        </article>
      </section>

      <section className="gad-dashboard-bottom-grid">
        <article className="gad-dashboard-panel gad-quick-actions">
          <div className="gad-panel-heading">
            <div>
              <span className="gad-dashboard-eyebrow">INVENTORY</span>
              <h2>Low stock<span>.</span></h2>
            </div>
          </div>
          {stats?.lowStock?.length ? (
            stats.lowStock.map((product) => (
              <button type="button" className="gad-quick-action" key={product._id} onClick={() => navigate("/admin/products")}>
                <span className="gad-quick-action-icon"><Package size={19} /></span>
                <span className="gad-quick-action-copy">
                  <strong>{product.name}</strong>
                  <small>{product.stock === 0 ? "Out of stock" : `${product.stock} left`} · {product.sku}</small>
                </span>
                <ArrowUpRight size={17} />
              </button>
            ))
          ) : (
            <p className="gad-panel-footnote">All products have more than {stats?.lowStockThreshold ?? 5} in stock.</p>
          )}
        </article>

        <article className="gad-dashboard-panel gad-recent-orders">
          <div className="gad-panel-heading">
            <div>
              <span className="gad-dashboard-eyebrow">LATEST ACTIVITY</span>
              <h2>Recent orders<span>.</span></h2>
            </div>
            <button type="button" className="gad-panel-view-all" onClick={() => navigate("/admin/orders")}>
              VIEW ALL <ArrowUpRight size={15} />
            </button>
          </div>
          {stats?.recent?.length ? (
            stats.recent.map((order) => (
              <button type="button" className="gad-quick-action" key={order._id} onClick={() => openOrder(order._id)}>
                <span className="gad-quick-action-icon"><ShoppingBag size={19} /></span>
                <span className="gad-quick-action-copy">
                  <strong>{order.orderNumber} · {customerName(order.customer)}</strong>
                  <small>
                    {formatDateTime(order.placedAt)} ·{" "}
                    <span className={`gad-order-status-pill ${statusClass(order.status)}`}>{statusLabel(order.status)}</span>
                  </small>
                </span>
                <b>{money(order.total)}</b>
              </button>
            ))
          ) : (
            <div className="gad-recent-orders-empty">
              <ShoppingBag size={25} />
              <strong>No orders to display</strong>
              <span>New customer orders will appear here.</span>
            </div>
          )}
        </article>
      </section>

      <div className="gad-dashboard-disclaimer">
        <TrendingUp size={15} />
        Live store data · refreshes every 20 seconds.
      </div>
    </div>
  );
};

export default AdminDashboard;
