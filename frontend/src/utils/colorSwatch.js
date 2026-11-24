// Turns a colour name typed in the admin panel ("red", "Rose Gold", "multicolour")
// into a swatch the shopper can actually see.

const NAMED = {
  black: "#10100e",
  midnight: "#10100e",
  white: "#ffffff",
  ivory: "#fffff0",
  cream: "#f4edda",
  beige: "#e8dfc8",
  silver: "#c5c8c8",
  grey: "#8c8c8c",
  gray: "#8c8c8c",
  "space grey": "#5b5b5f",
  "space gray": "#5b5b5f",
  red: "#d62828",
  maroon: "#7a1f2b",
  pink: "#f4a3c0",
  "rose gold": "#e0b0a0",
  gold: "#d4af37",
  yellow: "#eff04c",
  orange: "#f28c28",
  brown: "#7b4b2a",
  wood: "#a0703c",
  green: "#2e9e5b",
  olive: "#708238",
  mint: "#98e2c6",
  teal: "#1d8a8a",
  blue: "#164e74",
  "sky blue": "#7cc4f0",
  "light blue": "#9fd3f5",
  navy: "#1b2a4a",
  purple: "#7b3fbf",
  lavender: "#c7b6ea",
  clear: "rgba(255,255,255,0.35)",
  transparent: "rgba(255,255,255,0.35)",
};

const RAINBOW =
  "conic-gradient(#d62828, #f28c28, #eff04c, #2e9e5b, #4cc9f0, #7b3fbf, #d62828)";

function resolve(name) {
  const key = String(name || "").trim().toLowerCase();
  if (!key) return null;
  if (/^(multi|rainbow|rgb|assorted|mixed)/.test(key)) return { background: RAINBOW, dark: false };
  if (NAMED[key]) return { background: NAMED[key] };
  // Any other real CSS colour name ("coral", "#ff00aa") works as typed.
  if (typeof CSS !== "undefined" && CSS.supports?.("color", key)) return { background: key };
  // "Matte Black", "Deep Blue" → use the last word we know.
  const known = key.split(/[\s/-]+/).reverse().find((word) => NAMED[word]);
  return known ? { background: NAMED[known] } : null;
}

// Rough brightness of a hex colour, so the tick mark stays readable.
function isDark(color) {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)?.[1];
  if (!hex) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

/** Inline style for a colour swatch; empty object means "use the default swatch look". */
export function swatchStyle(name) {
  const found = resolve(name);
  if (!found) return {};
  const dark = found.dark ?? isDark(found.background);
  return {
    background: found.background,
    color: dark ? "#eff04c" : "#10100e",
  };
}
