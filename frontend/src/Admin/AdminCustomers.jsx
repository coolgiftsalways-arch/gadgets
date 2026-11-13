import { useEffect, useState } from "react";
import {
  Search,
  Users,
  UserRound,
  ShoppingBag,
  IndianRupee,
  Download,
  SlidersHorizontal,
  X,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  ChevronDown,
  Eye,
  CreditCard,
  PackageCheck,
  Globe2,
  Smartphone,
  Hash,
} from "lucide-react";
import {
  adminFetch,
  formatDate,
  formatDateTime,
  imageUrl,
  initials,
  money,
  paymentLabel,
  statusLabel,
} from "./api";
import "../Admincss/AdminCustomers.css";

const AdminCustomers = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [selectedPhone, setSelectedPhone] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const qs = new URLSearchParams({ sort: sortBy, page });
      if (query.trim()) qs.set("q", query.trim());
      if (statusFilter) qs.set("status", statusFilter);
      adminFetch(`/customers?${qs}`)
        .then((result) => {
          setData(result);
          setError("");
        })
        .catch((err) => setError(err.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, statusFilter, sortBy, page]);

  const customers = data?.items || [];
  const summary = data?.summary || {};

  const exportCustomers = () => {
    const rows = [
      ["Name", "Email", "Phone", "City", "State", "Orders", "Total Spent", "First order", "Status"],
      ...customers.map((c) => [c.name, c.email, c.phone, c.city, c.state, c.orders, c.spent, formatDate(c.firstOrderAt), c.status]),
    ];
    const csv = rows.map((row) => row.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "gadgete-customers.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gad-customers-page">
      <header className="gad-customers-header">
        <div>
          <span className="gad-customers-eyebrow">GADGETÉ / CUSTOMER RELATIONSHIPS</span>
          <h1>CUSTOMERS<span>.</span></h1>
          <p>Everyone who has ordered from your store, grouped by mobile number.</p>
        </div>
        <button type="button" className="gad-customer-export" onClick={exportCustomers}>
          <Download size={16} /> EXPORT CSV
        </button>
      </header>

      <section className="gad-customer-stats">
        {[
          ["TOTAL CUSTOMERS", summary.customers ?? 0, "People who have ordered", Users],
          ["TOTAL ORDERS", summary.orders ?? 0, "Not counting cancelled", ShoppingBag],
          ["CUSTOMER LIFETIME VALUE", money(summary.spent), "Combined customer spend", IndianRupee],
          ["NEW CUSTOMERS", summary.newCustomers ?? 0, "First order in last 30 days", UserRound],
        ].map(([label, value, note, Icon]) => (
          <article className="gad-customer-stat-card" key={label}>
            <div className="gad-customer-stat-icon"><Icon size={19} /></div>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>

      <section className="gad-customers-panel">
        <div className="gad-customers-panel-heading">
          <div>
            <span className="gad-customers-eyebrow">CUSTOMER DATABASE</span>
            <h2>ALL <span>CUSTOMERS.</span></h2>
            <p>Search and review customer profiles and purchase activity.</p>
          </div>
          <span className="gad-customer-record-count">{String(data?.total ?? 0).padStart(2, "0")} RECORDS</span>
        </div>

        <div className="gad-customers-toolbar">
          <label className="gad-customer-search">
            <Search size={17} />
            <input type="search" placeholder="Search name, email, phone or city..." value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}
          </label>

          <label className="gad-customer-filter">
            <SlidersHorizontal size={15} />
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All customers</option>
              <option value="active">Active</option>
              <option value="new">New</option>
            </select>
            <ChevronDown size={14} />
          </label>

          <label className="gad-customer-filter gad-customer-sort">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="recent">Recently ordered</option>
              <option value="highest-spend">Highest spend</option>
              <option value="most-orders">Most orders</option>
            </select>
            <ChevronDown size={14} />
          </label>
        </div>

        {error && <p className="gad-customer-demo-note">{error}</p>}

        <div className="gad-customers-table-wrap">
          <table className="gad-customers-table">
            <thead>
              <tr>
                <th>CUSTOMER</th>
                <th>CONTACT</th>
                <th>LOCATION</th>
                <th>ORDERS</th>
                <th>TOTAL SPENT</th>
                <th>FIRST ORDER</th>
                <th>STATUS</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.phone} onClick={() => setSelectedPhone(customer.phone)} style={{ cursor: "pointer" }}>
                  <td>
                    <div className="gad-customer-name-cell">
                      <span className="gad-customer-avatar">{initials(customer.name)}</span>
                      <span><strong>{customer.name}</strong><small>+91 {customer.phone}</small></span>
                    </div>
                  </td>
                  <td>
                    <div className="gad-customer-contact-cell">
                      <span>{customer.email}</span>
                      <small>+91 {customer.phone}</small>
                    </div>
                  </td>
                  <td><span className="gad-customer-location">{customer.city}</span></td>
                  <td className="gad-customer-orders-number">{customer.orders}</td>
                  <td className="gad-customer-spend">{money(customer.spent)}</td>
                  <td className="gad-customer-joined">{formatDate(customer.firstOrderAt)}</td>
                  <td><span className={`gad-customer-status ${customer.status.toLowerCase()}`}>{customer.status}</span></td>
                  <td>
                    <button type="button" className="gad-customer-view" aria-label={`View ${customer.name}`}><Eye size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data && customers.length === 0 && (
            <div className="gad-customers-empty">
              <Users size={28} />
              <strong>No customers found</strong>
              <span>Customers appear here after their first order.</span>
            </div>
          )}
        </div>

        <div className="gad-customers-table-footer">
          <span>Page <strong>{data?.page ?? 1}</strong> of <strong>{data?.pages ?? 1}</strong></span>
          <span style={{ display: "flex", gap: 8 }}>
            <button type="button" className="gad-customer-export" disabled={page <= 1} onClick={() => setPage(page - 1)}>PREV</button>
            <button type="button" className="gad-customer-export" disabled={!data || page >= data.pages} onClick={() => setPage(page + 1)}>NEXT</button>
          </span>
        </div>
      </section>

      {selectedPhone && <CustomerDrawer phone={selectedPhone} onClose={() => setSelectedPhone(null)} />}
    </div>
  );
};

