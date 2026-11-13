// The HTML + plain-text content of every email the store sends.
// Kept as inline-styled tables because that is what email apps render reliably.
import { env } from "../config/env.js";

const COLORS = {
  blue: "#164e74",
  yellow: "#eff04c",
  cream: "#f4edda",
  paper: "#fffaf0",
  black: "#10100e",
  muted: "#6f6e66",
  line: "#d9d2bf",
};

const HEADING_FONT = "'Anton','Impact','Arial Narrow',Arial,sans-serif";
const BODY_FONT = "'Space Grotesk','Helvetica Neue',Helvetica,Arial,sans-serif";

export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );

export const rupees = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const formatDate = (date, options = { day: "numeric", month: "short", year: "numeric" }) =>
  new Intl.DateTimeFormat("en-IN", { ...options, timeZone: env.store.timezone }).format(
    new Date(date),
  );

const addDays = (date, days) => new Date(new Date(date).getTime() + days * 86400000);

// "14 Nov – 16 Nov"
export function deliveryWindow(order) {
  if (order.shipping?.estimatedDelivery) {
    return formatDate(order.shipping.estimatedDelivery);
  }
  if (!order.delivery || order.delivery.maxDays === undefined) return "";

  const from = order.placedAt || order.createdAt || new Date();
  const short = { day: "numeric", month: "short" };
  return `${formatDate(addDays(from, order.delivery.minDays), short)} – ${formatDate(
    addDays(from, order.delivery.maxDays),
    short,
  )}`;
}

// Orders remember the address they were placed from; everything else falls
// back to CLIENT_URL.
const siteUrl = (order) => order?.links?.site || env.clientUrl;

const isLocal = (url) => /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(url);

