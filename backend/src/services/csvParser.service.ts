import { parse as csvParse } from 'csv-parse/sync';
import iconv from 'iconv-lite';

export interface ParsedTransaction {
  accountingDate: Date;
  valueDate: Date | null;
  label: string;
  detail: string | null;
  debit: number | null;
  credit: number | null;
  accountLabel: string;
}

export interface CsvMetadata {
  accountNumber: string | null;
  exportStartDate: Date | null;
  exportEndDate: Date | null;
  transactionCount: number | null;
  balanceDate: Date | null;
  balance: number | null;
  currency: string | null;
}

export interface ParsedCsvResult {
  metadata: CsvMetadata;
  transactions: ParsedTransaction[];
}

type CsvFormat = '5col' | '4col' | '5col-operation' | 'livret-a';

const HEADER_5COL = 'Date de comptabilisation';
const HEADER_5COL_OPERATION = "Date de l'opération";
const HEADER_4COL_DATE = 'Date';
const HEADER_4COL_MONTANT = 'Montant';
const HEADER_LIVRET_A = 'date_comptabilisation';

function decodeBuffer(buffer: Buffer): string {
  // Detect UTF-8 BOM
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.slice(3).toString('utf8');
  }
  return iconv.decode(buffer, 'windows-1252');
}

function parseAmount(raw: string | undefined): number | null {
  if (!raw || raw.trim() === '') return null;
  const normalized = raw.trim().replace(',', '.');
  const value = parseFloat(normalized);
  return Number.isNaN(value) ? null : value;
}

/**
 * Extracts account number from Excel format ="..." or plain string
 */
function extractAccountNumber(raw: string | undefined): string | null {
  return raw?.replace(/^="?|"?$/g, '').trim() || null;
}

/**
 * Parses balance and currency from "3,39 EUR" format
 */
function parseBalanceWithCurrency(raw: string | undefined): {
  balance: number | null;
  currency: string | null;
} {
  if (!raw) return { balance: null, currency: null };

  const parts = raw.trim().split(/\s+/);
  const balance = parts[0] ? parseAmount(parts[0]) : null;
  const currency = parts[1] ?? null;

  return { balance, currency };
}

/**
 * Parses the first metadata row of the CSV.
 * Format: ="account_number";start_date;end_date;count;balance_date;balance currency
 * Example: ="0105900051804855";01/02/2026;20/02/2026;35;18/02/2026;3,39 EUR
 */
function parseMetadataRow(row: string[]): CsvMetadata {
  const emptyMetadata: CsvMetadata = {
    accountNumber: null,
    exportStartDate: null,
    exportEndDate: null,
    transactionCount: null,
    balanceDate: null,
    balance: null,
    currency: null,
  };

  if (row.length < 6) return emptyMetadata;

  const [accountRaw, startDateRaw, endDateRaw, countRaw, balanceDateRaw, balanceRaw] = row;

  const accountNumber = extractAccountNumber(accountRaw);
  const exportStartDate = startDateRaw ? parseDate(startDateRaw) : null;
  const exportEndDate = endDateRaw ? parseDate(endDateRaw) : null;
  const balanceDate = balanceDateRaw ? parseDate(balanceDateRaw) : null;

  const countParsed = countRaw ? parseInt(countRaw.trim(), 10) : null;
  const transactionCount = countParsed !== null && !Number.isNaN(countParsed) ? countParsed : null;

  const { balance, currency } = parseBalanceWithCurrency(balanceRaw);

  return {
    accountNumber,
    exportStartDate,
    exportEndDate,
    transactionCount,
    balanceDate,
    balance,
    currency,
  };
}

function parseDate(raw: string): Date {
  // Expected format: DD/MM/YYYY
  const [day, month, year] = raw.trim().split('/');
  return new Date(`${year}-${month}-${day}`);
}

function is4ColFormat(row: string[], first: string): boolean {
  return first === HEADER_4COL_DATE && row.some((c) => c.trim() === HEADER_4COL_MONTANT);
}

function detectFormatFromRow(row: string[]): CsvFormat | null {
  const first = row[0]?.trim() ?? '';
  if (first === HEADER_5COL) return '5col';
  if (first === HEADER_5COL_OPERATION) return '5col-operation';
  if (is4ColFormat(row, first)) return '4col';
  if (first === HEADER_LIVRET_A) return 'livret-a';
  return null;
}

