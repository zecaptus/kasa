import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';

describe('createApp', () => {
  const app = createApp();

  it('GET /api/health → 200 { status: ok }', async () => {
    const res = await request(app.callback()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('unknown route → 404', async () => {
    const res = await request(app.callback()).get('/not-found');
    expect(res.status).toBe(404);
  });

  it('error handler catches thrown errors → 500 JSON', async () => {
    const testApp = createApp();
    // Add an error-throwing middleware for an unregistered path.
    // The error handler is the first middleware in createApp, so it wraps this.
    testApp.use((ctx) => {
      if (ctx.path === '/test-error') throw new Error('boom');
    });
    const res = await request(testApp.callback()).get('/test-error');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'boom');
  });

  it('error handler wraps non-Error thrown values → 500 JSON', async () => {
    const testApp = createApp();
    testApp.use((ctx) => {
      if (ctx.path === '/test-non-error') throw 'string error';
    });
    const res = await request(testApp.callback()).get('/test-non-error');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Internal server error');
  });
});
