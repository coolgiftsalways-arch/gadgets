// Starts the store. Written without top-level await so hosts that load the
// entry file with require() (Hostinger / LiteSpeed) can start it too.
import mongoose from "mongoose";
import { env, checkEnv } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { createApp } from "./app.js";
import { startPaymentSweep } from "./services/paymentSweep.js";
import { backgroundIdle } from "./services/background.js";
import { seedIfEmpty } from "./seed/seedProducts.js";

// Some hosts hand over a socket path in PORT instead of a port number.
const rawPort = String(process.env.PORT || "");
const listenOn = rawPort && !/^\d+$/.test(rawPort) ? rawPort : env.port;

async function main() {
  const { errors, warnings } = checkEnv();
  warnings.forEach((warning) => console.warn("⚠", warning));
  if (errors.length) {
    errors.forEach((error) => console.error("✖", error));
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

  const server = createApp().listen(listenOn, () => console.log(`Server running on ${listenOn}`));
  const stopSweep = startPaymentSweep();

  const shutdown = async () => {
    stopSweep();
    server.close();
    await backgroundIdle();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
