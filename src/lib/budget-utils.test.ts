import { describe, it, expect } from 'vitest';
import {
  getRevenueAccounts,
  resolveEffectiveMoms,
  computeRealized,
  computePL,
  computeLiquiditySection,
} from './budget-utils';
import { PL, YEAR, INIT_LIQUIDITY_CONFIG, type PLRow, type BskatRate } from '@/data/budget-constants';


describe('getRevenueAccounts', () => {
  it('collects acct rows before the first total plus 4310/4360/4610 on the default PL', () => {
    const set = getRevenueAccounts(PL);
    // Omsætning-sektionen
    [1010, 1015, 1020, 1021, 1050, 1055, 1060, 1065].forEach(nr =>
      expect(set.has(nr)).toBe(true),
    );
    // Eksplicitte "andre indtægter"
    expect(set.has(4310)).toBe(true);
    expect(set.has(4360)).toBe(true);
    expect(set.has(4610)).toBe(true);
    // Udgiftskonti er IKKE med
    expect(set.has(1310)).toBe(false);
    expect(set.has(2210)).toBe(false);
    expect(set.has(3410)).toBe(false);
  });

  it('always includes 4310/4360/4610 even when PL does not list them', () => {
    const rows: PLRow[] = [
      { t: 'sec', lbl: 'Omsætning' },
      { t: 'acct', nr: 1010, lbl: 'Salg' },
      { t: 'total', id: 'oms', sum: 'grp:oms' },
      { t: 'acct', nr: 2000, lbl: 'Noget udgift' },
    ];
    const set = getRevenueAccounts(rows);
    expect(set.has(1010)).toBe(true);
    expect(set.has(4310)).toBe(true);
    expect(set.has(4360)).toBe(true);
    expect(set.has(4610)).toBe(true);
    expect(set.has(2000)).toBe(false);
  });

  it('treats all acct rows as revenue when no total row is present', () => {
    const rows: PLRow[] = [
      { t: 'acct', nr: 1010 },
      { t: 'acct', nr: 2000 },
      { t: 'acct', nr: 3000 },
    ];
    const set = getRevenueAccounts(rows);
    expect(set.has(1010)).toBe(true);
    expect(set.has(2000)).toBe(true);
    expect(set.has(3000)).toBe(true);
  });

  it('returns only the explicit extras for an empty PL', () => {
    const set = getRevenueAccounts([]);
    expect([...set].sort()).toEqual([4310, 4360, 4610]);
  });
});

describe('resolveEffectiveMoms', () => {
  it('returns txMoms verbatim when set, ignoring any inference', () => {
    expect(resolveEffectiveMoms('U25', 1310, PL)).toBe('U25');
    expect(resolveEffectiveMoms('I25', 1010, PL)).toBe('I25');
  });

  it('uses PLRow.moms when txMoms is missing', () => {
    const rows: PLRow[] = [{ t: 'acct', nr: 5000, lbl: 'Andet', moms: 'I25' }];
    expect(resolveEffectiveMoms(null, 5000, rows)).toBe('I25');
  });

  it('returns null when label indicates u/moms', () => {
    expect(resolveEffectiveMoms(null, 1015, PL)).toBeNull(); // "Salg til kunder u/moms"
    expect(resolveEffectiveMoms(null, 3411, PL)).toBeNull(); // "Husleje u/moms"
  });

  it('infers U25 for revenue accounts with m/moms in label', () => {
    expect(resolveEffectiveMoms(null, 1010, PL)).toBe('U25'); // Salg m/moms
  });

  it('infers I25 for expense accounts with m/moms in label', () => {
    expect(resolveEffectiveMoms(null, 1310, PL)).toBe('I25'); // Direkte omk. m/moms
    expect(resolveEffectiveMoms(null, 3410, PL)).toBe('I25'); // Husleje m/moms
    expect(resolveEffectiveMoms(null, 3660, PL)).toBe('I25'); // Faglitteratur m/moms
  });

  it('returns null when no label/moms info is available', () => {
    expect(resolveEffectiveMoms(null, 99999, PL)).toBeNull();
    const rows: PLRow[] = [{ t: 'acct', nr: 5000, lbl: 'Ingen momshint' }];
    expect(resolveEffectiveMoms(null, 5000, rows)).toBeNull();
  });
});

