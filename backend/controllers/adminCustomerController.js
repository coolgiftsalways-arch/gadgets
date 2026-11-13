// Admin: customers.
//
// The shop has guest checkout (no accounts), so a "customer" is everyone who
// has placed an order, grouped by mobile number. Nothing is stored twice —
// the list is worked out from the orders themselves, so it can never drift
// out of sync with them.
import Order from "../models/Order.js";
import { PLACED_STATUSES } from "../config/store.js";
import { notFound } from "../utils/httpError.js";
import { escapeRegex, line, phone as cleanPhone } from "../utils/validate.js";
import { parsePage } from "./adminController.js";

const NEW_CUSTOMER_DAYS = 30;

const notCancelled = { $ne: ["$status", "cancelled"] };

const SORTS = {
  newest: { firstOrderAt: -1 },
  recent: { lastOrderAt: -1 },
  "highest-spend": { spent: -1, lastOrderAt: -1 },
  "most-orders": { orders: -1, lastOrderAt: -1 },
};

// GET /api/admin/customers?q=&status=&sort=&page=&limit=
export async function listCustomers(req, res) {
  const { page, limit, skip } = parsePage(req.query);
  const sort = SORTS[req.query.sort] || SORTS.newest;
  const newSince = new Date(Date.now() - NEW_CUSTOMER_DAYS * 86400000);

  const pipeline = [
    { $match: { status: { $in: PLACED_STATUSES } } },
    { $sort: { placedAt: -1 } },
    {
      // Newest order first, so $first picks up the latest name and address.
      $group: {
        _id: "$customer.phone",
        firstName: { $first: "$customer.firstName" },
        lastName: { $first: "$customer.lastName" },
        email: { $first: "$customer.email" },
        city: { $first: "$shippingAddress.city" },
        state: { $first: "$shippingAddress.state" },
        orders: { $sum: { $cond: [notCancelled, 1, 0] } },
        spent: { $sum: { $cond: [notCancelled, "$total", 0] } },
        firstOrderAt: { $min: "$placedAt" },
        lastOrderAt: { $max: "$placedAt" },
      },
    },
    {
      $addFields: {
        isNew: { $and: [{ $gte: ["$firstOrderAt", newSince] }, { $lte: ["$orders", 1] }] },
      },
    },
  ];

  const terms = line(req.query.q, 80).split(" ").filter(Boolean).slice(0, 5);
  const search = terms.map((term) => {
    const pattern = new RegExp(escapeRegex(term), "i");
    return {
      $or: [
        { _id: pattern },
        { firstName: pattern },
        { lastName: pattern },
        { email: pattern },
        { city: pattern },
      ],
    };
  });

  const status = line(req.query.status, 20).toLowerCase();
  if (status === "new") search.push({ isNew: true });
  if (status === "active") search.push({ isNew: false });

  pipeline.push({
    $facet: {
      // Totals across every customer, whatever is being searched for.
      summary: [
        {
          $group: {
            _id: null,
            customers: { $sum: 1 },
            orders: { $sum: "$orders" },
            spent: { $sum: "$spent" },
            newCustomers: { $sum: { $cond: ["$isNew", 1, 0] } },
          },
        },
      ],
      matched: [...(search.length ? [{ $match: { $and: search } }] : []), { $count: "count" }],
      items: [
        ...(search.length ? [{ $match: { $and: search } }] : []),
        { $sort: { ...sort, _id: 1 } },
        { $skip: skip },
        { $limit: limit },
      ],
    },
  });

  const [result] = await Order.aggregate(pipeline);
  const total = result.matched[0]?.count || 0;
  const summary = result.summary[0] || { customers: 0, orders: 0, spent: 0, newCustomers: 0 };

  res.set("Cache-Control", "no-store");
  res.json({
    items: result.items.map((customer) => ({
      phone: customer._id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      name: `${customer.firstName} ${customer.lastName}`.trim(),
      email: customer.email,
      city: customer.city,
      state: customer.state,
      orders: customer.orders,
      spent: customer.spent,
      firstOrderAt: customer.firstOrderAt,
      lastOrderAt: customer.lastOrderAt,
      status: customer.isNew ? "New" : "Active",
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    summary: {
      customers: summary.customers,
      orders: summary.orders,
      spent: summary.spent,
      newCustomers: summary.newCustomers,
    },
  });
}

// GET /api/admin/customers/:phone — one customer with their full order history
export async function getCustomer(req, res) {
  const phone = cleanPhone(req.params.phone);
  if (!phone) throw notFound("Customer not found.");

  const orders = await Order.find({ "customer.phone": phone, status: { $in: PLACED_STATUSES } })
    .sort({ placedAt: -1 })
    .limit(200)
    .select("-emails -accessToken -checkoutKey -payment.linkUrl -payment.linkId");

  if (!orders.length) throw notFound("Customer not found.");

  const latest = orders[0];
  const counted = orders.filter((order) => order.status !== "cancelled");
  const firstOrderAt = orders[orders.length - 1].placedAt;

  res.set("Cache-Control", "no-store");
  res.json({
    customer: {
      phone,
      firstName: latest.customer.firstName,
      lastName: latest.customer.lastName,
      name: `${latest.customer.firstName} ${latest.customer.lastName}`.trim(),
      email: latest.customer.email,
      address: latest.shippingAddress,
      orders: counted.length,
      spent: counted.reduce((sum, order) => sum + order.total, 0),
      firstOrderAt,
      lastOrderAt: latest.placedAt,
      status:
        counted.length <= 1 && firstOrderAt >= new Date(Date.now() - NEW_CUSTOMER_DAYS * 86400000)
          ? "New"
          : "Active",
    },
    orders,
  });
}
