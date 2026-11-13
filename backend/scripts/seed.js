import mongoose from "mongoose";
import { env } from "../config/env.js";
import { connectDB } from "../config/db.js";
import { seedProducts } from "../seed/seedProducts.js";

await connectDB(env.mongoUri);
console.log(`Added ${await seedProducts()} products (existing ones untouched).`);
await mongoose.disconnect();
