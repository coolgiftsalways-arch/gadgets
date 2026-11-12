import { useMemo, useState } from "react";
import {
  Search,
  ShoppingBag,
  IndianRupee,
  Clock3,
  PackageCheck,
  Truck,
  CheckCircle2,
  XCircle,
  Download,
  SlidersHorizontal,
  ChevronDown,
  X,
  Eye,
  MapPin,
  CalendarDays,
  CreditCard,
  Phone,
  Mail,
  UserRound,
  ArrowUpRight,
} from "lucide-react";
import "../Admincss/AdminOrders.css";

// UI preview data only. Replace with orders fetched from your backend API.
const demoOrders = [
  {
    id: "GAD-2026-1028",
    customer: "Aarav Sharma",
    email: "aarav.sharma@example.com",
    phone: "+91 98765 43210",
    date: "11 Nov 2026",
    time: "11:42 AM",
    status: "Processing",
    payment: "Paid Online",
    paymentStatus: "Paid",
    subtotal: 3499,
    shipping: 0,
    total: 3499,
    source: "Website",
    address: "12 MG Road, Andheri West, Mumbai, Maharashtra - 400053",
    items: [
      {
        id: "G-01",
        name: "Air Pods Pro",
        color: "White",
        quantity: 1,
        price: 3499,
        image:
          "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=240&q=80",
      },
    ],
  },
  {
    id: "GAD-2026-1027",
    customer: "Meera Patel",
    email: "meera.patel@example.com",
    phone: "+91 98201 12345",
    date: "11 Nov 2026",
    time: "10:18 AM",
    status: "Pending",
    payment: "Cash on Delivery",
    paymentStatus: "Pay on delivery",
    subtotal: 1999,
    shipping: 0,
    total: 1999,
    source: "Website",
    address: "Flat 4B, FC Road, Shivajinagar, Pune, Maharashtra - 411005",
    items: [
      {
        id: "G-02",
        name: "Power Core",
        color: "Black",
        quantity: 1,
        price: 1999,
        image:
          "https://images.unsplash.com/photo-1609592424758-3a1f3a9f6f17?w=240&q=80",
      },
    ],
  },
  {
    id: "GAD-2026-1026",
    customer: "Rohan Mehta",
    email: "rohan.mehta@example.com",
    phone: "+91 98190 45678",
    date: "10 Nov 2026",
    time: "06:35 PM",
    status: "Shipped",
    payment: "Paid Online",
    paymentStatus: "Paid",
    subtotal: 5999,
    shipping: 0,
    total: 5999,
    source: "Instagram",
    address: "22 Satellite Road, Ahmedabad, Gujarat - 380015",
    items: [
      {
        id: "G-04",
        name: "Smart Watch",
        color: "Blue",
        quantity: 1,
        price: 5999,
        image:
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=240&q=80",
      },
    ],
  },
  {
    id: "GAD-2026-1025",
    customer: "Ananya Rao",
    email: "ananya.rao@example.com",
    phone: "+91 98920 56789",
    date: "10 Nov 2026",
    time: "01:09 PM",
    status: "Delivered",
    payment: "Paid Online",
    paymentStatus: "Paid",
    subtotal: 6998,
    shipping: 0,
    total: 6998,
    source: "Website",
    address: "18 Indiranagar, Bengaluru, Karnataka - 560038",
    items: [
      {
        id: "G-01",
        name: "Air Pods Pro",
        color: "White",
        quantity: 2,
        price: 3499,
        image:
          "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=240&q=80",
      },
    ],
  },
  {
    id: "GAD-2026-1024",
    customer: "Kabir Shah",
    email: "kabir.shah@example.com",
    phone: "+91 97690 23456",
    date: "09 Nov 2026",
    time: "09:22 AM",
    status: "Cancelled",
    payment: "Cash on Delivery",
    paymentStatus: "Not collected",
    subtotal: 1999,
    shipping: 0,
    total: 1999,
    source: "Website",
    address: "7 Ring Road, Surat, Gujarat - 395002",
    items: [
      {
        id: "G-02",
        name: "Power Core",
        color: "Black",
        quantity: 1,
        price: 1999,
        image:
          "https://images.unsplash.com/photo-1609592424758-3a1f3a9f6f17?w=240&q=80",
      },
    ],
  },
];

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const statusKey = (value) => value.toLowerCase().replaceAll(" ", "-");