// Product photos only work in an inbox when they have a public address.
function absoluteImage(path, order) {
  if (!path) return "";
  if (/^https:\/\//i.test(path)) return path;
  if (!path.startsWith("/")) return "";

  const base = env.serverUrl || order?.links?.api || siteUrl(order);
  if (!base || isLocal(base)) return "";
  return `${base}${path}`;
}

export const trackUrl = (order) =>
  `${siteUrl(order)}/track-order?order=${encodeURIComponent(order.orderNumber)}`;

const customerName = (order) =>
  [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ");

const paymentLine = (order) => {
  if (order.payment?.method === "cod") {
    return order.payment.status === "paid"
      ? "Cash on Delivery — paid"
      : `Cash on Delivery — please keep ${rupees(order.total)} ready`;
  }
  if (order.payment?.status === "refunded") return "Paid online — refunded";
  return "Paid online (UPI / Razorpay)";
};

function addressLines(order) {
  const address = order.shippingAddress || {};
  return [
    address.line1,
    address.line2,
    `${address.city}, ${address.state} – ${address.pincode}`,
  ].filter(Boolean);
}

// ---------- shared layout ----------

function button(label, href) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
    <tr><td bgcolor="${COLORS.yellow}" style="border-radius:8px;">
      <a href="${esc(href)}" style="display:inline-block;padding:15px 30px;font-family:${BODY_FONT};font-size:13px;font-weight:700;letter-spacing:1.6px;color:${COLORS.black};text-decoration:none;text-transform:uppercase;">${esc(label)} &#8599;</a>
    </td></tr>
  </table>`;
}

function layout({ preheader, eyebrow, title, intro, body, footerNote }) {
  const support = [
    env.store.supportEmail &&
      `<a href="mailto:${esc(env.store.supportEmail)}" style="color:${COLORS.yellow};">${esc(env.store.supportEmail)}</a>`,
    env.store.supportPhone && esc(env.store.supportPhone),
  ]
    .filter(Boolean)
    .join(" &nbsp;·&nbsp; ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader || "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.cream}">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
    <tr><td bgcolor="${COLORS.blue}" style="padding:22px 28px;border-radius:14px 14px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-family:${HEADING_FONT};font-size:28px;line-height:1;letter-spacing:-0.5px;color:${COLORS.cream};">GADGET<span style="color:${COLORS.yellow};">É</span><sup style="font-family:${BODY_FONT};font-size:10px;">&reg;</sup></td>
        <td align="right" style="font-family:${BODY_FONT};font-size:10px;font-weight:700;letter-spacing:1.8px;color:${COLORS.cream};text-transform:uppercase;">${esc(eyebrow || "")}</td>
      </tr></table>
    </td></tr>
    <tr><td bgcolor="${COLORS.paper}" style="padding:30px 28px 8px;border-left:1px solid ${COLORS.line};border-right:1px solid ${COLORS.line};">
      <h1 style="margin:0 0 12px;font-family:${HEADING_FONT};font-size:34px;line-height:1.08;font-weight:400;letter-spacing:-0.5px;color:${COLORS.blue};text-transform:uppercase;">${title}</h1>
      <p style="margin:0;font-family:${BODY_FONT};font-size:15px;line-height:1.65;color:${COLORS.black};">${intro}</p>
    </td></tr>
    <tr><td bgcolor="${COLORS.paper}" style="padding:20px 28px 30px;border-left:1px solid ${COLORS.line};border-right:1px solid ${COLORS.line};font-family:${BODY_FONT};color:${COLORS.black};">
      ${body}
    </td></tr>
    <tr><td bgcolor="${COLORS.black}" style="padding:22px 28px;border-radius:0 0 14px 14px;font-family:${BODY_FONT};font-size:12px;line-height:1.7;color:${COLORS.cream};">
      ${footerNote ? `<p style="margin:0 0 10px;">${footerNote}</p>` : ""}
      ${support ? `<p style="margin:0 0 10px;">Need help? ${support}</p>` : ""}
      <p style="margin:0;color:#a9a79c;font-size:11px;letter-spacing:1px;text-transform:uppercase;">${esc(env.store.name)} &mdash; Good tech. Better life.</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

// ---------- order building blocks ----------

function orderChip(order) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
    <tr>
      <td bgcolor="${COLORS.yellow}" style="padding:9px 14px;border-radius:6px;font-family:${BODY_FONT};font-size:13px;font-weight:700;letter-spacing:1.2px;color:${COLORS.black};">ORDER ${esc(order.orderNumber)}</td>
      <td style="padding-left:12px;font-family:${BODY_FONT};font-size:12px;color:${COLORS.muted};">${esc(formatDate(order.placedAt || order.createdAt || new Date()))}</td>
    </tr>
  </table>`;
}

function itemsTable(order) {
  const rows = order.items
    .map((item) => {
      const image = absoluteImage(item.image, order);
      const thumb = image
        ? `<td width="64" style="padding:12px 12px 12px 0;border-bottom:1px solid ${COLORS.line};"><img src="${esc(image)}" width="56" height="56" alt="" style="display:block;width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid ${COLORS.line};"></td>`
        : "";

      return `<tr>
        ${thumb}
        <td style="padding:12px 0;border-bottom:1px solid ${COLORS.line};font-size:14px;line-height:1.5;">
          <strong>${esc(item.name)}</strong><br>
          <span style="color:${COLORS.muted};font-size:12px;">${item.color ? `${esc(item.color)} · ` : ""}Qty ${item.quantity} × ${rupees(item.price)}</span>
        </td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid ${COLORS.line};font-size:14px;font-weight:700;white-space:nowrap;">${rupees(item.price * item.quantity)}</td>
      </tr>`;
    })
    .join("");

  const line = (label, value, style = "") =>
    `<tr><td style="padding:5px 0;font-size:13px;${style}">${label}</td><td align="right" style="padding:5px 0;font-size:13px;white-space:nowrap;${style}">${value}</td></tr>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
    ${line("Subtotal", rupees(order.subtotal))}
    ${order.couponDiscount > 0 ? line(`Coupon ${esc(order.coupon?.code || "")}`, `−${rupees(order.couponDiscount)}`, "color:#1d7a3a;") : ""}
    ${order.discount > 0 ? line(`UPI discount${order.payment?.discountPercent ? ` (${order.payment.discountPercent}%)` : ""}`, `−${rupees(order.discount)}`, "color:#1d7a3a;") : ""}
    ${line("Shipping", order.shippingFee > 0 ? rupees(order.shippingFee) : "FREE")}
    <tr><td style="padding:12px 0 0;border-top:2px solid ${COLORS.black};font-size:17px;font-weight:700;">${order.payment?.method === "cod" && order.payment?.status !== "paid" ? "To pay on delivery" : "Total"}</td>
        <td align="right" style="padding:12px 0 0;border-top:2px solid ${COLORS.black};font-size:17px;font-weight:700;white-space:nowrap;">${rupees(order.total)}</td></tr>
  </table>`;
}

function infoPanel(order, { showDelivery = true } = {}) {
  const eta = showDelivery ? deliveryWindow(order) : "";
  const label = (text) =>
    `<div style="margin:0 0 5px;font-size:10px;font-weight:700;letter-spacing:1.4px;color:${COLORS.muted};text-transform:uppercase;">${text}</div>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.cream}" style="margin-top:22px;border-radius:10px;">
    <tr>
      <td valign="top" width="50%" style="padding:16px 16px 16px 18px;font-size:13px;line-height:1.6;">
        ${label("Ship to")}
        <strong>${esc(customerName(order))}</strong><br>
        ${addressLines(order).map(esc).join("<br>")}<br>
        +91 ${esc(order.customer?.phone)}
      </td>
      <td valign="top" width="50%" style="padding:16px 18px 16px 8px;font-size:13px;line-height:1.6;">
        ${label("Payment")}
        ${esc(paymentLine(order))}
        ${eta ? `<div style="height:12px;line-height:12px;">&nbsp;</div>${label("Estimated delivery")}${esc(eta)}` : ""}
      </td>
    </tr>
  </table>`;
}

function textSummary(order) {
  return [
    `Order ${order.orderNumber}`,
    "",
    ...order.items.map(
      (item) =>
        `${item.name}${item.color ? ` (${item.color})` : ""} x${item.quantity} — ${rupees(item.price * item.quantity)}`,
    ),
    "",
    `Subtotal: ${rupees(order.subtotal)}`,
    order.couponDiscount > 0 ? `Coupon ${order.coupon?.code}: -${rupees(order.couponDiscount)}` : "",
    order.discount > 0 ? `UPI discount: -${rupees(order.discount)}` : "",
    `Shipping: ${order.shippingFee > 0 ? rupees(order.shippingFee) : "FREE"}`,
    `Total: ${rupees(order.total)}`,
    `Payment: ${paymentLine(order)}`,
  ].filter((entry) => entry !== "");
}

// ---------- customer emails ----------

function confirmation(order) {
  const eta = deliveryWindow(order);
  const cod = order.payment.method === "cod";

  const html = layout({
    preheader: `We've got your order ${order.orderNumber}. Total ${rupees(order.total)}.`,
    eyebrow: "Order confirmed",
    title: `Thank you, ${esc(order.customer.firstName)}.`,
    intro: cod
      ? `Your order is confirmed and we're getting it ready. Please keep <strong>${rupees(order.total)}</strong> ready to pay in cash when it arrives.`
      : `Your payment was successful and your order is confirmed. We're getting it ready to ship.`,
    body: `${orderChip(order)}${itemsTable(order)}${infoPanel(order)}
      <div style="height:26px;line-height:26px;">&nbsp;</div>
      ${button("Track your order", trackUrl(order))}`,
    footerNote: "We'll email you again as soon as your order ships.",
  });

  const text = [
    `Thank you, ${order.customer.firstName}! Your order is confirmed.`,
    "",
    ...textSummary(order),
    eta ? `Estimated delivery: ${eta}` : "",
    "",
    "Ship to:",
    customerName(order),
    ...addressLines(order),
    `+91 ${order.customer.phone}`,
    "",
    `Track your order: ${trackUrl(order)}`,
  ]
    .filter((entry, index, list) => entry !== "" || list[index - 1] !== "")
    .join("\n");

  return { subject: `Order confirmed — ${order.orderNumber} | ${env.store.name}`, html, text };
}

function shipped(order) {
  const { courier, awb, trackingUrl } = order.shipping || {};
  const eta = deliveryWindow(order);

  const rows = [
    courier && ["Courier", esc(courier)],
    awb && ["Tracking number", esc(awb)],
    eta && ["Estimated delivery", esc(eta)],
  ].filter(Boolean);

  const details = rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.cream}" style="margin:0 0 22px;border-radius:10px;">
        ${rows
          .map(
            ([label, value]) =>
              `<tr><td style="padding:11px 18px;font-size:11px;font-weight:700;letter-spacing:1.3px;color:${COLORS.muted};text-transform:uppercase;">${label}</td><td align="right" style="padding:11px 18px;font-size:14px;font-weight:700;">${value}</td></tr>`,
          )
          .join("")}
      </table>`
    : "";

  const html = layout({
    preheader: `Order ${order.orderNumber} has shipped${courier ? ` with ${courier}` : ""}.`,
    eyebrow: "Shipped",
    title: "Your order is on its way.",
    intro: `Good news, ${esc(order.customer.firstName)} — order <strong>${esc(order.orderNumber)}</strong> has left our hands and is heading to you.`,
    body: `${details}${button(
      trackingUrl ? "Track with courier" : "Track your order",
      trackingUrl || trackUrl(order),
    )}
      <div style="height:26px;line-height:26px;">&nbsp;</div>
      ${itemsTable(order)}${infoPanel(order, { showDelivery: false })}`,
    footerNote:
      order.payment.method === "cod" && order.payment.status !== "paid"
        ? `Cash on Delivery: please keep ${rupees(order.total)} ready.`
        : "",
  });

  const text = [
    `Your order ${order.orderNumber} is on its way.`,
    "",
    courier ? `Courier: ${courier}` : "",
    awb ? `Tracking number: ${awb}` : "",
    eta ? `Estimated delivery: ${eta}` : "",
    trackingUrl ? `Track with courier: ${trackingUrl}` : "",
    `Order status: ${trackUrl(order)}`,
    "",
    ...textSummary(order),
  ]
    .filter((entry, index, list) => entry !== "" || list[index - 1] !== "")
    .join("\n");

  return { subject: `Your order has shipped — ${order.orderNumber} | ${env.store.name}`, html, text };
}

function outForDelivery(order) {
  const cod = order.payment.method === "cod" && order.payment.status !== "paid";

  const html = layout({
    preheader: `Order ${order.orderNumber} is out for delivery.`,
    eyebrow: "Out for delivery",
    title: "Arriving today.",
    intro: `${esc(order.customer.firstName)}, order <strong>${esc(order.orderNumber)}</strong> is out for delivery.${
      cod ? ` Please keep <strong>${rupees(order.total)}</strong> ready in cash.` : ""
    }`,
    body: `${button("Track your order", order.shipping?.trackingUrl || trackUrl(order))}${infoPanel(order, { showDelivery: false })}`,
  });

  const text = [
    `Order ${order.orderNumber} is out for delivery.`,
    cod ? `Please keep ${rupees(order.total)} ready in cash.` : "",
    `Track: ${order.shipping?.trackingUrl || trackUrl(order)}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: `Out for delivery — ${order.orderNumber} | ${env.store.name}`, html, text };
}

