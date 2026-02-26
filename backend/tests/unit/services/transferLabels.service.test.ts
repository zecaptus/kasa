import type { TransferLabelRule } from '@kasa/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── mock @kasa/db ─────────────────────────────────────────────────────────────

const mockTlrFindMany = vi.fn();
const mockTlrFindFirst = vi.fn();
const mockTlrCreate = vi.fn();
const mockTlrUpdate = vi.fn();
const mockTlrDelete = vi.fn();
const mockTxFindMany = vi.fn();
const mockTxFindFirst = vi.fn();
const mockTxUpdate = vi.fn();

vi.mock('@kasa/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@kasa/db')>();
  return {
    ...actual,
    prisma: {
      transferLabelRule: {
        findMany: (...args: unknown[]) => mockTlrFindMany(...args),
        findFirst: (...args: unknown[]) => mockTlrFindFirst(...args),
        create: (...args: unknown[]) => mockTlrCreate(...args),
        update: (...args: unknown[]) => mockTlrUpdate(...args),
        delete: (...args: unknown[]) => mockTlrDelete(...args),
      },
      importedTransaction: {
        findMany: (...args: unknown[]) => mockTxFindMany(...args),
        findFirst: (...args: unknown[]) => mockTxFindFirst(...args),
        update: (...args: unknown[]) => mockTxUpdate(...args),
      },
    },
  };
});

import { Prisma } from '@kasa/db';
// Import after mock
import {
  applyTransferLabelRules,
  createTransferLabelRule,
  deleteTransferLabelRule,
  listTransferLabelRules,
  setTransferLabel,
  updateTransferLabelRule,
} from '../../../src/services/transferLabels.service.js';

// ── helpers ───────────────────────────────────────────────────────────────────

const USER_ID = 'u1';
const RULE_ID = 'rule-001';
const TX_ID = 'tx-001';

function mkRule(
  id: string,
  keyword: string,
  label: string,
  amount: Prisma.Decimal | null = null,
): TransferLabelRule {
  return { id, keyword, label, amount, isSystem: false, userId: USER_ID, createdAt: new Date() };
}

function mkTx(
  id: string,
  label: string,
  detail: string | null = null,
  debit: Prisma.Decimal | null = null,
  credit: Prisma.Decimal | null = null,
) {
  return { id, label, detail, debit, credit };
}

// ── listTransferLabelRules ─────────────────────────────────────────────────────

describe('listTransferLabelRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps _count.transactions to transactionCount', async () => {
    const rawRule = {
      ...mkRule(RULE_ID, 'virement', 'Loyer'),
      _count: { transactions: 5 },
    };
    mockTlrFindMany.mockResolvedValue([rawRule]);

    const result = await listTransferLabelRules(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0]?.transactionCount).toBe(5);
    expect(result[0]?.keyword).toBe('virement');
    expect(result[0]?.label).toBe('Loyer');
  });
});

// ── createTransferLabelRule ────────────────────────────────────────────────────

describe('createTransferLabelRule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls create with correct data and amount null when not provided', async () => {
    const created = mkRule(RULE_ID, 'amazon', 'Shopping');
    mockTlrCreate.mockResolvedValue(created);

    const result = await createTransferLabelRule(USER_ID, 'amazon', 'Shopping');

    expect(mockTlrCreate).toHaveBeenCalledWith({
      data: { userId: USER_ID, keyword: 'amazon', label: 'Shopping', amount: null },
    });
    expect(result).toEqual(created);
  });

  it('calls create with amount when provided', async () => {
    const created = mkRule(RULE_ID, 'loyer', 'Loyer', new Prisma.Decimal(800));
    mockTlrCreate.mockResolvedValue(created);

    const result = await createTransferLabelRule(USER_ID, 'loyer', 'Loyer', 800);

    expect(mockTlrCreate).toHaveBeenCalledWith({
      data: { userId: USER_ID, keyword: 'loyer', label: 'Loyer', amount: 800 },
    });
    expect(result).toEqual(created);
  });
});

// ── updateTransferLabelRule ────────────────────────────────────────────────────

describe('updateTransferLabelRule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when rule not found', async () => {
    mockTlrFindFirst.mockResolvedValue(null);

    const result = await updateTransferLabelRule(USER_ID, RULE_ID, { label: 'New label' });

    expect(result).toBeNull();
    expect(mockTlrUpdate).not.toHaveBeenCalled();
  });

  it('updates and returns the rule when found', async () => {
    const existing = mkRule(RULE_ID, 'amazon', 'Shopping');
    const updated = { ...existing, label: 'Online Shopping' };
    mockTlrFindFirst.mockResolvedValue(existing);
    mockTlrUpdate.mockResolvedValue(updated);

    const result = await updateTransferLabelRule(USER_ID, RULE_ID, { label: 'Online Shopping' });

    expect(mockTlrUpdate).toHaveBeenCalledWith({
      where: { id: RULE_ID },
      data: { label: 'Online Shopping' },
    });
    expect(result?.label).toBe('Online Shopping');
  });
});

// ── deleteTransferLabelRule ────────────────────────────────────────────────────

