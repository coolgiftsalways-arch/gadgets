import mongoose from "mongoose";
import { env, checkEnv } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { createApp } from "./app.js";
import { startPaymentSweep } from "./services/paymentSweep.js";
import { backgroundIdle } from "./services/background.js";
import { seedIfEmpty } from "./seed/seedProducts.js";

const { errors, warnings } = checkEnv();
warnings.forEach((w) => console.warn("⚠", w));
if (errors.length) {
  errors.forEach((e) => console.error("✖", e));
  process.exit(1);
}

try {
  await connectDB(env.mongoUri);
} catch (error) {
  console.error("MongoDB connection failed:", error.message);
  if (error.hint) console.error("→", error.hint);
  process.exit(1);
}

await seedIfEmpty();

const server = createApp().listen(env.port, () =>
  console.log(`Server running on http://localhost:${env.port}`),
);
const stopSweep = startPaymentSweep();

async function shutdown() {
  stopSweep();
  server.close();
  await backgroundIdle();
  await mongoose.disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