function detectFormat(rows: string[][]): CsvFormat | null {
  for (const row of rows) {
    if (row.length === 0) continue;
    const format = detectFormatFromRow(row);
    if (format) return format;
  }
  return null;
}

function isHeaderRow(row: string[], format: CsvFormat): boolean {
  const first = row[0]?.trim() ?? '';
  if (format === '5col') return first === HEADER_5COL;
  if (format === '5col-operation') return first === HEADER_5COL_OPERATION;
  if (format === 'livret-a') return first === HEADER_LIVRET_A;
  return first === HEADER_4COL_DATE;
}

function findHeaderRowIndex(rows: string[][], format: CsvFormat): number {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && isHeaderRow(row, format)) return i;
  }
  return -1;
}

/**
 * Extracts a cell value from pre-header rows by key name.
 */
function findPreHeaderValue(rows: string[][], headerIdx: number, key: string): string {
  for (let i = 0; i < headerIdx; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    if ((row[0]?.trim() ?? '') === key) return row[1]?.trim() ?? '';
  }
  return '';
}

/**
 * Scans pre-header rows for SG account metadata.
 * Prefers "Libellé du compte", falls back to "Numéro de compte".
 */
function extractAccountLabel(rows: string[][], headerIdx: number): string {
  return (
    findPreHeaderValue(rows, headerIdx, 'Libellé du compte') ||
    findPreHeaderValue(rows, headerIdx, 'Numéro de compte')
  );
}

/**
 * Derives a display label from the uploaded filename.
 * Strips .csv extension, replaces underscores and dashes with spaces.
 */
export function accountLabelFromFilename(filename: string): string {
  return filename
    .replace(/\.csv$/i, '')
    .replace(/[_-]/g, ' ')
    .trim();
}

function parseRow5col(row: string[], accountLabel: string): ParsedTransaction | null {
  const [dateStr, valueDateStr, label, debitRaw, creditRaw] = row;
  if (!dateStr || !label) return null;
  const accountingDate = parseDate(dateStr);
  if (Number.isNaN(accountingDate.getTime())) return null;
  return {
    accountingDate,
    valueDate: valueDateStr ? parseDate(valueDateStr) : null,
    label: label.trim(),
    detail: null,
    debit: parseAmount(debitRaw),
    credit: parseAmount(creditRaw),
    accountLabel,
  };
}

function parse5col(rows: string[][], headerIdx: number, accountLabel: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length !== 5) continue;
    const tx = parseRow5col(row, accountLabel);
    if (tx) transactions.push(tx);
  }
  return transactions;
}

function parseRow4col(row: string[], accountLabel: string): ParsedTransaction | null {
  const [dateStr, label, montantRaw] = row;
  if (!dateStr || !label) return null;
  const accountingDate = parseDate(dateStr);
  if (Number.isNaN(accountingDate.getTime())) return null;
  const montant = parseAmount(montantRaw);
  return {
    accountingDate,
    valueDate: null,
    label: label.trim(),
    detail: null,
    debit: montant !== null && montant < 0 ? Math.abs(montant) : null,
    credit: montant !== null && montant > 0 ? montant : null,
    accountLabel,
  };
}

function parse4col(rows: string[][], headerIdx: number, accountLabel: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length !== 4) continue;
    const tx = parseRow4col(row, accountLabel);
    if (tx) transactions.push(tx);
  }
  return transactions;
}

function parseRow5colOperation(row: string[], accountLabel: string): ParsedTransaction | null {
  // Format: Date de l'opération, Libellé, Détail de l'écriture, Montant, Devise
  const [dateStr, label, detail, montantRaw, _devise] = row;
  if (!dateStr || !label) return null;
  const accountingDate = parseDate(dateStr);
  if (Number.isNaN(accountingDate.getTime())) return null;
  const montant = parseAmount(montantRaw);

  return {
    accountingDate,
    valueDate: null,
    label: label.trim(),
    detail: detail?.trim() || null,
    debit: montant !== null && montant < 0 ? Math.abs(montant) : null,
    credit: montant !== null && montant > 0 ? montant : null,
    accountLabel,
  };
}

function parse5colOperation(
  rows: string[][],
  headerIdx: number,
  accountLabel: string,
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length !== 5) continue;
    const tx = parseRow5colOperation(row, accountLabel);
    if (tx) transactions.push(tx);
  }
  return transactions;
}