describe('deleteTransferLabelRule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when rule not found', async () => {
    mockTlrFindFirst.mockResolvedValue(null);

    const result = await deleteTransferLabelRule(USER_ID, RULE_ID);

    expect(result).toBe(false);
    expect(mockTlrDelete).not.toHaveBeenCalled();
  });

  it('deletes and returns true when found', async () => {
    const existing = mkRule(RULE_ID, 'amazon', 'Shopping');
    mockTlrFindFirst.mockResolvedValue(existing);
    mockTlrDelete.mockResolvedValue(existing);

    const result = await deleteTransferLabelRule(USER_ID, RULE_ID);

    expect(result).toBe(true);
    expect(mockTlrDelete).toHaveBeenCalledWith({ where: { id: RULE_ID } });
  });
});

// ── applyTransferLabelRules ────────────────────────────────────────────────────

describe('applyTransferLabelRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 0 when no rules exist', async () => {
    mockTlrFindMany.mockResolvedValue([]);

    const count = await applyTransferLabelRules(USER_ID);

    expect(count).toBe(0);
    expect(mockTxFindMany).not.toHaveBeenCalled();
  });

  it('returns 0 when no unlabeled transactions', async () => {
    mockTlrFindMany.mockResolvedValue([mkRule(RULE_ID, 'amazon', 'Shopping')]);
    mockTxFindMany.mockResolvedValue([]);

    const count = await applyTransferLabelRules(USER_ID);

    expect(count).toBe(0);
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('labels matching transactions and returns count', async () => {
    const rule = mkRule(RULE_ID, 'amazon', 'Shopping');
    const tx = mkTx(TX_ID, 'AMAZON MARKETPLACE', null);
    mockTlrFindMany.mockResolvedValue([rule]);
    mockTxFindMany.mockResolvedValue([tx]);
    mockTxUpdate.mockResolvedValue({});

    const count = await applyTransferLabelRules(USER_ID);

    expect(count).toBe(1);
    expect(mockTxUpdate).toHaveBeenCalledWith({
      where: { id: TX_ID },
      data: { transferLabel: 'Shopping', transferLabelRuleId: RULE_ID },
    });
  });

  it('skips non-matching transactions', async () => {
    const rule = mkRule(RULE_ID, 'amazon', 'Shopping');
    const tx = mkTx(TX_ID, 'CARREFOUR CITY', null);
    mockTlrFindMany.mockResolvedValue([rule]);
    mockTxFindMany.mockResolvedValue([tx]);

    const count = await applyTransferLabelRules(USER_ID);

    expect(count).toBe(0);
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('skips rule with amount when tx amount does not match', async () => {
    const rule = mkRule(RULE_ID, 'loyer', 'Loyer', new Prisma.Decimal(100));
    const tx = mkTx(TX_ID, 'loyer mensuel', null, new Prisma.Decimal(200), null);
    mockTlrFindMany.mockResolvedValue([rule]);
    mockTxFindMany.mockResolvedValue([tx]);

    const count = await applyTransferLabelRules(USER_ID);

    expect(count).toBe(0);
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('matches rule with amount when tx amount matches', async () => {
    const rule = mkRule(RULE_ID, 'loyer', 'Loyer', new Prisma.Decimal(100));
    const tx = mkTx(TX_ID, 'loyer mensuel', null, new Prisma.Decimal(100), null);
    mockTlrFindMany.mockResolvedValue([rule]);
    mockTxFindMany.mockResolvedValue([tx]);
    mockTxUpdate.mockResolvedValue({});

    const count = await applyTransferLabelRules(USER_ID);

    expect(count).toBe(1);
    expect(mockTxUpdate).toHaveBeenCalledWith({
      where: { id: TX_ID },
      data: { transferLabel: 'Loyer', transferLabelRuleId: RULE_ID },
    });
  });

  it('filters transactions by txIds when provided', async () => {
    const rule = mkRule(RULE_ID, 'amazon', 'Shopping');
    mockTlrFindMany.mockResolvedValue([rule]);
    mockTxFindMany.mockResolvedValue([]);

    await applyTransferLabelRules(USER_ID, ['tx-abc', 'tx-def']);

    expect(mockTxFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['tx-abc', 'tx-def'] } }),
      }),
    );
  });
});

// ── setTransferLabel ──────────────────────────────────────────────────────────

describe('setTransferLabel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when transaction not found', async () => {
    mockTxFindFirst.mockResolvedValue(null);

    const result = await setTransferLabel(USER_ID, TX_ID, 'Some label');

    expect(result).toBe(false);
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('sets label to string and returns true', async () => {
    mockTxFindFirst.mockResolvedValue({ id: TX_ID, userId: USER_ID });
    mockTxUpdate.mockResolvedValue({});

    const result = await setTransferLabel(USER_ID, TX_ID, 'Loyer');

    expect(result).toBe(true);
    expect(mockTxUpdate).toHaveBeenCalledWith({
      where: { id: TX_ID },
      data: { transferLabel: 'Loyer', transferLabelRuleId: null },
    });
  });

  it('sets label to null and returns true', async () => {
    mockTxFindFirst.mockResolvedValue({ id: TX_ID, userId: USER_ID });
    mockTxUpdate.mockResolvedValue({});

    const result = await setTransferLabel(USER_ID, TX_ID, null);

    expect(result).toBe(true);
    expect(mockTxUpdate).toHaveBeenCalledWith({
      where: { id: TX_ID },
      data: { transferLabel: null, transferLabelRuleId: null },
    });
  });
});
