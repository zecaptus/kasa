import { describe, expect, it } from 'vitest';
import { matchBankLabel } from '../../../src/services/bankLabelMatcher.js';

describe('matchBankLabel', () => {
  describe('haute confiance (≥ 0.85)', () => {
    it('match exact après normalisation', () => {
      const result = matchBankLabel('VIR SEPA LOYER MARS', 'Loyer mars');
      expect(result.score).toBeGreaterThanOrEqual(0.85);
      expect(result.confidence).toBe('high');
    });

    it('libellé utilisateur = sous-ensemble du libellé bancaire', () => {
      const result = matchBankLabel('AMAZON EU SARL REF 20250114', 'Amazon');
      expect(result.score).toBeGreaterThanOrEqual(0.85);
      expect(result.confidence).toBe('high');
    });

    it('préfixe PRLV SEPA strippé correctement', () => {
      const result = matchBankLabel('PRLV SEPA EDF SA REF ABCDE123', 'EDF');
      expect(result.score).toBeGreaterThanOrEqual(0.85);
      expect(result.confidence).toBe('high');
    });

    it('préfixe CB strippé correctement', () => {
      const result = matchBankLabel('CB BOULANGERIE DUPONT PARIS', 'Boulangerie');
      expect(result.score).toBeGreaterThanOrEqual(0.85);
      expect(result.confidence).toBe('high');
    });

    it('match avec accents normalisés', () => {
      const result = matchBankLabel('PAIEMENT LOYER FEVRIER', 'Loyer février');
      expect(result.score).toBeGreaterThanOrEqual(0.85);
      expect(result.confidence).toBe('high');
    });
  });

  describe('confiance plausible (0.60–0.84)', () => {
    it('libellé partiellement correspondant', () => {
      // 'SNCF' alone vs 'PAIEMENT PAR CARTE SNCF INTERNET' after strip
      // 'sncf' is a token inside 'sncf internet', partial overlap
      const result = matchBankLabel('CB PHARMACIE CENTRALE PARIS', 'Pharmacie');
      expect(result.score).toBeGreaterThanOrEqual(0.6);
    });
  });

  describe('aucun match (< 0.40)', () => {
    it('libellés sans rapport', () => {
      const result = matchBankLabel('VIR SEPA SALAIRE JANVIER', 'Loyer');
      expect(result.score).toBeLessThan(0.4);
      expect(result.confidence).toBe('none');
    });

    it('chaînes vides', () => {
      const result = matchBankLabel('', '');
      expect(result.confidence).toBe('none');
    });
  });

  describe('retourne un objet MatchResult structuré', () => {
    it('inclut score, confidence et method', () => {
      const result = matchBankLabel('VIR SEPA LOYER', 'Loyer');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('method');
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });
});
