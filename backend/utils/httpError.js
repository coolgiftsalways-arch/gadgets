// An error that carries the HTTP status the client should receive.
// Anything thrown without a status is reported as a 500 by errorMiddleware.
export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.expose = true;
    Object.assign(this, extra);
  }
}

export const badRequest = (message, extra) => new HttpError(400, message, extra);
export const unauthorized = (message = "Please log in.") => new HttpError(401, message);
export const notFound = (message = "Not found") => new HttpError(404, message);
export const conflict = (message, extra) => new HttpError(409, message, extra);
export const unavailable = (message) => new HttpError(503, message);
