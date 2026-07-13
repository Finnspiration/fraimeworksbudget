import { useState, useRef, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { fmtDec } from '@/lib/budget-utils';
import { parseTransactionsFromSheet } from '@/lib/import-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem, CommandGroup } from '@/components/ui/command';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Transaction, PLRow } from '@/data/budget-constants';
import { PL } from '@/data/budget-constants';
import { Upload, Trash2, FileSpreadsheet, Check, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Search, BookOpen, RotateCcw, ChevronsUpDown, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  txns: Transaction[];
  setTxns: React.Dispatch<React.SetStateAction<Transaction[]>>;
  customPL: PLRow[] | null;
  setCustomPL: React.Dispatch<React.SetStateAction<PLRow[] | null>>;
  onImportComplete?: (txns: Transaction[]) => void;
}

type SortKey = 'dato' | 'belob' | 'konto' | 'type' | 'bilag';
type SortDir = 'asc' | 'desc';

export default function ImportTab({ txns, setTxns, customPL, setCustomPL, onImportComplete }: Props) {
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
  const [editingMoms, setEditingMoms] = useState<number | null>(null);
  const kontoPlanRef = useRef<HTMLInputElement>(null);
  const [kontoPlanPreview, setKontoPlanPreview] = useState<PLRow[] | null>(null);
  const [kontoPlanMeta, setKontoPlanMeta] = useState<{ origType: number; moms: string; sumfra: string }[]>([]);
  const [kontoPlanStatus, setKontoPlanStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const activePL = customPL ?? PL;
  const acctList = useMemo(() => activePL.filter(r => (r.t === 'acct' || r.t === 'bal') && r.nr), [activePL]);
  const acctMap = useMemo(() => new Map(acctList.map(r => [r.nr!, r.lbl || ''])), [acctList]);
  const [kontoPopoverOpen, setKontoPopoverOpen] = useState<number | null>(null);

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
      const { parsed, error } = parseTransactionsFromSheet(rows, activePL);
      if (error) { setStatus({ type: 'error', msg: error }); return; }
      if (parsed.length === 0) { setStatus({ type: 'error', msg: 'Ingen gyldige rækker fundet' }); return; }
      setPreview(parsed);
      setStatus(null);
    };
    reader.readAsArrayBuffer(file);
  }, [activePL]);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) parseFile(f); }, [parseFile]);

  const txnKey = (t: Transaction) => `${t.bilag}_${t.dato}_${t.konto}_${t.belob}`;

  const existingMap = useMemo(() => {
    const m = new Map<string, Transaction>();
    txns.forEach(t => m.set(txnKey(t), t));
    return m;
  }, [txns]);

  const { newRows, dupRows, updatedRows } = useMemo(() => {
    if (!preview) return { newRows: [] as Transaction[], dupRows: [] as Transaction[], updatedRows: [] as Transaction[] };
    const n: Transaction[] = [], d: Transaction[] = [], u: Transaction[] = [];
    preview.forEach(t => {
      const key = txnKey(t);
      const existing = existingMap.get(key);
      if (!existing) n.push(t);
      else if (existing.tekst !== t.tekst || existing.faktura !== t.faktura
               || existing.moms !== t.moms || existing.modkonto !== t.modkonto)
        u.push(t);
      else d.push(t);
    });
    return { newRows: n, dupRows: d, updatedRows: u };
  }, [preview, existingMap]);

  const doImport = () => {
    if (!newRows.length && !updatedRows.length) return;
    const maxId = Math.max(0, ...txns.map(t => t.id || 0));
    const withIds = newRows.map((t, i) => ({ ...t, id: maxId + i + 1 }));
    
    // Build updated txns: replace matching rows, then add new
    setTxns(prev => {
      let result = [...prev];
      // Overwrite updated rows
      for (const u of updatedRows) {
        const key = txnKey(u);
        const idx = result.findIndex(t => txnKey(t) === key);
        if (idx >= 0) {
          result[idx] = { ...result[idx], tekst: u.tekst, faktura: u.faktura, moms: u.moms, modkonto: u.modkonto };
        }
      }
      // Add new rows
      return [...result, ...withIds];
    });

    // Check for account numbers not in the active chart of accounts
    const acctNrs = new Set(activePL.filter(r => (r.t === 'acct' || r.t === 'bal') && r.nr).map(r => r.nr!));
    const allImportedKonti = new Set([...withIds, ...updatedRows].map(t => t.konto));
    const missingKonti = [...allImportedKonti].filter(k => !acctNrs.has(k)).sort((a, b) => a - b);
    
    const parts: string[] = [];
    if (withIds.length) parts.push(`${withIds.length} nye`);
    if (updatedRows.length) parts.push(`${updatedRows.length} opdaterede`);
    let msg = `✓ Importerede ${parts.join(' og ')} posteringer${dupRows.length ? ` (${dupRows.length} uændrede sprunget over)` : ''}`;
    if (missingKonti.length > 0) {
      msg += ` ⚠️ Kontonumre ikke fundet i kontoplanen: ${missingKonti.join(', ')}. Genimportér kontoplanen for at inkludere disse.`;
    }
    setStatus({ type: missingKonti.length > 0 ? 'error' : 'success', msg });
    setPreview(null);
    // Trigger future expenses matching
    if (onImportComplete) {
      // Use timeout to ensure txns state is updated first
      setTimeout(() => {
        const allTxns = [...txns, ...withIds];
        onImportComplete(allTxns);
      }, 500);
    }
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


  const parseKontoPlan = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

      let headerIdx = -1;
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const r = rows[i].map(c => String(c || '').toLowerCase().trim());
        if (r.some(c => c.includes('nr')) && r.some(c => c.includes('navn') || c.includes('name'))) { headerIdx = i; break; }
      }
      if (headerIdx === -1) { setKontoPlanStatus({ type: 'error', msg: 'Kunne ikke finde header-række (skal indeholde Nr og Navn)' }); return; }

      const headers = rows[headerIdx].map(h => String(h || '').toLowerCase().trim());
      const cNr = headers.findIndex(h => h === 'nr' || h === 'nr.');
      const cNavn = headers.findIndex(h => h.includes('navn') || h.includes('name'));
      const cType = headers.findIndex(h => h === 'type');
      const cSumfra = headers.findIndex(h => h.includes('sumfra') || h.includes('sum fra'));

      console.log('[KontoPlan] Headers:', { headers, cNr, cNavn, cType, cSumfra });

      if (cNr === -1 || cNavn === -1) { setKontoPlanStatus({ type: 'error', msg: 'Mangler kolonnerne Nr og/eller Navn' }); return; }

      const cMoms = headers.findIndex(h => h === 'moms');

      const plRows: PLRow[] = [];
      const previewMeta: { origType: number; moms: string; sumfra: string }[] = [];
      let currentGrp = 'default';
      let grpCounter = 0;
      const totalIds: string[] = [];

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.every(c => c == null || String(c).trim() === '')) continue;

        const nr = Number(r[cNr]) || 0;
        const navn = String(r[cNavn] || '').trim();
        const type = cType >= 0 ? Number(r[cType]) || 0 : 1;
        const moms = cMoms >= 0 ? String(r[cMoms] || '').trim() : '';
        const sumfra = cSumfra >= 0 ? String(r[cSumfra] || '').trim() : '';

        if (!navn && !nr) continue;
        

        const addMeta = () => previewMeta.push({ origType: type, moms, sumfra });

        if (type === 4) {
          currentGrp = `grp${++grpCounter}`;
          plRows.push({ t: 'sec', lbl: navn });
          addMeta();
        } else if (type === 5) {
          currentGrp = `grp${++grpCounter}`;
          plRows.push({ t: 'sp' });
          previewMeta.push({ origType: type, moms: '', sumfra: '' });
          plRows.push({ t: 'sec', lbl: navn });
          addMeta();
        } else if (type === 1 || (type === 0 && nr > 0)) {
          plRows.push({ t: 'acct', nr, lbl: navn, grp: currentGrp, moms: moms || null });
          addMeta();
        } else if (type === 2) {
          plRows.push({ t: 'bal', nr, lbl: navn, grp: currentGrp, moms: moms || null });
          addMeta();
        } else if (type === 3) {
          const id = `t${nr}`;
          totalIds.push(id);
          const sumfraNum = Number(sumfra);
          const formula = sumfraNum > 0 ? `range:${sumfraNum}-${nr}` : `grp:${currentGrp}`;
          plRows.push({ t: 'total', nr, lbl: navn, id, sum: formula });
          addMeta();
        } else if (type === 6) {
          const id = `t${nr}`;
          totalIds.push(id);
          const sumfraNum = Number(sumfra);
          const formula = sumfraNum > 0 
            ? `range:${sumfraNum}-${nr}` 
            : `grp:${currentGrp}`;
          plRows.push({ t: 'total', nr, lbl: navn, id, sum: formula });
          addMeta();
        }
      }

      if (plRows.length > 0 && !plRows.some(r => r.t === 'final')) {
        // Find the last cumulative total (highest nr) to use as the final result
        const allTotals = plRows.filter(r => r.t === 'total' && r.nr);
        if (allTotals.length > 0) {
          const lastTotal = allTotals[allTotals.length - 1];
          plRows.push({ t: 'final', lbl: 'PERIODENS RESULTAT', id: 'res', sum: `id:${lastTotal.id}` });
        }
      }

      if (plRows.filter(r => r.t === 'acct' || r.t === 'bal').length === 0) {
        setKontoPlanStatus({ type: 'error', msg: 'Ingen konti (type 1 eller 2) fundet i filen' });
        return;
      }

      setKontoPlanPreview(plRows);
      setKontoPlanMeta(previewMeta);
      setKontoPlanStatus(null);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleKontoPlanDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) parseKontoPlan(f); }, [parseKontoPlan]);

  const doImportKontoPlan = () => {
    if (!kontoPlanPreview) return;
    setCustomPL(kontoPlanPreview);
    setKontoPlanStatus({ type: 'success', msg: `✓ Kontoplan importeret med ${kontoPlanPreview.filter(r => r.t === 'acct' || r.t === 'bal').length} konti` });
    setKontoPlanPreview(null);
  };

  return (
    <div className="space-y-6">
      <Collapsible defaultOpen={false}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4" />Kontoplan</CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Importér kontoplan fra Excel. Format: Nr, Navn, Type (1=Drift, 2=Balance, 3=SumFra, 4=Overskrift, 5=Overskrift Start, 6=SumInterval), Sumfra.</p>

          {customPL && (
            <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--budget-positive))]/30 bg-[hsl(var(--budget-positive))]/5 p-3">
              <div className="text-sm">
                <span className="font-medium">Brugerdefineret kontoplan aktiv</span>
                <span className="text-muted-foreground ml-2">({customPL.filter(r => r.t === 'acct' || r.t === 'bal').length} konti)</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => { if (window.confirm('Nulstil til standard-kontoplanen?')) setCustomPL(null); }}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" />Nulstil
              </Button>
            </div>
          )}

          <div onDrop={handleKontoPlanDrop} onDragOver={e => e.preventDefault()} onClick={() => kontoPlanRef.current?.click()}
            className="border-2 border-dashed border-primary/30 rounded-xl p-6 text-center cursor-pointer hover:bg-secondary transition-colors bg-secondary/30">
            <BookOpen className="h-8 w-8 mx-auto text-primary/50 mb-2" />
            <p className="font-medium text-sm">Træk kontoplan-fil hertil eller klik for at vælge</p>
            <p className="text-xs text-muted-foreground mt-1">.xlsx eller .xls</p>
            <input ref={kontoPlanRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && parseKontoPlan(e.target.files[0])} />
          </div>

          {kontoPlanStatus && (
            <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${kontoPlanStatus.type === 'success' ? 'bg-[hsl(var(--budget-positive))]/10 text-[hsl(var(--budget-positive))]' : 'bg-destructive/10 text-destructive'}`}>
              {kontoPlanStatus.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {kontoPlanStatus.msg}
            </div>
          )}

          {kontoPlanPreview && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  Forhåndsvisning ({kontoPlanPreview.filter(r => r.t === 'acct' || r.t === 'bal').length} konti, {kontoPlanPreview.filter(r => r.t === 'total' || r.t === 'res').length} summer)
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setKontoPlanPreview(null); setKontoPlanStatus(null); }}>Annuller</Button>
                  <Button size="sm" onClick={doImportKontoPlan}>Importér kontoplan</Button>
                </div>
              </div>
              <div className="overflow-auto max-h-60 rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-right">Nr.</th>
                      <th className="px-3 py-2 text-left">Navn</th>
                      <th className="px-3 py-2 text-center">Type</th>
                      <th className="px-3 py-2 text-left">Moms</th>
                      <th className="px-3 py-2 text-left">Sumfra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kontoPlanPreview.map((row, i) => {
                      const meta = kontoPlanMeta[i];
                      const typeLabels: Record<number, string> = { 1: 'Drift', 3: 'SumFra', 4: 'Overskrift', 5: 'Overskr. Start', 6: 'SumInterval' };
                      return (
                        <tr key={i} className={`border-b border-border/30 ${row.t === 'sec' ? 'bg-secondary/50 font-semibold' : row.t === 'total' || row.t === 'res' || row.t === 'final' ? 'bg-primary/5 font-medium' : row.t === 'sp' ? 'h-2' : ''}`}>
                          {row.t === 'sp' ? <td colSpan={5} /> : (
                            <>
                              <td className="px-3 py-1 text-xs tabular-nums text-right">{row.nr || ''}</td>
                              <td className="px-3 py-1 text-xs">{row.lbl || ''}</td>
                              <td className="px-3 py-1 text-xs text-center text-muted-foreground">{meta ? `${meta.origType} (${typeLabels[meta.origType] || ''})` : ''}</td>
                              <td className="px-3 py-1 text-xs text-muted-foreground">{meta?.moms || ''}</td>
                              <td className="px-3 py-1 text-xs text-muted-foreground">{meta?.sumfra || ''}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
        </CollapsibleContent>
      </Card>
      </Collapsible>

      <Collapsible defaultOpen={false}>
      <Card>
        <CollapsibleTrigger asChild>
        <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Upload className="h-4 w-4" />Importér kassekladde <ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground" /></CardTitle>
        </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
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
                    {newRows.length} nye{updatedRows.length > 0 && <span className="text-[hsl(var(--budget-positive))]"> · {updatedRows.length} opdaterede</span>}{dupRows.length > 0 && <span className="text-destructive/70"> · {dupRows.length} uændrede</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setPreview(null); setStatus(null); }}>Annuller</Button>
                  <Button size="sm" onClick={doImport} disabled={newRows.length === 0 && updatedRows.length === 0}>Importér {newRows.length + updatedRows.length} posteringer</Button>
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
                      const key = txnKey(t);
                      const existing = existingMap.get(key);
                      const isDup = !!existing && existing.tekst === t.tekst && existing.faktura === t.faktura && existing.moms === t.moms && existing.modkonto === t.modkonto;
                      const isUpdated = !!existing && !isDup;
                      return (
                        <tr key={i} className={`border-b border-border/30 ${isDup ? 'opacity-40 line-through' : isUpdated ? 'bg-[hsl(var(--budget-positive))]/10' : ''}`}>
                          <td className="px-3 py-1.5 text-xs text-muted-foreground">{t.type}</td>
                          <td className="px-3 py-1.5 text-xs">{t.dato}</td>
                          <td className="px-3 py-1.5 text-xs">{t.bilag}</td>
                          <td className="px-3 py-1.5 text-xs">{t.faktura || '–'}</td>
                          <td className="px-3 py-1.5 text-xs truncate max-w-[200px]">{t.tekst}</td>
                          <td className={`px-3 py-1.5 text-right tabular-nums text-xs ${t.belob < 0 ? 'text-[hsl(var(--budget-positive))]' : ''}`}>{fmtDec(t.belob)}</td>
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
        </CollapsibleContent>
      </Card>
      </Collapsible>

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
                        <td className={`px-3 py-1.5 text-right text-xs tabular-nums ${t.belob < 0 ? 'text-[hsl(var(--budget-positive))]' : ''}`}>{fmtDec(t.belob)}</td>
                        <td className="px-3 py-1.5 text-right text-xs tabular-nums">
                          {kontoPopoverOpen === t.id ? (
                            <Popover open onOpenChange={(open) => { if (!open) setKontoPopoverOpen(null); }}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-6 w-auto min-w-[60px] text-xs px-2 font-mono">
                                  {t.konto} <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="end">
                                <Command>
                                  <CommandInput placeholder="Søg konto..." className="h-8 text-xs" />
                                  <CommandList>
                                    <CommandEmpty>Ingen konto fundet</CommandEmpty>
                                    <CommandGroup>
                                      {acctList.map(a => (
                                        <CommandItem
                                          key={a.nr}
                                          value={`${a.nr} ${a.lbl}`}
                                          onSelect={() => {
                                            setTxns(prev => prev.map(tx => tx.id === t.id ? { ...tx, konto: a.nr! } : tx));
                                            setKontoPopoverOpen(null);
                                          }}
                                          className="text-xs"
                                        >
                                          <Check className={`mr-2 h-3 w-3 ${t.konto === a.nr ? 'opacity-100' : 'opacity-0'}`} />
                                          <span className="font-mono mr-2">{a.nr}</span>
                                          <span className="truncate">{a.lbl}</span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span
                              className={`cursor-pointer hover:text-primary hover:underline ${!acctMap.has(t.konto) ? 'text-destructive' : ''}`}
                              onClick={() => setKontoPopoverOpen(t.id)}
                              title={acctMap.get(t.konto) || 'Ukendt konto — klik for at ændre'}
                            >
                              {t.konto}
                              {acctMap.has(t.konto) && (
                                <span className="ml-1 text-muted-foreground font-normal hidden lg:inline">{acctMap.get(t.konto)}</span>
                              )}
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
