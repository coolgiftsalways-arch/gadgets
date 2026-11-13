// Customer Care form + newsletter sign-up.
import Contact, { CONTACT_TOPICS } from "../models/Contact.js";
import Subscriber from "../models/Subscriber.js";
import { env } from "../config/env.js";
import { badRequest } from "../utils/httpError.js";
import { email as cleanEmail, line, text } from "../utils/validate.js";
import { sendMail } from "../services/mailer.js";
import { contactAlert } from "../services/emailTemplates.js";
import { runInBackground } from "../services/background.js";

// POST /api/contact  { name, email, phone?, topic?, orderNumber?, message }
export async function createContact(req, res) {
  const body = req.body || {};

  // Hidden field real people never fill in; bots do. Pretend it worked.
  if (line(body.website, 200)) {
    return res.status(201).json({ message: "Thank you — we'll get back to you soon." });
  }

  const message = await Contact.create({
    name: line(body.name, 80),
    email: cleanEmail(body.email) || line(body.email, 254).toLowerCase(),
    phone: line(body.phone, 20),
    topic: CONTACT_TOPICS.includes(body.topic) ? body.topic : "Other",
    orderNumber: line(body.orderNumber, 20).toUpperCase(),
    message: text(body.message, 3000),
  });

  // Forward it to the store's inbox so it isn't only visible in the admin panel.
  const inbox = env.orderAlertEmail || env.store.supportEmail;
  if (inbox) {
    runInBackground("contact alert", async () => {
      const { subject, html, text: plain } = contactAlert(message);
      await sendMail({ to: inbox, subject, html, text: plain, replyTo: message.email });
    });
  }

  res.status(201).json({ message: "Thank you — we've got your message and will reply soon." });
}

// POST /api/newsletter  { email }
export async function subscribe(req, res) {
  const address = cleanEmail(req.body?.email);
  if (!address) throw badRequest("Please enter a valid email.");

  const existing = await Subscriber.findOne({ email: address });
  if (existing) return res.json({ message: "You're already on the list!" });

  try {
    await Subscriber.create({ email: address });
  } catch (error) {
    // Two sign-ups for the same address at the same moment.
    if (error?.code !== 11000) throw error;
  }

  res.status(201).json({ message: "Thank you for joining GADGETÉ!" });
}
