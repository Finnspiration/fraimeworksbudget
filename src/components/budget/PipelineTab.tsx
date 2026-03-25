import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Users, Target, TrendingUp, Pencil } from 'lucide-react';
import { fmt, getTxnAmounts, getJobAmounts } from '@/lib/budget-utils';
import { useCustomers, usePipelineJobs, useCreateCustomer, useDeleteCustomer, useCreateJob, useUpdateJob, useDeleteJob, useRevenueTransactions, useAssignCustomerToTxn, type PipelineJobWithCustomer } from '@/hooks/use-pipeline';
import type { PLRow } from '@/data/budget-constants';
import { toast } from 'sonner';
import CommentButton from '@/components/CommentButton';

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead', color: 'bg-muted text-muted-foreground' },
  { value: 'tilbud', label: 'Tilbud', color: 'bg-primary/20 text-primary' },
  { value: 'forhandling', label: 'Forhandling', color: 'bg-accent text-accent-foreground' },
  { value: 'vundet', label: 'Vundet', color: 'bg-[hsl(var(--budget-positive))]/20 text-[hsl(var(--budget-positive))]' },
  { value: 'tabt', label: 'Tabt', color: 'bg-destructive/20 text-destructive' },
  { value: 'betalt', label: 'Betalt', color: 'bg-[hsl(var(--budget-positive))]/30 text-[hsl(var(--budget-positive))]' },
];

function statusBadge(status: string) {
  const s = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
  return <Badge variant="outline" className={`${s.color} text-xs`}>{s.label}</Badge>;
}

interface Props {
  activePL: PLRow[];
}

