// Store settings from the server (payment options, delivery days), loaded once.
import { api } from "./shopApi";

let request = null;

export function loadStoreConfig() {
  if (!request) {
    request = api("/store/config").catch(() => {
      request = null; // try again next time
      return null;
    });
  }
  return request;
}
