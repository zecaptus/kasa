import { prisma } from '../src/client.js';

const SYSTEM_CATEGORIES = [
  { id: 'cat_system_food', name: 'Alimentation', slug: 'food', color: '#22c55e' },
  { id: 'cat_system_transport', name: 'Transport', slug: 'transport', color: '#3b82f6' },
  { id: 'cat_system_housing', name: 'Logement', slug: 'housing', color: '#f59e0b' },
  { id: 'cat_system_health', name: 'Santé', slug: 'health', color: '#ec4899' },
  { id: 'cat_system_entertainment', name: 'Loisirs', slug: 'entertainment', color: '#8b5cf6' },
  { id: 'cat_system_other', name: 'Autre', slug: 'other', color: '#94a3b8' },
];

const SYSTEM_RULES = [
  { keyword: 'carrefour', categoryId: 'cat_system_food' },
  { keyword: 'leclerc', categoryId: 'cat_system_food' },
  { keyword: 'lidl', categoryId: 'cat_system_food' },
  { keyword: 'aldi', categoryId: 'cat_system_food' },
  { keyword: 'intermarche', categoryId: 'cat_system_food' },
  { keyword: 'monoprix', categoryId: 'cat_system_food' },
  { keyword: 'franprix', categoryId: 'cat_system_food' },
  { keyword: 'picard', categoryId: 'cat_system_food' },
  { keyword: 'sncf', categoryId: 'cat_system_transport' },
  { keyword: 'ratp', categoryId: 'cat_system_transport' },
  { keyword: 'navigo', categoryId: 'cat_system_transport' },
  { keyword: 'uber', categoryId: 'cat_system_transport' },
  { keyword: 'blablacar', categoryId: 'cat_system_transport' },
  { keyword: 'autoroute', categoryId: 'cat_system_transport' },
  { keyword: 'loyer', categoryId: 'cat_system_housing' },
  { keyword: 'edf', categoryId: 'cat_system_housing' },
  { keyword: 'engie', categoryId: 'cat_system_housing' },
  { keyword: 'bouygues', categoryId: 'cat_system_housing' },
  { keyword: 'orange', categoryId: 'cat_system_housing' },
  { keyword: 'sfr', categoryId: 'cat_system_housing' },
  { keyword: 'pharmacie', categoryId: 'cat_system_health' },
  { keyword: 'medecin', categoryId: 'cat_system_health' },
  { keyword: 'dentiste', categoryId: 'cat_system_health' },
  { keyword: 'hopital', categoryId: 'cat_system_health' },
  { keyword: 'netflix', categoryId: 'cat_system_entertainment' },
  { keyword: 'spotify', categoryId: 'cat_system_entertainment' },
  { keyword: 'amazon prime', categoryId: 'cat_system_entertainment' },
  { keyword: 'canal', categoryId: 'cat_system_entertainment' },
  { keyword: 'cinema', categoryId: 'cat_system_entertainment' },
];

async function main(): Promise<void> {
  // Upsert system categories
  for (const cat of SYSTEM_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { name: cat.name, color: cat.color },
      create: { ...cat, isSystem: true, userId: null },
    });
  }

  // Upsert system rules
  for (const rule of SYSTEM_RULES) {
    const existing = await prisma.categoryRule.findFirst({
      where: { keyword: rule.keyword, isSystem: true, userId: null },
    });
    if (!existing) {
      await prisma.categoryRule.create({
        data: { ...rule, isSystem: true, userId: null },
      });
    }
  }

  console.log(
    `Seeded ${SYSTEM_CATEGORIES.length} system categories and ${SYSTEM_RULES.length} system rules.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
