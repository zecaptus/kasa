import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { CategoryForm } from '../components/CategoryForm';
import { CategoryRuleForm } from '../components/CategoryRuleForm';
import { RuleSuggestions } from '../components/RuleSuggestions';
import { TransferLabelRuleForm } from '../components/TransferLabelRuleForm';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/cn';
import {
  type CategoryDto,
  type CategoryRuleDto,
  type RuleSuggestionDto,
  type TransferLabelRuleDto,
  useDeleteCategoryMutation,
  useDeleteCategoryRuleMutation,
  useDeleteTransferLabelRuleMutation,
  useListCategoriesQuery,
  useListCategoryRulesQuery,
  useListRuleSuggestionsQuery,
  useListTransferLabelRulesQuery,
  useRecategorizeAllMutation,
} from '../services/transactionsApi';

interface RuleFormSectionProps {
  showRuleForm: boolean;
  editingRule: CategoryRuleDto | null;
  pendingSuggestion: string | undefined;
  suggestions: RuleSuggestionDto[];
  onShowForm: () => void;
  onAcceptSuggestion: (keyword: string) => void;
  onSuccess: (categorized?: number) => void;
}

function RuleFormSection({
  showRuleForm,
  editingRule,
  pendingSuggestion,
  suggestions,
  onShowForm,
  onAcceptSuggestion,
  onSuccess,
}: RuleFormSectionProps) {
  const intl = useIntl();
  const formKey = editingRule ? editingRule.id : (pendingSuggestion ?? '');
  const formInitialValues = editingRule
    ? { keyword: editingRule.keyword, categoryId: editingRule.categoryId }
    : pendingSuggestion !== undefined
      ? { keyword: pendingSuggestion, categoryId: '' }
      : undefined;
  return (
    <>
      <RuleSuggestions suggestions={suggestions} onAccept={onAcceptSuggestion} />
      {showRuleForm ? (
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <CategoryRuleForm
            key={formKey}
            {...(formInitialValues !== undefined ? { initialValues: formInitialValues } : {})}
            {...(editingRule !== null ? { ruleId: editingRule.id } : {})}
            onSuccess={onSuccess}
          />
        </div>
      ) : (
        <Button onClick={onShowForm}>
          {intl.formatMessage({ id: 'categories.rules.create' })}
        </Button>
      )}
    </>
  );
}

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

interface CategoryFormSectionProps {
  editingCategory: CategoryDto | null;
  onSuccess: () => void;
}

function CategoryFormSection({ editingCategory, onSuccess }: CategoryFormSectionProps) {
  const editProps = editingCategory
    ? {
        categoryId: editingCategory.id,
        initialValues: { name: editingCategory.name, color: editingCategory.color },
      }
    : {};
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <CategoryForm {...editProps} onSuccess={onSuccess} />
    </div>
  );
}

async function confirmAndDeleteCategory(
  cat: CategoryDto,
  deleteFn: (id: string) => unknown,
  msg: string,
): Promise<void> {
  if (!window.confirm(msg)) return;
  await deleteFn(cat.id);
}

