// Turns anything that goes wrong inside a route into a clean JSON answer:
//   { "message": "Something a person can read" }
// Details of unexpected errors are logged on the server, never sent out.
import mongoose from "mongoose";

export function notFoundHandler(req, res) {
  res.status(404).json({ message: "Not found" });
}

function firstValidationMessage(error) {
  const first = Object.values(error.errors || {})[0];
  if (!first) return "Please check the details you entered.";
  if (first instanceof mongoose.Error.CastError) return "Please check the details you entered.";
  return first.message;
}

// Express recognises an error handler by its four arguments.
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return;

  // Errors we raised on purpose (HttpError).
  if (error?.expose && error.status) {
    const { status, message, name, expose, stack, ...extra } = error;
    return res.status(status).json({ message, ...extra });
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ message: firstValidationMessage(error) });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: "Please check the details you entered." });
  }

  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "value";
    return res.status(409).json({ message: `That ${field} is already in use.` });
  }

  // Problems with the request body itself.
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "The request could not be read." });
  }
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ message: "That request is too large." });
  }

  if (error?.name === "CorsError") {
    return res.status(403).json({ message: "This website is not allowed to use the API." });
  }

  console.error(`[${req.method} ${req.originalUrl}]`, error);
  res.status(500).json({ message: "Something went wrong on our side. Please try again." });
}
