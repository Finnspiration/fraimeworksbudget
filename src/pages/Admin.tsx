import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Check, X, Shield, Pencil, Plus, Save, Link2, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface UserRow {
  id: string;
  name: string;
  email: string | null;
  approved: boolean;
  created_at: string;
  roles: string[];
}

export default function Admin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [magicLink, setMagicLink] = useState('');
  const [magicLinkOpen, setMagicLinkOpen] = useState(false);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);

  const load = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at');
    const { data: roles } = await supabase.from('user_roles').select('*');
    if (!profiles) return;
    setUsers(profiles.map(p => ({
      ...p,
      email: (p as any).email ?? null,
      roles: (roles ?? []).filter(r => r.user_id === p.id).map(r => r.role),
    })));
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string, approved: boolean) => {
    await supabase.from('profiles').update({ approved }).eq('id', id);
    toast.success(approved ? 'Bruger godkendt' : 'Godkendelse fjernet');
    load();
  };

  const toggleAdmin = async (user: UserRow) => {
    if (user.roles.includes('admin')) {
      await supabase.from('user_roles').delete().eq('user_id', user.id).eq('role', 'admin');
      toast.success('Admin-rolle fjernet');
    } else {
      await supabase.from('user_roles').insert({ user_id: user.id, role: 'admin' });
      toast.success('Admin-rolle tildelt');
    }
    load();
  };

  const startEdit = (user: UserRow) => {
    setEditingId(user.id);
    setEditName(user.name);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await supabase.from('profiles').update({ name: editName.trim() }).eq('id', id);
    toast.success('Navn opdateret');
    setEditingId(null);
    load();
  };

  const createUser = async () => {
    if (!newEmail || !newPassword || !newName) {
      toast.error('Udfyld alle felter');
      return;
    }
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ email: newEmail, password: newPassword, name: newName }),
        }
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      toast.success('Bruger oprettet');
      setAddOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Kunne ikke oprette bruger');
    } finally {
      setCreating(false);
    }
  };

  const generateMagicLink = async (user: UserRow) => {
    if (!user.email) {
      toast.error('Bruger har ingen email');
      return;
    }
    setGeneratingLink(user.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-generate-magic-link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ email: user.email }),
        }
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setMagicLink(result.link);
      setMagicLinkOpen(true);
    } catch (e: any) {
      toast.error(e.message || 'Kunne ikke generere magic link');
    } finally {
      setGeneratingLink(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(magicLink);
      toast.success('Link kopieret til udklipsholder');
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = magicLink;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast.success('Link kopieret til udklipsholder');
      } catch {
        toast.error('Kunne ikke kopiere linket');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Brugeradministration</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Tilføj bruger
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Opret ny bruger</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label>Navn</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Fuldt navn" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="bruger@eksempel.dk" />
              </div>
              <div>
                <Label>Adgangskode</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mindst 6 tegn" />
              </div>
              <Button onClick={createUser} disabled={creating} className="w-full">
                {creating ? 'Opretter…' : 'Opret bruger'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Magic link dialog */}
      <Dialog open={magicLinkOpen} onOpenChange={setMagicLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Magic link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Kopiér linket og send det til brugeren. Linket giver adgang uden adgangskode.
            </p>
            <div className="flex gap-2">
              <Input value={magicLink} readOnly className="text-xs" />
              <Button size="sm" onClick={copyLink}>
                <Copy className="h-4 w-4 mr-1" />
                Kopiér
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3">
        {users.map(u => (
          <Card key={u.id}>
            <CardContent className="flex items-center justify-between py-3 px-4">
              <div className="flex-1 min-w-0 mr-3">
                {editingId === u.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="h-8 text-sm"
                      onKeyDown={e => e.key === 'Enter' && saveEdit(u.id)}
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={() => saveEdit(u.id)}>
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{u.name}</p>
                    {u.email && <span className="text-xs text-muted-foreground truncate">{u.email}</span>}
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => startEdit(u)}>
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-1.5 mt-1">
                  {u.approved
                    ? <Badge variant="default" className="text-xs">Godkendt</Badge>
                    : <Badge variant="secondary" className="text-xs">Afventer</Badge>
                  }
                  {u.roles.includes('admin') && <Badge variant="destructive" className="text-xs">Admin</Badge>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateMagicLink(u)}
                  disabled={generatingLink === u.id}
                  title="Generér magic link"
                >
                  <Link2 className="h-3.5 w-3.5 mr-1" />
                  {generatingLink === u.id ? 'Genererer…' : 'Magic link'}
                </Button>
                <Button size="sm" variant={u.approved ? 'outline' : 'default'} onClick={() => approve(u.id, !u.approved)}>
                  {u.approved ? <X className="h-3.5 w-3.5 mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  {u.approved ? 'Fjern' : 'Godkend'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleAdmin(u)}>
                  <Shield className="h-3.5 w-3.5 mr-1" />
                  {u.roles.includes('admin') ? 'Fjern admin' : 'Gør admin'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
