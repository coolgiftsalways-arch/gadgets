import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Search,
  TrendingUp,
  ShoppingBag,
  Users,
  Package,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Clock3,
  CheckCircle2,
  Truck,
  X,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../Admincss/AdminDashboard.css";

const NOTIFICATIONS_KEY = "gadgete_admin_notifications";

const readNotifications = () => {
  try {
    const value = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(readNotifications);
  const [bellOpen, setBellOpen] = useState(false);
  const [search, setSearch] = useState("");
  const bellRef = useRef(null);

  // Unread count is derived from the notification list.
  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  // Keep notifications in sync with same-tab events and other tabs.
  useEffect(() => {
    const syncNotifications = () => setNotifications(readNotifications());

    const receiveNewOrder = (event) => {
      const order = event?.detail || {};
      const notification = {
        id: order.id || order._id || `new-${Date.now()}`,
        orderId: order.orderId || order.orderNumber || order.id || "New order",
        customer:
          order.customerName ||
          order.customer?.name ||
          [order.customer?.firstName, order.customer?.lastName]
            .filter(Boolean)
            .join(" ") ||
          "New customer",
        amount: Number(order.total || order.amount || 0),
        createdAt: order.createdAt || new Date().toISOString(),
        read: false,
      };

      setNotifications((current) => {
        const exists = current.some(
          (item) => String(item.id) === String(notification.id),
        );
        if (exists) return current;
        const updated = [notification, ...current].slice(0, 50);
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
        return updated;
      });
    };

    window.addEventListener("storage", syncNotifications);
    window.addEventListener("gadgete-new-order", receiveNewOrder);
    window.addEventListener(
      "gadgete-admin-notifications-updated",
      syncNotifications,
    );

    return () => {
      window.removeEventListener("storage", syncNotifications);
      window.removeEventListener("gadgete-new-order", receiveNewOrder);
      window.removeEventListener(
        "gadgete-admin-notifications-updated",
        syncNotifications,
      );
    };
  }, []);

  // Close notification popover when clicking outside it.
  useEffect(() => {
    const handleOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const markAllRead = () => {
    const updated = notifications.map((item) => ({ ...item, read: true }));
    setNotifications(updated);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  };

  const markOneRead = (id) => {
    const updated = notifications.map((item) =>
      String(item.id) === String(id) ? { ...item, read: true } : item,
    );
    setNotifications(updated);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  };

  const openOrder = (notification) => {
    markOneRead(notification.id);
    setBellOpen(false);
    navigate("/admin/orders");
  };

  const visibleNotifications = notifications.filter((item) => {
    const text = `${item.orderId} ${item.customer}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const stats = [
    {
      label: "TOTAL REVENUE",
      value: money(0),
      note: "Revenue from paid orders",
      icon: IndianRupee,
      trend: null,
    },
    {
      label: "TOTAL ORDERS",
      value: "0",
      note: "All orders received",
      icon: ShoppingBag,
      trend: null,
    },
    {
      label: "TOTAL CUSTOMERS",
      value: "0",
      note: "Registered customers",
      icon: Users,
      trend: null,
    },
    {
      label: "TOTAL PRODUCTS",
      value: "0",
      note: "Products in your store",
      icon: Package,
      trend: null,
    },
  ];

  const quickLinks = [
    {
      label: "Manage products",
      detail: "Add products, images and prices",
      icon: Package,
      path: "/admin/products",
    },
    {
      label: "View orders",
      detail: "Review and update customer orders",
      icon: ShoppingBag,
      path: "/admin/orders",
    },
    {
      label: "View customers",
      detail: "Customer profiles and order history",
      icon: Users,
      path: "/admin/customers",
    },
  ];

  const formatTime = (date) => {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "Just now";
    return parsed.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="gad-dashboard">
      <header className="gad-dashboard-header">
        <div className="gad-dashboard-title">
          <span className="gad-dashboard-eyebrow">
            GADGETÉ / CONTROL CENTRE
          </span>
          <h1>
            DASHBOARD<span>.</span>
          </h1>
          <p>Here’s what’s happening with your store.</p>
        </div>

        <div className="gad-dashboard-header-actions">
          <div className="gad-dashboard-date">
            <span className="gad-live-dot" />
            STORE OVERVIEW
          </div>

          <div className="gad-notification-wrap" ref={bellRef}>
            <button
              type="button"
              className={`gad-notification-button ${bellOpen ? "is-open" : ""}`}
              onClick={() => setBellOpen((open) => !open)}
              aria-label={`Notifications, ${unreadCount} unread new orders`}
              aria-expanded={bellOpen}
            >
              <Bell size={21} />
              {unreadCount > 0 && (
                <span className="gad-notification-count">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <section className="gad-notification-popover">
                <div className="gad-notification-popover-head">
                  <div>
                    <span className="gad-dashboard-eyebrow">LIVE UPDATES</span>
                    <h2>Notifications</h2>
                    <p>
                      {unreadCount} unread{" "}
                      {unreadCount === 1 ? "notification" : "notifications"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="gad-popover-close"
                    onClick={() => setBellOpen(false)}
                    aria-label="Close notifications"
                  >
                    <X size={18} />
                  </button>
                </div>

                {notifications.length > 0 && (
                  <div className="gad-notification-tools">
                    <button type="button" onClick={markAllRead}>
                      Mark all as read
                    </button>
                  </div>
                )}

                <div className="gad-notification-list">
                  {visibleNotifications.length ? (
                    visibleNotifications.map((item) => (
                      <button
                        type="button"
                        className={`gad-notification-item ${item.read ? "read" : "unread"}`}
                        key={item.id}
                        onClick={() => openOrder(item)}
                      >
                        <span className="gad-notification-item-icon">
                          <ShoppingBag size={17} />
                        </span>
                        <span className="gad-notification-item-copy">
                          <strong>New order received</strong>
                          <span>
                            {item.orderId} · {item.customer}
                          </span>
                          <small>{formatTime(item.createdAt)}</small>
                        </span>
                        <span className="gad-notification-item-right">
                          <b>{money(item.amount)}</b>
                          {!item.read && <i />}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="gad-notification-empty">
                      <Bell size={25} />
                      <strong>No new orders yet</strong>
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

      <section className="gad-dashboard-welcome">
        <div>
          <span className="gad-dashboard-eyebrow">YOUR STORE AT A GLANCE</span>
          <h2>
            Welcome back, <em>Admin.</em>
          </h2>
          <p>Manage your products, customers and orders from one place.</p>
        </div>
        <div className="gad-welcome-mark">
          G<span>É</span>
        </div>
      </section>

      <section className="gad-dashboard-stats">
        {stats.map(({ label, value, note, icon: Icon }) => (
          <article className="gad-stat-card" key={label}>
            <div className="gad-stat-top">
              <span>{label}</span>
              <span className="gad-stat-icon">
                <Icon size={19} />
              </span>
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
              <h2>
                Sales overview<span>.</span>
              </h2>
            </div>
            <span className="gad-panel-period">LAST 7 DAYS</span>
          </div>

          <div className="gad-sales-empty-chart">
            <div className="gad-chart-y-labels">
              <span>₹ 10k</span>
              <span>₹ 7.5k</span>
              <span>₹ 5k</span>
              <span>₹ 2.5k</span>
              <span>₹ 0</span>
            </div>
            <div className="gad-chart-area">
              {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
                <div className="gad-chart-column" key={day}>
                  <div className="gad-chart-gridline" />
                  <div className="gad-chart-bar-empty" />
                  <span>{day}</span>
                </div>
              ))}
              <div className="gad-chart-no-data">
                SALES DATA WILL APPEAR HERE
              </div>
            </div>
          </div>
          <p className="gad-panel-footnote">
            Sales figures will populate once your orders API is connected.
          </p>
        </article>

        <article className="gad-dashboard-panel gad-order-status-panel">
          <div className="gad-panel-heading">
            <div>
              <span className="gad-dashboard-eyebrow">FULFILMENT</span>
              <h2>
                Order status<span>.</span>
              </h2>
            </div>
          </div>

          <div className="gad-status-row">
            <span className="gad-status-icon pending">
              <Clock3 size={17} />
            </span>
            <span>Pending</span>
            <strong>0</strong>
          </div>
          <div className="gad-status-row">
            <span className="gad-status-icon processing">
              <ShoppingBag size={17} />
            </span>
            <span>Processing</span>
            <strong>0</strong>
          </div>
          <div className="gad-status-row">
            <span className="gad-status-icon shipped">
              <Truck size={17} />
            </span>
            <span>Shipped</span>
            <strong>0</strong>
          </div>
          <div className="gad-status-row">
            <span className="gad-status-icon delivered">
              <CheckCircle2 size={17} />
            </span>
            <span>Delivered</span>
            <strong>0</strong>
          </div>
          <button
            type="button"
            className="gad-text-link"
            onClick={() => navigate("/admin/orders")}
          >
            MANAGE ORDERS <ArrowUpRight size={16} />
          </button>
        </article>
      </section>

      <section className="gad-dashboard-bottom-grid">
        <article className="gad-dashboard-panel gad-quick-actions">
          <div className="gad-panel-heading">
            <div>
              <span className="gad-dashboard-eyebrow">SHORTCUTS</span>
              <h2>
                Quick actions<span>.</span>
              </h2>
            </div>
          </div>
          {quickLinks.map(({ label, detail, icon: Icon, path }) => (
            <button
              type="button"
              className="gad-quick-action"
              key={label}
              onClick={() => navigate(path)}
            >
              <span className="gad-quick-action-icon">
                <Icon size={19} />
              </span>
              <span className="gad-quick-action-copy">
                <strong>{label}</strong>
                <small>{detail}</small>
              </span>
              <ArrowUpRight size={17} />
            </button>
          ))}
        </article>

        <article className="gad-dashboard-panel gad-recent-orders">
          <div className="gad-panel-heading">
            <div>
              <span className="gad-dashboard-eyebrow">LATEST ACTIVITY</span>
              <h2>
                Recent orders<span>.</span>
              </h2>
            </div>
            <button
              type="button"
              className="gad-panel-view-all"
              onClick={() => navigate("/admin/orders")}
            >
              VIEW ALL <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="gad-recent-orders-empty">
            <ShoppingBag size={25} />
            <strong>No orders to display</strong>
            <span>New customer orders will appear here.</span>
          </div>
        </article>
      </section>
      <div className="gad-dashboard-disclaimer">
        <TrendingUp size={15} />
        Dashboard figures are awaiting connection to your live store data.
      </div>
    </div>
  );
};

export default AdminDashboard;
