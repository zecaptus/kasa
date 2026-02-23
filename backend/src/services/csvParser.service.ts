import { parse as csvParse } from 'csv-parse/sync';
import iconv from 'iconv-lite';

export interface ParsedTransaction {
  accountingDate: Date;
  valueDate: Date | null;
  label: string;
  detail: string | null;
  debit: number | null;
  credit: number | null;
}

type CsvFormat = '5col' | '4col' | '5col-operation';

const HEADER_5COL = 'Date de comptabilisation';
const HEADER_5COL_OPERATION = "Date de l'opération";
const HEADER_4COL_DATE = 'Date';
const HEADER_4COL_MONTANT = 'Montant';

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
  return first === HEADER_4COL_DATE;
}

function findHeaderRowIndex(rows: string[][], format: CsvFormat): number {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && isHeaderRow(row, format)) return i;
  }
  return -1;
}

function parseRow5col(row: string[]): ParsedTransaction | null {
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
  };
}

function parse5col(rows: string[][], headerIdx: number): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length !== 5) continue;
    const tx = parseRow5col(row);
    if (tx) transactions.push(tx);
  }
  return transactions;
}

function parseRow4col(row: string[]): ParsedTransaction | null {
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
  };
}

function parse4col(rows: string[][], headerIdx: number): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length !== 4) continue;
    const tx = parseRow4col(row);
    if (tx) transactions.push(tx);
  }
  return transactions;
}

function parseRow5colOperation(row: string[]): ParsedTransaction | null {
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
  };
}

function parse5colOperation(rows: string[][], headerIdx: number): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length !== 5) continue;
    const tx = parseRow5colOperation(row);
    if (tx) transactions.push(tx);
  }
  return transactions;
}

export async function parseSgCsv(buffer: Buffer): Promise<ParsedTransaction[]> {
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

  const format = detectFormat(rows);
  if (!format) {
    throw new Error('INVALID_CSV_FORMAT');
  }

  const headerIdx = findHeaderRowIndex(rows, format);
  if (headerIdx === -1) {
    throw new Error('INVALID_CSV_FORMAT');
  }

  if (format === '5col') {
    return parse5col(rows, headerIdx);
  }
  if (format === '5col-operation') {
    return parse5colOperation(rows, headerIdx);
  }
  return parse4col(rows, headerIdx);
}
