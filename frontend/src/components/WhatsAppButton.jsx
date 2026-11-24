import { useLocation } from "react-router-dom";
import { BUSINESS } from "../data/business";
import "../Style/WhatsAppButton.css";

// Floating "chat on WhatsApp" button on every shop page (not in the admin panel).
// The message is pre-filled with the page the shopper is looking at.
export default function WhatsAppButton() {
  const { pathname } = useLocation();
  if (!BUSINESS.whatsapp || pathname.startsWith("/admin")) return null;

  const onProduct = pathname.startsWith("/product/");
  const message = onProduct
    ? `Hi ${BUSINESS.tradeName}! I have a question about this product: https://${BUSINESS.website}${pathname}`
    : `Hi ${BUSINESS.tradeName}! I have a question.`;
  const href = `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(message)}`;

  return (
    <a className="wa-float" href={href} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.04 3C8.86 3 3.03 8.82 3.03 16c0 2.29.6 4.53 1.74 6.5L3 29l6.68-1.75A12.95 12.95 0 0 0 16.04 29C23.2 29 29.03 23.18 29.03 16S23.2 3 16.04 3Zm0 23.62c-1.95 0-3.86-.52-5.53-1.51l-.4-.24-3.96 1.04 1.06-3.86-.26-.4A10.6 10.6 0 0 1 5.4 16c0-5.86 4.77-10.63 10.64-10.63 5.86 0 10.63 4.77 10.63 10.63 0 5.87-4.77 10.62-10.63 10.62Zm5.83-7.96c-.32-.16-1.89-.93-2.18-1.04-.29-.1-.5-.16-.72.16-.21.32-.82 1.04-1 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66 0 1.57 1.14 3.09 1.3 3.3.16.21 2.25 3.43 5.44 4.81.76.33 1.35.52 1.81.67.76.24 1.46.21 2 .13.61-.09 1.89-.77 2.15-1.52.27-.74.27-1.38.19-1.52-.08-.13-.29-.21-.61-.37Z"
        />
      </svg>
      <span>Chat with us</span>
    </a>
  );
}
