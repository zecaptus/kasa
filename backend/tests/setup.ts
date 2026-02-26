import { afterAll, beforeAll } from 'vitest';

// Koa's app.onerror calls console.error(err.stack) for every unhandled route
// error. In tests that deliberately throw errors (to test error-handler logic),
// this produces noisy stack traces. We suppress them by detecting Koa's
// characteristic "\n  Error: …" prefix.
const originalError = console.error.bind(console);

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    // Koa formats: "\n  Error: <message>\n      at …"
    if (/^\n {2}Error:/.test(msg)) return;
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
