import { describe, it, expect } from 'vitest';
import { parseTransactionsFromSheet, parseDanishNumber, parseDanishDate } from './import-utils';
import { PL } from '@/data/budget-constants';

describe('import-utils', () => {
  it('parser negative beløb på udgiftskonto uden omklassificering', () => {
    const rows = [
      ['dato', 'konto', 'beløb', 'tekst'],
      ['01.03.2026', 3604, -1250.50, 'Softwarerefusion'],
      ['15.03.2026', 4450, -89.00, 'Rentekorrektion'],
    ];
    const { parsed, error } = parseTransactionsFromSheet(rows, PL);
    expect(error).toBeUndefined();
    expect(parsed).toHaveLength(2);
    expect(parsed[0].konto).toBe(3604);
    expect(parsed[0].belob).toBe(-1250.5);
    expect(parsed[1].konto).toBe(4450);
    expect(parsed[1].belob).toBe(-89);
  });

  it('parser negative beløb på indtægtskonto uden ændring', () => {
    const rows = [
      ['dato', 'konto', 'beløb', 'tekst'],
      ['01.03.2026', 1010, -5000, 'Kreditnota salg'],
    ];
    const { parsed, error } = parseTransactionsFromSheet(rows, PL);
    expect(error).toBeUndefined();
    expect(parsed).toHaveLength(1);
    expect(parsed[0].konto).toBe(1010);
    expect(parsed[0].belob).toBe(-5000);
  });

  it('parser dansk talformat med komma', () => {
    expect(parseDanishNumber('1.234,56')).toBe(1234.56);
    expect(parseDanishNumber('-2.500,00')).toBe(-2500);
  });

  it('parser dansk datoformat', () => {
    expect(parseDanishDate('01.03.2026')).toBe('2026-03-01');
  });
});
