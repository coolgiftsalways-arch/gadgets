// Work that should not make the customer wait — sending emails, cancelling a
// payment link — runs "in the background". This keeps track of it so a
// failure is logged instead of crashing the server, and so the server can
// finish what it started before shutting down.
const pending = new Set();

export function runInBackground(label, task) {
  const promise = Promise.resolve()
    .then(task)
    .catch((error) => {
      console.error(`Background task failed (${label}):`, error?.message || error);
    })
    .finally(() => pending.delete(promise));

  pending.add(promise);
  return promise;
}

// Resolves once everything started so far has finished (used on shutdown and in tests).
export async function backgroundIdle() {
  while (pending.size > 0) {
    await Promise.allSettled([...pending]);
  }
}
