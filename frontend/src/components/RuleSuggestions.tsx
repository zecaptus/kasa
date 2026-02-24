import { useIntl } from 'react-intl';
import type { RuleSuggestionDto } from '../services/transactionsApi';
import { Button } from './ui/Button';

interface RuleSuggestionsProps {
  suggestions: RuleSuggestionDto[];
  onAccept: (keyword: string) => void;
}

export function RuleSuggestions({ suggestions, onAccept }: RuleSuggestionsProps) {
  const intl = useIntl();

  if (suggestions.length === 0) return null;

  const totalCount = suggestions.reduce((sum, s) => sum + s.matchCount, 0);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
      <p className="mb-1 text-sm font-semibold text-amber-800 dark:text-amber-300">
        {intl.formatMessage({ id: 'categories.suggestions.title' })}
      </p>
      <p className="mb-3 text-xs text-amber-600 dark:text-amber-400">
        {intl.formatMessage({ id: 'categories.suggestions.hint' }, { count: totalCount })}
      </p>
      <ul className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <li key={s.keyword} className="flex items-center gap-1.5">
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-mono font-medium text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
              {s.keyword}
            </span>
            <span className="text-xs text-amber-500 dark:text-amber-500">×{s.matchCount}</span>
            <Button size="sm" variant="ghost" onClick={() => onAccept(s.keyword)}>
              {intl.formatMessage({ id: 'categories.suggestions.accept' })}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
