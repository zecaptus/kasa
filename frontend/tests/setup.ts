import { afterAll, beforeAll, vi } from 'vitest';

// Prevent RTK Query from making real network calls in the jsdom environment.
//
// Problem: fetchBaseQuery uses Node's undici Request constructor which:
//   1. Rejects jsdom's AbortSignal (not an instance of undici's AbortSignal)
//   2. Rejects relative URLs like /api/... (requires absolute URLs)
// Both throw before fetch() is even called, producing unhandled rejections.
//
// Fix: replace global Request with a minimal stub that accepts anything,
// then mock fetch so no actual network call is ever made.
vi.stubGlobal(
  'Request',
  class MockRequest {
    readonly url: string;
    readonly method: string;
    readonly headers: Headers;
    readonly body: null = null;
    readonly bodyUsed = false;
    readonly signal: null = null;

    constructor(input: string | URL, init?: RequestInit) {
      this.url = String(input);
      this.method = (init?.method ?? 'GET').toUpperCase();
      this.headers = new Headers(init?.headers as HeadersInit | undefined);
    }

    clone() {
      return this;
    }
    arrayBuffer() {
      return Promise.resolve(new ArrayBuffer(0));
    }
    blob() {
      return Promise.resolve(new Blob());
    }
    formData() {
      return Promise.resolve(new FormData());
    }
    json() {
      return Promise.resolve({});
    }
    text() {
      return Promise.resolve('');
    }
  },
);

// Return a fresh Response on every call — RTK Query calls response.clone()
// which fails if the same body is reused across multiple requests.
vi.stubGlobal(
  'fetch',
  vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify({ error: 'mocked' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  ),
);

const SUPPRESSED = [
  'An unhandled error occurred processing a request for the endpoint',
  'In the case of an unhandled error, no tags will be',
  'An update to ',
  'When testing, code that causes React state updates should be wrapped into act',
  'act(() => {',
  '/* fire events that update state */',
  '/* assert on the output */',
  'This ensures that you',
  'Learn more at https://react.dev/link/wrap-tests-with-act',
  '[React Intl] Missing message:',
  '[React Intl] Could not find required `intl` object.',
];

const originalError = console.error.bind(console);

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (SUPPRESSED.some((s) => msg.includes(s))) return;
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
