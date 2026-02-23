import { type Category, type CategoryRule, prisma } from '@kasa/db';
import { invalidateRuleCache } from './categorization.service.js';

// ─── Categories ───────────────────────────────────────────────────────────────

export async function listCategories(userId: string): Promise<Category[]> {
  return prisma.category.findMany({
    where: { OR: [{ isSystem: true }, { userId }] },
    orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
  });
}

function toSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function createCategory(
  userId: string,
  name: string,
  color: string,
): Promise<Category> {
  const slug = toSlug(name);
  return prisma.category.create({
    data: { name, slug, color, userId, isSystem: false },
  });
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  updates: { name?: string; color?: string },
): Promise<Category | null> {
  const cat = await prisma.category.findFirst({ where: { id: categoryId } });
  if (!cat) return null;
  if (cat.isSystem || cat.userId !== userId) {
    const err = Object.assign(new Error('Cannot modify a system category'), { status: 403 });
    throw err;
  }

  const data: { name?: string; slug?: string; color?: string } = {};
  if (updates.name) {
    data.name = updates.name;
    data.slug = toSlug(updates.name);
  }
  if (updates.color) data.color = updates.color;

  return prisma.category.update({ where: { id: categoryId }, data });
}

export async function deleteCategory(
  userId: string,
  categoryId: string,
): Promise<{ affectedTransactions: number } | null> {
  const cat = await prisma.category.findFirst({ where: { id: categoryId } });
  if (!cat) return null;
  if (cat.isSystem || cat.userId !== userId) {
    const err = Object.assign(new Error('Cannot delete a system category'), { status: 403 });
    throw err;
  }

  const [itCount, meCount] = await Promise.all([
    prisma.importedTransaction.count({ where: { categoryId } }),
    prisma.manualExpense.count({ where: { categoryId } }),
  ]);

  // Cascade: onDelete: SetNull handles the FK nullification automatically
  await prisma.category.delete({ where: { id: categoryId } });

  return { affectedTransactions: itCount + meCount };
}

// ─── CategoryRules ────────────────────────────────────────────────────────────

export async function listCategoryRules(userId: string): Promise<CategoryRule[]> {
  return prisma.categoryRule.findMany({
    where: { OR: [{ isSystem: true }, { userId }] },
    orderBy: [{ isSystem: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function createCategoryRule(
  userId: string,
  keyword: string,
  categoryId: string,
): Promise<CategoryRule> {
  // Verify category exists and belongs to user or is system
  const cat = await prisma.category.findFirst({
    where: { id: categoryId, OR: [{ isSystem: true }, { userId }] },
  });
  if (!cat) {
    const err = Object.assign(new Error('Category not found'), { status: 404 });
    throw err;
  }

  const rule = await prisma.categoryRule.create({
    data: { keyword, categoryId, userId, isSystem: false },
  });
  invalidateRuleCache(userId);
  return rule;
}

export async function updateCategoryRule(
  userId: string,
  ruleId: string,
  updates: { keyword?: string; categoryId?: string },
): Promise<CategoryRule | null> {
  const rule = await prisma.categoryRule.findFirst({ where: { id: ruleId } });
  if (!rule) return null;
  if (rule.isSystem || rule.userId !== userId) {
    const err = Object.assign(new Error('Cannot modify a system rule'), { status: 403 });
    throw err;
  }

  if (updates.categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: updates.categoryId, OR: [{ isSystem: true }, { userId }] },
    });
    if (!cat) {
      const err = Object.assign(new Error('Category not found'), { status: 404 });
      throw err;
    }
  }

  const updated = await prisma.categoryRule.update({
    where: { id: ruleId },
    data: updates,
  });
  invalidateRuleCache(userId);
  return updated;
}

export async function deleteCategoryRule(userId: string, ruleId: string): Promise<boolean> {
  const rule = await prisma.categoryRule.findFirst({ where: { id: ruleId } });
  if (!rule) return false;
  if (rule.isSystem || rule.userId !== userId) {
    const err = Object.assign(new Error('Cannot delete a system rule'), { status: 403 });
    throw err;
  }

  await prisma.categoryRule.delete({ where: { id: ruleId } });
  invalidateRuleCache(userId);
  return true;
}
