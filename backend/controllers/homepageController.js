// Homepage video section: a headline plus a row of videos shown on the
// front page. Managed from Admin → Homepage. Stored in the Meta collection.
import Meta from "../models/Meta.js";
import { badRequest } from "../utils/httpError.js";
import { boolean, line } from "../utils/validate.js";

const KEY = "homepage";
const MAX_VIDEOS = 12;

const DEFAULTS = {
  enabled: true,
  eyebrow: "SEE IT IN ACTION",
  title: "WATCH. WANT. ORDER.",
  subtitle: "Real products, in motion.",
  videos: [], // [{ url, caption, productSlug }]
};

async function read() {
  const doc = await Meta.findOne({ key: KEY }).lean();
  return { ...DEFAULTS, ...(doc?.value || {}) };
}

// GET /api/store/homepage — public
export async function getHomepage(req, res) {
  const value = await read();
  res.set("Cache-Control", "public, max-age=30");
  res.json(value.enabled ? value : { ...value, videos: [] });
}

// GET /api/admin/homepage
export async function getHomepageAdmin(req, res) {
  res.set("Cache-Control", "no-store");
  res.json(await read());
}

// PUT /api/admin/homepage  { enabled, eyebrow, title, subtitle, videos: [{ url, caption, productSlug }] }
export async function saveHomepage(req, res) {
  const body = req.body || {};
  const current = await read();

  const videos = body.videos === undefined ? current.videos : body.videos;
  if (!Array.isArray(videos)) throw badRequest("Videos must be a list.");
  if (videos.length > MAX_VIDEOS) throw badRequest(`Up to ${MAX_VIDEOS} homepage videos.`);

  const cleanVideos = videos.map((video) => {
    const url = line(video?.url, 600);
    if (!/^https:\/\/[^\s"'<>]+$/i.test(url)) throw badRequest("Each video must be an uploaded https:// address.");
    return {
      url,
      caption: line(video?.caption, 80),
      productSlug: line(video?.productSlug, 80).toLowerCase(),
    };
  });

  const value = {
    enabled: body.enabled === undefined ? current.enabled : boolean(body.enabled, true),
    eyebrow: body.eyebrow === undefined ? current.eyebrow : line(body.eyebrow, 60),
    title: body.title === undefined ? current.title : line(body.title, 80),
    subtitle: body.subtitle === undefined ? current.subtitle : line(body.subtitle, 160),
    videos: cleanVideos,
  };

  await Meta.updateOne({ key: KEY }, { $set: { value } }, { upsert: true });
  res.json(value);
}
