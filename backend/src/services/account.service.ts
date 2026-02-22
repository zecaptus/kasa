import { prisma } from '@kasa/db';
import type { UserDto } from './auth.service';

export interface UpdateProfileInput {
  name?: string | undefined;
  locale?: 'FR' | 'EN' | undefined;
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDto> {
  const data: Record<string, unknown> = {};

  if (input.name !== undefined) {
    data.name = input.name.trim();
  }
  if (input.locale !== undefined) {
    data.locale = input.locale;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    locale: user.locale,
    createdAt: user.createdAt.toISOString(),
  };
}