describe('computeRealized', () => {
  it('nets U25 by 1.25 and negates onto konto-month key', () => {
    const r = computeRealized(
      [{ dato: `${YEAR}-03-15`, konto: 1010, belob: 1250, moms: 'U25' }],
      YEAR,
      PL,
    );
    // 1250 / 1.25 = 1000, negated => -1000
    expect(r['1010-3']).toBeCloseTo(-1000, 5);
  });

  it('leaves belob raw when there is no moms', () => {
    const r = computeRealized(
      [{ dato: `${YEAR}-01-10`, konto: 1015, belob: 500, moms: null }],
      YEAR,
      PL,
    );
    expect(r['1015-1']).toBe(-500);
  });

  it('ignores transactions outside target year', () => {
    const r = computeRealized(
      [{ dato: `2020-01-10`, konto: 1010, belob: 100, moms: null }],
      YEAR,
      PL,
    );
    expect(r['1010-1']).toBeUndefined();
  });

  it('ignores rows with missing or invalid dates', () => {
    const r = computeRealized(
      [
        { dato: '', konto: 1010, belob: 100, moms: null },
        { dato: 'not-a-date', konto: 1010, belob: 100, moms: null },
      ],
      YEAR,
      PL,
    );
    expect(Object.keys(r)).toHaveLength(0);
  });

  it('sums multiple transactions for same konto+month', () => {
    const r = computeRealized(
      [
        { dato: `${YEAR}-02-01`, konto: 1015, belob: 100, moms: null },
        { dato: `${YEAR}-02-20`, konto: 1015, belob: 250, moms: null },
      ],
      YEAR,
      PL,
    );
    expect(r['1015-2']).toBe(-350);
  });

  it('uses label fallback: 1310 (m/moms expense) => I25 netting', () => {
    const r = computeRealized(
      [{ dato: `${YEAR}-04-01`, konto: 1310, belob: 1250, moms: null }],
      YEAR,
      PL,
    );
    // I25 => divide by 1.25 => 1000, negated
    expect(r['1310-4']).toBeCloseTo(-1000, 5);
  });
});

