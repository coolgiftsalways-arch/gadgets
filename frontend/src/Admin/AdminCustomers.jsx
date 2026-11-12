import  { useMemo, useState } from "react";
import {
  Search,
  Users,
  UserRound,
  ShoppingBag,
  IndianRupee,
  ArrowUpRight,
  Download,
  SlidersHorizontal,
  X,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  ChevronDown,
  Eye,
  Clock3,
  CreditCard,
  PackageCheck,
  Globe2,
  Smartphone,
  Hash,
} from "lucide-react";
import "../Admincss/AdminCustomers.css";

// Demonstration records for the UI preview.
// Replace this array with the customers returned by your backend API.
const demoCustomers = [
  {
    id: "CUS-1001",
    name: "Aarav Sharma",
    email: "aarav.sharma@example.com",
    phone: "+91 98765 43210",
    city: "Mumbai",
    state: "Maharashtra",
    orders: 5,
    spent: 18495,
    joined: "08 Nov 2026",
    status: "Active",
    initials: "AS",
    address: "Flat 402, Sea View Apartments, Linking Road",
    pincode: "400050",
    ordersHistory: [
      {
        orderId: "GAD-2026-1028",
        placedAt: "2026-11-11T14:32:00+05:30",
        status: "Processing",
        payment: "Paid online",
        source: "Website",
        subtotal: 6998,
        shipping: 0,
        total: 6998,
        address:
          "Flat 402, Sea View Apartments, Linking Road, Bandra West, Mumbai, Maharashtra 400050",
        items: [
          {
            name: "Air Pods Pro",
            sku: "G-01",
            quantity: 1,
            price: 3499,
            image:
              "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=240&auto=format&fit=crop&q=85",
          },
          {
            name: "Power Core",
            sku: "G-02",
            quantity: 1,
            price: 3499,
            image:
              "https://images.unsplash.com/photo-1609592806596-b43bada0f4b5?w=240&auto=format&fit=crop&q=85",
          },
        ],
      },
      {
        orderId: "GAD-2026-0981",
        placedAt: "2026-11-03T10:18:00+05:30",
        status: "Delivered",
        payment: "Cash on delivery",
        source: "Mobile website",
        subtotal: 5999,
        shipping: 0,
        total: 5999,
        address:
          "Flat 402, Sea View Apartments, Linking Road, Bandra West, Mumbai, Maharashtra 400050",
        items: [
          {
            name: "Smart Watch",
            sku: "G-04",
            quantity: 1,
            price: 5999,
            image:
              "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=240&auto=format&fit=crop&q=85",
          },
        ],
      },
      {
        orderId: "GAD-2026-0912",
        placedAt: "2026-10-21T19:46:00+05:30",
        status: "Delivered",
        payment: "Paid online",
        source: "Website",
        subtotal: 5498,
        shipping: 0,
        total: 5498,
        address:
          "Flat 402, Sea View Apartments, Linking Road, Bandra West, Mumbai, Maharashtra 400050",
        items: [
          {
            name: "Air Pods Pro",
            sku: "G-01",
            quantity: 1,
            price: 3499,
            image:
              "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=240&auto=format&fit=crop&q=85",
          },
          {
            name: "Charging Cable",
            sku: "G-08",
            quantity: 1,
            price: 1999,
            image:
              "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=240&auto=format&fit=crop&q=85",
          },
        ],
      },
    ],
  },
  {
    id: "CUS-1002",
    name: "Meera Patel",
    email: "meera.patel@example.com",
    phone: "+91 98201 12345",
    city: "Pune",
    state: "Maharashtra",
    orders: 3,
    spent: 8997,
    joined: "06 Nov 2026",
    status: "Active",
    initials: "MP",
    address: "B-12, Koregaon Park",
    pincode: "411001",
    ordersHistory: [
      {
        orderId: "GAD-2026-1021",
        placedAt: "2026-11-06T12:05:00+05:30",
        status: "Delivered",
        payment: "Paid online",
        source: "Website",
        subtotal: 8997,
        shipping: 0,
        total: 8997,
        address: "B-12, Koregaon Park, Pune, Maharashtra 411001",
        items: [
          {
            name: "Smart Watch",
            sku: "G-04",
            quantity: 1,
            price: 5999,
            image:
              "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=240&auto=format&fit=crop&q=85",
          },
          {
            name: "Air Pods Pro",
            sku: "G-01",
            quantity: 1,
            price: 2998,
            image:
              "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=240&auto=format&fit=crop&q=85",
          },
        ],
      },
    ],
  },
  {
    id: "CUS-1003",
    name: "Rohan Mehta",
    email: "rohan.mehta@example.com",
    phone: "+91 98190 45678",
    city: "Ahmedabad",
    state: "Gujarat",
    orders: 2,
    spent: 7498,
    joined: "02 Nov 2026",
    status: "Active",
    initials: "RM",
    address: "21 Riverfront Residency",
    pincode: "380009",
    ordersHistory: [
      {
        orderId: "GAD-2026-0995",
        placedAt: "2026-11-02T16:41:00+05:30",
        status: "Shipped",
        payment: "Cash on delivery",
        source: "Instagram shop link",
        subtotal: 7498,
        shipping: 0,
        total: 7498,
        address: "21 Riverfront Residency, Ahmedabad, Gujarat 380009",
        items: [
          {
            name: "Air Pods Pro",
            sku: "G-01",
            quantity: 1,
            price: 3499,
            image:
              "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=240&auto=format&fit=crop&q=85",
          },
          {
            name: "Power Core",
            sku: "G-02",
            quantity: 2,
            price: 1999.5,
            image:
              "https://images.unsplash.com/photo-1609592806596-b43bada0f4b5?w=240&auto=format&fit=crop&q=85",
          },
        ],
      },
    ],
  },
  {
    id: "CUS-1004",
    name: "Ananya Rao",
    email: "ananya.rao@example.com",
    phone: "+91 98920 56789",
    city: "Bengaluru",
    state: "Karnataka",
    orders: 1,
    spent: 3499,
    joined: "30 Oct 2026",
    status: "Active",
    initials: "AR",
    address: "18 Indiranagar Main Road",
    pincode: "560038",
    ordersHistory: [
      {
        orderId: "GAD-2026-0950",
        placedAt: "2026-10-30T09:22:00+05:30",
        status: "Delivered",
        payment: "Paid online",
        source: "Website",
        subtotal: 3499,
        shipping: 0,
        total: 3499,
        address: "18 Indiranagar Main Road, Bengaluru, Karnataka 560038",
        items: [
          {
            name: "Air Pods Pro",
            sku: "G-01",
            quantity: 1,
            price: 3499,
            image:
              "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=240&auto=format&fit=crop&q=85",
          },
        ],
      },
    ],
  },
  {
    id: "CUS-1005",
    name: "Kabir Shah",
    email: "kabir.shah@example.com",
    phone: "+91 97690 23456",
    city: "Surat",
    state: "Gujarat",
    orders: 0,
    spent: 0,
    joined: "27 Oct 2026",
    status: "New",
    initials: "KS",
    address: "7 Adajan Circle",
    pincode: "395009",
    ordersHistory: [],
  },
];

