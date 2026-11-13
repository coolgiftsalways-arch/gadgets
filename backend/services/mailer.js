// Sends email through the SMTP mailbox configured in backend/.env.
//
//   SMTP_HOST=smtp.gmail.com        (or smtp.hostinger.com, smtp.zoho.in …)
//   SMTP_PORT=465
//   SMTP_USER=orders@yourdomain.com
//   SMTP_PASS=the mailbox password / Gmail app password
//   MAIL_FROM="GADGETÉ <orders@yourdomain.com>"
//
// If SMTP is not configured every send is skipped quietly — orders keep
// working, they just don't produce emails.
import nodemailer from "nodemailer";
import { env, isSmtpConfigured } from "../config/env.js";

export const isConfigured = isSmtpConfigured;

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const { host, port, user, pass } = env.smtp;

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = SSL from the start; other ports upgrade with STARTTLS
      requireTLS: port === 587, // never send the password in plain text on 587
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    });
  }

  return transporter;
}

export function fromAddress() {
  if (env.smtp.from) return env.smtp.from;
  return { name: env.store.name, address: env.smtp.user };
}

// Turns raw SMTP failures into something a store owner can act on.
function explain(error) {
  const message = String(error?.message || error);
  const code = error?.code || "";

  if (code === "EAUTH" || /Invalid login|Username and Password not accepted|535/i.test(message)) {
    return "The mailbox rejected SMTP_USER / SMTP_PASS. For Gmail you must use an App Password, not your normal password.";
  }
  if (code === "ESOCKET" || code === "ECONNECTION" || code === "ETIMEDOUT" || code === "EDNS") {
    return `Could not reach ${env.smtp.host}:${env.smtp.port}. Check SMTP_HOST and SMTP_PORT (465 or 587).`;
  }
  return message;
}

// Never throws: a failed email must not break an order.
// Returns { ok, skipped?, error? }.
export async function sendMail({ to, subject, html, text, replyTo }) {
  if (!isConfigured()) {
    return { ok: false, skipped: true, error: "Email is not set up (SMTP_HOST / SMTP_USER / SMTP_PASS)." };
  }

  if (!to) return { ok: false, skipped: true, error: "No recipient address." };

  try {
    const info = await getTransporter().sendMail({
      from: fromAddress(),
      to,
      replyTo: replyTo || env.smtp.replyTo || undefined,
      subject,
      html,
      text,
    });

    return { ok: true, messageId: info.messageId };
  } catch (error) {
    return { ok: false, error: explain(error) };
  }
}

// Used by the admin "System status" page to check the mailbox login.
export async function verifyConnection() {
  if (!isConfigured()) {
    return { ok: false, error: "Email is not set up (SMTP_HOST / SMTP_USER / SMTP_PASS)." };
  }

  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: explain(error) };
  }
}