describe('computePL', () => {
  const miniPL: PLRow[] = [
    { t: 'sec', lbl: 'Omsætning' },
    { t: 'acct', nr: 1010, lbl: 'Salg m/moms', grp: 'oms' },
    { t: 'acct', nr: 1020, lbl: 'Salg 2', grp: 'oms' },
    { t: 'total', lbl: 'Oms i alt', id: 'oms', sum: 'grp:oms' },
    { t: 'acct', nr: 1310, lbl: 'Direkte omk m/moms', grp: 'dir' },
    { t: 'total', lbl: 'Dir i alt', id: 'dir', sum: 'range:1300-1399' },
    { t: 'res', lbl: 'DB', id: 'db', sum: 'id:oms+id:dir' },
  ];

  it('builds 12-element r/b arrays for acct rows', () => {
    const realized = { '1010-1': 100, '1010-6': 50 };
    const budget = { 1010: [10, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
    const pl = computePL(realized, budget, miniPL);
    expect(pl[1010].r).toHaveLength(12);
    expect(pl[1010].b).toHaveLength(12);
    expect(pl[1010].r[0]).toBe(100);
    expect(pl[1010].r[5]).toBe(50);
    expect(pl[1010].r[2]).toBe(0);
    expect(pl[1010].b[1]).toBe(20);
    expect(pl[1010].b[11]).toBe(0);
  });

  it('defaults missing accounts/budget to zeros', () => {
    const pl = computePL({}, {}, miniPL);
    expect(pl[1020].r.every(v => v === 0)).toBe(true);
    expect(pl[1020].b.every(v => v === 0)).toBe(true);
  });

  it('sums grp: totals per month', () => {
    const realized = { '1010-1': 100, '1020-1': 50, '1010-2': 10 };
    const budget = { 1010: Array(12).fill(1), 1020: Array(12).fill(2) };
    const pl = computePL(realized, budget, miniPL);
    expect(pl.oms.r[0]).toBe(150);
    expect(pl.oms.r[1]).toBe(10);
    expect(pl.oms.b[0]).toBe(3);
  });

  it('sums range: totals per month', () => {
    const realized = { '1310-3': 77 };
    const pl = computePL(realized, {}, miniPL);
    expect(pl.dir.r[2]).toBe(77);
  });

  it('chains id: references (res summing prior totals)', () => {
    const realized = { '1010-1': 100, '1310-1': -30 };
    const pl = computePL(realized, {}, miniPL);
    expect(pl.db.r[0]).toBe(70);
  });

  it('handles empty PL without throwing', () => {
    expect(() => computePL({}, {}, [])).not.toThrow();
  });
});

describe('computeLiquiditySection', () => {
  const emptyPL = {} as Record<string | number, { r: number[]; b: number[] }>;

  const baseParams = (overrides: Partial<Parameters<typeof computeLiquiditySection>[0]>) => ({
    pl: emptyPL,
    plRows: PL,
    txns: [],
    momsBetalt: [0, 0],
    bskat: [] as BskatRate[],
    andenGeld: 0,
    config: { ...INIT_LIQUIDITY_CONFIG },
    nReal: 0,
    ...overrides,
  });

  it('(a) shows a paid B-skat rate via betaltDato even when bskatKonti is set and no txn matches', () => {
    const bskat: BskatRate[] = [
      { id: 1, belob: 15000, forfald: `20-07-${YEAR}`, betalt: 15000, betaltDato: `${YEAR}-07-20` },
    ];
    const rows = computeLiquiditySection(baseParams({
      bskat,
      config: { ...INIT_LIQUIDITY_CONFIG, bskatKonti: [6138] },
      txns: [],
    }));
    const bskatRow = rows.find(r => r.id === 'liq_bskat')!;
    expect(bskatRow.r[6]).toBe(15000);
  });

  it('(b) counts a payment only once when present as both rate and transaction', () => {
    const bskat: BskatRate[] = [
      { id: 1, belob: 15000, forfald: `20-07-${YEAR}`, betalt: 15000, betaltDato: `${YEAR}-07-20` },
    ];
    const rows = computeLiquiditySection(baseParams({
      bskat,
      config: { ...INIT_LIQUIDITY_CONFIG, bskatKonti: [6138] },
      txns: [{ dato: `${YEAR}-07-20`, konto: 6138, belob: -15000, moms: null }],
    }));
    const bskatRow = rows.find(r => r.id === 'liq_bskat')!;
    expect(bskatRow.r[6]).toBe(15000);
  });

  it('(c) uses momsBetalt Q1 fallback in July when no momsAfregningKonti transactions exist', () => {
    const rows = computeLiquiditySection(baseParams({
      momsBetalt: [8000, 0],
      config: { ...INIT_LIQUIDITY_CONFIG, momsAfregningKonti: [6900] },
      txns: [],
    }));
    const momsRow = rows.find(r => r.id === 'liq_moms_betalt')!;
    expect(momsRow.r[6]).toBe(8000);
  });

  it('prefers transactions over momsBetalt fallback in the same month', () => {
    const rows = computeLiquiditySection(baseParams({
      momsBetalt: [8000, 0],
      config: { ...INIT_LIQUIDITY_CONFIG, momsAfregningKonti: [6900] },
      txns: [{ dato: `${YEAR}-07-15`, konto: 6900, belob: -8500, moms: null }],
    }));
    const momsRow = rows.find(r => r.id === 'liq_moms_betalt')!;
    expect(momsRow.r[6]).toBe(8500);
  });
});

describe('computeLiquiditySection - liq_drift.proj', () => {
  it('switches from realized to budget cashflows at nReal', () => {
    // Build a pl with a res row so cashflows are well-defined
    const pl: Record<string | number, { r: number[]; b: number[] }> = {
      res: {
        r: [100, 100, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0], // realized profit jan-mar
        b: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50], // flat budget
      },
    };
    const nReal = 3;
    const rows = computeLiquiditySection({
      pl,
      plRows: PL,
      txns: [],
      momsBetalt: [0, 0],
      bskat: [],
      andenGeld: 0,
      config: { primoSaldo: 1000, momsAfregningKonti: [], bskatKonti: [], andenGeldKonti: [] },
      nReal,
    });
    const drift = rows.find(r => r.id === 'liq_drift')!;
    expect(drift.proj).toBeDefined();
    // Months 0..2 use realized cf (100 each) -> 1000 + 100*3 = 1300 at index 2
    expect(drift.proj![2]).toBe(1300);
    // Months 3..11 use budget cf (50 each) -> 1300 + 50*9 = 1750 at index 11
    expect(drift.proj![11]).toBe(1750);
    // Realized-only saldo diverges (stays at 1300 from month 3 onward)
    expect(drift.r[11]).toBe(1300);
    // Budget-only saldo uses budget throughout: 1000 + 50*12 = 1600
    expect(drift.b[11]).toBe(1600);
  });
});
