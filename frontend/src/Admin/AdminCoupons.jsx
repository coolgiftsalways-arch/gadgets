import { useCallback, useEffect, useState } from "react";
import { Plus, X, Pencil, Trash2, Save, TicketPercent, Search } from "lucide-react";
import { adminFetch, formatDate, money } from "./api";
import "../Admincss/AdminProducts.css";

const emptyForm = {
  code: "",
  description: "",
  type: "percent",
  value: "",
  maxDiscount: "",
  minOrder: "",
  paymentMethod: "any",
  startsAt: "",
  expiresAt: "",
  usageLimit: "",
  perCustomerLimit: "1",
  active: true,
};

const toInputDate = (date) => (date ? new Date(date).toISOString().slice(0, 10) : "");

function couponState(coupon) {
  const now = new Date();
  if (!coupon.active) return "Paused";
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) return "Expired";
  if (coupon.startsAt && new Date(coupon.startsAt) > now) return "Scheduled";
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return "Used up";
  return "Active";
}

const describe = (c) =>
  `${c.type === "percent" ? `${c.value}% off` : `${money(c.value)} off`}${
    c.type === "percent" && c.maxDiscount ? ` (max ${money(c.maxDiscount)})` : ""
  }${c.minOrder ? ` · min order ${money(c.minOrder)}` : ""}${
    c.paymentMethod === "upi" ? " · UPI only" : c.paymentMethod === "cod" ? " · COD only" : ""
  }`;

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    adminFetch("/coupons")
      .then((data) => setCoupons(data.coupons))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditingId(c._id);
    setForm({
      code: c.code,
      description: c.description || "",
      type: c.type,
      value: String(c.value),
      maxDiscount: c.maxDiscount ? String(c.maxDiscount) : "",
      minOrder: c.minOrder ? String(c.minOrder) : "",
      paymentMethod: c.paymentMethod,
      startsAt: toInputDate(c.startsAt),
      expiresAt: toInputDate(c.expiresAt),
      usageLimit: c.usageLimit ? String(c.usageLimit) : "",
      perCustomerLimit: c.perCustomerLimit ? String(c.perCustomerLimit) : "",
      active: c.active,
    });
    setError("");
    setModalOpen(true);
  };

  const update = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body = {
      ...form,
      code: form.code.trim().toUpperCase(),
      // expiry date counts until the end of that day
      expiresAt: form.expiresAt ? `${form.expiresAt}T23:59:59` : "",
      startsAt: form.startsAt ? `${form.startsAt}T00:00:00` : "",
    };
    try {
      if (editingId) await adminFetch(`/coupons/${editingId}`, { method: "PATCH", body });
      else await adminFetch("/coupons", { method: "POST", body });
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c) => {
    await adminFetch(`/coupons/${c._id}`, { method: "PATCH", body: { active: !c.active } }).catch((e) => alert(e.message));
    load();
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete coupon ${c.code}? Past orders keep their discount.`)) return;
    await adminFetch(`/coupons/${c._id}`, { method: "DELETE" }).catch((e) => alert(e.message));
    load();
  };

  const shown = coupons.filter((c) => `${c.code} ${c.description}`.toLowerCase().includes(query.toLowerCase()));
  const activeCount = coupons.filter((c) => couponState(c) === "Active").length;
  const totalUses = coupons.reduce((sum, c) => sum + c.usedCount, 0);

  return (
    <div className="gad-products-page">
      <header className="gad-products-header">
        <div>
          <span className="gad-products-eyebrow">GADGETÉ / PROMOTIONS</span>
          <h1>COUPONS<span>.</span></h1>
          <p>Create discount codes your customers can use at checkout.</p>
        </div>
        <div className="gad-products-header-actions">
          <button type="button" className="gad-products-add" onClick={openAdd}>
            <Plus size={17} /> ADD COUPON
          </button>
        </div>
      </header>

      <section className="gad-products-stats">
        <article className="gad-product-stat-card">
          <span className="gad-product-stat-icon"><TicketPercent size={19} /></span>
          <small>TOTAL COUPONS</small>
          <strong>{coupons.length}</strong>
          <em>All codes</em>
        </article>
        <article className="gad-product-stat-card">
          <span className="gad-product-stat-icon"><TicketPercent size={19} /></span>
          <small>ACTIVE NOW</small>
          <strong>{activeCount}</strong>
          <em>Usable at checkout</em>
        </article>
        <article className="gad-product-stat-card">
          <span className="gad-product-stat-icon"><TicketPercent size={19} /></span>
          <small>TIMES USED</small>
          <strong>{totalUses}</strong>
          <em>Across all orders</em>
        </article>
      </section>

      <section className="gad-products-panel">
        <div className="gad-products-toolbar">
          <label className="gad-products-search">
            <Search size={16} />
            <input type="search" placeholder="Search coupon code..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>

        {error && !modalOpen && <p className="gad-product-form-error">{error}</p>}

        <div className="gad-products-table-wrap">
          <table className="gad-products-table">
            <thead>
              <tr>
                <th>CODE</th>
                <th>DISCOUNT</th>
                <th>USED</th>
                <th>VALID</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => {
                const state = couponState(c);
                return (
                  <tr key={c._id}>
                    <td>
                      <strong className="gad-product-sku">{c.code}</strong>
                      {c.description && <small className="gad-product-category">{c.description}</small>}
                    </td>
                    <td>{describe(c)}</td>
                    <td>
                      {c.usedCount}
                      {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                      {c.perCustomerLimit ? <small className="gad-product-category">{c.perCustomerLimit} per customer</small> : null}
                    </td>
                    <td>
                      {c.startsAt ? formatDate(c.startsAt) : "Now"} → {c.expiresAt ? formatDate(c.expiresAt) : "No expiry"}
                    </td>
                    <td>
                      <span className={`gad-product-status ${state === "Active" ? "active" : state === "Paused" ? "draft" : "out-of-stock"}`}>
                        {state}
                      </span>
                    </td>
                    <td>
                      <div className="gad-product-actions">
                        <button type="button" onClick={() => toggle(c)} title={c.active ? "Pause" : "Activate"}>
                          {c.active ? "⏸" : "▶"}
                        </button>
                        <button type="button" onClick={() => openEdit(c)} title="Edit" aria-label="Edit coupon"><Pencil size={15} /></button>
                        <button type="button" className="delete" onClick={() => remove(c)} title="Delete" aria-label="Delete coupon"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && shown.length === 0 && (
            <div className="gad-products-empty">
              <TicketPercent size={28} />
              <strong>No coupons yet</strong>
              <span>Click “Add coupon” to create your first discount code.</span>
            </div>
          )}
        </div>
      </section>

      {modalOpen && (
        <div className="gad-product-modal-backdrop" onMouseDown={() => setModalOpen(false)}>
          <section className="gad-product-modal" onMouseDown={(e) => e.stopPropagation()}>
            <header className="gad-product-modal-header">
              <div>
                <span className="gad-products-eyebrow">{editingId ? "UPDATE COUPON" : "NEW COUPON"}</span>
                <h2>{editingId ? "EDIT COUPON" : "ADD COUPON"}<span>.</span></h2>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close"><X size={20} /></button>
            </header>

            <form className="gad-product-form" onSubmit={save}>
              <div className="gad-product-form-grid three">
                <label>COUPON CODE *<input name="code" value={form.code} onChange={update} placeholder="e.g. WELCOME10" style={{ textTransform: "uppercase" }} /></label>
                <label>
                  TYPE
                  <select name="type" value={form.type} onChange={update}>
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat amount (₹)</option>
                  </select>
                </label>
                <label>{form.type === "percent" ? "DISCOUNT (%) *" : "DISCOUNT (₹) *"}<input type="number" min="1" name="value" value={form.value} onChange={update} placeholder={form.type === "percent" ? "10" : "200"} /></label>
              </div>

              <div className="gad-product-form-grid three">
                {form.type === "percent" && (
                  <label>MAX DISCOUNT (₹)<input type="number" min="0" name="maxDiscount" value={form.maxDiscount} onChange={update} placeholder="No limit" /></label>
                )}
                <label>MINIMUM ORDER (₹)<input type="number" min="0" name="minOrder" value={form.minOrder} onChange={update} placeholder="No minimum" /></label>
                <label>
                  PAYMENT METHOD
                  <select name="paymentMethod" value={form.paymentMethod} onChange={update}>
                    <option value="any">Any</option>
                    <option value="upi">UPI / online only</option>
                    <option value="cod">Cash on Delivery only</option>
                  </select>
                </label>
              </div>

              <div className="gad-product-form-grid three">
                <label>STARTS ON<input type="date" name="startsAt" value={form.startsAt} onChange={update} /></label>
                <label>EXPIRES ON<input type="date" name="expiresAt" value={form.expiresAt} onChange={update} /></label>
                <label>TOTAL USES<input type="number" min="0" name="usageLimit" value={form.usageLimit} onChange={update} placeholder="Unlimited" /></label>
              </div>

              <div className="gad-product-form-grid three">
                <label>USES PER CUSTOMER<input type="number" min="0" name="perCustomerLimit" value={form.perCustomerLimit} onChange={update} placeholder="Unlimited" /></label>
                <label>DESCRIPTION<input name="description" value={form.description} onChange={update} placeholder="e.g. 10% off your first order" /></label>
                <label style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <input type="checkbox" name="active" checked={form.active} onChange={update} style={{ width: 20, height: 20 }} /> ACTIVE
                </label>
              </div>

              {error && <p className="gad-product-form-error">{error}</p>}
              <div className="gad-product-form-actions">
                <button type="button" className="secondary" onClick={() => setModalOpen(false)}>CANCEL</button>
                <button type="submit" className="primary" disabled={saving}>
                  <Save size={15} /> {saving ? "SAVING…" : editingId ? "SAVE CHANGES" : "ADD COUPON"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminCoupons;
