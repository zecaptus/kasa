const talisman = require('talisman/metrics/dice') as
  | { default?: (a: string, b: string) => number }
  | ((a: string, b: string) => number);

// talisman/metrics/dice returns Sørensen-Dice SIMILARITY (0=no overlap, 1=identical)
const bigramDiceSimilarity: (a: string, b: string) => number =
  typeof talisman === 'function'
    ? talisman
    : (talisman as { default: (a: string, b: string) => number }).default;

// ─── Constants ────────────────────────────────────────────────────────────────

const BANK_PREFIXES = [
  'VIR SEPA RECU DE',
  'VIR SEPA',
  'VIR INST',
  'VIR TRESO',
  'PRLV SEPA',
  'PRLV EUROPEEN',
  'RETRAIT DAB',
  'RETRAIT CB',
  'AVOIR CB',
  'ANNUL VIR',
  'REMISE CB',
  'VIREMENT DE',
  'VIREMENT A',
  'VIREMENT RECU',
  'PAIEMENT PAR CARTE',
  'CB/',
  'CB ',
  'PRELEVEMENT SEPA',
  'ECHEANCE',
  'CHEQUE',
  'REM CHQ',
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchResult {
  score: number;
  confidence: 'high' | 'plausible' | 'weak' | 'none';
  method: 'token-set' | 'bigram-dice';
}

// ─── Preprocessing ────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripBankingPrefix(bankLabel: string): string {
  const upper = bankLabel.toUpperCase();
  for (const prefix of BANK_PREFIXES) {
    if (upper.startsWith(prefix)) {
      return bankLabel.slice(prefix.length).trim();
    }
  }
  return bankLabel;
}

function tokenSetRatio(a: string, b: string): number {
  const tokensA = new Set(a.split(' ').filter((t) => t.length >= 2));
  const tokensB = new Set(b.split(' ').filter((t) => t.length >= 2));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  const intersection = new Set([...tokensA].filter((t) => tokensB.has(t)));
  const smaller = tokensA.size <= tokensB.size ? tokensA : tokensB;

  return intersection.size / smaller.size;
}

// ─── Main matching function ───────────────────────────────────────────────────

const HIGH_THRESHOLD = 0.85;
const PLAUSIBLE_THRESHOLD = 0.6;
const WEAK_THRESHOLD = 0.4;

export function matchBankLabel(bankRaw: string, userLabel: string): MatchResult {
  if (!bankRaw.trim() || !userLabel.trim()) {
    return { score: 0, confidence: 'none', method: 'token-set' };
  }

  const bankStripped = stripBankingPrefix(bankRaw);
  const bankNorm = normalize(bankStripped);
  const userNorm = normalize(userLabel);

  const tsRatio = tokenSetRatio(bankNorm, userNorm);
  const diceSim = bigramDiceSimilarity ? Math.max(0, bigramDiceSimilarity(bankNorm, userNorm)) : 0;

  const score = Math.max(tsRatio, diceSim);
  const method: MatchResult['method'] = tsRatio >= diceSim ? 'token-set' : 'bigram-dice';

  const confidence: MatchResult['confidence'] =
    score >= HIGH_THRESHOLD
      ? 'high'
      : score >= PLAUSIBLE_THRESHOLD
        ? 'plausible'
        : score >= WEAK_THRESHOLD
          ? 'weak'
          : 'none';

  return { score: Math.round(score * 1000) / 1000, confidence, method };
}
