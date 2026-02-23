import { describe, expect, it } from 'vitest';
import {
  computeReconciliationCandidates,
  HIGH_CONFIDENCE_THRESHOLD,
  PLAUSIBLE_THRESHOLD,
} from '../../../src/services/reconciliation.service.js';

// Minimal in-memory types matching the Prisma shapes we use
interface TxLike {
  id: string;
  userId: string;
  label: string;
  debit: number | null;
  credit: number | null;
  accountingDate: Date;
}

interface ExpenseLike {
  id: string;
  userId: string;
  label: string;
  amount: number;
  date: Date;
}

function makeTx(overrides: Partial<TxLike> = {}): TxLike {
  return {
    id: 'tx1',
    userId: 'user1',
    label: 'VIR SEPA LOYER MARS',
    debit: 800,
    credit: null,
    accountingDate: new Date('2025-01-15'),
    ...overrides,
  };
}

function makeExpense(overrides: Partial<ExpenseLike> = {}): ExpenseLike {
  return {
    id: 'exp1',
    userId: 'user1',
    label: 'Loyer mars',
    amount: 800,
    date: new Date('2025-01-15'),
    ...overrides,
  };
}

describe('computeReconciliationCandidates', () => {
  it('retourne un match haute confiance quand montant + date + libellé correspondent', () => {
    const tx = makeTx();
    const expense = makeExpense();
    const candidates = computeReconciliationCandidates(tx, [expense]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.confidence).toBe('high');
    expect(candidates[0]?.score).toBeGreaterThanOrEqual(HIGH_CONFIDENCE_THRESHOLD);
  });

  it('retourne tableau vide quand le montant ne correspond pas', () => {
    const tx = makeTx({ debit: 800 });
    const expense = makeExpense({ amount: 500 }); // différent
    const candidates = computeReconciliationCandidates(tx, [expense]);
    expect(candidates).toHaveLength(0);
  });

  it('retourne tableau vide quand la date est trop éloignée (> 3 jours)', () => {
    const tx = makeTx({ accountingDate: new Date('2025-01-15') });
    const expense = makeExpense({ date: new Date('2025-01-20') }); // 5 jours d'écart
    const candidates = computeReconciliationCandidates(tx, [expense]);
    expect(candidates).toHaveLength(0);
  });

  it('retourne tableau vide quand le libellé est trop différent', () => {
    const tx = makeTx({ label: 'VIR SEPA SALAIRE JANVIER' });
    const expense = makeExpense({ label: 'Loyer' }); // sans rapport
    const candidates = computeReconciliationCandidates(tx, [expense]);
    expect(candidates).toHaveLength(0);
  });

  it('retourne plusieurs candidats pour une transaction ambiguë', () => {
    const tx = makeTx({ debit: 800, accountingDate: new Date('2025-01-15') });
    const expense1 = makeExpense({ id: 'exp1', label: 'Loyer mars', date: new Date('2025-01-15') });
    const expense2 = makeExpense({
      id: 'exp2',
      label: 'Loyer appartement',
      date: new Date('2025-01-14'),
    });

    const candidates = computeReconciliationCandidates(tx, [expense1, expense2]);
    expect(candidates.length).toBeGreaterThan(1);
  });

  it('seuils exportés sont dans la plage [0,1]', () => {
    expect(HIGH_CONFIDENCE_THRESHOLD).toBeGreaterThan(0);
    expect(HIGH_CONFIDENCE_THRESHOLD).toBeLessThanOrEqual(1);
    expect(PLAUSIBLE_THRESHOLD).toBeGreaterThan(0);
    expect(PLAUSIBLE_THRESHOLD).toBeLessThan(HIGH_CONFIDENCE_THRESHOLD);
  });

  it('performance : matrice 200×200 en < 2000 ms', () => {
    const txs = Array.from({ length: 200 }, (_, i) =>
      makeTx({ id: `tx${i}`, label: `VIR SEPA LOYER ${i}` }),
    );
    const expenses = Array.from({ length: 200 }, (_, i) =>
      makeExpense({ id: `exp${i}`, label: `Loyer ${i}`, amount: 800 }),
    );

    const start = Date.now();
    for (const tx of txs) {
      computeReconciliationCandidates(tx, expenses);
    }
    const elapsed = Date.now();
    // CI environments are slower than local - allow 2s instead of 1s
    expect(elapsed - start).toBeLessThan(2000);
  });
});
