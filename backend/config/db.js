import mongoose from "mongoose";

// Unknown fields in a query filter are dropped instead of matching everything.
mongoose.set("strictQuery", true);

// Turns the most common MongoDB Atlas connection failures into plain advice.
function explain(error) {
  const message = String(error?.message || error);

  if (/bad auth|authentication failed/i.test(message)) {
    return "The database username or password in MONGO_URI is wrong. In Atlas open Database Access, reset the user's password and paste it again (special characters must be URL-encoded).";
  }

  if (/whitelist|not allowed to access|IP that isn't|ip address/i.test(message)) {
    return "Atlas is blocking this server's IP address. In Atlas open Network Access and add the IP (or 0.0.0.0/0 to allow access from anywhere).";
  }

  if (/querySrv|ENOTFOUND|ETIMEOUT|EREFUSED|ECONNREFUSED.*_mongodb/i.test(message)) {
    return "The Atlas address could not be looked up. Check the cluster name in MONGO_URI; if it is correct, add FORCE_PUBLIC_DNS=true to backend/.env and try again.";
  }

  if (/Invalid scheme|must start with|URI malformed|Invalid connection string/i.test(message)) {
    return 'MONGO_URI is not a valid connection string. It should start with "mongodb+srv://" (Atlas) or "mongodb://".';
  }

  return "";
}

export async function connectDB(uri) {
  if (!uri) throw new Error("MONGO_URI is not set");

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  } catch (error) {
    const hint = explain(error);
    if (hint) error.hint = hint;
    throw error;
  }

  const { host, name } = mongoose.connection;
  console.log(`MongoDB connected: ${host}/${name}`);

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB error:", error.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected — retrying automatically.");
  });

  return mongoose.connection;
}

export const isDbReady = () => mongoose.connection.readyState === 1;