function TransferLabelSection() {
  const intl = useIntl();
  const { data: transferLabelRulesData } = useListTransferLabelRulesQuery();
  const [deleteTransferLabelRule] = useDeleteTransferLabelRuleMutation();
  const [showTransferLabelForm, setShowTransferLabelForm] = useState(false);
  const [editingTransferLabelRule, setEditingTransferLabelRule] =
    useState<TransferLabelRuleDto | null>(null);
  const [labeledCount, setLabeledCount] = useState<number | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function handleSuccess(labeled?: number) {
    setShowTransferLabelForm(false);
    setEditingTransferLabelRule(null);
    setLabeledCount(labeled);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setLabeledCount(undefined), 4000);
  }

  const rules = transferLabelRulesData?.rules ?? [];

  return (
    <section className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold text-kasa-dark dark:text-slate-100">
        {intl.formatMessage({ id: 'transfer.labels.title' })}
      </h2>

      {labeledCount !== undefined && (
        <output className="block rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
          {intl.formatMessage({ id: 'transfer.labels.labeled' }, { count: labeledCount })}
        </output>
      )}

      {rules.length > 0 && (
        <ul className={cn(listCls, 'mb-3')}>
          {rules.map((rule: TransferLabelRuleDto) => (
            <li key={rule.id} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-300">
                <span className="font-mono text-xs text-slate-500">{rule.keyword}</span>
                <span className="mx-2 text-slate-300">→</span>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                  {rule.label}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {intl.formatMessage(
                  { id: 'transfer.labels.rule.stats' },
                  { count: rule.transactionCount ?? 0 },
                )}
              </span>
              <span className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTransferLabelRule(rule);
                    setShowTransferLabelForm(true);
                  }}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-kasa-accent transition-colors hover:bg-kasa-accent/10 dark:hover:bg-kasa-accent/15"
                >
                  {intl.formatMessage({ id: 'categories.edit' })}
                </button>
                <Button variant="danger" size="sm" onClick={() => deleteTransferLabelRule(rule.id)}>
                  {intl.formatMessage({ id: 'transfer.labels.rule.delete' })}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {showTransferLabelForm ? (
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <TransferLabelRuleForm
            key={editingTransferLabelRule?.id ?? ''}
            {...(editingTransferLabelRule !== null
              ? {
                  initialValues: {
                    keyword: editingTransferLabelRule.keyword,
                    label: editingTransferLabelRule.label,
                  },
                  ruleId: editingTransferLabelRule.id,
                }
              : {})}
            onSuccess={handleSuccess}
          />
        </div>
      ) : (
        <Button
          onClick={() => {
            setEditingTransferLabelRule(null);
            setShowTransferLabelForm(true);
          }}
        >
          {intl.formatMessage({ id: 'transfer.labels.rule.create' })}
        </Button>
      )}
    </section>
  );
}

export function CategoriesPage() {
  const intl = useIntl();

  const { data: categoriesData } = useListCategoriesQuery();
  const { data: rulesData } = useListCategoryRulesQuery();
  const { data: suggestionsData } = useListRuleSuggestionsQuery();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [deleteRule] = useDeleteCategoryRuleMutation();
  const [recategorizeAll, { isLoading: isRecategorizing }] = useRecategorizeAllMutation();

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<CategoryRuleDto | null>(null);
  const [recategorizedCount, setRecategorizedCount] = useState<number | undefined>(undefined);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(bannerTimerRef.current), []);

  function handleRuleSuccess(categorized?: number) {
    setShowRuleForm(false);
    setEditingRule(null);
    setRecategorizedCount(categorized);
    clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setRecategorizedCount(undefined), 4000);
  }

  const categories = categoriesData?.categories ?? [];
  const rules = rulesData?.rules ?? [];
  const suggestions = suggestionsData?.suggestions ?? [];
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const [pendingSuggestion, setPendingSuggestion] = useState<string | undefined>(undefined);

  const systemCategories = categories.filter((c) => c.isSystem);
  const customCategories = categories.filter((c) => !c.isSystem);
  const systemRules = rules.filter((r) => r.isSystem);
  const customRules = rules.filter((r) => !r.isSystem);

  async function handleRecategorizeAll() {
    const result = await recategorizeAll();
    if ('data' in result && result.data !== undefined) {
      handleRuleSuccess(result.data.categorized);
    }
  }

  function handleDeleteCategory(cat: CategoryDto) {
    void confirmAndDeleteCategory(
      cat,
      deleteCategory,
      intl.formatMessage({ id: 'categories.delete.confirm' }, { name: cat.name, count: 0 }),
    );
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
                      className="rounded-lg px-2.5 py-1 text-xs font-medium text-kasa-accent transition-colors hover:bg-kasa-accent/10 dark:hover:bg-kasa-accent/15"
                    >
                      {intl.formatMessage({ id: 'categories.edit' })}
                    </button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteCategory(cat)}>
                      {intl.formatMessage({ id: 'categories.delete' })}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {showCategoryForm ? (
            <CategoryFormSection
              editingCategory={editingCategory}
              onSuccess={() => {
                setShowCategoryForm(false);
                setEditingCategory(null);
              }}
            />
          ) : (
            <Button onClick={() => setShowCategoryForm(true)}>
              {intl.formatMessage({ id: 'categories.create' })}
            </Button>
          )}
        </div>
      </section>

      {/* ── Recategorization banner ── */}
      {recategorizedCount !== undefined && (
        <output className="block rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
          {intl.formatMessage(
            { id: 'categories.rules.recategorized' },
            { count: recategorizedCount },
          )}
        </output>
      )}

      {/* ── Rules ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-kasa-dark dark:text-slate-100">
            {intl.formatMessage({ id: 'categories.rules.title' })}
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void handleRecategorizeAll()}
            disabled={isRecategorizing}
          >
            {intl.formatMessage({ id: 'categories.rules.recategorizeAll' })}
          </Button>
        </div>

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
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {intl.formatMessage(
                        { id: 'categories.rules.stats' },
                        { count: rule.transactionCount ?? 0 },
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
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {intl.formatMessage(
                        { id: 'categories.rules.stats' },
                        { count: rule.transactionCount ?? 0 },
                      )}
                    </span>
                    <span className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRule(rule);
                          setShowRuleForm(true);
                        }}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-kasa-accent transition-colors hover:bg-kasa-accent/10 dark:hover:bg-kasa-accent/15"
                      >
                        {intl.formatMessage({ id: 'categories.edit' })}
                      </button>
                      <Button variant="danger" size="sm" onClick={() => deleteRule(rule.id)}>
                        {intl.formatMessage({ id: 'categories.rules.delete' })}
                      </Button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <RuleFormSection
            showRuleForm={showRuleForm}
            editingRule={editingRule}
            pendingSuggestion={pendingSuggestion}
            suggestions={suggestions}
            onShowForm={() => {
              setEditingRule(null);
              setShowRuleForm(true);
            }}
            onAcceptSuggestion={(keyword) => {
              setEditingRule(null);
              setPendingSuggestion(keyword);
              setShowRuleForm(true);
            }}
            onSuccess={(categorized) => {
              setPendingSuggestion(undefined);
              handleRuleSuccess(categorized);
            }}
          />
        </div>
      </section>

      <TransferLabelSection />
    </main>
  );
}