export default function PipelineTab({ activePL }: Props) {
  const { data: customers = [], isLoading: loadingC } = useCustomers();
  const { data: jobs = [], isLoading: loadingJ } = usePipelineJobs();
  const { data: revenueTxns = [] } = useRevenueTransactions();
  const createCustomer = useCreateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const assignCustomerToTxn = useAssignCustomerToTxn();

  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');

  const [jobOpen, setJobOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<PipelineJobWithCustomer | null>(null);
  const [jobCustomerId, setJobCustomerId] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobAmount, setJobAmount] = useState('');
  const [jobProb, setJobProb] = useState(50);
  const [jobDate, setJobDate] = useState('');
  const [jobStatus, setJobStatus] = useState('lead');
  const [jobKonto, setJobKonto] = useState('1010');

  const allAccts = activePL.filter(r => r.t === 'acct');

  const activeJobs = jobs.filter(j => j.status !== 'tabt');
  const totalPipelineExMoms = activeJobs.reduce((s, j) => s + Number(j.amount), 0);
  const weightedPipelineExMoms = activeJobs.reduce((s, j) => s + Number(j.amount) * j.probability / 100, 0);

  const resetForm = () => {
    setEditingJob(null);
    setJobCustomerId('');
    setJobDesc('');
    setJobAmount('');
    setJobProb(50);
    setJobDate('');
    setJobStatus('lead');
    setJobKonto('1010');
  };

  const openCreateDialog = () => { resetForm(); setJobOpen(true); };
  const openEditDialog = (job: PipelineJobWithCustomer) => {
    setEditingJob(job);
    setJobCustomerId(job.customer_id);
    setJobDesc(job.description);
    setJobAmount(String(job.amount));
    setJobProb(job.probability);
    setJobDate(job.expected_payment_date);
    setJobStatus(job.status);
    setJobKonto(String(job.konto));
    setJobOpen(true);
  };

  const handleAddCustomer = () => {
    if (!custName.trim()) return;
    createCustomer.mutate({ name: custName, contact_email: custEmail || undefined }, {
      onSuccess: () => { setCustName(''); setCustEmail(''); toast.success('Kunde oprettet'); },
    });
  };

  const handleSaveJob = () => {
    if (!jobCustomerId || !jobDesc || !jobAmount || !jobDate) {
      toast.error('Udfyld alle felter');
      return;
    }
    const payload = {
      customer_id: jobCustomerId,
      description: jobDesc,
      amount: Number(jobAmount),
      probability: jobProb,
      expected_payment_date: jobDate,
      status: jobStatus,
      konto: Number(jobKonto),
      notes: null,
    };

    if (editingJob) {
      updateJob.mutate({ id: editingJob.id, ...payload }, {
        onSuccess: () => { setJobOpen(false); resetForm(); toast.success('Job opdateret'); },
      });
    } else {
      createJob.mutate(payload, {
        onSuccess: () => { setJobOpen(false); resetForm(); toast.success('Job tilføjet'); },
      });
    }
  };

  const handleStatusChange = (job: PipelineJobWithCustomer, newStatus: string) => {
    updateJob.mutate({ id: job.id, status: newStatus });
  };

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1"><Target className="h-3.5 w-3.5" />Total pipeline (ekskl. moms)</div>
            <p className="text-2xl font-bold tracking-tight">{fmt(totalPipelineExMoms)} kr</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[hsl(var(--budget-positive))]">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1"><TrendingUp className="h-3.5 w-3.5" />Vægtet pipeline (ekskl. moms)</div>
            <p className="text-2xl font-bold tracking-tight">{fmt(weightedPipelineExMoms)} kr</p>
            <p className="text-xs text-muted-foreground mt-1">Beløb × sandsynlighed</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-accent">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1"><Users className="h-3.5 w-3.5" />Aktive jobs</div>
            <p className="text-2xl font-bold tracking-tight">{activeJobs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{customers.length} kunder</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline jobs table */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">📋 Salgspipeline</CardTitle>
          <Button size="sm" className="gap-1" onClick={openCreateDialog}><Plus className="h-3.5 w-3.5" />Tilføj job</Button>
        </CardHeader>
        <CardContent>
          {loadingJ ? <p className="text-sm text-muted-foreground">Indlæser...</p> : (
            <div className="overflow-auto max-h-[calc(100vh-400px)]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left px-3 py-2">Kunde</th>
                    <th className="text-left px-3 py-2">Beskrivelse</th>
                    <th className="text-center px-3 py-2 text-[10px]">Kilde</th>
                    <th className="text-right px-3 py-2">Ekskl. moms</th>
                    <th className="text-right px-3 py-2">Moms</th>
                    <th className="text-right px-3 py-2">Inkl. moms</th>
                    <th className="text-center px-3 py-2">Sandsynlighed</th>
                    <th className="text-right px-3 py-2">Vægtet (ekskl.)</th>
                    <th className="text-center px-3 py-2">Dato</th>
                    <th className="text-center px-3 py-2">Status</th>
                    <th className="text-center px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(j => {
                    const amounts = getJobAmounts(Number(j.amount), j.konto, activePL);
                    const weighted = amounts.netto * j.probability / 100;
                    return (
                      <tr key={j.id} className={`border-b border-border/30 ${j.status === 'tabt' ? 'opacity-50' : ''}`}>
                        <td className="px-3 py-2 font-medium">{j.customers?.name || '–'}</td>
                        <td className="px-3 py-2">{j.description}</td>
                        <td className="px-3 py-2 text-center"><Badge variant="outline" className="text-[10px] px-1.5">Manuel</Badge></td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(amounts.netto)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(amounts.momsBeloeb)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(amounts.brutto)}</td>
                        <td className="px-3 py-2 text-center tabular-nums">{j.probability}%</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(weighted)}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground text-xs">{j.expected_payment_date}</td>
                        <td className="px-3 py-2 text-center">
                          <Select value={j.status} onValueChange={(v) => handleStatusChange(j, v)}>
                            <SelectTrigger className="h-7 w-28 text-xs border-none">{statusBadge(j.status)}</SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.filter(o => o.value !== 'betalt').map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-center flex gap-1 justify-center">
                          <CommentButton contextType="pipeline" contextRef={j.id} contextLabel={`Pipeline: ${j.description}`} />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(j)}>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteJob.mutate(j.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {revenueTxns.map(txn => {
                    const amounts = getTxnAmounts(txn.belob, txn.moms, txn.konto, activePL);
                    return (
                      <tr key={`txn-${txn.id}`} className="border-b border-border/30 bg-[hsl(var(--budget-positive))]/5">
                        <td className="px-3 py-2">
                          <Select
                            value={txn.customer_id || ''}
                            onValueChange={(v) => assignCustomerToTxn.mutate({ id: txn.id, customer_id: v || null })}
                          >
                            <SelectTrigger className="h-7 w-32 text-xs">
                              <SelectValue placeholder="Vælg kunde...">{txn.customers?.name || 'Vælg kunde...'}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{txn.tekst || '–'}</td>
                        <td className="px-3 py-2 text-center"><Badge variant="outline" className="text-[10px] px-1.5 border-[hsl(var(--budget-positive))]/50 text-[hsl(var(--budget-positive))]">Import</Badge></td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(amounts.netto)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(amounts.momsBeloeb)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(amounts.brutto)}</td>
                        <td className="px-3 py-2 text-center tabular-nums">100%</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(amounts.netto)}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground text-xs">{txn.dato || '–'}</td>
                        <td className="px-3 py-2 text-center">{statusBadge('betalt')}</td>
                        <td className="px-3 py-2"></td>
                      </tr>
                    );
                  })}
                  {jobs.length === 0 && revenueTxns.length === 0 && (
                    <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">Ingen jobs endnu — tilføj dit første pipeline-job ovenfor</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Job Dialog */}
      <Dialog open={jobOpen} onOpenChange={(open) => { setJobOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingJob ? 'Rediger pipeline-job' : 'Nyt pipeline-job'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kunde</Label>
              <Select value={jobCustomerId} onValueChange={setJobCustomerId}>
                <SelectTrigger><SelectValue placeholder="Vælg kunde..." /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Beskrivelse</Label>
              <Input value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="Projektbeskrivelse" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Beløb (ekskl. moms)</Label>
                <Input type="number" value={jobAmount} onChange={e => setJobAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>Forventet betalingsdato</Label>
                <Input type="date" value={jobDate} onChange={e => setJobDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Sandsynlighed: {jobProb}%</Label>
              <Slider value={[jobProb]} onValueChange={([v]) => setJobProb(v)} min={0} max={100} step={5} className="mt-2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={jobStatus} onValueChange={setJobStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Konto</Label>
                <Select value={jobKonto} onValueChange={setJobKonto}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allAccts.map(a => <SelectItem key={a.nr} value={String(a.nr)}>{a.nr} {a.lbl}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annullér</Button></DialogClose>
            <Button onClick={handleSaveJob} disabled={createJob.isPending || updateJob.isPending}>
              {editingJob ? 'Gem ændringer' : 'Tilføj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customers */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">👥 Kunder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input value={custName} onChange={e => setCustName(e.target.value)} placeholder="Kundenavn" className="max-w-xs" />
            <Input value={custEmail} onChange={e => setCustEmail(e.target.value)} placeholder="Email (valgfrit)" className="max-w-xs" />
            <Button size="sm" onClick={handleAddCustomer} disabled={createCustomer.isPending} className="gap-1">
              <Plus className="h-3.5 w-3.5" />Tilføj
            </Button>
          </div>
          {loadingC ? <p className="text-sm text-muted-foreground">Indlæser...</p> : (
            <div className="space-y-1">
              {customers.map(c => (
                <div key={c.id} className="flex items-center justify-between py-1.5 px-3 rounded hover:bg-muted/50 text-sm">
                  <div>
                    <span className="font-medium">{c.name}</span>
                    {c.contact_email && <span className="text-muted-foreground ml-2 text-xs">{c.contact_email}</span>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCustomer.mutate(c.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              {customers.length === 0 && <p className="text-sm text-muted-foreground">Ingen kunder endnu</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
