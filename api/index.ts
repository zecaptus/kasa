// Vercel serverless function entry point — thin adapter only.
// The Koa app lives in backend/src/app.ts; this file is the Vercel shim.
export { default } from '../backend/src/app';
