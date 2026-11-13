// Adds the 20 starter products the first time the server starts on an empty
// database. Run "npm run seed" to add any that are missing later.
import Product from "../models/Product.js";
import Meta from "../models/Meta.js";

const ICON = { "PERSONAL AUDIO": "headphones", "POWER ESSENTIALS": "battery", "CREATIVE GEAR": "camera", "SMART ESSENTIALS": "watch" };
const CATEGORY = { "PERSONAL AUDIO": "Audio", "POWER ESSENTIALS": "Power", "CREATIVE GEAR": "Camera", "SMART ESSENTIALS": "Wearables" };

const raw = [
  ["air-pods-pro","AIR PODS PRO","PERSONAL AUDIO",3499,4999,"SOUND WITHOUT LIMITS","Premium sound. Zero distractions."],
  ["power-core","POWER CORE","POWER ESSENTIALS",1999,2499,"POWER YOUR WORLD","Power that keeps you moving."],
  ["digital-camera","DIGITAL CAMERA","CREATIVE GEAR",8999,10999,"CAPTURE EVERYTHING","Every moment deserves to be captured."],
  ["smart-watch","SMART WATCH","SMART ESSENTIALS",5999,7499,"STAY CONNECTED","Stay connected. Stay ahead."],
  ["studio-headphones","STUDIO HEADPHONES","PERSONAL AUDIO",4499,5999,"HEAR EVERY DETAIL","Experience every detail."],
  ["fast-charger","FAST CHARGER","POWER ESSENTIALS",1299,1699,"CHARGE FASTER","Fast charging. Less waiting."],
  ["action-camera","ACTION CAMERA","CREATIVE GEAR",7499,9499,"ADVENTURE WITHOUT LIMITS","Adventure without limits."],
  ["fitness-watch","FITNESS WATCH","SMART ESSENTIALS",3999,4999,"MOVE WITH PURPOSE","Track your everyday movement."],
  ["wireless-buds","WIRELESS BUDS","PERSONAL AUDIO",2499,3299,"FREEDOM IN EVERY BEAT","Freedom in every beat."],
  ["power-bank","POWER BANK","POWER ESSENTIALS",1799,2299,"POWER ON THE GO","Power wherever you go."],
  ["mini-camera","MINI CAMERA","CREATIVE GEAR",5499,6999,"SMALL DESIGN. BIG MOMENTS","Small design. Big moments."],
  ["smart-band","SMART BAND","SMART ESSENTIALS",2299,2999,"YOUR DAILY COMPANION","Your daily health companion."],
  ["bass-headphones","BASS HEADPHONES","PERSONAL AUDIO",3299,4299,"FEEL THE RHYTHM","Feel the rhythm."],
  ["usb-c-hub","USB-C HUB","POWER ESSENTIALS",1499,1999,"CONNECT MORE","More connections. More possibilities."],
  ["pocket-camera","POCKET CAMERA","CREATIVE GEAR",9999,12499,"YOUR WORLD. YOUR VIEW","Your world, your perspective."],
  ["active-watch","ACTIVE WATCH","SMART ESSENTIALS",6999,8499,"MADE TO MOVE","Made for your active lifestyle."],
  ["sound-pods","SOUND PODS","PERSONAL AUDIO",1899,2499,"COMPACT SOUND","Compact sound. Big energy."],
  ["wireless-charger","WIRELESS CHARGER","POWER ESSENTIALS",1599,2099,"SIMPLY PLACE AND POWER","Simply place and power up."],
  ["creator-camera","CREATOR CAMERA","CREATIVE GEAR",11999,14999,"CREATE SOMETHING UNFORGETTABLE","Create something unforgettable."],
  ["digital-watch","DIGITAL WATCH","SMART ESSENTIALS",4999,6499,"A SMARTER WAY TO LIVE","A smarter way to live."],
];

export const STARTER_PRODUCTS = raw.map(([slug, name, cat, price, compareAtPrice, label, shortDescription], i) => ({
  slug, name, price, compareAtPrice, label, shortDescription,
  sku: `G-${String(i + 1).padStart(2, "0")}`,
  category: CATEGORY[cat], icon: ICON[cat],
  description: shortDescription, stock: 25, sortOrder: i + 1, featured: i < 3,
}));

export async function seedProducts() {
  let added = 0;
  for (const p of STARTER_PRODUCTS) {
    const r = await Product.updateOne({ slug: p.slug }, { $setOnInsert: p }, { upsert: true });
    added += r.upsertedCount;
  }
  return added;
}

export async function seedIfEmpty() {
  if (await Meta.exists({ key: "starterProductsSeeded" })) return;
  if ((await Product.countDocuments()) === 0) {
    console.log(`Added ${await seedProducts()} starter products.`);
  }
  await Meta.create({ key: "starterProductsSeeded", value: true });
}