/**
 * Parses the short metadata row used by Livret A CSV exports.
 * Format: ="account_number";start_date;end_date;
 */
function parseLivretAMetadata(row: string[]): CsvMetadata {
  const [accountRaw, startDateRaw, endDateRaw] = row;
  return {
    accountNumber: extractAccountNumber(accountRaw),
    exportStartDate: startDateRaw ? parseDate(startDateRaw) : null,
    exportEndDate: endDateRaw ? parseDate(endDateRaw) : null,
    transactionCount: null,
    balanceDate: null,
    balance: null,
    currency: null,
  };
}

/**
 * Extracts metadata from first row if it matches metadata format, not a header row.
 * Supports 6-column full format and 3-column Livret A format.
 */
function tryExtractMetadata(rows: string[][]): CsvMetadata {
  const emptyMetadata: CsvMetadata = {
    accountNumber: null,
    exportStartDate: null,
    exportEndDate: null,
    transactionCount: null,
    balanceDate: null,
    balance: null,
    currency: null,
  };

  const firstRow = rows[0];
  if (!firstRow || detectFormatFromRow(firstRow)) return emptyMetadata;
  if (firstRow.length >= 6) return parseMetadataRow(firstRow);

  // Livret A short metadata: ="accountNumber";startDate;endDate;
  const firstCell = firstRow[0] ?? '';
  if (firstRow.length >= 3 && firstCell.startsWith('=')) return parseLivretAMetadata(firstRow);

  return emptyMetadata;
}

function parseRowLivretA(row: string[], accountLabel: string): ParsedTransaction | null {
  // Format: date_comptabilisation;libellé_complet_operation;montant_operation;devise;
  // Rows have a trailing semicolon so csv-parse gives 5 elements, montant is at index 2.
  const [dateStr, label, montantRaw] = row;
  if (!dateStr || !label) return null;
  const accountingDate = parseDate(dateStr);
  if (Number.isNaN(accountingDate.getTime())) return null;
  const montant = parseAmount(montantRaw);
  return {
    accountingDate,
    valueDate: null,
    label: label.trim(),
    detail: null,
    debit: montant !== null && montant < 0 ? Math.abs(montant) : null,
    credit: montant !== null && montant > 0 ? montant : null,
    accountLabel,
  };
}

function parseLivretA(
  rows: string[][],
  headerIdx: number,
  accountLabel: string,
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    // At least date + label + montant (devise + trailing empty are optional)
    if (!row || row.length < 3) continue;
    const tx = parseRowLivretA(row, accountLabel);
    if (tx) transactions.push(tx);
  }
  return transactions;
}

/**
 * Parses transactions based on detected format
 */
function parseTransactionsByFormat(
  rows: string[][],
  format: CsvFormat,
  headerIdx: number,
  accountLabel: string,
): ParsedTransaction[] {
  if (format === '5col') return parse5col(rows, headerIdx, accountLabel);
  if (format === '5col-operation') return parse5colOperation(rows, headerIdx, accountLabel);
  if (format === 'livret-a') return parseLivretA(rows, headerIdx, accountLabel);
  return parse4col(rows, headerIdx, accountLabel);
}

export async function parseSgCsv(buffer: Buffer, filename?: string): Promise<ParsedCsvResult> {
  if (buffer.length === 0) {
    throw new Error('INVALID_CSV_FORMAT');
  }

  const content = decodeBuffer(buffer);

  const rows: string[][] = csvParse(content, {
    delimiter: ';',
    relax_column_count: true,
    skip_empty_lines: true,
    relax_quotes: true,
  }) as string[][];

  if (rows.length === 0) {
    throw new Error('INVALID_CSV_FORMAT');
  }

  const metadata = tryExtractMetadata(rows);

  const format = detectFormat(rows);
  if (!format) {
    throw new Error('INVALID_CSV_FORMAT');
  }

  const headerIdx = findHeaderRowIndex(rows, format);
  if (headerIdx === -1) {
    throw new Error('INVALID_CSV_FORMAT');
  }

  const accountLabel =
    extractAccountLabel(rows, headerIdx) ||
    metadata.accountNumber ||
    (filename ? accountLabelFromFilename(filename) : '');

  const transactions = parseTransactionsByFormat(rows, format, headerIdx, accountLabel);

  return { metadata, transactions };
}
