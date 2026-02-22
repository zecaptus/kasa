import crypto from 'node:crypto';
import { prisma } from '@kasa/db';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import type { Context } from 'koa';
import type { StringValue } from 'ms';
import { config } from '../config';

// ── Types ────────────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  email: string;
  name: string;
  locale: 'FR' | 'EN';
  createdAt: string;
}

// ── Password helpers ─────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 64 * 1024, // 64 MiB
    timeCost: 3,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}

// ── Token helpers ────────────────────────────────────────────────────

function toUserDto(user: {
  id: string;
  email: string;
  name: string;
  locale: 'FR' | 'EN';
  createdAt: Date;
}): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    locale: user.locale,
    createdAt: user.createdAt.toISOString(),
  };
}

export function issueTokens(
  userId: string,
  email: string,
  ctx: Context,
  refreshToken: string,
): void {
  const accessToken = jwt.sign({ sub: userId, email }, config.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: config.JWT_ACCESS_EXPIRES as StringValue,
  });

  const isProduction = config.NODE_ENV === 'production';

  ctx.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 min
    path: '/',
    overwrite: true,
  });

  ctx.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
    overwrite: true,
  });
}

async function createRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomUUID();
  const family = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { token, family, userId, expiresAt },
  });

  return token;
}

// ── Register ─────────────────────────────────────────────────────────

export async function register(
  email: string,
  password: string,
  name: string,
  ctx: Context,
): Promise<UserDto> {
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    ctx.throw(409, 'Email already registered');
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: name.trim(),
    },
  });

  const refreshToken = await createRefreshToken(user.id);
  issueTokens(user.id, user.email, ctx, refreshToken);

  return toUserDto(user);
}

// ── Login ───────────────────────────────────────────────────────────

const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=1$dummysaltdummysalt$dummyhashdummyhashdummyhash';

export async function login(email: string, password: string, ctx: Context): Promise<UserDto> {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    // Constant-time: hash against dummy to prevent timing attacks
    await argon2.verify(DUMMY_HASH, password).catch(() => {});
    ctx.throw(401, 'Invalid credentials');
  }

  // Check lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const retryAfterMs = user.lockedUntil.getTime() - Date.now();
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    ctx.set('Retry-After', String(retryAfterSeconds));
    ctx.throw(429, 'Account temporarily locked');
  }

  const valid = await verifyPassword(user.passwordHash, password);

  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
      failedLoginAttempts: attempts,
    };

    if (attempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    if (attempts >= 5) {
      ctx.set('Retry-After', '900');
      ctx.throw(429, 'Account temporarily locked');
    }

    ctx.throw(401, 'Invalid credentials');
  }

  // Reset failed attempts on success
  if (user.failedLoginAttempts > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  const refreshToken = await createRefreshToken(user.id);
  issueTokens(user.id, user.email, ctx, refreshToken);

  return toUserDto(user);
}

// ── Refresh token rotation ──────────────────────────────────────────

export async function rotateRefreshToken(token: string, ctx: Context): Promise<UserDto> {
  const existing = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!existing || existing.expiresAt < new Date()) {
    ctx.throw(401, 'Invalid refresh token');
  }

  // Reuse detection: token already consumed → wipe entire family
  if (existing.usedAt) {
    await prisma.refreshToken.deleteMany({
      where: { family: existing.family },
    });
    ctx.throw(401, 'Refresh token reuse detected');
  }

  // Mark current token as used
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { usedAt: new Date() },
  });

  // Issue new token in same family
  const newToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      token: newToken,
      family: existing.family,
      userId: existing.userId,
      expiresAt,
    },
  });

  issueTokens(existing.userId, existing.user.email, ctx, newToken);

  return toUserDto(existing.user);
}

// ── Logout ──────────────────────────────────────────────────────────

export async function logout(refreshToken: string | undefined, ctx: Context): Promise<void> {
  if (refreshToken) {
    await prisma.refreshToken
      .update({
        where: { token: refreshToken },
        data: { usedAt: new Date() },
      })
      .catch(() => {
        // Token may not exist — ignore
      });
  }

  const isProduction = config.NODE_ENV === 'production';

  ctx.cookies.set('access_token', null, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
    overwrite: true,
  });

  ctx.cookies.set('refresh_token', null, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 0,
    path: '/api/auth/refresh',
    overwrite: true,
  });
}

// ── Get current user ────────────────────────────────────────────────

export async function getMe(userId: string): Promise<UserDto | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

  return toUserDto(user);
}
