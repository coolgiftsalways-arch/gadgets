// Admin: newsletter subscribers and Customer Care messages.
import Contact from "../models/Contact.js";
import Subscriber from "../models/Subscriber.js";
import { notFound } from "../utils/httpError.js";
import { boolean, escapeRegex, isObjectId, line } from "../utils/validate.js";
import { parsePage } from "./adminController.js";
import { toCsv } from "./adminOrderController.js";

// ---------- subscribers ----------

// GET /api/admin/subscribers?q=&page=
export async function listSubscribers(req, res) {
  const { page, limit, skip } = parsePage(req.query, { defaultLimit: 50, maxLimit: 200 });
  const q = line(req.query.q, 80);
  const filter = q ? { email: new RegExp(escapeRegex(q), "i") } : {};

  const [items, total, all] = await Promise.all([
    Subscriber.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Subscriber.countDocuments(filter),
    Subscriber.countDocuments(),
  ]);

  res.set("Cache-Control", "no-store");
  res.json({ items, total, all, page, pages: Math.max(1, Math.ceil(total / limit)) });
}

// GET /api/admin/subscribers/export.csv
export async function exportSubscribers(req, res) {
  const subscribers = await Subscriber.find().sort({ createdAt: -1 }).limit(50000).lean();

  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="gadgete-subscribers.csv"',
    "Cache-Control": "no-store",
  });
  res.send(
    toCsv([
      ["Email", "Subscribed on"],
      ...subscribers.map((entry) => [entry.email, new Date(entry.createdAt).toISOString().slice(0, 10)]),
    ]),
  );
}

// DELETE /api/admin/subscribers/:id
export async function deleteSubscriber(req, res) {
  if (!isObjectId(req.params.id)) throw notFound("Subscriber not found.");
  await Subscriber.deleteOne({ _id: req.params.id });
  res.status(204).end();
}

// ---------- messages ----------

// GET /api/admin/messages?filter=unread&q=&page=
export async function listMessages(req, res) {
  const { page, limit, skip } = parsePage(req.query, { defaultLimit: 30 });
  const filter = {};

  if (req.query.filter === "unread") filter.read = false;
  if (req.query.filter === "read") filter.read = true;

  const q = line(req.query.q, 80);
  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: pattern }, { email: pattern }, { message: pattern }, { orderNumber: pattern }];
  }

  const [items, total, unread] = await Promise.all([
    Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Contact.countDocuments(filter),
    Contact.countDocuments({ read: false }),
  ]);

  res.set("Cache-Control", "no-store");
  res.json({ items, total, unread, page, pages: Math.max(1, Math.ceil(total / limit)) });
}

// PATCH /api/admin/messages/:id  { read }
export async function updateMessage(req, res) {
  if (!isObjectId(req.params.id)) throw notFound("Message not found.");

  const message = await Contact.findByIdAndUpdate(
    req.params.id,
    { $set: { read: boolean(req.body?.read, true) } },
    { returnDocument: "after" },
  );
  if (!message) throw notFound("Message not found.");

  res.json({ message });
}

// DELETE /api/admin/messages/:id
export async function deleteMessage(req, res) {
  if (!isObjectId(req.params.id)) throw notFound("Message not found.");
  await Contact.deleteOne({ _id: req.params.id });
  res.status(204).end();
}
