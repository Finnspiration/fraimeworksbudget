import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Users, Target, TrendingUp } from 'lucide-react';
import { fmt } from '@/lib/budget-utils';
import { useCustomers, usePipelineJobs, useCreateCustomer, useDeleteCustomer, useCreateJob, useUpdateJob, useDeleteJob, type PipelineJobWithCustomer } from '@/hooks/use-pipeline';
import type { PLRow } from '@/data/budget-constants';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead', color: 'bg-muted text-muted-foreground' },
  { value: 'tilbud', label: 'Tilbud', color: 'bg-primary/20 text-primary' },
  { value: 'forhandling', label: 'Forhandling', color: 'bg-accent text-accent-foreground' },
  { value: 'vundet', label: 'Vundet', color: 'bg-[hsl(var(--budget-positive))]/20 text-[hsl(var(--budget-positive))]' },
  { value: 'tabt', label: 'Tabt', color: 'bg-destructive/20 text-destructive' },
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
  const createCustomer = useCreateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();

  // Customer form
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');

  // Job form
  const [jobOpen, setJobOpen] = useState(false);
  const [jobCustomerId, setJobCustomerId] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobAmount, setJobAmount] = useState('');
  const [jobProb, setJobProb] = useState(50);
  const [jobDate, setJobDate] = useState('');
  const [jobStatus, setJobStatus] = useState('lead');
  const [jobKonto, setJobKonto] = useState('1010');

  const omsAccts = activePL.filter(r => r.t === 'acct' && r.grp === 'oms');

  const activeJobs = jobs.filter(j => j.status !== 'tabt');
  const totalPipeline = activeJobs.reduce((s, j) => s + Number(j.amount), 0);
  const weightedPipeline = activeJobs.reduce((s, j) => s + Number(j.amount) * j.probability / 100, 0);

  const handleAddCustomer = () => {
    if (!custName.trim()) return;
    createCustomer.mutate({ name: custName, contact_email: custEmail || undefined }, {
      onSuccess: () => { setCustName(''); setCustEmail(''); toast.success('Kunde oprettet'); },
    });
  };

  const handleAddJob = () => {
    if (!jobCustomerId || !jobDesc || !jobAmount || !jobDate) {
      toast.error('Udfyld alle felter');
      return;
    }
    createJob.mutate({
      customer_id: jobCustomerId,
      description: jobDesc,
      amount: Number(jobAmount),
      probability: jobProb,
      expected_payment_date: jobDate,
      status: jobStatus,
      konto: Number(jobKonto),
      notes: null,
    }, {
      onSuccess: () => {
        setJobOpen(false);
        setJobDesc(''); setJobAmount(''); setJobProb(50); setJobDate(''); setJobStatus('lead');
        toast.success('Job tilføjet');
      },
    });
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
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1"><Target className="h-3.5 w-3.5" />Total pipeline</div>
            <p className="text-2xl font-bold tracking-tight">{fmt(totalPipeline)} kr</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[hsl(var(--budget-positive))]">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1"><TrendingUp className="h-3.5 w-3.5" />Vægtet pipeline</div>
            <p className="text-2xl font-bold tracking-tight">{fmt(weightedPipeline)} kr</p>
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
          <Dialog open={jobOpen} onOpenChange={setJobOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" />Tilføj job</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nyt pipeline-job</DialogTitle></DialogHeader>
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
                        {omsAccts.map(a => <SelectItem key={a.nr} value={String(a.nr)}>{a.nr} {a.lbl}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Annullér</Button></DialogClose>
                <Button onClick={handleAddJob} disabled={createJob.isPending}>Tilføj</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loadingJ ? <p className="text-sm text-muted-foreground">Indlæser...</p> : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left px-3 py-2">Kunde</th>
                    <th className="text-left px-3 py-2">Beskrivelse</th>
                    <th className="text-right px-3 py-2">Beløb</th>
                    <th className="text-center px-3 py-2">Sandsynlighed</th>
                    <th className="text-right px-3 py-2">Vægtet</th>
                    <th className="text-center px-3 py-2">Dato</th>
                    <th className="text-center px-3 py-2">Status</th>
                    <th className="text-center px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(j => (
                    <tr key={j.id} className={`border-b border-border/30 ${j.status === 'tabt' ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2 font-medium">{j.customers?.name || '–'}</td>
                      <td className="px-3 py-2">{j.description}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(Number(j.amount))}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{j.probability}%</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(Number(j.amount) * j.probability / 100)}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground text-xs">{j.expected_payment_date}</td>
                      <td className="px-3 py-2 text-center">
                        <Select value={j.status} onValueChange={(v) => handleStatusChange(j, v)}>
                          <SelectTrigger className="h-7 w-28 text-xs border-none">{statusBadge(j.status)}</SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteJob.mutate(j.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {jobs.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Ingen jobs endnu — tilføj dit første pipeline-job ovenfor</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
