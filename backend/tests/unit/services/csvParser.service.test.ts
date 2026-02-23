import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import iconv from 'iconv-lite';
import { describe, expect, it } from 'vitest';
import { type ParsedTransaction, parseSgCsv } from '../../../src/services/csvParser.service.js';

const FIXTURES_DIR = join(__dirname, '../../fixtures');

function loadFixture(name: string): Buffer {
  return readFileSync(join(FIXTURES_DIR, name));
}

describe('parseSgCsv', () => {
  describe('format 5 colonnes (compte courant)', () => {
    it('parse un fichier SG valide et retourne les transactions', async () => {
      const buffer = loadFixture('sg-sample.csv');
      const result = await parseSgCsv(buffer);

      expect(result).toHaveLength(10);
    });

    it('extrait correctement date, libellé, débit et crédit', async () => {
      const buffer = loadFixture('sg-sample.csv');
      const result = await parseSgCsv(buffer);

      const first = result[0] as ParsedTransaction;
      expect(first.accountingDate).toEqual(new Date('2025-01-15'));
      expect(first.label).toBe('PAIEMENT PAR CARTE 14/01/25 CARREFOUR MARKET PARIS 75');
      expect(first.debit).toBe(42.5);
      expect(first.credit).toBeNull();
    });

    it('extrait les transactions créditrices correctement', async () => {
      const buffer = loadFixture('sg-sample.csv');
      const result = await parseSgCsv(buffer);

      const creditTx = result.find((t) => t.credit !== null);
      expect(creditTx).toBeDefined();
      expect(creditTx?.credit).toBe(2500);
      expect(creditTx?.debit).toBeNull();
    });

    it('ignore la ligne preamble (numéro de compte)', async () => {
      const buffer = loadFixture('sg-sample.csv');
      const result = await parseSgCsv(buffer);
      // The preamble "Numéro de compte;12345678901" must not appear as a transaction
      const preambleTx = result.find((t) => t.label.includes('12345678901'));
      expect(preambleTx).toBeUndefined();
    });

    it('ignore la ligne footer (solde)', async () => {
      const buffer = loadFixture('sg-sample.csv');
      const result = await parseSgCsv(buffer);
      // "Solde au 15/01/2025" must not appear
      const footerTx = result.find((t) => t.label.includes('Solde au'));
      expect(footerTx).toBeUndefined();
    });

    it('normalise les montants (virgule → point)', async () => {
      const buffer = loadFixture('sg-sample.csv');
      const result = await parseSgCsv(buffer);
      // 42,50 should become 42.5
      const tx = result.find((t) => t.debit !== null && t.label.includes('CARREFOUR'));
      expect(tx?.debit).toBe(42.5);
    });
  });

  describe('fichier vide ou invalide', () => {
    it('retourne un tableau vide pour un fichier avec seulement un header', async () => {
      const csv = Buffer.from('Date de comptabilisation;Date de valeur;Libellé;Débit;Crédit\n');
      const result = await parseSgCsv(csv);
      expect(result).toHaveLength(0);
    });

    it('lève une erreur pour un fichier sans header SG reconnaissable', async () => {
      const csv = Buffer.from('foo,bar,baz\n1,2,3\n');
      await expect(parseSgCsv(csv)).rejects.toThrow('INVALID_CSV_FORMAT');
    });

    it('lève une erreur pour un buffer vide', async () => {
      await expect(parseSgCsv(Buffer.from(''))).rejects.toThrow('INVALID_CSV_FORMAT');
    });

    it('ignore les lignes avec nombre de colonnes incorrect', async () => {
      const csv = Buffer.from(
        'Date de comptabilisation;Date de valeur;Libellé;Débit;Crédit\n' +
          '15/01/2025;15/01/2025;CARREFOUR;42,50;\n' +
          'bad_line_with_only_one_column\n' +
          '14/01/2025;14/01/2025;AMAZON;29,99;\n',
      );
      const result = await parseSgCsv(csv);
      expect(result).toHaveLength(2);
    });
  });

  describe('format 4 colonnes (livret)', () => {
    it('parse le format 4 colonnes avec montant signé', async () => {
      const csv = Buffer.from(
        'Date;Libellé;Montant;Devise\n' +
          '15/01/2025;VIREMENT ENTRANT;500,00;EUR\n' +
          '10/01/2025;RETRAIT;-100,00;EUR\n',
      );
      const result = await parseSgCsv(csv);
      expect(result).toHaveLength(2);

      const credit = result.find((t) => t.credit !== null);
      const debit = result.find((t) => t.debit !== null);
      expect(credit?.credit).toBe(500);
      expect(debit?.debit).toBe(100);
    });
  });

  describe("format 5 colonnes avec Date de l'opération", () => {
    it('parse le format avec en-tête "Date de l\'opération"', async () => {
      const content =
        '="0105900051804855";01/02/2026;20/02/2026;35;18/02/2026;3,39 EUR\n' +
        '\n' +
        "Date de l'opération;Libellé;Détail de l'écriture;Montant de l'opération;Devise\n" +
        '18/02/2026;CARTE X1306 17/02 ;CARTE X1306 17/02 ROMCOCO;-26,01;EUR\n' +
        '17/02/2026;VIR RECU 960488198;VIR RECU 9604881985018 DE: M. STEEVE PITIS;50,00;EUR\n' +
        '17/02/2026;PRELEVEMENT EUROPE;PRELEVEMENT EUROPEEN 4704545537;-26,00;EUR\n';
      // Encode as Windows-1252 to simulate real SG file
      const csv = iconv.encode(content, 'windows-1252');

      const result = await parseSgCsv(csv);
      expect(result).toHaveLength(3);

      const debit = result[0];
      expect(debit?.accountingDate).toEqual(new Date('2026-02-18'));
      expect(debit?.label).toBe('CARTE X1306 17/02');
      expect(debit?.detail).toBe('CARTE X1306 17/02 ROMCOCO');
      expect(debit?.debit).toBe(26.01);
      expect(debit?.credit).toBeNull();

      const credit = result[1];
      expect(credit?.label).toBe('VIR RECU 960488198');
      expect(credit?.detail).toBe('VIR RECU 9604881985018 DE: M. STEEVE PITIS');
      expect(credit?.credit).toBe(50);
      expect(credit?.debit).toBeNull();
    });

    it('gère les formules Excel (=" ") en début de fichier', async () => {
      const content =
        '="0105900051804855";01/02/2026;20/02/2026;35;18/02/2026;3,39 EUR\n' +
        '\n' +
        "Date de l'opération;Libellé;Détail de l'écriture;Montant de l'opération;Devise\n" +
        '18/02/2026;TEST;DETAIL;-10,00;EUR\n';
      // Encode as Windows-1252
      const csv = iconv.encode(content, 'windows-1252');

      const result = await parseSgCsv(csv);
      expect(result).toHaveLength(1);
      expect(result[0]?.label).toBe('TEST');
      expect(result[0]?.detail).toBe('DETAIL');
    });
  });
});