function delivered(order) {
  const html = layout({
    preheader: `Order ${order.orderNumber} has been delivered.`,
    eyebrow: "Delivered",
    title: "Delivered. Enjoy.",
    intro: `${esc(order.customer.firstName)}, order <strong>${esc(order.orderNumber)}</strong> has been delivered. We hope you love it.`,
    body: `${itemsTable(order)}
      <div style="height:26px;line-height:26px;">&nbsp;</div>
      ${button("Shop again", `${siteUrl(order)}/shop`)}`,
    footerNote: "Something not right with your order? Just reply to this email and we'll sort it out.",
  });

  const text = [
    `Order ${order.orderNumber} has been delivered. We hope you love it.`,
    "",
    ...textSummary(order),
    "",
    "Something not right? Just reply to this email.",
  ].join("\n");

  return { subject: `Delivered — ${order.orderNumber} | ${env.store.name}`, html, text };
}

function cancelled(order) {
  const paid = order.payment.method === "upi" && ["paid", "refunded"].includes(order.payment.status);
  const refundLine = paid
    ? order.payment.status === "refunded"
      ? `Your payment of <strong>${rupees(order.total)}</strong> has been refunded. Banks usually take 5–7 working days to show it.`
      : `Your payment of <strong>${rupees(order.total)}</strong> will be refunded to the original payment method within 5–7 working days.`
    : "You have not been charged for this order.";

  const html = layout({
    preheader: `Order ${order.orderNumber} has been cancelled.`,
    eyebrow: "Order cancelled",
    title: "Your order was cancelled.",
    intro: `${esc(order.customer.firstName)}, order <strong>${esc(order.orderNumber)}</strong> has been cancelled.${
      order.cancelReason ? ` Reason: ${esc(order.cancelReason)}.` : ""
    } ${refundLine}`,
    body: `${itemsTable(order)}
      <div style="height:26px;line-height:26px;">&nbsp;</div>
      ${button("Continue shopping", `${siteUrl(order)}/shop`)}`,
    footerNote: "If you didn't expect this, reply to this email and we'll help.",
  });

  const text = [
    `Order ${order.orderNumber} has been cancelled.`,
    order.cancelReason ? `Reason: ${order.cancelReason}` : "",
    refundLine.replace(/<[^>]+>/g, ""),
    "",
    ...textSummary(order),
  ]
    .filter((entry, index, list) => entry !== "" || list[index - 1] !== "")
    .join("\n");

  return { subject: `Order cancelled — ${order.orderNumber} | ${env.store.name}`, html, text };
}

