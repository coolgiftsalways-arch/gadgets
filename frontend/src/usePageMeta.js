// Sets the browser-tab title and the page description for the current page.
import { useEffect } from "react";

export const SITE_NAME = "GADGETÉ by Cool Gadgets Hub";
export const DEFAULT_DESCRIPTION =
  "Cool gadgets & gifts in India — glowing lamps, colour-changing mugs, bike lights and desk décor. Cash on Delivery, free shipping and extra off with UPI.";

export function setPageMeta(title, description) {
  document.title = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} – Cool Gadgets & Gifts Online in India`;
  const tag = document.querySelector('meta[name="description"]');
  if (tag) tag.setAttribute("content", description || DEFAULT_DESCRIPTION);
}

export function usePageMeta(title, description) {
  useEffect(() => {
    setPageMeta(title, description);
  }, [title, description]);
}
