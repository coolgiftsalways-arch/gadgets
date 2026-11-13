import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Boxes,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Save,
} from "lucide-react";
import { adminFetch, imageUrl, money } from "./api";
import "../Admincss/AdminProducts.css";

const emptyForm = {
  name: "",
  sku: "",
  category: "Audio",
  price: "",
  compareAtPrice: "",
  stock: "",
  status: "active",
  images: [],
  label: "",
  description: "",
  colors: "",
  features: "",
};

// Shrinks a photo in the browser (max 1600px, JPEG) so uploads are quick.
function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not read image."))), "image/jpeg", 0.85);
    };
    img.onerror = () => reject(new Error("That file isn't a readable image."));
    img.src = URL.createObjectURL(file);
  });
}

const displayStatus = (product) =>
  product.status === "draft" ? "Draft" : product.stock === 0 ? "Out of stock" : "Active";

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(["Audio"]);
  const [threshold, setThreshold] = useState(5);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [statusFilter, setStatusFilter] = useState("All status");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await adminFetch("/products");
      setProducts(data.products);
      setCategories(data.categories);
      setThreshold(data.lowStockThreshold);
      setPageError("");
    } catch (err) {
      setPageError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= threshold).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const inventoryValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

  const filteredProducts = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = [product.name, product.sku, product.category].join(" ").toLowerCase().includes(searchText);
      const matchesCategory = categoryFilter === "All categories" || product.category === categoryFilter;
      const matchesStatus = statusFilter === "All status" || displayStatus(product) === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, query, categoryFilter, statusFilter]);

  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm, category: categories[0] || "Audio" });
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: String(product.price),
      compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : "",
      stock: String(product.stock),
      status: product.status,
      images: product.images || [],
      label: product.label || "",
      description: product.description || "",
      colors: (product.colors || []).join(", "),
      features: (product.features || []).join("\n"),
    });
    setFormError("");
    setModalOpen(true);
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setFormError("Please choose an image file.");

    setUploading(true);
    setFormError("");
    try {
      const blob = await shrinkImage(file);
      const body = new FormData();
      body.append("image", blob, "product.jpg");
      const { url } = await adminFetch("/media", { method: "POST", body });
      setForm((current) => ({ ...current, images: [...current.images, url].slice(0, 8) }));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url) =>
    setForm((current) => ({ ...current, images: current.images.filter((image) => image !== url) }));

  const saveProduct = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || form.price === "" || form.stock === "") {
      return setFormError("Please fill in the product name, price and stock.");
    }

    const description = form.description.trim();
    const body = {
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice === "" ? 0 : Number(form.compareAtPrice),
      stock: Number(form.stock),
      status: form.status,
      images: form.images,
      label: form.label.trim(),
      description,
      shortDescription: description.split("\n")[0].slice(0, 160),
      colors: form.colors,
      features: form.features,
    };
    if (form.sku.trim()) body.sku = form.sku.trim();

    setSaving(true);
    setFormError("");
    try {
      if (editingId) await adminFetch(`/products/${editingId}`, { method: "PATCH", body });
      else await adminFetch("/products", { method: "POST", body });
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? Past orders are not affected.`)) return;
    try {
      await adminFetch(`/products/${product._id}`, { method: "DELETE" });
      if (viewProduct?._id === product._id) setViewProduct(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const exportProducts = () => {
    const rows = [
      ["Name", "SKU", "Category", "Price", "Compare at price", "Stock", "Status"],
      ...filteredProducts.map((p) => [p.name, p.sku, p.category, p.price, p.compareAtPrice, p.stock, displayStatus(p)]),
    ];
    const csv = rows.map((row) => row.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
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
          <span className="gad-products-eyebrow">GADGETÉ / CATALOGUE CONTROL</span>
          <h1>PRODUCTS<span>.</span></h1>
          <p>Add products, manage pricing, update images and keep stock in check.</p>
        </div>
        <div className="gad-products-header-actions">
          <button type="button" className="gad-products-export" onClick={exportProducts}>
            <Download size={15} /> EXPORT
          </button>
          <button type="button" className="gad-products-add" onClick={openAddModal}>
            <Plus size={17} /> ADD PRODUCT
          </button>
        </div>
      </header>

      <section className="gad-products-stats">
        <article className="gad-product-stat-card">
          <span className="gad-product-stat-icon"><Package size={19} /></span>
          <small>TOTAL PRODUCTS</small>
          <strong>{products.length}</strong>
          <em>Products in catalogue</em>
        </article>
        <article className="gad-product-stat-card">
          <span className="gad-product-stat-icon"><Boxes size={19} /></span>
          <small>TOTAL STOCK UNITS</small>
          <strong>{totalStock.toLocaleString("en-IN")}</strong>
          <em>Units currently in stock</em>
        </article>
        <article className="gad-product-stat-card">
          <span className="gad-product-stat-icon warning"><AlertTriangle size={19} /></span>
          <small>LOW STOCK</small>
          <strong>{lowStock}</strong>
          <em>{threshold} units or fewer</em>
        </article>
        <article className="gad-product-stat-card">
          <span className="gad-product-stat-icon danger"><XCircle size={19} /></span>
          <small>OUT OF STOCK</small>
          <strong>{outOfStock}</strong>
          <em>Needs restocking</em>
        </article>
      </section>

      <section className="gad-products-panel">
        <div className="gad-products-panel-heading">
          <div>
            <span className="gad-products-eyebrow">YOUR INVENTORY</span>
            <h2>ALL <span>PRODUCTS.</span></h2>
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
            <input type="search" placeholder="Search product, SKU or category..." value={query} onChange={(e) => setQuery(e.target.value)} />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>
            )}
          </label>
          <label className="gad-products-filter">
            <SlidersHorizontal size={14} />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option>All categories</option>
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
            <ChevronDown size={13} />
          </label>
          <label className="gad-products-filter">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All status</option>
              <option>Active</option>
              <option>Out of stock</option>
              <option>Draft</option>
            </select>
            <ChevronDown size={13} />
          </label>
        </div>

        {pageError && <p className="gad-product-form-error">{pageError}</p>}

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
              {filteredProducts.map((product) => {
                const status = displayStatus(product);
                return (
                  <tr key={product._id}>
                    <td>
                      <div className="gad-product-name-cell">
                        {product.images[0] ? (
                          <img src={imageUrl(product.images[0])} alt={product.name} />
                        ) : (
                          <span style={{ width: 46, height: 46, display: "grid", placeItems: "center" }}><Package size={20} /></span>
                        )}
                        <span>
                          <strong>{product.name}</strong>
                          <small>/{product.slug}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="gad-product-sku">{product.sku}</span>
                      <small className="gad-product-category">{product.category}</small>
                    </td>
                    <td>
                      <strong className="gad-product-price">{money(product.price)}</strong>
                      {product.compareAtPrice > product.price && (
                        <small className="gad-product-compare">{money(product.compareAtPrice)}</small>
                      )}
                    </td>
                    <td>
                      <span className={`gad-product-stock ${product.stock === 0 ? "empty" : product.stock <= threshold ? "low" : ""}`}>
                        {product.stock} units
                      </span>
                    </td>
                    <td>
                      <span className={`gad-product-status ${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>
                    </td>
                    <td>
                      <div className="gad-product-actions">
                        <button type="button" onClick={() => setViewProduct(product)} title="View product" aria-label="View product"><Eye size={15} /></button>
                        <button type="button" onClick={() => openEditModal(product)} title="Edit product" aria-label="Edit product"><Pencil size={15} /></button>
                        <button type="button" className="delete" onClick={() => deleteProduct(product)} title="Delete product" aria-label="Delete product"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && filteredProducts.length === 0 && (
            <div className="gad-products-empty">
              <Package size={28} />
              <strong>No products found</strong>
              <span>Try another search or add a new product.</span>
            </div>
          )}
          {loading && <div className="gad-products-empty"><strong>Loading products…</strong></div>}
        </div>
        <footer className="gad-products-table-footer">
          <span>Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products</span>
          <span>GADGETÉ® PRODUCT CATALOGUE</span>
        </footer>
      </section>

      {(modalOpen || viewProduct) && (
        <div className="gad-product-modal-backdrop" onMouseDown={() => { setModalOpen(false); setViewProduct(null); }}>
          {modalOpen ? (
            <section className="gad-product-modal" onMouseDown={(e) => e.stopPropagation()}>
              <header className="gad-product-modal-header">
                <div>
                  <span className="gad-products-eyebrow">{editingId ? "UPDATE CATALOGUE ITEM" : "NEW CATALOGUE ITEM"}</span>
                  <h2>{editingId ? "EDIT PRODUCT" : "ADD PRODUCT"}<span>.</span></h2>
                </div>
                <button type="button" onClick={() => setModalOpen(false)} aria-label="Close"><X size={20} /></button>
              </header>

              <form className="gad-product-form" onSubmit={saveProduct}>
                <div className="gad-product-form-grid">
                  <div className="gad-product-image-field">
                    <span>PRODUCT IMAGES ({form.images.length}/8)</span>
                    <button type="button" className="gad-product-image-picker" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                      {form.images[0] ? (
                        <img src={imageUrl(form.images[0])} alt="Main product" />
                      ) : (
                        <>
                          <ImagePlus size={27} />
                          <b>{uploading ? "UPLOADING…" : "UPLOAD IMAGE"}</b>
                          <small>JPG, PNG or WebP</small>
                        </>
                      )}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} hidden />
                    {form.images.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {form.images.map((url) => (
                          <span key={url} style={{ position: "relative" }}>
                            <img src={imageUrl(url)} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 6 }} />
                            <button type="button" onClick={() => removeImage(url)} aria-label="Remove image"
                              style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", border: 0, background: "#c0392b", color: "#fff", fontSize: 12 }}>×</button>
                          </span>
                        ))}
                        <button type="button" className="gad-product-remove-image" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                          {uploading ? "UPLOADING…" : "+ ADD"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="gad-product-fields">
                    <label>PRODUCT NAME *<input name="name" value={form.name} onChange={updateField} placeholder="e.g. Air Pods Pro" /></label>
                    <label>SKU<input name="sku" value={form.sku} onChange={updateField} placeholder="Leave empty to auto-generate" /></label>
                    <label>
                      CATEGORY
                      <select name="category" value={form.category} onChange={updateField}>
                        {categories.map((category) => <option key={category}>{category}</option>)}
                      </select>
                    </label>
                    <label>TAGLINE<input name="label" value={form.label} onChange={updateField} placeholder="e.g. SOUND WITHOUT LIMITS" /></label>
                    <label>DESCRIPTION<textarea name="description" value={form.description} onChange={updateField} placeholder="First line is used as the short description" rows="3" /></label>
                  </div>
                </div>

                <div className="gad-product-form-grid three">
                  <label>SELLING PRICE (₹) *<input type="number" min="0" step="1" name="price" value={form.price} onChange={updateField} placeholder="3499" /></label>
                  <label>COMPARE AT PRICE (₹)<input type="number" min="0" step="1" name="compareAtPrice" value={form.compareAtPrice} onChange={updateField} placeholder="4999" /></label>
                  <label>STOCK QUANTITY *<input type="number" min="0" step="1" name="stock" value={form.stock} onChange={updateField} placeholder="25" /></label>
                </div>

                <div className="gad-product-form-grid three">
                  <label>COLOURS<input name="colors" value={form.colors} onChange={updateField} placeholder="Black, White, Blue" /></label>
                  <label>FEATURES (one per line)<textarea name="features" value={form.features} onChange={updateField} rows="2" /></label>
                  <label>
                    PRODUCT STATUS
                    <select name="status" value={form.status} onChange={updateField}>
                      <option value="active">Active (shown in shop)</option>
                      <option value="draft">Draft (hidden)</option>
                    </select>
                  </label>
                </div>

                {formError && <p className="gad-product-form-error">{formError}</p>}
                <div className="gad-product-form-actions">
                  <button type="button" className="secondary" onClick={() => setModalOpen(false)}>CANCEL</button>
                  <button type="submit" className="primary" disabled={saving || uploading}>
                    <Save size={15} /> {saving ? "SAVING…" : editingId ? "SAVE CHANGES" : "ADD PRODUCT"}
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <section className="gad-product-view-modal" onMouseDown={(e) => e.stopPropagation()}>
              <button type="button" className="gad-product-view-close" onClick={() => setViewProduct(null)} aria-label="Close"><X size={20} /></button>
              {viewProduct.images[0] ? <img src={imageUrl(viewProduct.images[0])} alt={viewProduct.name} /> : <Package size={80} />}
              <div className="gad-product-view-copy">
                <span className="gad-products-eyebrow">{viewProduct.category} / {viewProduct.sku}</span>
                <h2>{viewProduct.name}</h2>
                <p>{viewProduct.description}</p>
                <strong>{money(viewProduct.price)}</strong>
                {viewProduct.compareAtPrice > viewProduct.price && <del>{money(viewProduct.compareAtPrice)}</del>}
                <div className="gad-product-view-meta">
                  <span>STOCK: <b>{viewProduct.stock}</b></span>
                  <span>STATUS: <b>{displayStatus(viewProduct)}</b></span>
                </div>
                <button type="button" onClick={() => { setViewProduct(null); openEditModal(viewProduct); }}>
                  <Pencil size={15} /> EDIT PRODUCT
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      <div className="gad-products-note">
        <CheckCircle2 size={14} />
        Changes are saved to the database and appear in the shop straight away.
      </div>
    </div>
  );
};

export default AdminProducts;