const CUSTOMER_EMAILS = {
  confirmation,
  shipped,
  out_for_delivery: outForDelivery,
  delivered,
  cancelled,
};

export const CUSTOMER_EMAIL_TYPES = Object.keys(CUSTOMER_EMAILS);

export function customerOrderEmail(order, type) {
  const build = CUSTOMER_EMAILS[type];
  if (!build) throw new Error(`Unknown order email type: ${type}`);
  return build(order);
}

// ---------- emails to the store owner ----------

export function newOrderAlert(order) {
  const adminUrl = `${siteUrl(order)}/admin/orders?open=${order._id}`;
  const cod = order.payment.method === "cod";

  const html = layout({
    preheader: `${customerName(order)} · ${rupees(order.total)} · ${cod ? "Cash on Delivery" : "Paid online"}`,
    eyebrow: "New order",
    title: `New order — ${rupees(order.total)}`,
    intro: `<strong>${esc(customerName(order))}</strong> just placed order <strong>${esc(order.orderNumber)}</strong> (${cod ? "Cash on Delivery" : "paid online"}).`,
    body: `${itemsTable(order)}${infoPanel(order)}
      <p style="margin:18px 0 0;font-size:13px;line-height:1.6;">Email: <a href="mailto:${esc(order.customer.email)}" style="color:${COLORS.blue};">${esc(order.customer.email)}</a></p>
      <div style="height:22px;line-height:22px;">&nbsp;</div>
      ${button("Open in admin panel", adminUrl)}`,
  });

  const text = [
    `New order ${order.orderNumber} — ${rupees(order.total)} (${cod ? "Cash on Delivery" : "paid online"})`,
    "",
    `${customerName(order)} · +91 ${order.customer.phone} · ${order.customer.email}`,
    ...addressLines(order),
    "",
    ...textSummary(order),
    "",
    `Open in admin panel: ${adminUrl}`,
  ].join("\n");

  return {
    subject: `New order ${order.orderNumber} — ${rupees(order.total)} (${cod ? "COD" : "Paid"})`,
    html,
    text,
  };
}

