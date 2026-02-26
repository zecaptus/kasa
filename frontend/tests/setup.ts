import { afterAll, beforeAll } from 'vitest';

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
