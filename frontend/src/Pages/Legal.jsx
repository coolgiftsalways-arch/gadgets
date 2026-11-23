import { useEffect } from "react";
import { Link } from "react-router-dom";
import "../Style/Legal.css";

// ==========================================
// YOUR BUSINESS DETAILS — edit these
// ==========================================
export const BUSINESS = {
  brand: "GADGETÉ",
  tradeName: "Cool Gadgets Hub",
  website: "coolgadgetshub.in",
  email: "info@coolgadgetshub.in",
  phone: "+91 70392 35169",
  whatsapp: "917039235169",
  instagram: "https://www.instagram.com/coolgadgetshub.in/",
  // Registered business address (leave "" to hide it).
  address: "",
  // Name of your Grievance Officer (required for Indian e-commerce sites).
  grievanceOfficer: "",
  // Days after delivery a customer has to report a damaged / defective / wrong item.
  reportDays: 7,
  // City whose courts handle disputes (leave "" to just say "India").
  jurisdiction: "",
  updated: "23 November 2026",
};

const mail = <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>;
const whatsapp = <a href={`https://wa.me/${BUSINESS.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp {BUSINESS.phone}</a>;
const courts = BUSINESS.jurisdiction ? `the courts at ${BUSINESS.jurisdiction}, India` : "the courts of India";

function LegalLayout({ eyebrow, title, intro, sections }) {
  useEffect(() => {
    document.title = `${title} — ${BUSINESS.brand}`;
    // Jump to a section when the link has one, e.g. /terms#returns
    const id = window.location.hash.slice(1);
    if (!id) return undefined;
    const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 400);
    return () => window.clearTimeout(timer);
  }, [title]);

  return (
    <section className="legal-page">
      <header className="legal-hero">
        <span className="legal-eyebrow">{eyebrow}</span>
        <h1>{title}<span>.</span></h1>
        <p className="legal-updated">Last updated: {BUSINESS.updated}</p>
        <p className="legal-intro">{intro}</p>
      </header>

      <div className="legal-body">
        <nav className="legal-toc" aria-label="On this page">
          <span className="legal-eyebrow">ON THIS PAGE</span>
          <ol>
            {sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span> {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="legal-content">
          {sections.map((section, index) => (
            <article className="legal-section" id={section.id} key={section.id}>
              <h2>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {section.title}
              </h2>
              {section.body}
            </article>
          ))}

          <aside className="legal-contact">
            <h2>Questions?</h2>
            <p>
              Write to {mail} or message us on {whatsapp}. You can also reach us through the{" "}
              <Link to="/contact">Contact page</Link>.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}

// ==========================================
// PRIVACY POLICY
// ==========================================

export function PrivacyPolicy() {
  const sections = [
    {
      id: "who",
      title: "Who we are",
      body: (
        <p>
          {BUSINESS.brand} ({BUSINESS.tradeName}) runs the online store at {BUSINESS.website}. This policy explains what
          personal information we collect when you visit or shop with us, how we use it, and the choices you have.
          {BUSINESS.address && <> Our address is {BUSINESS.address}.</>}
        </p>
      ),
    },
    {
      id: "collect",
      title: "Information we collect",
      body: (
        <>
          <p>We only collect what we need to run the store:</p>
          <ul>
            <li><strong>Order details</strong> — your name, email address, mobile number, delivery address, the products you buy, the amount paid and your payment method (Cash on Delivery or UPI / online).</li>
            <li><strong>Payment confirmation</strong> — for online payments we receive a payment reference and status from our payment partner. We never see or store your card number, UPI PIN or bank login.</li>
            <li><strong>Messages</strong> — what you send us through the contact form, email or WhatsApp.</li>
            <li><strong>Newsletter</strong> — your email address, if you subscribe.</li>
            <li><strong>Device and usage data</strong> — pages visited, device and browser type, approximate location and similar information collected through cookies and analytics tools (see below).</li>
          </ul>
        </>
      ),
    },
    {
      id: "use",
      title: "How we use it",
      body: (
        <ul>
          <li>To process, pack, ship and deliver your order, and to collect Cash on Delivery payments.</li>
          <li>To send order emails — confirmation, shipping, out-for-delivery, delivery and cancellation updates.</li>
          <li>To contact you about your order, for example to confirm a COD order or a delivery address.</li>
          <li>To handle returns, replacements, refunds and support requests.</li>
          <li>To send offers and new-drop emails, only if you subscribed. You can unsubscribe at any time.</li>
          <li>To understand how the site is used, improve it, and measure our ads.</li>
          <li>To prevent fraud and fake orders, and to meet tax, accounting and other legal requirements.</li>
        </ul>
      ),
    },
    {
      id: "share",
      title: "Who we share it with",
      body: (
        <>
          <p>We do not sell your personal information. We share it only with service providers who help us run the store, and only what they need:</p>
          <ul>
            <li><strong>Payment partner</strong> (Razorpay) — to take online / UPI payments securely.</li>
            <li><strong>Shipping partners</strong> (Shipway and the courier companies it works with) — your name, phone number and delivery address, so your parcel can be delivered and tracked.</li>
            <li><strong>Hosting, database and email providers</strong> — to store orders and send you order emails.</li>
            <li><strong>Analytics and advertising</strong> (Google, Meta) — usage data collected by cookies, as described below.</li>
            <li><strong>Authorities</strong> — when the law requires it, or to protect our rights or prevent fraud.</li>
          </ul>
        </>
      ),
    },
    {
      id: "cookies",
      title: "Cookies and similar tools",
      body: (
        <>
          <p>
            We use Google Tag Manager / Google Analytics and the Meta (Facebook) Pixel. These set cookies to count visits,
            understand which pages and products are popular, and show you relevant ads on Google, Facebook and Instagram.
          </p>
          <p>
            Your cart is saved in your browser's local storage so it is still there when you come back. You can clear
            cookies and site data, or block them, in your browser settings — the store will still work, but your cart may be emptied.
          </p>
        </>
      ),
    },
    {
      id: "keep",
      title: "How long we keep it",
      body: (
        <p>
          We keep order records for as long as needed to deliver your order, handle returns and warranty claims, and meet
          tax and accounting laws. Newsletter emails are kept until you unsubscribe. Unpaid checkouts
          that were never completed may be deleted sooner.
        </p>
      ),
    },
    {
      id: "security",
      title: "Keeping it safe",
      body: (
        <p>
          The site uses HTTPS encryption, payments are handled by a PCI-DSS compliant payment partner, and access to order
          data is limited to our team. No system is perfectly secure, but we take reasonable steps to protect your information.
        </p>
      ),
    },
    {
      id: "rights",
      title: "Your choices and rights",
      body: (
        <>
          <p>You can ask us to:</p>
          <ul>
            <li>show you the personal information we hold about you;</li>
            <li>correct anything that is wrong or out of date;</li>
            <li>delete your information, unless we must keep it for legal, tax or order reasons;</li>
            <li>stop sending you marketing emails.</li>
          </ul>
          <p>Email {mail} from the address you used with us and we will respond within 30 days.</p>
        </>
      ),
    },
    {
      id: "children",
      title: "Children",
      body: <p>Our store is meant for adults. If you are under 18, please shop with the help of a parent or guardian.</p>,
    },
    {
      id: "changes",
      title: "Changes to this policy",
      body: <p>We may update this policy from time to time. The latest version is always on this page, with the date it was last updated at the top.</p>,
    },
    {
      id: "grievance",
      title: "Grievance Officer",
      body: (
        <p>
          In line with the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020, you can
          raise any concern about your data with our Grievance Officer{BUSINESS.grievanceOfficer && <>, <strong>{BUSINESS.grievanceOfficer}</strong></>},
          at {mail} or {BUSINESS.phone}. We acknowledge complaints within 48 hours and aim to resolve them within one month.
        </p>
      ),
    },
  ];

  return (
    <LegalLayout
      eyebrow="LEGAL / PRIVACY"
      title="Privacy Policy"
      intro="Your trust matters. Here is exactly what we collect, why, and who we share it with — in plain language."
      sections={sections}
    />
  );
}

// ==========================================
// TERMS & CONDITIONS
// ==========================================

export function Terms() {
  const sections = [
    {
      id: "about",
      title: "About these terms",
      body: (
        <p>
          These terms apply when you use {BUSINESS.website} or buy from {BUSINESS.brand} ({BUSINESS.tradeName}). By placing
          an order you agree to them, together with our <Link to="/privacy-policy">Privacy Policy</Link>. If you do not agree,
          please do not use the site.
          {BUSINESS.address && <> Our address is {BUSINESS.address}.</>}
        </p>
      ),
    },
    {
      id: "products",
      title: "Products and prices",
      body: (
        <ul>
          <li>All prices are in Indian Rupees (₹) and include GST unless stated otherwise.</li>
          <li>Shipping charges, if any, are shown at checkout before you place the order.</li>
          <li>We try to show products, colours and sizes accurately, but photos are for illustration and actual items may vary slightly.</li>
          <li>Stock is limited. If an item becomes unavailable after you order, we will tell you and cancel or refund that item.</li>
          <li>If a product is listed at a clearly wrong price because of an error, we may cancel the order and refund any amount paid.</li>
        </ul>
      ),
    },
    {
      id: "orders",
      title: "Placing an order",
      body: (
        <ul>
          <li>Please give a correct name, mobile number and full delivery address (house / flat number, street, area, city, PIN code). We are not responsible for delays or failed deliveries caused by incomplete or wrong details.</li>
          <li>You will receive an order number and a confirmation email. An order is accepted when we confirm and ship it.</li>
          <li>We may call or message you to confirm a Cash on Delivery order before it ships. We may cancel orders we cannot confirm, or that look fraudulent or abusive.</li>
          <li>Coupons and discounts are subject to their own conditions, cannot be exchanged for cash, and may be withdrawn at any time.</li>
        </ul>
      ),
    },
    {
      id: "payment",
      title: "Payment",
      body: (
        <ul>
          <li><strong>Online / UPI</strong> — payments are processed securely by Razorpay. If payment is not completed within the time shown, the order is released.</li>
          <li><strong>Cash on Delivery</strong> — pay the courier the order amount in cash at delivery. Please keep the exact amount ready.</li>
          <li>Repeatedly refusing Cash on Delivery orders may lead to COD being turned off for your number or address.</li>
        </ul>
      ),
    },
    {
      id: "shipping",
      title: "Shipping and delivery",
      body: (
        <ul>
          <li>We ship across India through our shipping partners. The expected delivery time is shown at checkout and in your confirmation email; it is an estimate, not a guarantee.</li>
          <li>Once your order ships you will get a tracking number by email, and you can follow it on the <Link to="/track-order">Track Order</Link> page.</li>
          <li>Delays caused by couriers, weather, holidays or other events outside our control may happen. We will help you follow up with the courier.</li>
          <li>Please check the parcel at delivery. If the outer box is open, torn or damaged, note it with the delivery person or refuse the parcel and contact us.</li>
        </ul>
      ),
    },
    {
      id: "cancellations",
      title: "Cancellations",
      body: (
        <ul>
          <li>You can cancel free of charge before your order is shipped — message us on {whatsapp} or email {mail} with your order number.</li>
          <li>Once shipped, an order cannot be cancelled; you may refuse the delivery instead. For prepaid orders, the refund is made after the parcel returns to us.</li>
          <li>Online payments for cancelled orders are refunded to the original payment method within 5–7 working days.</li>
        </ul>
      ),
    },
    {
      id: "returns",
      title: "Returns, replacements and refunds",
      body: (
        <>
          <p>
            If your item arrives <strong>damaged, defective, or is not what you ordered</strong>, tell us within{" "}
            <strong>{BUSINESS.reportDays} days of delivery</strong> on {whatsapp} or at {mail}, with your order number and clear photos.
            A continuous <strong>unboxing video</strong> (from the sealed parcel onwards) is required for damage and missing-item claims.
          </p>
          <p>Once we verify the claim, we will arrange a <strong>replacement</strong>, or a <strong>refund</strong> if a replacement is not available.</p>
          <ul>
            <li>The item must be unused, with its original box, accessories, manuals and tags.</li>
            <li>We do not accept returns for change of mind, unless the product page says otherwise.</li>
            <li>Damage caused by misuse, accidents, water, wrong charging or unauthorised repair is not covered.</li>
            <li>Approved refunds go to the original payment method within 5–7 working days. Cash on Delivery orders are refunded by UPI or bank transfer to an account you share with us.</li>
          </ul>
        </>
      ),
    },
    {
      id: "warranty",
      title: "Warranty",
      body: (
        <p>
          Where a product comes with a warranty, the period and terms are shown on its product page or in the box. To claim it,
          contact us with your order number and a description or video of the problem. Warranty covers manufacturing defects
          only, not physical damage, liquid damage, normal wear, or misuse.
        </p>
      ),
    },
    {
      id: "use",
      title: "Using the site",
      body: (
        <ul>
          <li>All content on this site — text, photos, videos, logos and design — belongs to {BUSINESS.brand} or its licensors. Please do not copy or reuse it without permission.</li>
          <li>Do not misuse the site: no fake orders, scraping, attempts to break security, or anything unlawful.</li>
          <li>Links to other sites (for example payment or courier tracking pages) are provided for convenience; we are not responsible for their content.</li>
        </ul>
      ),
    },
    {
      id: "liability",
      title: "Limitation of liability",
      body: (
        <p>
          Products should be used as described in their instructions. To the extent allowed by law, our total liability for any
          claim relating to an order is limited to the amount you paid for that order. We are not liable for indirect or
          consequential losses. Nothing in these terms limits your rights under the Consumer Protection Act, 2019.
        </p>
      ),
    },
    {
      id: "law",
      title: "Governing law and disputes",
      body: (
        <p>
          These terms are governed by the laws of India. Please contact us first — most issues are sorted out quickly. Any
          dispute that cannot be resolved will be subject to the jurisdiction of {courts}.
        </p>
      ),
    },
    {
      id: "grievance",
      title: "Grievance Officer",
      body: (
        <p>
          Under the Consumer Protection (E-Commerce) Rules, 2020, you can raise a complaint with our Grievance Officer
          {BUSINESS.grievanceOfficer && <>, <strong>{BUSINESS.grievanceOfficer}</strong>,</>} at {mail} or {BUSINESS.phone}.
          We acknowledge complaints within 48 hours and aim to resolve them within one month.
        </p>
      ),
    },
    {
      id: "changes",
      title: "Changes to these terms",
      body: <p>We may update these terms from time to time. The version on this page on the day you place your order applies to that order.</p>,
    },
  ];

  return (
    <LegalLayout
      eyebrow="LEGAL / TERMS"
      title="Terms & Conditions"
      intro="The rules for shopping with us — orders, payment, delivery, cancellations, returns and warranty."
      sections={sections}
    />
  );
}
