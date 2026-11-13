// Limits how often one visitor (IP address) can hit the sensitive endpoints.
import { rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";

// The automated tests fire hundreds of requests from one address.
const disabled = () => env.isTest && process.env.TEST_RATE_LIMITS !== "on";

const limiter = ({ minutes, limit, message, ...rest }) =>
  rateLimit({
    windowMs: minutes * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: disabled,
    message: { message },
    ...rest,
  });

// Wrong passwords only: 10 tries, then a 15 minute wait.
export const loginLimiter = limiter({
  minutes: 15,
  limit: 10,
  skipSuccessfulRequests: true,
  message: "Too many login attempts. Please try again in 15 minutes.",
});

export const checkoutLimiter = limiter({
  minutes: 10,
  limit: 20,
  message: "Too many checkout attempts. Please wait a few minutes and try again.",
});

// Stops people guessing order numbers.
export const trackLimiter = limiter({
  minutes: 15,
  limit: 40,
  message: "Too many tries. Please wait a few minutes and try again.",
});

export const formLimiter = limiter({
  minutes: 15,
  limit: 10,
  message: "Too many requests. Please try again later.",
});

// The payment screen checks the order status every few seconds.
export const statusLimiter = limiter({
  minutes: 5,
  limit: 300,
  message: "Too many requests. Please slow down.",
});

// A generous ceiling for everything else, to blunt scraping and abuse.
export const apiLimiter = limiter({
  minutes: 5,
  limit: 1500,
  message: "Too many requests. Please slow down.",
});