export function contactAlert(message) {
  const html = layout({
    preheader: `${message.name}: ${message.message.slice(0, 90)}`,
    eyebrow: "Customer message",
    title: "New message from the website.",
    intro: `<strong>${esc(message.name)}</strong> wrote to you from the Customer Care page.`,
    body: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.cream}" style="border-radius:10px;">
        <tr><td style="padding:16px 18px;font-size:13px;line-height:1.7;">
          <strong>Topic:</strong> ${esc(message.topic)}<br>
          <strong>Email:</strong> <a href="mailto:${esc(message.email)}" style="color:${COLORS.blue};">${esc(message.email)}</a><br>
          ${message.phone ? `<strong>Phone:</strong> ${esc(message.phone)}<br>` : ""}
          ${message.orderNumber ? `<strong>Order:</strong> ${esc(message.orderNumber)}<br>` : ""}
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:15px;line-height:1.7;white-space:pre-wrap;">${esc(message.message)}</p>`,
    footerNote: "Reply to this email to answer the customer directly.",
  });

  const text = [
    `New message from ${message.name} <${message.email}>`,
    `Topic: ${message.topic}`,
    message.phone ? `Phone: ${message.phone}` : "",
    message.orderNumber ? `Order: ${message.orderNumber}` : "",
    "",
    message.message,
  ]
    .filter((entry, index, list) => entry !== "" || list[index - 1] !== "")
    .join("\n");

  return { subject: `Customer message: ${message.topic} — ${message.name}`, html, text };
}

export function testEmail() {
  const html = layout({
    preheader: "Your store can send email.",
    eyebrow: "Test email",
    title: "Email is working.",
    intro: `If you can read this, <strong>${esc(env.store.name)}</strong> is ready to send order confirmations to your customers.`,
    body: `<p style="margin:0;font-size:13px;line-height:1.7;color:${COLORS.muted};">Sent from the admin panel on ${esc(
      formatDate(new Date(), { dateStyle: "medium", timeStyle: "short" }),
    )}.</p>`,
  });

  return {
    subject: `${env.store.name} — test email`,
    html,
    text: `Email is working. ${env.store.name} is ready to send order confirmations.`,
  };
}
