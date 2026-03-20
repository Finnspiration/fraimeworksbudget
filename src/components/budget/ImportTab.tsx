import { useState, useRef, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { fmtDec } from '@/lib/budget-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Transaction } from '@/data/budget-constants';
import { Upload, Trash2, FileSpreadsheet, Check, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';

interface Props {
  txns: Transaction[];
  setTxns: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

type SortKey = 'dato' | 'belob' | 'konto' | 'type' | 'bilag';
type SortDir = 'asc' | 'desc';

export default function ImportTab({ txns, setTxns }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Transaction[] | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('dato');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMoms, setFilterMoms] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [editingKonto, setEditingKonto] = useState<number | null>(null);
  const [editKontoVal, setEditKontoVal] = useState('');
  const [editingMoms, setEditingMoms] = useState<number | null>(null);

  const parseDanishNumber = (val: unknown): number => {
    if (val == null) return 0;
    if (typeof val === 'number') return val;
    const s = String(val).trim();
    if (!s) return 0;
    const cleaned = s.replace(/\./g, '').replace(',', '.');
    return Number(cleaned) || 0;
  };

  const parseDanishDate = (val: unknown): string => {
    if (val == null) return '';
    if (typeof val === 'object' && 'toISOString' in (val as object)) return (val as Date).toISOString().slice(0, 10);
    const s = String(val).trim();
    const match = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    return s;
  };

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
      let headerIdx = -1;
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const r = rows[i].map(c => String(c || '').toLowerCase());
        if (r.some(c => c.includes('konto')) && (r.some(c => c.includes('beløb') || c.includes('belob')) || r.some(c => c.includes('type')))) { headerIdx = i; break; }
      }
      if (headerIdx === -1) { setStatus({ type: 'error', msg: 'Kunne ikke finde header-række (skal indeholde Konto og Beløb/Type)' }); return; }
      const headers = rows[headerIdx].map(h => String(h || '').toLowerCase().trim());
      const col = (name: string) => headers.findIndex(h => h.includes(name));
      const cDato = col('dato'), cBelob = col('beløb') !== -1 ? col('beløb') : col('belob');
      const cKonto = col('konto'), cMoms = col('moms'), cBilag = col('bilag'), cTekst = col('tekst');
      const cType = col('type');
      const cFaktura = headers.findIndex(h => h.includes('faktura') || h.includes('fak'));
      const cModkonto = headers.findIndex(h => h.includes('modkonto') || h.includes('mod'));
      const parsed: Transaction[] = [];
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r[cKonto]) continue;
        const belob = cBelob >= 0 ? parseDanishNumber(r[cBelob]) : 0;
        if (belob === 0) continue;
        const dato = cDato >= 0 ? parseDanishDate(r[cDato]) : '';
        const kontoFromFile = Number(r[cKonto]);
        // Negative amounts = income → default to 1010 unless file konto is already in 1xxx range
        const konto = belob < 0 && kontoFromFile >= 2000 ? 1010 : kontoFromFile;
        const modkonto = cModkonto >= 0 && r[cModkonto] ? Number(r[cModkonto]) : undefined;
        const faktura = cFaktura >= 0 && r[cFaktura] ? String(r[cFaktura]) : undefined;
        parsed.push({
          id: 0, dato,
          type: cType >= 0 && r[cType] ? String(r[cType]) : 'Import',
          bilag: cBilag >= 0 ? String(r[cBilag] || '') : '',
          tekst: cTekst >= 0 ? String(r[cTekst] || '') : '',
          belob, konto,
          moms: cMoms >= 0 && r[cMoms] ? String(r[cMoms]) : null,
          modkonto, faktura,
        });
      }
      if (parsed.length === 0) { setStatus({ type: 'error', msg: 'Ingen gyldige rækker fundet' }); return; }
      setPreview(parsed);
      setStatus(null);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) parseFile(f); }, [parseFile]);

  const txnKey = (t: Transaction) => `${t.bilag}_${t.dato}_${t.konto}_${t.belob}`;

  const existingKeys = useMemo(() => new Set(txns.map(txnKey)), [txns]);

  const { newRows, dupRows } = useMemo(() => {
    if (!preview) return { newRows: [] as Transaction[], dupRows: [] as Transaction[] };
    const n: Transaction[] = [], d: Transaction[] = [];
    preview.forEach(t => (existingKeys.has(txnKey(t)) ? d : n).push(t));
    return { newRows: n, dupRows: d };
  }, [preview, existingKeys]);

  const doImport = () => {
    if (!newRows.length) return;
    const maxId = Math.max(0, ...txns.map(t => t.id || 0));
    const withIds = newRows.map((t, i) => ({ ...t, id: maxId + i + 1 }));
    setTxns(prev => [...prev, ...withIds]);
    setStatus({ type: 'success', msg: `✓ Importerede ${withIds.length} nye posteringer${dupRows.length ? ` (${dupRows.length} duplikater sprunget over)` : ''}` });
    setPreview(null);
  };

  // Unique types for filter dropdown
  const uniqueTypes = useMemo(() => {
    const types = new Set(txns.map(t => t.type).filter(Boolean));
    return Array.from(types).sort();
  }, [txns]);

  // Filtered & sorted transactions
  const filteredTxns = useMemo(() => {
    let result = [...txns];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.tekst.toLowerCase().includes(q) ||
        String(t.bilag).toLowerCase().includes(q) ||
        String(t.konto).includes(q) ||
        t.dato.includes(q) ||
        t.type.toLowerCase().includes(q) ||
        (t.faktura && t.faktura.toLowerCase().includes(q))
      );
    }
    if (filterType !== 'all') result = result.filter(t => t.type === filterType);
    if (filterMoms !== 'all') result = result.filter(t => filterMoms === 'none' ? !t.moms : t.moms === filterMoms);
    if (filterDateFrom) result = result.filter(t => t.dato >= filterDateFrom);
    if (filterDateTo) result = result.filter(t => t.dato <= filterDateTo);
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'dato': cmp = a.dato.localeCompare(b.dato); break;
        case 'belob': cmp = a.belob - b.belob; break;
        case 'konto': cmp = a.konto - b.konto; break;
        case 'type': cmp = a.type.localeCompare(b.type); break;
        case 'bilag': cmp = String(a.bilag).localeCompare(String(b.bilag)); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [txns, searchTerm, filterType, filterMoms, filterDateFrom, filterDateTo, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const startEditKonto = (txnId: number, currentKonto: number) => {
    setEditingKonto(txnId);
    setEditKontoVal(String(currentKonto));
  };

  const commitKontoEdit = (txnId: number) => {
    const newKonto = Number(editKontoVal);
    if (newKonto > 0) {
      setTxns(prev => prev.map(t => t.id === txnId ? { ...t, konto: newKonto } : t));
    }
    setEditingKonto(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Upload className="h-4 w-4" />Importér kassekladde</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Eksportér kassekladden fra dit regnskabsprogram som Excel eller CSV. Format: Type, Dato, Bilag, Faktura, Tekst, Beløb, Konto, Moms, Modkonto.</p>
          <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center cursor-pointer hover:bg-secondary transition-colors bg-secondary/30">
            <FileSpreadsheet className="h-10 w-10 mx-auto text-primary/50 mb-3" />
            <p className="font-medium text-sm">Træk fil hertil eller klik for at vælge</p>
            <p className="text-xs text-muted-foreground mt-1">Understøtter .xlsx, .xls og .csv</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => e.target.files?.[0] && parseFile(e.target.files[0])} />
          </div>

          {status && (
            <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${status.type === 'success' ? 'bg-[hsl(var(--budget-positive))]/10 text-[hsl(var(--budget-positive))]' : 'bg-destructive/10 text-destructive'}`}>
              {status.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {status.msg}
            </div>
          )}

          {preview && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Forhåndsvisning ({preview.length} rækker)</p>
                  <p className="text-xs text-muted-foreground">
                    {newRows.length} nye posteringer{dupRows.length > 0 && <span className="text-destructive/70"> · {dupRows.length} duplikater</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setPreview(null); setStatus(null); }}>Annuller</Button>
                  <Button size="sm" onClick={doImport} disabled={newRows.length === 0}>Importér {newRows.length} nye posteringer</Button>
                </div>
              </div>
              <div className="overflow-auto max-h-80 rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Dato</th>
                      <th className="px-3 py-2 text-left">Bilag</th>
                      <th className="px-3 py-2 text-left">Faktura</th>
                      <th className="px-3 py-2 text-left">Tekst</th>
                      <th className="px-3 py-2 text-right">Beløb</th>
                      <th className="px-3 py-2 text-right">Konto</th>
                      <th className="px-3 py-2 text-center">Moms</th>
                      <th className="px-3 py-2 text-right">Modkonto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 50).map((t, i) => {
                      const isDup = existingKeys.has(txnKey(t));
                      return (
                        <tr key={i} className={`border-b border-border/30 ${isDup ? 'opacity-40 line-through' : ''}`}>
                          <td className="px-3 py-1.5 text-xs text-muted-foreground">{t.type}</td>
                          <td className="px-3 py-1.5 text-xs">{t.dato}</td>
                          <td className="px-3 py-1.5 text-xs">{t.bilag}</td>
                          <td className="px-3 py-1.5 text-xs">{t.faktura || '–'}</td>
                          <td className="px-3 py-1.5 text-xs truncate max-w-[200px]">{t.tekst}</td>
                          <td className={`px-3 py-1.5 text-right tabular-nums text-xs ${t.belob < 0 ? 'text-[hsl(var(--budget-positive))]' : ''}`}>{fmt(t.belob)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-xs">{t.konto}</td>
                          <td className="px-3 py-1.5 text-center text-xs text-muted-foreground">{t.moms || '–'}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-xs">{t.modkonto || '–'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">📊 Kassekladde ({filteredTxns.length}{filteredTxns.length !== txns.length ? ` af ${txns.length}` : ''} posteringer)</CardTitle>
          {txns.length > 0 && (
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => { if (window.confirm(`Slet alle ${txns.length} posteringer?`)) setTxns([]); }}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />Ryd alt
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {txns.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Ingen posteringer. Importér en kassekladde for at komme i gang.</p>
          ) : (
            <div className="space-y-3">
              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Søg i posteringer…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle typer</SelectItem>
                    {uniqueTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterMoms} onValueChange={setFilterMoms}>
                  <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="Moms" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle moms</SelectItem>
                    <SelectItem value="I25">I25</SelectItem>
                    <SelectItem value="U25">U25</SelectItem>
                    <SelectItem value="none">Ingen moms</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-[150px] h-9 text-sm" placeholder="Fra dato" />
                <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-[150px] h-9 text-sm" placeholder="Til dato" />
                {(filterDateFrom || filterDateTo) && (
                  <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}>Nulstil dato</Button>
                )}
              </div>

              <div className="overflow-auto max-h-[500px] rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('type')}>
                        <span className="inline-flex items-center gap-1">Type <SortIcon col="type" /></span>
                      </th>
                      <th className="px-3 py-2 text-left cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('dato')}>
                        <span className="inline-flex items-center gap-1">Dato <SortIcon col="dato" /></span>
                      </th>
                      <th className="px-3 py-2 text-left cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('bilag')}>
                        <span className="inline-flex items-center gap-1">Bilag <SortIcon col="bilag" /></span>
                      </th>
                      <th className="px-3 py-2 text-left">Faktura</th>
                      <th className="px-3 py-2 text-left">Tekst</th>
                      <th className="px-3 py-2 text-right cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('belob')}>
                        <span className="inline-flex items-center gap-1 justify-end">Beløb <SortIcon col="belob" /></span>
                      </th>
                      <th className="px-3 py-2 text-right cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('konto')}>
                        <span className="inline-flex items-center gap-1 justify-end">Konto <SortIcon col="konto" /></span>
                      </th>
                      <th className="px-3 py-2 text-center">Moms</th>
                      <th className="px-3 py-2 text-right">Modkonto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxns.map(t => (
                      <tr key={t.id} className="border-b border-border/30 hover:bg-secondary/30">
                        <td className="px-3 py-1.5 text-xs text-muted-foreground">{t.type}</td>
                        <td className="px-3 py-1.5 text-xs tabular-nums">{t.dato}</td>
                        <td className="px-3 py-1.5 text-xs">{t.bilag}</td>
                        <td className="px-3 py-1.5 text-xs">{t.faktura || '–'}</td>
                        <td className="px-3 py-1.5 text-xs truncate max-w-[250px]">{t.tekst}</td>
                        <td className={`px-3 py-1.5 text-right text-xs tabular-nums ${t.belob < 0 ? 'text-[hsl(var(--budget-positive))]' : ''}`}>{fmt(t.belob)}</td>
                        <td className="px-3 py-1.5 text-right text-xs tabular-nums">
                          {editingKonto === t.id ? (
                            <input
                              type="number"
                              value={editKontoVal}
                              onChange={e => setEditKontoVal(e.target.value)}
                              onBlur={() => commitKontoEdit(t.id)}
                              onKeyDown={e => { if (e.key === 'Enter') commitKontoEdit(t.id); if (e.key === 'Escape') setEditingKonto(null); }}
                              className="w-16 text-right border border-primary/30 rounded px-1 py-0.5 text-xs bg-secondary"
                              autoFocus
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:text-primary hover:underline"
                              onClick={() => startEditKonto(t.id, t.konto)}
                              title="Klik for at ændre konto"
                            >
                              {t.konto}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-center text-xs text-muted-foreground">
                          {editingMoms === t.id ? (
                            <select
                              value={t.moms || ''}
                              onChange={e => {
                                const val = e.target.value || null;
                                setTxns(prev => prev.map(tx => tx.id === t.id ? { ...tx, moms: val } : tx));
                                setEditingMoms(null);
                              }}
                              onBlur={() => setEditingMoms(null)}
                              className="border border-primary/30 rounded px-1 py-0.5 text-xs bg-secondary"
                              autoFocus
                            >
                              <option value="">Ingen</option>
                              <option value="I25">I25</option>
                              <option value="U25">U25</option>
                            </select>
                          ) : (
                            <span
                              className="cursor-pointer hover:text-primary hover:underline"
                              onClick={() => setEditingMoms(t.id)}
                              title="Klik for at ændre moms"
                            >
                              {t.moms || '–'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right text-xs tabular-nums text-muted-foreground">{t.modkonto || '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
