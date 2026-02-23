import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import type { PocketSummaryDto } from '../services/pocketsApi';

interface Props {
  pocket: PocketSummaryDto;
  onAddMovement?: (pocket: PocketSummaryDto) => void;
  onEdit?: (pocket: PocketSummaryDto) => void;
  onDelete?: (pocket: PocketSummaryDto) => void;
  compact?: boolean;
}

export function PocketCard({ pocket, onAddMovement, onEdit, onDelete, compact = false }: Props) {
  const intl = useIntl();
  const isGoalReached = pocket.progressPct >= 100;
  const barWidth = Math.min(pocket.progressPct, 100);

  const formattedAllocated = intl.formatNumber(pocket.allocatedAmount, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
  const formattedGoal = intl.formatNumber(pocket.goalAmount, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });

  return (
    <div
      className={cn('rounded-xl border bg-white p-4 shadow-sm', {
        'border-slate-100': !isGoalReached,
        'border-emerald-200 bg-emerald-50': isGoalReached,
      })}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: pocket.color }}
            aria-hidden
          />
          <span className="font-medium text-slate-800 text-sm">{pocket.name}</span>
        </div>
        {isGoalReached && <span className="text-xs font-semibold text-emerald-600">✓</span>}
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pocket.progressPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pocket.name} — ${Math.round(pocket.progressPct)} %`}
        className="mb-2 h-2 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${barWidth}%`, backgroundColor: pocket.color }}
        />
      </div>

      {/* Ratio */}
      <p className="text-xs text-slate-500">
        {formattedAllocated} / {formattedGoal}
      </p>

      {/* Actions — hidden in compact (dashboard) mode */}
      {!compact && (onAddMovement || onEdit || onDelete) && (
        <div className="mt-3 flex gap-2">
          {onAddMovement && (
            <button
              type="button"
              onClick={() => onAddMovement(pocket)}
              className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              {intl.formatMessage({ id: 'pockets.movement.add' })}
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(pocket)}
              className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            >
              {intl.formatMessage({ id: 'pockets.edit' })}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(pocket)}
              className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50"
            >
              {intl.formatMessage({ id: 'pockets.delete' })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
