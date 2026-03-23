import { useState, useMemo } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem, CommandGroup } from '@/components/ui/command';
import { fmtDec } from '@/lib/budget-utils';
import type { PLRow } from '@/data/budget-constants';
import { useFutureExpenses, type FutureExpense } from '@/hooks/use-future-expenses';
import { Plus, Trash2, Check, CalendarClock, CalendarIcon, Undo2, Copy, ChevronsUpDown, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths, parse } from 'date-fns';
import { da } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function KontoPicker({ value, onChange, acctList, acctMap, className }: {
  value: number;
  onChange: (v: number) => void;
  acctList: { nr?: number; lbl?: string }[];
  acctMap: Map<number, string>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("h-8 text-xs justify-between font-normal", !value && "text-muted-foreground", className)}>
          {value ? `${value} ${acctMap.get(value) || ''}`.trim() : 'Vælg konto'}
          <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Søg konto..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>Ingen konto fundet</CommandEmpty>
            <CommandGroup>
              {acctList.map(a => (
                <CommandItem
                  key={a.nr}
                  value={`${a.nr} ${a.lbl}`}
                  onSelect={() => { onChange(a.nr!); setOpen(false); }}
                  className="text-xs"
                >
                  <Check className={`mr-2 h-3 w-3 ${value === a.nr ? 'opacity-100' : 'opacity-0'}`} />
                  <span className="font-mono mr-2">{a.nr}</span>
                  <span className="truncate">{a.lbl}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  activePL: PLRow[];
}

const emptyRow = (): Omit<FutureExpense, 'id' | 'matched' | 'matched_txn_id' | 'created_at'> => ({
  dato: '', tekst: '', belob: 0, konto: 0, moms: null, bilag: null, modkonto: null, faktura: null,
});

function DatePicker({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const date = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("h-8 text-xs justify-start text-left font-normal", !value && "text-muted-foreground", className)}>
          <CalendarIcon className="h-3 w-3 mr-1" />
          {date ? format(date, 'dd/MM/yyyy') : 'Vælg dato'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? format(d, 'yyyy-MM-dd') : '')}
          locale={da}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

export default function FutureExpensesTab({ activePL }: Props) {
  const { expenses, addExpense, updateExpense, deleteExpense, unmatchExpense, isLoading } = useFutureExpenses();
  const [newRow, setNewRow] = useState(emptyRow());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<FutureExpense>>({});
  const [copyDialog, setCopyDialog] = useState<FutureExpense | null>(null);
  const [copyMonths, setCopyMonths] = useState(1);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'matched'>('all');
  const [filterKonto, setFilterKonto] = useState<number | null>(null);

  const filtered = useMemo(() => expenses.filter(e => {
    if (filterStatus === 'active' && e.matched) return false;
    if (filterStatus === 'matched' && !e.matched) return false;
    if (filterKonto && e.konto !== filterKonto) return false;
    return true;
  }), [expenses, filterStatus, filterKonto]);
  const acctList = useMemo(() => activePL.filter(r => (r.t === 'acct' || r.t === 'bal') && r.nr), [activePL]);
  const acctMap = useMemo(() => {
    const m = new Map<number, string>();
    acctList.forEach(r => m.set(r.nr!, r.lbl || ''));
    return m;
  }, [acctList]);

  const handleAdd = async () => {
    if (!newRow.konto || !newRow.tekst) {
      toast.error('Udfyld mindst Tekst og Konto');
      return;
    }
    try {
      await addExpense(newRow);
      setNewRow(emptyRow());
      toast.success('Fremtidig udgift tilføjet');
    } catch {
      toast.error('Kunne ikke gemme');
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateExpense(id, editRow);
      setEditingId(null);
      toast.success('Opdateret');
    } catch {
      toast.error('Kunne ikke opdatere');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Slet denne fremtidige udgift?')) return;
    try {
      await deleteExpense(id);
      toast.success('Slettet');
    } catch {
      toast.error('Kunne ikke slette');
    }
  };

  const handleUnmatch = async (id: string) => {
    try {
      await unmatchExpense(id);
      toast.success('Match fortrudt');
    } catch {
      toast.error('Kunne ikke fortryde match');
    }
  };

  const handleCopyForward = async () => {
    if (!copyDialog || copyMonths < 1) return;
    try {
      for (let i = 1; i <= copyMonths; i++) {
        const baseDate = copyDialog.dato ? parse(copyDialog.dato, 'yyyy-MM-dd', new Date()) : new Date();
        const newDate = addMonths(baseDate, i);
        await addExpense({
          dato: format(newDate, 'yyyy-MM-dd'),
          tekst: copyDialog.tekst,
          belob: copyDialog.belob,
          konto: copyDialog.konto,
          moms: copyDialog.moms,
          bilag: copyDialog.bilag,
          modkonto: copyDialog.modkonto,
          faktura: copyDialog.faktura,
        });
      }
      toast.success(`Oprettet ${copyMonths} ${copyMonths === 1 ? 'kopi' : 'kopier'}`);
      setCopyDialog(null);
      setCopyMonths(1);
    } catch {
      toast.error('Kunne ikke kopiere');
    }
  };

  const startEdit = (exp: FutureExpense) => {
    setEditingId(exp.id);
    setEditRow({ dato: exp.dato, tekst: exp.tekst, belob: exp.belob, konto: exp.konto, moms: exp.moms });
  };

  const activeCount = expenses.filter(e => !e.matched).length;
  const matchedCount = expenses.filter(e => e.matched).length;
  const activeTotal = expenses.filter(e => !e.matched).reduce((s, e) => s + e.belob, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />Fremtidige udgifter
            </CardTitle>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>{activeCount} aktive ({fmtDec(activeTotal)} kr)</span>
              {matchedCount > 0 && <span className="text-[hsl(var(--budget-positive))]">{matchedCount} matchet</span>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Registrér forventede udgifter. De indgår i budgettet og fjernes automatisk når de matches ved kassekladde-import.
          </p>

          {/* Add new row */}
          <div className="grid grid-cols-[90px_1fr_90px_180px_60px_40px] gap-1 mb-4 items-end">
            <div>
              <label className="text-[10px] text-muted-foreground">Dato</label>
              <DatePicker value={newRow.dato} onChange={v => setNewRow(p => ({ ...p, dato: v }))} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Tekst</label>
              <Input className="h-8 text-xs" value={newRow.tekst} onChange={e => setNewRow(p => ({ ...p, tekst: e.target.value }))} placeholder="Beskrivelse" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Beløb</label>
              <Input type="number" className="h-8 text-xs text-right" value={newRow.belob || ''} onChange={e => setNewRow(p => ({ ...p, belob: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Konto</label>
              <KontoPicker value={newRow.konto} onChange={v => setNewRow(p => ({ ...p, konto: v }))} acctList={acctList} acctMap={acctMap} className="w-full" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Moms</label>
              <Input className="h-8 text-xs" value={newRow.moms || ''} onChange={e => setNewRow(p => ({ ...p, moms: e.target.value || null }))} placeholder="I25" />
            </div>
            <Button size="sm" className="h-8 w-8 p-0" onClick={handleAdd}><Plus className="h-4 w-4" /></Button>
          </div>

          {/* Table */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Indlæser…</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Ingen fremtidige udgifter registreret</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1 pr-2 font-medium">Dato</th>
                    <th className="py-1 pr-2 font-medium">Tekst</th>
                    <th className="py-1 pr-2 font-medium text-right">Beløb</th>
                    <th className="py-1 pr-2 font-medium">Konto</th>
                    <th className="py-1 pr-2 font-medium">Moms</th>
                    <th className="py-1 pr-2 font-medium">Status</th>
                    <th className="py-1 font-medium w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => {
                    const isEditing = editingId === exp.id;
                    const kontoValid = acctMap.has(exp.konto);
                    return (
                      <tr key={exp.id} className={`border-b hover:bg-muted/50 ${exp.matched ? 'opacity-50 line-through' : ''}`}
                        onDoubleClick={() => !exp.matched && startEdit(exp)}>
                        <td className="py-1.5 pr-2 whitespace-nowrap">
                          {isEditing
                            ? <DatePicker value={editRow.dato || ''} onChange={v => setEditRow(p => ({ ...p, dato: v }))} className="w-24" />
                            : exp.dato || '—'}
                        </td>
                        <td className="py-1.5 pr-2">
                          {isEditing ? <Input className="h-7 text-xs" value={editRow.tekst || ''} onChange={e => setEditRow(p => ({ ...p, tekst: e.target.value }))} />
                            : exp.tekst}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">
                          {isEditing ? <Input type="number" className="h-7 text-xs text-right w-24" value={editRow.belob ?? ''} onChange={e => setEditRow(p => ({ ...p, belob: Number(e.target.value) }))} />
                            : fmtDec(exp.belob)}
                        </td>
                        <td className="py-1.5 pr-2" style={!kontoValid ? { color: 'hsl(var(--destructive))' } : {}}>
                          {isEditing ? <KontoPicker value={editRow.konto ?? exp.konto} onChange={v => setEditRow(p => ({ ...p, konto: v }))} acctList={acctList} acctMap={acctMap} className="w-44" />
                            : <span title={acctMap.get(exp.konto) || 'Ukendt konto'}>{exp.konto} {acctMap.get(exp.konto) || ''}</span>}
                        </td>
                        <td className="py-1.5 pr-2">
                          {isEditing ? <Input className="h-7 text-xs w-16" value={editRow.moms || ''} onChange={e => setEditRow(p => ({ ...p, moms: e.target.value || null }))} />
                            : (exp.moms || '—')}
                        </td>
                        <td className="py-1.5 pr-2">
                          {exp.matched
                            ? <span className="inline-flex items-center gap-1 text-[hsl(var(--budget-positive))]"><Check className="h-3 w-3" />Matchet</span>
                            : <span className="text-muted-foreground">Aktiv</span>}
                        </td>
                        <td className="py-1.5 text-right">
                          {isEditing ? (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveEdit(exp.id)}><Check className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>✕</Button>
                            </div>
                          ) : exp.matched ? (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleUnmatch(exp.id)} title="Fortryd match">
                              <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(exp)} title="Redigér">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setCopyDialog(exp); setCopyMonths(1); }} title="Kopiér frem">
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(exp.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Copy forward dialog */}
      <Dialog open={!!copyDialog} onOpenChange={o => !o && setCopyDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Kopiér udgift frem</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Kopiér "{copyDialog?.tekst}" ({fmtDec(copyDialog?.belob || 0)} kr, konto {copyDialog?.konto}) frem i tid.
            </p>
            <div>
              <label className="text-xs font-medium">Antal måneder frem</label>
              <Input type="number" min={1} max={36} className="h-8 text-xs w-24 mt-1" value={copyMonths} onChange={e => setCopyMonths(Math.max(1, Number(e.target.value)))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCopyDialog(null)}>Annullér</Button>
            <Button size="sm" onClick={handleCopyForward}>Opret {copyMonths} {copyMonths === 1 ? 'kopi' : 'kopier'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
