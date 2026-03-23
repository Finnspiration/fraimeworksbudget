import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fmtDec } from '@/lib/budget-utils';
import type { PLRow } from '@/data/budget-constants';
import { useFutureExpenses, type FutureExpense } from '@/hooks/use-future-expenses';
import { Plus, Trash2, Check, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  activePL: PLRow[];
}

const emptyRow = (): Omit<FutureExpense, 'id' | 'matched' | 'matched_txn_id' | 'created_at'> => ({
  dato: '', tekst: '', belob: 0, konto: 0, moms: null, bilag: null, modkonto: null, faktura: null,
});

export default function FutureExpensesTab({ activePL }: Props) {
  const { expenses, addExpense, updateExpense, deleteExpense, isLoading } = useFutureExpenses();
  const [newRow, setNewRow] = useState(emptyRow());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<FutureExpense>>({});

  const acctMap = useMemo(() => {
    const m = new Map<number, string>();
    activePL.filter(r => (r.t === 'acct' || r.t === 'bal') && r.nr).forEach(r => m.set(r.nr!, r.lbl || ''));
    return m;
  }, [activePL]);

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
          <div className="grid grid-cols-[100px_1fr_100px_80px_70px_40px] gap-1 mb-4 items-end">
            <div>
              <label className="text-[10px] text-muted-foreground">Dato</label>
              <Input type="date" className="h-8 text-xs" value={newRow.dato} onChange={e => setNewRow(p => ({ ...p, dato: e.target.value }))} />
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
              <Input type="number" className="h-8 text-xs" value={newRow.konto || ''} onChange={e => setNewRow(p => ({ ...p, konto: Number(e.target.value) }))}
                style={newRow.konto && !acctMap.has(newRow.konto) ? { color: 'hsl(var(--destructive))' } : {}} />
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
                    <th className="py-1 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => {
                    const isEditing = editingId === exp.id;
                    const kontoValid = acctMap.has(exp.konto);
                    return (
                      <tr key={exp.id} className={`border-b hover:bg-muted/50 ${exp.matched ? 'opacity-50 line-through' : ''}`}
                        onDoubleClick={() => !exp.matched && startEdit(exp)}>
                        <td className="py-1.5 pr-2">
                          {isEditing ? <Input type="date" className="h-7 text-xs w-28" value={editRow.dato || ''} onChange={e => setEditRow(p => ({ ...p, dato: e.target.value }))} />
                            : exp.dato}
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
                          {isEditing ? <Input type="number" className="h-7 text-xs w-20" value={editRow.konto ?? ''} onChange={e => setEditRow(p => ({ ...p, konto: Number(e.target.value) }))} />
                            : <span title={acctMap.get(exp.konto) || 'Ukendt konto'}>{exp.konto}</span>}
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
                          ) : !exp.matched ? (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(exp.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          ) : null}
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
    </div>
  );
}
