// Real products for the home page sections, loaded once and shared.
//   heroPicks     – 3 cards in "Our products" (featured products first)
//   trendingPicks – 3 more, different ones, for "Trending now"
const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

let request = null;

export function mediaUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (/^https?:\/\//i.test(API_URL)) return `${new URL(API_URL).origin}${path}`;
  return path;
}

export const formatRupees = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const toCard = (product, index) => ({
  id: product.slug,
  slug: product.slug,
  number: String(index + 1).padStart(2, "0"),
  name: product.name,
  description: product.shortDescription || product.label || product.description || "",
  label: product.label || "",
  category: String(product.category || "").toUpperCase(),
  price: product.price,
  compareAtPrice: product.compareAtPrice || 0,
  image: mediaUrl(product.images?.[0] || ""),
  video: product.videos?.[0] || "",
  inStock: product.inStock !== false,
});

export function loadHomeProducts() {
  if (!request) {
    request = fetch(`${API_URL}/products`)
      .then((response) => (response.ok ? response.json() : { products: [] }))
      .then((data) => {
        const all = Array.isArray(data.products) ? data.products : [];
        // Featured first, then products that have a photo or video.
        const ranked = [...all].sort(
          (a, b) =>
            Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
            Number(Boolean(b.images?.length || b.videos?.length)) -
              Number(Boolean(a.images?.length || a.videos?.length)),
        );
        const heroPicks = ranked.slice(0, 3).map(toCard);
        const trendingPicks = ranked.slice(3, 6).map(toCard);
        return { heroPicks, trendingPicks };
      })
      .catch(() => {
        request = null; // try again next time
        return { heroPicks: [], trendingPicks: [] };
      });
  }
  return request;
}
