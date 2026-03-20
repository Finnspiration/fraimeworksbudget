import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { fmt } from '@/lib/budget-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Transaction } from '@/data/budget-constants';
import { Upload, Trash2, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';

interface Props {
  txns: Transaction[];
  setTxns: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

export default function ImportTab({ txns, setTxns }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Transaction[] | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const parseDanishNumber = (val: unknown): number => {
    if (val == null) return 0;
    if (typeof val === 'number') return val;
    const s = String(val).trim();
    if (!s) return 0;
    // Danish: 1.989,00 → remove dots, replace comma with dot
    const cleaned = s.replace(/\./g, '').replace(',', '.');
    return Number(cleaned) || 0;
  };

  const parseDanishDate = (val: unknown): string => {
    if (val == null) return '';
    if (typeof val === 'object' && 'toISOString' in (val as object)) return (val as Date).toISOString().slice(0, 10);
    const s = String(val).trim();
    // dd.mm.yyyy → yyyy-mm-dd
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
      const cType = col('type'), cFaktura = col('faktura');
      const parsed: Transaction[] = [];
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r[cKonto]) continue;
        const belob = cBelob >= 0 ? parseDanishNumber(r[cBelob]) : 0;
        if (belob === 0) continue;
        const dato = cDato >= 0 ? parseDanishDate(r[cDato]) : '';
        parsed.push({
          id: 0, dato,
          type: cType >= 0 && r[cType] ? String(r[cType]) : 'Import',
          bilag: cBilag >= 0 ? String(r[cBilag] || '') : '',
          tekst: cTekst >= 0 ? String(r[cTekst] || '') : '',
          belob,
          konto: Number(r[cKonto]), moms: cMoms >= 0 && r[cMoms] ? String(r[cMoms]) : null,
        });
      }
      if (parsed.length === 0) { setStatus({ type: 'error', msg: 'Ingen gyldige rækker fundet' }); return; }
      setPreview(parsed);
      setStatus(null);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) parseFile(f); }, [parseFile]);

  const doImport = () => {
    if (!preview) return;
    const existing = new Set(txns.map(t => String(t.bilag) + '-' + t.dato));
    const newTxns = preview.filter(t => !existing.has(String(t.bilag) + '-' + t.dato));
    const maxId = Math.max(0, ...txns.map(t => t.id || 0));
    const withIds = newTxns.map((t, i) => ({ ...t, id: maxId + i + 1 }));
    setTxns(prev => [...prev, ...withIds]);
    setStatus({ type: 'success', msg: `✓ Importerede ${withIds.length} nye posteringer (${preview.length - withIds.length} duplikater sprunget over)` });
    setPreview(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Upload className="h-4 w-4" />Importér kassekladde</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Eksportér kassekladden fra dit regnskabsprogram som Excel eller CSV og upload her. Filen skal have kolonner for Dato, Beløb, Konto og Moms.</p>
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
                <p className="text-sm font-semibold">Forhåndsvisning ({preview.length} rækker)</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setPreview(null); setStatus(null); }}>Annuller</Button>
                  <Button size="sm" onClick={doImport}>Importér {preview.length} posteringer</Button>
                </div>
              </div>
              <div className="overflow-auto max-h-80 rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left">Dato</th>
                      <th className="px-3 py-2 text-right">Beløb</th>
                      <th className="px-3 py-2 text-right">Konto</th>
                      <th className="px-3 py-2 text-center">Moms</th>
                      <th className="px-3 py-2 text-left">Tekst</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 50).map((t, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="px-3 py-1.5 text-xs">{t.dato}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-xs">{fmt(t.belob)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-xs">{t.konto}</td>
                        <td className="px-3 py-1.5 text-center text-xs text-muted-foreground">{t.moms || '–'}</td>
                        <td className="px-3 py-1.5 text-xs truncate max-w-[200px]">{t.tekst}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">📊 Kassekladde ({txns.length} posteringer)</CardTitle>
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
            <div className="overflow-auto max-h-96 rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left">Dato</th>
                    <th className="px-3 py-2 text-left">Bilag</th>
                    <th className="px-3 py-2 text-left">Tekst</th>
                    <th className="px-3 py-2 text-right">Beløb</th>
                    <th className="px-3 py-2 text-right">Konto</th>
                    <th className="px-3 py-2 text-center">Moms</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map(t => (
                    <tr key={t.id} className="border-b border-border/30 hover:bg-secondary/30">
                      <td className="px-3 py-1.5 text-xs tabular-nums">{t.dato}</td>
                      <td className="px-3 py-1.5 text-xs">{t.bilag}</td>
                      <td className="px-3 py-1.5 text-xs truncate max-w-[250px]">{t.tekst}</td>
                      <td className={`px-3 py-1.5 text-right text-xs tabular-nums ${t.belob < 0 ? 'text-[hsl(var(--budget-positive))]' : ''}`}>{fmt(t.belob)}</td>
                      <td className="px-3 py-1.5 text-right text-xs tabular-nums">{t.konto}</td>
                      <td className="px-3 py-1.5 text-center text-xs text-muted-foreground">{t.moms || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