const AdminOrders = () => {
  const [orders, setOrders] = useState(demoOrders);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All orders");
  const [paymentFilter, setPaymentFilter] = useState("All payments");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const summary = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((order) => order.status === "Pending").length,
      processing: orders.filter((order) => order.status === "Processing")
        .length,
      shipped: orders.filter((order) => order.status === "Shipped").length,
      delivered: orders.filter((order) => order.status === "Delivered").length,
      revenue: orders
        .filter((order) => order.paymentStatus === "Paid")
        .reduce((sum, order) => sum + order.total, 0),
    }),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    let result = orders.filter((order) => {
      const searchable =
        `${order.id} ${order.customer} ${order.email} ${order.phone}`.toLowerCase();
      const matchesQuery = searchable.includes(query.toLowerCase());
      const matchesStatus =
        statusFilter === "All orders" || order.status === statusFilter;
      const matchesPayment =
        paymentFilter === "All payments" || order.payment === paymentFilter;
      return matchesQuery && matchesStatus && matchesPayment;
    });

    if (sortBy === "highest")
      result = [...result].sort((a, b) => b.total - a.total);
    else if (sortBy === "lowest")
      result = [...result].sort((a, b) => a.total - b.total);
    return result;
  }, [orders, query, statusFilter, paymentFilter, sortBy]);

  const updateStatus = (orderId, newStatus) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order,
      ),
    );
    setSelectedOrder((current) =>
      current?.id === orderId ? { ...current, status: newStatus } : current,
    );
  };

  const exportOrders = () => {
    const headers = [
      "Order ID",
      "Customer",
      "Email",
      "Phone",
      "Date",
      "Time",
      "Status",
      "Payment",
      "Total",
      "Source",
      "Address",
    ];
    const rows = filteredOrders.map((order) => [
      order.id,
      order.customer,
      order.email,
      order.phone,
      order.date,
      order.time,
      order.status,
      order.payment,
      order.total,
      order.source,
      order.address,
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "gadgete-orders.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gad-orders-page">
      <header className="gad-orders-header">
        <div>
          <span className="gad-orders-eyebrow">
            GADGETÉ / SALES & FULFILMENT
          </span>
          <h1>
            ORDERS<span>.</span>
          </h1>
          <p>Every order, every detail — all in one place.</p>
        </div>
        <button
          type="button"
          className="gad-orders-export"
          onClick={exportOrders}
        >
          <Download size={16} /> EXPORT ORDERS
        </button>
      </header>

      <section className="gad-orders-stats">
        <article className="gad-orders-stat">
          <span className="gad-orders-stat-icon">
            <ShoppingBag size={19} />
          </span>
          <small>TOTAL ORDERS</small>
          <strong>{summary.total}</strong>
          <em>All received orders</em>
        </article>
        <article className="gad-orders-stat">
          <span className="gad-orders-stat-icon pending">
            <Clock3 size={19} />
          </span>
          <small>PENDING</small>
          <strong>{summary.pending}</strong>
          <em>Awaiting confirmation</em>
        </article>
        <article className="gad-orders-stat">
          <span className="gad-orders-stat-icon processing">
            <PackageCheck size={19} />
          </span>
          <small>PROCESSING</small>
          <strong>{summary.processing}</strong>
          <em>Being prepared</em>
        </article>
        <article className="gad-orders-stat">
          <span className="gad-orders-stat-icon shipped">
            <Truck size={19} />
          </span>
          <small>SHIPPED</small>
          <strong>{summary.shipped}</strong>
          <em>On the way</em>
        </article>
        <article className="gad-orders-stat">
          <span className="gad-orders-stat-icon delivered">
            <CheckCircle2 size={19} />
          </span>
          <small>DELIVERED</small>
          <strong>{summary.delivered}</strong>
          <em>Successfully delivered</em>
        </article>
        <article className="gad-orders-stat">
          <span className="gad-orders-stat-icon revenue">
            <IndianRupee size={19} />
          </span>
          <small>PAID REVENUE</small>
          <strong>{money(summary.revenue)}</strong>
          <em>Paid orders only</em>
        </article>
      </section>

      <section className="gad-orders-panel">
        <div className="gad-orders-panel-heading">
          <div>
            <span className="gad-orders-eyebrow">ORDER MANAGEMENT</span>
            <h2>
              ALL <span>ORDERS.</span>
            </h2>
            <p>
              Search orders, review customer details and update fulfilment
              status.
            </p>
          </div>
          <span className="gad-orders-record-count">
            {filteredOrders.length.toString().padStart(2, "0")} RECORDS
          </span>
        </div>

        <div className="gad-orders-toolbar">
          <label className="gad-orders-search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search order ID, customer, email or phone..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </label>

          <label className="gad-orders-filter">
            <SlidersHorizontal size={15} />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option>All orders</option>
              <option>Pending</option>
              <option>Processing</option>
              <option>Shipped</option>
              <option>Delivered</option>
              <option>Cancelled</option>
            </select>
            <ChevronDown size={14} />
          </label>

          <label className="gad-orders-filter">
            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
            >
              <option>All payments</option>
              <option>Paid Online</option>
              <option>Cash on Delivery</option>
            </select>
            <ChevronDown size={14} />
          </label>

          <label className="gad-orders-filter gad-orders-sort">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="highest">Highest amount</option>
              <option value="lowest">Lowest amount</option>
            </select>
            <ChevronDown size={14} />
          </label>
        </div>

        <div className="gad-orders-table-wrap">
          <table className="gad-orders-table">
            <thead>
              <tr>
                <th>ORDER ID</th>
                <th>CUSTOMER</th>
                <th>DATE & TIME</th>
                <th>ITEMS</th>
                <th>TOTAL</th>
                <th>PAYMENT</th>
                <th>STATUS</th>
                <th>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className="gad-order-id-cell">{order.id}</td>
                  <td>
                    <div className="gad-order-customer">
                      <span>
                        {order.customer
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <strong>{order.customer}</strong>
                    </div>
                  </td>
                  <td className="gad-order-date-cell">
                    <strong>{order.date}</strong>
                    <small>{order.time}</small>
                  </td>
                  <td>
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                    item(s)
                  </td>
                  <td className="gad-order-total-cell">{money(order.total)}</td>
                  <td>
                    <span
                      className={`gad-order-payment ${order.payment === "Paid Online" ? "online" : "cod"}`}
                    >
                      {order.payment}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`gad-order-status-pill ${statusKey(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="gad-order-view-button"
                      onClick={() => setSelectedOrder(order)}
                      aria-label={`View ${order.id}`}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="gad-orders-empty">
              <ShoppingBag size={28} />
              <strong>No orders found</strong>
              <span>Try changing your search or filters.</span>
            </div>
          )}
        </div>

        <div className="gad-orders-table-footer">
          <span>
            Showing <strong>{filteredOrders.length}</strong> of{" "}
            <strong>{orders.length}</strong> orders
          </span>
          <span>GADGETÉ® ORDER MANAGEMENT</span>
        </div>
      </section>

      {selectedOrder && (
        <div
          className="gad-order-drawer-backdrop"
          onMouseDown={() => setSelectedOrder(null)}
        >
          <aside
            className="gad-order-drawer"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="gad-order-drawer-header">
              <div>
                <span className="gad-orders-eyebrow">ORDER DETAILS</span>
                <h2>
                  {selectedOrder.id}
                  <span>.</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="gad-order-drawer-status-row">
              <span
                className={`gad-order-status-pill ${statusKey(selectedOrder.status)}`}
              >
                {selectedOrder.status}
              </span>
              <span>
                <CalendarDays size={14} /> {selectedOrder.date} ·{" "}
                {selectedOrder.time}
              </span>
            </div>

            <section className="gad-order-detail-section">
              <h3>
                <UserRound size={16} /> CUSTOMER INFORMATION
              </h3>
              <div className="gad-order-customer-detail">
                <strong>{selectedOrder.customer}</strong>
              </div>
              <p>
                <Mail size={15} /> {selectedOrder.email}
              </p>
              <p>
                <Phone size={15} /> {selectedOrder.phone}
              </p>
              <p>
                <MapPin size={15} /> {selectedOrder.address}
              </p>
            </section>

            <section className="gad-order-detail-section">
              <h3>
                <ShoppingBag size={16} /> ITEMS ORDERED
              </h3>
              <div className="gad-order-item-list">
                {selectedOrder.items.map((item) => (
                  <div className="gad-order-item" key={item.id}>
                    <img src={item.image} alt={item.name} />
                    <div className="gad-order-item-copy">
                      <strong>{item.name}</strong>
                      <span>
                        SKU / {item.id} · {item.color}
                      </span>
                      <small>Qty: {item.quantity}</small>
                    </div>
                    <b>{money(item.price * item.quantity)}</b>
                  </div>
                ))}
              </div>
            </section>

            <section className="gad-order-detail-section">
              <h3>
                <CreditCard size={16} /> PAYMENT & SOURCE
              </h3>
              <div className="gad-order-meta-row">
                <span>Payment method</span>
                <strong>{selectedOrder.payment}</strong>
              </div>
              <div className="gad-order-meta-row">
                <span>Payment status</span>
                <strong>{selectedOrder.paymentStatus}</strong>
              </div>
              <div className="gad-order-meta-row">
                <span>Order source</span>
                <strong>{selectedOrder.source}</strong>
              </div>
            </section>

            <section className="gad-order-total-breakdown">
              <div>
                <span>Subtotal</span>
                <strong>{money(selectedOrder.subtotal)}</strong>
              </div>
              <div>
                <span>Shipping</span>
                <strong>
                  {selectedOrder.shipping === 0
                    ? "FREE"
                    : money(selectedOrder.shipping)}
                </strong>
              </div>
              <div className="grand-total">
                <span>ORDER TOTAL</span>
                <strong>{money(selectedOrder.total)}</strong>
              </div>
            </section>

            <section className="gad-order-update-section">
              <label htmlFor="gad-order-status-select">
                UPDATE ORDER STATUS
              </label>
              <select
                id="gad-order-status-select"
                value={selectedOrder.status}
                onChange={(event) =>
                  updateStatus(selectedOrder.id, event.target.value)
                }
              >
                <option>Pending</option>
                <option>Processing</option>
                <option>Shipped</option>
                <option>Delivered</option>
                <option>Cancelled</option>
              </select>
              <p>
                Status changes here are local preview state until connected to
                your orders API.
              </p>
            </section>
          </aside>
        </div>
      )}

      <div className="gad-orders-note">
        <ArrowUpRight size={14} />
        Sample order records are shown for layout preview. Connect the orders
        API to manage live customer orders.
      </div>
    </div>
  );
};

export default AdminOrders;