function CustomerDrawer({ phone, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch(`/customers/${phone}`).then(setData).catch((err) => setError(err.message));
  }, [phone]);

  const customer = data?.customer;
  const orders = data?.orders || [];

  return (
    <div className="gad-customer-drawer-backdrop" onMouseDown={onClose}>
      <aside className="gad-customer-drawer" onMouseDown={(e) => e.stopPropagation()} aria-label="Customer details">
        <div className="gad-customer-drawer-header">
          <div>
            <span className="gad-customers-eyebrow">CUSTOMER PROFILE</span>
            <h2>PROFILE<span>.</span></h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close details"><X size={20} /></button>
        </div>

        {!customer ? (
          <p>{error || "Loading customer…"}</p>
        ) : (
          <>
            <div className="gad-customer-profile-card">
              <div className="gad-customer-profile-avatar">{initials(customer.name)}</div>
              <h3>{customer.name}</h3>
              <span>+91 {customer.phone}</span>
              <b className={`gad-customer-status ${customer.status.toLowerCase()}`}>{customer.status}</b>
            </div>

            <div className="gad-customer-detail-list">
              <div><Mail size={17} /><span><small>EMAIL ADDRESS</small><a href={`mailto:${customer.email}`}>{customer.email}</a></span></div>
              <div><Phone size={17} /><span><small>PHONE NUMBER</small><a href={`tel:+91${customer.phone}`}>+91 {customer.phone}</a></span></div>
              <div>
                <MapPin size={17} />
                <span>
                  <small>LATEST ADDRESS</small>
                  <strong>
                    {customer.address.line1}{customer.address.line2 ? `, ${customer.address.line2}` : ""}, {customer.address.city}, {customer.address.state} {customer.address.pincode}
                  </strong>
                </span>
              </div>
              <div><CalendarDays size={17} /><span><small>FIRST ORDER</small><strong>{formatDate(customer.firstOrderAt)}</strong></span></div>
            </div>

            <div className="gad-customer-profile-metrics">
              <div><span>TOTAL ORDERS</span><strong>{customer.orders}</strong></div>
              <div><span>TOTAL SPENT</span><strong>{money(customer.spent)}</strong></div>
            </div>

            <section className="gad-customer-order-history">
              <div className="gad-customer-order-history-heading">
                <div>
                  <span className="gad-customers-eyebrow">PURCHASE ACTIVITY</span>
                  <h3>ORDER <em>HISTORY.</em></h3>
                </div>
                <span>{String(orders.length).padStart(2, "0")} ORDERS</span>
              </div>

              {orders.map((order) => (
                <article className="gad-customer-order-card" key={order._id}>
                  <div className="gad-customer-order-card-top">
                    <div>
                      <span className="gad-order-label">ORDER NUMBER</span>
                      <strong className="gad-order-number"><Hash size={13} /> {order.orderNumber}</strong>
                    </div>
                    <span className={`gad-customer-order-status ${order.status.replaceAll("_", "-")}`}>{statusLabel(order.status)}</span>
                  </div>

                  <div className="gad-customer-order-date">
                    <CalendarDays size={14} />
                    <span>{formatDateTime(order.placedAt)}</span>
                  </div>

                  <div className="gad-customer-order-products">
                    {order.items.map((item, index) => (
                      <div className="gad-customer-order-product" key={`${order._id}-${index}`}>
                        {item.image ? <img src={imageUrl(item.image)} alt={item.name} loading="lazy" /> : <span />}
                        <div className="gad-customer-order-product-info">
                          <strong>{item.name}</strong>
                          <small>SKU / {item.sku} · Qty {item.quantity}</small>
                        </div>
                        <b>{money(item.price * item.quantity)}</b>
                      </div>
                    ))}
                  </div>

                  <div className="gad-customer-order-meta">
                    <div><CreditCard size={14} /><span><small>PAYMENT</small><strong>{paymentLabel(order.payment)}</strong></span></div>
                    <div>
                      {order.source?.toLowerCase().includes("mobile") ? <Smartphone size={14} /> : <Globe2 size={14} />}
                      <span><small>ORDER SOURCE</small><strong>{order.source}</strong></span>
                    </div>
                    <div>
                      <PackageCheck size={14} />
                      <span><small>ITEMS</small><strong>{order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)</strong></span>
                    </div>
                  </div>

                  <div className="gad-customer-order-delivery">
                    <MapPin size={14} />
                    <span>
                      <small>DELIVERY ADDRESS</small>
                      <strong>{order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</strong>
                    </span>
                  </div>

                  <div className="gad-customer-order-total">
                    <span>
                      Subtotal {money(order.subtotal)}{order.discount ? ` · Discount −${money(order.discount)}` : ""} · Shipping {order.shippingFee ? money(order.shippingFee) : "FREE"}
                    </span>
                    <strong>{money(order.total)}</strong>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </aside>
    </div>
  );
}

export default AdminCustomers;
