import { useState } from 'react';
import { useIntl } from 'react-intl';
import { CategoryForm } from '../components/CategoryForm';
import { CategoryRuleForm } from '../components/CategoryRuleForm';
import { cn } from '../lib/cn';
import {
  type CategoryDto,
  type CategoryRuleDto,
  useDeleteCategoryMutation,
  useDeleteCategoryRuleMutation,
  useListCategoriesQuery,
  useListCategoryRulesQuery,
} from '../services/transactionsApi';

function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 text-slate-400"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="7" width="10" height="8" rx="1.5" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

const sectionHeaderCls =
  'mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500';
const listCls =
  'divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700';
const actionBtnCls =
  'rounded-xl bg-kasa-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-kasa-accent-hover active:scale-[0.98]';

export function CategoriesPage() {
  const intl = useIntl();

  const { data: categoriesData } = useListCategoriesQuery();
  const { data: rulesData } = useListCategoryRulesQuery();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [deleteRule] = useDeleteCategoryRuleMutation();

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);
  const [showRuleForm, setShowRuleForm] = useState(false);

  const categories = categoriesData?.categories ?? [];
  const rules = rulesData?.rules ?? [];
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const systemCategories = categories.filter((c) => c.isSystem);
  const customCategories = categories.filter((c) => !c.isSystem);
  const systemRules = rules.filter((r) => r.isSystem);
  const customRules = rules.filter((r) => !r.isSystem);

  async function handleDeleteCategory(cat: CategoryDto) {
    const confirmed = window.confirm(
      intl.formatMessage({ id: 'categories.delete.confirm' }, { name: cat.name, count: 0 }),
    );
    if (!confirmed) return;
    await deleteCategory(cat.id);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 font-display text-2xl font-semibold tracking-tight text-kasa-dark dark:text-slate-100">
        {intl.formatMessage({ id: 'categories.title' })}
      </h1>

      {/* ── Categories ── */}
      <section className="mb-8 space-y-4">
        {systemCategories.length > 0 && (
          <div>
            <p className={sectionHeaderCls}>{intl.formatMessage({ id: 'categories.system' })}</p>
            <ul className={listCls}>
              {systemCategories.map((cat) => (
                <li key={cat.id} className="flex items-center gap-3 px-4 py-3">
                  <ColorDot color={cat.color} />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-100">
                    {cat.name}
                  </span>
                  <span title={intl.formatMessage({ id: 'categories.delete.system.forbidden' })}>
                    <LockIcon />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className={sectionHeaderCls}>{intl.formatMessage({ id: 'categories.custom' })}</p>
          {customCategories.length > 0 && (
            <ul className={cn(listCls, 'mb-3')}>
              {customCategories.map((cat) => (
                <li key={cat.id} className="flex items-center gap-3 px-4 py-3">
                  <ColorDot color={cat.color} />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-100">
                    {cat.name}
                  </span>
                  <span className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(cat);
                        setShowCategoryForm(true);
                      }}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium text-kasa-accent transition-colors hover:bg-kasa-accent/10"
                    >
                      {intl.formatMessage({ id: 'categories.edit' })}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      {intl.formatMessage({ id: 'categories.delete' })}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {showCategoryForm ? (
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <CategoryForm
                {...(editingCategory
                  ? {
                      categoryId: editingCategory.id,
                      initialValues: { name: editingCategory.name, color: editingCategory.color },
                    }
                  : {})}
                onSuccess={() => {
                  setShowCategoryForm(false);
                  setEditingCategory(null);
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCategoryForm(true)}
              className={actionBtnCls}
            >
              {intl.formatMessage({ id: 'categories.create' })}
            </button>
          )}
        </div>
      </section>

      {/* ── Rules ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-kasa-dark dark:text-slate-100">
          {intl.formatMessage({ id: 'categories.rules.title' })}
        </h2>

        {systemRules.length > 0 && (
          <div>
            <p className={sectionHeaderCls}>{intl.formatMessage({ id: 'categories.system' })}</p>
            <ul className={listCls}>
              {systemRules.map((rule) => {
                const cat = categoryMap.get(rule.categoryId);
                return (
                  <li key={rule.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-mono text-xs text-slate-500">{rule.keyword}</span>
                      <span className="mx-2 text-slate-300">→</span>
                      {cat && (
                        <span className="inline-flex items-center gap-1.5">
                          <ColorDot color={cat.color} />
                          {cat.name}
                        </span>
                      )}
                    </span>
                    <span title={intl.formatMessage({ id: 'categories.rules.system.label' })}>
                      <LockIcon />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div>
          <p className={sectionHeaderCls}>{intl.formatMessage({ id: 'categories.custom' })}</p>
          {customRules.length > 0 && (
            <ul className={cn(listCls, 'mb-3')}>
              {customRules.map((rule: CategoryRuleDto) => {
                const cat = categoryMap.get(rule.categoryId);
                return (
                  <li key={rule.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-mono text-xs text-slate-500">{rule.keyword}</span>
                      <span className="mx-2 text-slate-300">→</span>
                      {cat && (
                        <span className="inline-flex items-center gap-1.5">
                          <ColorDot color={cat.color} />
                          {cat.name}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteRule(rule.id)}
                      className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      {intl.formatMessage({ id: 'categories.rules.delete' })}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {showRuleForm ? (
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <CategoryRuleForm onSuccess={() => setShowRuleForm(false)} />
            </div>
          ) : (
            <button type="button" onClick={() => setShowRuleForm(true)} className={actionBtnCls}>
              {intl.formatMessage({ id: 'categories.rules.create' })}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