const currency = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const formatOrderDate = (value) =>
  new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const AdminCustomers = () => {
  const [customers] = useState(demoCustomers);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All customers");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [sortBy, setSortBy] = useState("newest");

  const totalSpent = customers.reduce(
    (sum, customer) => sum + customer.spent,
    0,
  );
  const totalOrders = customers.reduce(
    (sum, customer) => sum + customer.orders,
    0,
  );
  const newCustomers = customers.filter(
    (customer) => customer.status === "New",
  ).length;

  const filteredCustomers = useMemo(() => {
    let result = customers.filter((customer) => {
      const searchable = [
        customer.name,
        customer.email,
        customer.phone,
        customer.id,
        customer.city,
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = searchable.includes(query.toLowerCase());
      const matchesStatus =
        statusFilter === "All customers" || customer.status === statusFilter;

      return matchesQuery && matchesStatus;
    });

    if (sortBy === "highest-spend") {
      result = [...result].sort((a, b) => b.spent - a.spent);
    } else if (sortBy === "most-orders") {
      result = [...result].sort((a, b) => b.orders - a.orders);
    } else {
      result = [...result];
    }

    return result;
  }, [customers, query, statusFilter, sortBy]);

  const exportCustomers = () => {
    const headers = [
      "Customer ID",
      "Name",
      "Email",
      "Phone",
      "City",
      "Orders",
      "Total Spent",
      "Joined",
      "Status",
    ];

    const rows = filteredCustomers.map((customer) => [
      customer.id,
      customer.name,
      customer.email,
      customer.phone,
      customer.city,
      customer.orders,
      customer.spent,
      customer.joined,
      customer.status,
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
    anchor.download = "gadgete-customers.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gad-customers-page">
      <header className="gad-customers-header">
        <div>
          <span className="gad-customers-eyebrow">
            GADGETÉ / CUSTOMER RELATIONSHIPS
          </span>
          <h1>
            CUSTOMERS<span>.</span>
          </h1>
          <p>Know your customers. Understand their orders. Build loyalty.</p>
        </div>

        <button
          type="button"
          className="gad-customer-export"
          onClick={exportCustomers}
        >
          <Download size={16} />
          EXPORT CSV
        </button>
      </header>

      <section className="gad-customer-stats">
        <article className="gad-customer-stat-card">
          <div className="gad-customer-stat-icon">
            <Users size={19} />
          </div>
          <span>TOTAL CUSTOMERS</span>
          <strong>{customers.length.toLocaleString("en-IN")}</strong>
          <small>Customer accounts in this view</small>
        </article>

        <article className="gad-customer-stat-card">
          <div className="gad-customer-stat-icon">
            <ShoppingBag size={19} />
          </div>
          <span>TOTAL ORDERS</span>
          <strong>{totalOrders.toLocaleString("en-IN")}</strong>
          <small>Orders placed by these customers</small>
        </article>

        <article className="gad-customer-stat-card">
          <div className="gad-customer-stat-icon">
            <IndianRupee size={19} />
          </div>
          <span>CUSTOMER LIFETIME VALUE</span>
          <strong>{currency(totalSpent)}</strong>
          <small>Combined customer spend</small>
        </article>

        <article className="gad-customer-stat-card">
          <div className="gad-customer-stat-icon">
            <UserRound size={19} />
          </div>
          <span>NEW CUSTOMERS</span>
          <strong>{newCustomers.toLocaleString("en-IN")}</strong>
          <small>Recently registered customers</small>
        </article>
      </section>

      <section className="gad-customers-panel">
        <div className="gad-customers-panel-heading">
          <div>
            <span className="gad-customers-eyebrow">CUSTOMER DATABASE</span>
            <h2>
              ALL <span>CUSTOMERS.</span>
            </h2>
            <p>Search and review customer profiles and purchase activity.</p>
          </div>
          <span className="gad-customer-record-count">
            {filteredCustomers.length.toString().padStart(2, "0")} RECORDS
          </span>
        </div>

        <div className="gad-customers-toolbar">
          <label className="gad-customer-search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search name, email, phone or customer ID..."
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

          <label className="gad-customer-filter">
            <SlidersHorizontal size={15} />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option>All customers</option>
              <option>Active</option>
              <option>New</option>
            </select>
            <ChevronDown size={14} />
          </label>

          <label className="gad-customer-filter gad-customer-sort">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="highest-spend">Highest spend</option>
              <option value="most-orders">Most orders</option>
            </select>
            <ChevronDown size={14} />
          </label>
        </div>

        <div className="gad-customers-table-wrap">
          <table className="gad-customers-table">
            <thead>
              <tr>
                <th>CUSTOMER</th>
                <th>CONTACT</th>
                <th>LOCATION</th>
                <th>ORDERS</th>
                <th>TOTAL SPENT</th>
                <th>JOINED</th>
                <th>STATUS</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className="gad-customer-name-cell">
                      <span className="gad-customer-avatar">
                        {customer.initials}
                      </span>
                      <span>
                        <strong>{customer.name}</strong>
                        <small>{customer.id}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="gad-customer-contact-cell">
                      <span>{customer.email}</span>
                      <small>{customer.phone}</small>
                    </div>
                  </td>
                  <td>
                    <span className="gad-customer-location">
                      {customer.city}
                    </span>
                  </td>
                  <td className="gad-customer-orders-number">
                    {customer.orders}
                  </td>
                  <td className="gad-customer-spend">
                    {currency(customer.spent)}
                  </td>
                  <td className="gad-customer-joined">{customer.joined}</td>
                  <td>
                    <span
                      className={`gad-customer-status ${customer.status.toLowerCase()}`}
                    >
                      {customer.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="gad-customer-view"
                      onClick={() => setSelectedCustomer(customer)}
                      aria-label={`View ${customer.name}`}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCustomers.length === 0 && (
            <div className="gad-customers-empty">
              <Users size={28} />
              <strong>No customers found</strong>
              <span>Try a different name, email, phone number or filter.</span>
            </div>
          )}
        </div>

        <div className="gad-customers-table-footer">
          <span>
            Showing <strong>{filteredCustomers.length}</strong> of{" "}
            <strong>{customers.length}</strong> customers
          </span>
          <span>GADGETÉ® CUSTOMER DIRECTORY</span>
        </div>
      </section>

      {selectedCustomer && (
        <div
          className="gad-customer-drawer-backdrop"
          onMouseDown={() => setSelectedCustomer(null)}
        >
          <aside
            className="gad-customer-drawer"
            onMouseDown={(event) => event.stopPropagation()}
            aria-label="Customer details"
          >
            <div className="gad-customer-drawer-header">
              <div>
                <span className="gad-customers-eyebrow">CUSTOMER PROFILE</span>
                <h2>
                  PROFILE<span>.</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="gad-customer-profile-card">
              <div className="gad-customer-profile-avatar">
                {selectedCustomer.initials}
              </div>
              <h3>{selectedCustomer.name}</h3>
              <span>{selectedCustomer.id}</span>
              <b
                className={`gad-customer-status ${selectedCustomer.status.toLowerCase()}`}
              >
                {selectedCustomer.status}
              </b>
            </div>

            <div className="gad-customer-detail-list">
              <div>
                <Mail size={17} />
                <span>
                  <small>EMAIL ADDRESS</small>
                  <a href={`mailto:${selectedCustomer.email}`}>
                    {selectedCustomer.email}
                  </a>
                </span>
              </div>
              <div>
                <Phone size={17} />
                <span>
                  <small>PHONE NUMBER</small>
                  <a href={`tel:${selectedCustomer.phone.replaceAll(" ", "")}`}>
                    {selectedCustomer.phone}
                  </a>
                </span>
              </div>
              <div>
                <MapPin size={17} />
                <span>
                  <small>REGISTERED LOCATION</small>
                  <strong>
                    {selectedCustomer.city}, {selectedCustomer.state}
                  </strong>
                </span>
              </div>
              <div>
                <MapPin size={17} />
                <span>
                  <small>DEFAULT ADDRESS</small>
                  <strong>
                    {selectedCustomer.address}, {selectedCustomer.city},{" "}
                    {selectedCustomer.state} {selectedCustomer.pincode}
                  </strong>
                </span>
              </div>
              <div>
                <CalendarDays size={17} />
                <span>
                  <small>MEMBER SINCE</small>
                  <strong>{selectedCustomer.joined}</strong>
                </span>
              </div>
            </div>

            <div className="gad-customer-profile-metrics">
              <div>
                <span>TOTAL ORDERS</span>
                <strong>{selectedCustomer.orders}</strong>
              </div>
              <div>
                <span>TOTAL SPENT</span>
                <strong>{currency(selectedCustomer.spent)}</strong>
              </div>
            </div>

            <section className="gad-customer-order-history">
              <div className="gad-customer-order-history-heading">
                <div>
                  <span className="gad-customers-eyebrow">
                    PURCHASE ACTIVITY
                  </span>
                  <h3>
                    ORDER <em>HISTORY.</em>
                  </h3>
                </div>
                <span>
                  {(selectedCustomer.ordersHistory || []).length
                    .toString()
                    .padStart(2, "0")}{" "}
                  ORDERS
                </span>
              </div>

              {(selectedCustomer.ordersHistory || []).length > 0 ? (
                selectedCustomer.ordersHistory.map((order) => (
                  <article
                    className="gad-customer-order-card"
                    key={order.orderId}
                  >
                    <div className="gad-customer-order-card-top">
                      <div>
                        <span className="gad-order-label">ORDER NUMBER</span>
                        <strong className="gad-order-number">
                          <Hash size={13} /> {order.orderId}
                        </strong>
                      </div>
                      <span
                        className={`gad-customer-order-status ${order.status.toLowerCase()}`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="gad-customer-order-date">
                      <CalendarDays size={14} />
                      <span>{formatOrderDate(order.placedAt)}</span>
                    </div>

                    <div className="gad-customer-order-products">
                      {order.items.map((item, index) => (
                        <div
                          className="gad-customer-order-product"
                          key={`${order.orderId}-${item.sku}-${index}`}
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.visibility = "hidden";
                            }}
                          />
                          <div className="gad-customer-order-product-info">
                            <strong>{item.name}</strong>
                            <small>
                              SKU / {item.sku} · Qty {item.quantity}
                            </small>
                          </div>
                          <b>{currency(item.price * item.quantity)}</b>
                        </div>
                      ))}
                    </div>

                    <div className="gad-customer-order-meta">
                      <div>
                        <CreditCard size={14} />
                        <span>
                          <small>PAYMENT</small>
                          <strong>{order.payment}</strong>
                        </span>
                      </div>
                      <div>
                        {order.source.toLowerCase().includes("mobile") ? (
                          <Smartphone size={14} />
                        ) : (
                          <Globe2 size={14} />
                        )}
                        <span>
                          <small>ORDER SOURCE</small>
                          <strong>{order.source}</strong>
                        </span>
                      </div>
                      <div>
                        <PackageCheck size={14} />
                        <span>
                          <small>ITEMS</small>
                          <strong>
                            {order.items.reduce(
                              (sum, item) => sum + item.quantity,
                              0,
                            )}{" "}
                            item(s)
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="gad-customer-order-delivery">
                      <MapPin size={14} />
                      <span>
                        <small>DELIVERY ADDRESS</small>
                        <strong>{order.address}</strong>
                      </span>
                    </div>

                    <div className="gad-customer-order-total">
                      <span>
                        Subtotal {currency(order.subtotal)} · Shipping{" "}
                        {order.shipping === 0
                          ? "FREE"
                          : currency(order.shipping)}
                      </span>
                      <strong>{currency(order.total)}</strong>
                    </div>
                  </article>
                ))
              ) : (
                <div className="gad-customer-no-orders">
                  <ShoppingBag size={24} />
                  <strong>No orders placed yet</strong>
                  <span>This customer has not completed an order.</span>
                </div>
              )}
            </section>

            <p className="gad-customer-demo-note">
              This profile currently uses sample order history and product
              images for layout preview. Connect your orders API to show
              verified customer orders, exact timestamps, images, prices,
              addresses and order sources.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;
