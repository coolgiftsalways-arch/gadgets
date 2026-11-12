import React, { useMemo, useRef, useState } from "react";
import {
  Search,
  Package,
  Plus,
  Download,
  SlidersHorizontal,
  ChevronDown,
  X,
  Pencil,
  Trash2,
  Eye,
  ImagePlus,
  IndianRupee,
  Boxes,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Upload,
  Save,
} from "lucide-react";
import "../Admincss/AdminProducts.css";

const initialProducts = [
  {
    id: "PRD-001",
    sku: "G-01",
    name: "Air Pods Pro",
    category: "Audio",
    price: 3499,
    compareAt: 4299,
    stock: 24,
    status: "Active",
    image:
      "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=500&q=85",
    description: "Premium sound. Zero distractions.",
  },
  {
    id: "PRD-002",
    sku: "G-02",
    name: "Power Core",
    category: "Power",
    price: 1999,
    compareAt: 2499,
    stock: 7,
    status: "Active",
    image:
      "https://images.unsplash.com/photo-1609592424758-3a1f3a9f6f17?w=500&q=85",
    description: "High capacity. All day power.",
  },
  {
    id: "PRD-003",
    sku: "G-04",
    name: "Smart Watch",
    category: "Wearables",
    price: 5999,
    compareAt: 6999,
    stock: 3,
    status: "Active",
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=85",
    description: "Stay connected. Stay ahead.",
  },
  {
    id: "PRD-004",
    sku: "G-05",
    name: "Studio Headphones",
    category: "Audio",
    price: 4499,
    compareAt: 0,
    stock: 0,
    status: "Out of stock",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=85",
    description: "Immersive audio for every day.",
  },
];

