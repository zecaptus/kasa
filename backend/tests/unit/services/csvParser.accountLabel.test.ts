import iconv from 'iconv-lite';
import { describe, expect, it } from 'vitest';
import { accountLabelFromFilename, parseSgCsv } from '../../../src/services/csvParser.service.js';

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a 5col SG CSV buffer encoded as windows-1252 (same encoding that real
 * SG exports use).  The parser decodes with iconv windows-1252 unless a UTF-8
 * BOM is present, so we must match that encoding when pre-header keys contain
 * French accented characters.
 */
function make5colBuf(preHeaderLine: string): Buffer {
  const content = [
    preHeaderLine,
    'Date de comptabilisation;Date de valeur;Libellé;Débit;Crédit',
    '15/01/2025;15/01/2025;PAIEMENT CARREFOUR;42,50;',
    '14/01/2025;14/01/2025;VIR SEPA SALAIRE;;2500,00',
  ].join('\n');
  return iconv.encode(content, 'windows-1252');
}

function make4colBuf(preHeaderLine: string): Buffer {
  const content = [
    preHeaderLine,
    'Date;Libellé;Montant;Devise',
    '15/01/2025;VIREMENT ENTRANT;500,00;EUR',
    '10/01/2025;RETRAIT;-100,00;EUR',
  ].join('\n');
  return iconv.encode(content, 'windows-1252');
}

function make5colOperationBuf(preHeaderLine: string): Buffer {
  const content = [
    preHeaderLine,
    '',
    "Date de l'opération;Libellé;Détail de l'écriture;Montant de l'opération;Devise",
    '18/02/2026;CARTE X1306;CARTE X1306 17/02 ROMCOCO;-26,01;EUR',
    '17/02/2026;VIR RECU;VIR RECU SALAIRE;50,00;EUR',
  ].join('\n');
  return iconv.encode(content, 'windows-1252');
}

// ── accountLabelFromFilename ───────────────────────────────────────────────────

describe('accountLabelFromFilename', () => {
  it('strips .csv extension', () => {
    expect(accountLabelFromFilename('compte-courant.csv')).toBe('compte courant');
  });

  it('replaces underscores with spaces', () => {
    expect(accountLabelFromFilename('livret_A.csv')).toBe('livret A');
  });

  it('handles mixed separators', () => {
    expect(accountLabelFromFilename('compte_courant-2025.csv')).toBe('compte courant 2025');
  });

  it('is case-insensitive for .CSV extension', () => {
    expect(accountLabelFromFilename('MonCompte.CSV')).toBe('MonCompte');
  });
});

// ── parseSgCsv — accountLabel extraction ─────────────────────────────────────

describe('parseSgCsv — accountLabel extraction', () => {
  describe('5col format', () => {
    it('extracts accountLabel from "Libellé du compte" pre-header', async () => {
      const buffer = make5colBuf('Libellé du compte;Compte courant');
      const result = await parseSgCsv(buffer, 'irrelevant.csv');

      expect(result.length).toBeGreaterThan(0);
      for (const tx of result) {
        expect(tx.accountLabel).toBe('Compte courant');
      }
    });

    it('falls back to "Numéro de compte" when "Libellé du compte" is absent', async () => {
      const buffer = make5colBuf('Numéro de compte;FR76 3000 1234');
      const result = await parseSgCsv(buffer);

      expect(result.length).toBeGreaterThan(0);
      for (const tx of result) {
        expect(tx.accountLabel).toBe('FR76 3000 1234');
      }
    });

    it('derives accountLabel from filename when no pre-header is present', async () => {
      // Plain CSV with no pre-header row — header is the very first line.
      // Encode as windows-1252 to stay consistent with parser expectations.
      const plainCsv = iconv.encode(
        'Date de comptabilisation;Date de valeur;Libellé;Débit;Crédit\n' +
          '15/01/2025;15/01/2025;PAIEMENT CARREFOUR;42,50;\n',
        'windows-1252',
      );
      const result = await parseSgCsv(plainCsv, 'compte-courant.csv');

      expect(result.length).toBeGreaterThan(0);
      for (const tx of result) {
        expect(tx.accountLabel).toBe('compte courant');
      }
    });

    it('sets accountLabel to empty string when no pre-header and no filename', async () => {
      const plainCsv = iconv.encode(
        'Date de comptabilisation;Date de valeur;Libellé;Débit;Crédit\n' +
          '15/01/2025;15/01/2025;PAIEMENT CARREFOUR;42,50;\n',
        'windows-1252',
      );
      const result = await parseSgCsv(plainCsv);

      expect(result.length).toBeGreaterThan(0);
      for (const tx of result) {
        expect(tx.accountLabel).toBe('');
      }
    });

    it('prefers "Libellé du compte" over "Numéro de compte" when both are present', async () => {
      const content = [
        'Numéro de compte;FR76 3000 1234',
        'Libellé du compte;Compte courant',
        'Date de comptabilisation;Date de valeur;Libellé;Débit;Crédit',
        '15/01/2025;15/01/2025;TEST;10,00;',
      ].join('\n');
      const buffer = iconv.encode(content, 'windows-1252');
      const result = await parseSgCsv(buffer);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]?.accountLabel).toBe('Compte courant');
    });
  });

  describe('4col format', () => {
    it('extracts accountLabel from "Libellé du compte" pre-header', async () => {
      const buffer = make4colBuf('Libellé du compte;Livret A');
      const result = await parseSgCsv(buffer);

      expect(result.length).toBeGreaterThan(0);
      for (const tx of result) {
        expect(tx.accountLabel).toBe('Livret A');
      }
    });

    it('uses "Numéro de compte" fallback in 4col format', async () => {
      const buffer = make4colBuf('Numéro de compte;FR76 9999 8888');
      const result = await parseSgCsv(buffer);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]?.accountLabel).toBe('FR76 9999 8888');
    });
  });

  describe('5col-operation format', () => {
    it('extracts accountLabel from "Libellé du compte" pre-header', async () => {
      const buffer = make5colOperationBuf('Libellé du compte;Compte pro');
      const result = await parseSgCsv(buffer, 'pro.csv');

      expect(result.length).toBeGreaterThan(0);
      for (const tx of result) {
        expect(tx.accountLabel).toBe('Compte pro');
      }
    });
  });
});
