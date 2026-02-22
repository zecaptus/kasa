import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
    vi.stubEnv('JWT_SECRET', 'test-secret-key-that-is-at-least-32-chars-long');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('parses DATABASE_URL from env', async () => {
    const { config } = await import('../../src/config');
    expect(config.DATABASE_URL).toBe('postgresql://localhost:5432/test');
  });

  it('defaults PORT to 3000 when not set', async () => {
    // Ensure PORT is absent so zod uses its default
    const { PORT: _ } = process.env;
    vi.stubEnv('PORT', undefined as unknown as string);
    const { config } = await import('../../src/config');
    expect(config.PORT).toBe(3000);
  });

  it('parses custom PORT', async () => {
    vi.stubEnv('PORT', '8080');
    const { config } = await import('../../src/config');
    expect(config.PORT).toBe(8080);
  });

  it('defaults CORS_ORIGIN to localhost:5173', async () => {
    const { config } = await import('../../src/config');
    expect(config.CORS_ORIGIN).toBe('http://localhost:5173');
  });

  it('accepts valid NODE_ENV values', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { config } = await import('../../src/config');
    expect(config.NODE_ENV).toBe('production');
  });
});