const emptyForm = {
  name: "",
  sku: "",
  category: "Audio",
  price: "",
  compareAt: "",
  stock: "",
  status: "Active",
  image: "",
  description: "",
};

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const AdminProducts = () => {
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [statusFilter, setStatusFilter] = useState("All status");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imagePreview, setImagePreview] = useState("");
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef(null);

  const totalStock = products.reduce(
    (sum, product) => sum + Number(product.stock || 0),
    0,
  );
  const lowStock = products.filter(
    (product) => Number(product.stock) > 0 && Number(product.stock) <= 7,
  ).length;
  const outOfStock = products.filter(
    (product) => Number(product.stock) === 0,
  ).length;
  const inventoryValue = products.reduce(
    (sum, product) =>
      sum + Number(product.price || 0) * Number(product.stock || 0),
    0,
  );

  const categories = useMemo(
    () => [
      "All categories",
      ...new Set(products.map((product) => product.category).filter(Boolean)),
    ],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = [
        product.name,
        product.sku,
        product.category,
        product.id,
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchText);
      const matchesCategory =
        categoryFilter === "All categories" ||
        product.category === categoryFilter;
      const matchesStatus =
        statusFilter === "All status" || product.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, query, categoryFilter, statusFilter]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImagePreview("");
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      sku: product.sku || "",
      category: product.category || "Audio",
      price: String(product.price ?? ""),
      compareAt: String(product.compareAt ?? ""),
      stock: String(product.stock ?? ""),
      status: product.status || "Active",
      image: product.image || "",
      description: product.description || "",
    });
    setImagePreview(product.image || "");
    setFormError("");
    setModalOpen(true);
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(String(reader.result));
      setForm((current) => ({ ...current, image: String(reader.result) }));
      setFormError("");
    };
    reader.readAsDataURL(file);
  };

  const saveProduct = (event) => {
    event.preventDefault();
    if (
      !form.name.trim() ||
      !form.sku.trim() ||
      form.price === "" ||
      form.stock === ""
    ) {
      setFormError("Please complete product name, SKU, price and stock.");
      return;
    }
    if (Number(form.price) < 0 || Number(form.stock) < 0) {
      setFormError("Price and stock cannot be negative.");
      return;
    }

    const product = {
      ...form,
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: Number(form.price),
      compareAt: Number(form.compareAt || 0),
      stock: Number(form.stock),
      status: Number(form.stock) === 0 ? "Out of stock" : form.status,
      id: editingId || `PRD-${String(Date.now()).slice(-6)}`,
      image: form.image || imagePreview || "",
    };

    if (editingId) {
      setProducts((current) =>
        current.map((item) => (item.id === editingId ? product : item)),
      );
    } else {
      setProducts((current) => [product, ...current]);
    }
    setModalOpen(false);
  };

  const deleteProduct = (product) => {
    const confirmed = window.confirm(
      `Delete "${product.name}" from this product list?`,
    );
    if (!confirmed) return;
    setProducts((current) => current.filter((item) => item.id !== product.id));
    if (viewProduct?.id === product.id) setViewProduct(null);
  };

  const exportProducts = () => {
    const headers = [
      "Product ID",
      "Name",
      "SKU",
      "Category",
      "Price",
      "Compare at price",
      "Stock",
      "Status",
    ];
    const rows = filteredProducts.map((product) => [
      product.id,
      product.name,
      product.sku,
      product.category,
      product.price,
      product.compareAt,
      product.stock,
      product.status,
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
    anchor.download = "gadgete-products.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gad-products-page">
      <header className="gad-products-header">
        <div>
          <span className="gad-products-eyebrow">
            GADGETÉ / CATALOGUE CONTROL
          </span>
          <h1>
            PRODUCTS<span>.</span>
          </h1>
          <p>
            Add products, manage pricing, update images and keep stock in check.
          </p>
        </div>
        <div className="gad-products-header-actions">
          <button
            type="button"
            className="gad-products-export"
            onClick={exportProducts}
          >
            <Download size={15} /> EXPORT
          </button>
          <button
            type="button"
            className="gad-products-add"
            onClick={openAddModal}
          >
            <Plus size={17} /> ADD PRODUCT
          </button>
        </div>
      </header>

      <section className="gad-products-stats">
        <article className="gad-product-stat-card">
          <span className="gad-product-stat-icon">
            <Package size={19} />
          </span>
          <small>TOTAL PRODUCTS</small>
          <strong>{products.length}</strong>
          <em>Products in catalogue</em>
        </article>
        <article className="gad-product-stat-card">
          <span className="gad-product-stat-icon">
            <Boxes size={19} />
          </span>
          <small>TOTAL STOCK UNITS</small>
          <strong>{totalStock.toLocaleString("en-IN")}</strong>
          <em>Units currently in stock</em>
        </article>
        <article className="gad-product-stat-card">
          <span className="gad-product-stat-icon warning">
            <AlertTriangle size={19} />
          </span>
          <small>LOW STOCK</small>
          <strong>{lowStock}</strong>
          <em>7 units or fewer</em>
        </article>
        <article className="gad-product-stat-card">
          <span className="gad-product-stat-icon danger">
            <XCircle size={19} />
          </span>
          <small>OUT OF STOCK</small>
          <strong>{outOfStock}</strong>
          <em>Needs restocking</em>
        </article>
      </section>

      <section className="gad-products-panel">
        <div className="gad-products-panel-heading">
          <div>
            <span className="gad-products-eyebrow">YOUR INVENTORY</span>
            <h2>
              ALL <span>PRODUCTS.</span>
            </h2>
            <p>Manage every item available in your GADGETÉ store.</p>
          </div>
          <div className="gad-products-inventory-value">
            <small>INVENTORY VALUE</small>
            <strong>{money(inventoryValue)}</strong>
          </div>
        </div>

        <div className="gad-products-toolbar">
          <label className="gad-products-search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search product, SKU or category..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </label>
          <label className="gad-products-filter">
            <SlidersHorizontal size={14} />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            <ChevronDown size={13} />
          </label>
          <label className="gad-products-filter">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option>All status</option>
              <option>Active</option>
              <option>Out of stock</option>
              <option>Draft</option>
            </select>
            <ChevronDown size={13} />
          </label>
        </div>

        <div className="gad-products-table-wrap">
          <table className="gad-products-table">
            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>SKU / CATEGORY</th>
                <th>PRICE</th>
                <th>STOCK</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="gad-product-name-cell">
                      <img
                        src={product.image || ""}
                        alt={product.name}
                        onError={(event) => {
                          event.currentTarget.style.visibility = "hidden";
                        }}
                      />
                      <span>
                        <strong>{product.name}</strong>
                        <small>{product.id}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="gad-product-sku">{product.sku}</span>
                    <small className="gad-product-category">
                      {product.category}
                    </small>
                  </td>
                  <td>
                    <strong className="gad-product-price">
                      {money(product.price)}
                    </strong>
                    {product.compareAt > product.price && (
                      <small className="gad-product-compare">
                        {money(product.compareAt)}
                      </small>
                    )}
                  </td>
                  <td>
                    <span
                      className={`gad-product-stock ${product.stock === 0 ? "empty" : product.stock <= 7 ? "low" : ""}`}
                    >
                      {product.stock} units
                    </span>
                  </td>
                  <td>
                    <span
                      className={`gad-product-status ${product.status.toLowerCase().replaceAll(" ", "-")}`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td>
                    <div className="gad-product-actions">
                      <button
                        type="button"
                        onClick={() => setViewProduct(product)}
                        title="View product"
                        aria-label="View product"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        title="Edit product"
                        aria-label="Edit product"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="delete"
                        onClick={() => deleteProduct(product)}
                        title="Delete product"
                        aria-label="Delete product"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="gad-products-empty">
              <Package size={28} />
              <strong>No products found</strong>
              <span>Try another search or add a new product.</span>
            </div>
          )}
        </div>
        <footer className="gad-products-table-footer">
          <span>
            Showing <strong>{filteredProducts.length}</strong> of{" "}
            <strong>{products.length}</strong> products
          </span>
          <span>GADGETÉ® PRODUCT CATALOGUE</span>
        </footer>
      </section>

      {(modalOpen || viewProduct) && (
        <div
          className="gad-product-modal-backdrop"
          onMouseDown={() => {
            setModalOpen(false);
            setViewProduct(null);
          }}
        >
          {modalOpen ? (
            <section
              className="gad-product-modal"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <header className="gad-product-modal-header">
                <div>
                  <span className="gad-products-eyebrow">
                    {editingId ? "UPDATE CATALOGUE ITEM" : "NEW CATALOGUE ITEM"}
                  </span>
                  <h2>
                    {editingId ? "EDIT PRODUCT" : "ADD PRODUCT"}
                    <span>.</span>
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </header>

              <form className="gad-product-form" onSubmit={saveProduct}>
                <div className="gad-product-form-grid">
                  <label className="gad-product-image-field">
                    <span>PRODUCT IMAGE</span>
                    <button
                      type="button"
                      className="gad-product-image-picker"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="Product preview" />
                      ) : (
                        <>
                          <ImagePlus size={27} />
                          <b>UPLOAD IMAGE</b>
                          <small>Choose an image from your device</small>
                        </>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImage}
                      hidden
                    />
                    {imagePreview && (
                      <button
                        type="button"
                        className="gad-product-remove-image"
                        onClick={() => {
                          setImagePreview("");
                          setForm((current) => ({ ...current, image: "" }));
                        }}
                      >
                        REMOVE IMAGE
                      </button>
                    )}
                  </label>

                  <div className="gad-product-fields">
                    <label>
                      PRODUCT NAME *
                      <input
                        name="name"
                        value={form.name}
                        onChange={updateField}
                        placeholder="e.g. Air Pods Pro"
                      />
                    </label>
                    <label>
                      SKU *
                      <input
                        name="sku"
                        value={form.sku}
                        onChange={updateField}
                        placeholder="e.g. G-01"
                      />
                    </label>
                    <label>
                      CATEGORY
                      <select
                        name="category"
                        value={form.category}
                        onChange={updateField}
                      >
                        <option>Audio</option>
                        <option>Power</option>
                        <option>Wearables</option>
                        <option>Accessories</option>
                        <option>Smart Home</option>
                        <option>Other</option>
                      </select>
                    </label>
                    <label>
                      DESCRIPTION
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={updateField}
                        placeholder="Short product description..."
                        rows="3"
                      />
                    </label>
                  </div>
                </div>

                <div className="gad-product-form-grid three">
                  <label>
                    SELLING PRICE (₹) *
                    <input
                      type="number"
                      min="0"
                      step="1"
                      name="price"
                      value={form.price}
                      onChange={updateField}
                      placeholder="3499"
                    />
                  </label>
                  <label>
                    COMPARE AT PRICE (₹)
                    <input
                      type="number"
                      min="0"
                      step="1"
                      name="compareAt"
                      value={form.compareAt}
                      onChange={updateField}
                      placeholder="4299"
                    />
                  </label>
                  <label>
                    STOCK QUANTITY *
                    <input
                      type="number"
                      min="0"
                      step="1"
                      name="stock"
                      value={form.stock}
                      onChange={updateField}
                      placeholder="25"
                    />
                  </label>
                </div>

                <label className="gad-product-status-field">
                  PRODUCT STATUS
                  <select
                    name="status"
                    value={form.status}
                    onChange={updateField}
                  >
                    <option>Active</option>
                    <option>Draft</option>
                    <option>Out of stock</option>
                  </select>
                </label>

                {formError && (
                  <p className="gad-product-form-error">{formError}</p>
                )}
                <div className="gad-product-form-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setModalOpen(false)}
                  >
                    CANCEL
                  </button>
                  <button type="submit" className="primary">
                    <Save size={15} />{" "}
                    {editingId ? "SAVE CHANGES" : "ADD PRODUCT"}
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <section
              className="gad-product-view-modal"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="gad-product-view-close"
                onClick={() => setViewProduct(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
              <img src={viewProduct.image} alt={viewProduct.name} />
              <div className="gad-product-view-copy">
                <span className="gad-products-eyebrow">
                  {viewProduct.category} / {viewProduct.sku}
                </span>
                <h2>{viewProduct.name}</h2>
                <p>{viewProduct.description}</p>
                <strong>{money(viewProduct.price)}</strong>
                {viewProduct.compareAt > viewProduct.price && (
                  <del>{money(viewProduct.compareAt)}</del>
                )}
                <div className="gad-product-view-meta">
                  <span>
                    STOCK: <b>{viewProduct.stock}</b>
                  </span>
                  <span>
                    STATUS: <b>{viewProduct.status}</b>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setViewProduct(null);
                    openEditModal(viewProduct);
                  }}
                >
                  <Pencil size={15} /> EDIT PRODUCT
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      <div className="gad-products-note">
        <CheckCircle2 size={14} />
        Product changes in this preview are held in page state. Connect your
        products API to save them permanently.
      </div>
    </div>
  );
};

export default AdminProducts;
