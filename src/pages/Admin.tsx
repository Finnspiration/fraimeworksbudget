import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface UserRow {
  id: string;
  name: string;
  approved: boolean;
  created_at: string;
  roles: string[];
}

export default function Admin() {
  const [users, setUsers] = useState<UserRow[]>([]);

  const load = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at');
    const { data: roles } = await supabase.from('user_roles').select('*');
    if (!profiles) return;
    setUsers(profiles.map(p => ({
      ...p,
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Brugeradministration</h1>
      <div className="grid gap-3">
        {users.map(u => (
          <Card key={u.id}>
            <CardContent className="flex items-center justify-between py-3 px-4">
              <div>
                <p className="font-medium">{u.name}</p>
                <div className="flex gap-1.5 mt-1">
                  {u.approved
                    ? <Badge variant="default" className="text-xs">Godkendt</Badge>
                    : <Badge variant="secondary" className="text-xs">Afventer</Badge>
                  }
                  {u.roles.includes('admin') && <Badge variant="destructive" className="text-xs">Admin</Badge>}
                </div>
              </div>
              <div className="flex gap-2">
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
