import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Plus, Hash, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Channel {
  id: string;
  name: string | null;
  is_direct: boolean;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile_name?: string;
}

export default function Chat() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [allProfiles, setAllProfiles] = useState<{ id: string; name: string }[]>([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [dmUserId, setDmUserId] = useState('');
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showNewDm, setShowNewDm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load profiles
  useEffect(() => {
    supabase.from('profiles').select('id, name').eq('approved', true).then(({ data }) => {
      if (!data) return;
      const map: Record<string, string> = {};
      data.forEach(p => { map[p.id] = p.name; });
      setProfiles(map);
      setAllProfiles(data.filter(p => p.id !== user?.id));
    });
  }, [user]);

  // Load channels
  const loadChannels = async () => {
    if (!user) return;
    const { data: memberships } = await supabase
      .from('chat_channel_members')
      .select('channel_id')
      .eq('user_id', user.id);
    if (!memberships?.length) return;
    const ids = memberships.map(m => m.channel_id);
    const { data } = await supabase.from('chat_channels').select('*').in('id', ids);
    setChannels(data ?? []);
    if (!activeChannel && data?.length) setActiveChannel(data[0].id);
  };

  useEffect(() => { loadChannels(); }, [user]);

  // Load messages for active channel
  useEffect(() => {
    if (!activeChannel) return;
    supabase.from('chat_messages').select('*').eq('channel_id', activeChannel).order('created_at').then(({ data }) => {
      setMessages(data ?? []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    const channel = supabase.channel(`chat-${activeChannel}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${activeChannel}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChannel]);

  const sendMessage = async () => {
    if (!input.trim() || !activeChannel || !user) return;
    const { error } = await supabase.from('chat_messages').insert({
      channel_id: activeChannel,
      user_id: user.id,
      content: input.trim(),
    });
    if (error) {
      console.error('sendMessage error:', error);
      toast.error('Kunne ikke sende besked: ' + error.message);
      return;
    }
    setInput('');
  };

  const createChannel = async () => {
    if (!newChannelName.trim() || !user) return;
    const channelId = crypto.randomUUID();
    const { error } = await supabase.from('chat_channels').insert({ id: channelId, name: newChannelName.trim(), is_direct: false });
    if (error) {
      console.error('createChannel error:', error);
      toast.error('Kunne ikke oprette kanal: ' + error.message);
      return;
    }
    // Insert creator membership first
    const { error: memErr } = await supabase.from('chat_channel_members').insert({ channel_id: channelId, user_id: user.id });
    if (memErr) {
      console.error('membership error:', memErr);
      toast.error('Kanal oprettet, men kunne ikke tilføje dig som medlem');
      return;
    }
    // Add all approved users
    const { data: approved } = await supabase.from('profiles').select('id').eq('approved', true);
    if (approved) {
      const inserts = approved.filter(p => p.id !== user.id).map(p => ({ channel_id: channelId, user_id: p.id }));
      if (inserts.length) await supabase.from('chat_channel_members').insert(inserts);
    }
    setShowNewChannel(false);
    setNewChannelName('');
    loadChannels();
    setActiveChannel(channelId);
  };

  const createDm = async () => {
    if (!dmUserId || !user) return;
    // Check if DM already exists
    const { data: myChannels } = await supabase
      .from('chat_channel_members')
      .select('channel_id')
      .eq('user_id', user.id);
    if (myChannels) {
      for (const mc of myChannels) {
        const ch = channels.find(c => c.id === mc.channel_id && c.is_direct);
        if (ch) {
          const { data: members } = await supabase
            .from('chat_channel_members')
            .select('user_id')
            .eq('channel_id', ch.id);
          if (members?.some(m => m.user_id === dmUserId)) {
            setActiveChannel(ch.id);
            setShowNewDm(false);
            return;
          }
        }
      }
    }
    const channelId = crypto.randomUUID();
    const { error } = await supabase.from('chat_channels').insert({ id: channelId, is_direct: true });
    if (error) {
      console.error('createDm error:', error);
      toast.error('Kunne ikke oprette samtale: ' + error.message);
      return;
    }
    const { error: memErr } = await supabase.from('chat_channel_members').insert([
      { channel_id: channelId, user_id: user.id },
      { channel_id: channelId, user_id: dmUserId },
    ]);
    if (memErr) {
      console.error('dm membership error:', memErr);
      toast.error('Samtale oprettet, men kunne ikke tilføje medlemmer');
      return;
    }
    setShowNewDm(false);
    setDmUserId('');
    loadChannels();
    setActiveChannel(channelId);
  };

  const getChannelLabel = (ch: Channel) => {
    if (!ch.is_direct) return ch.name || 'Kanal';
    return 'DM'; // Will be resolved below
  };

  const [dmNames, setDmNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const directChannels = channels.filter(c => c.is_direct);
    if (!directChannels.length || !user) return;
    Promise.all(directChannels.map(async (ch) => {
      const { data } = await supabase.from('chat_channel_members').select('user_id').eq('channel_id', ch.id);
      const otherId = data?.find(m => m.user_id !== user.id)?.user_id;
      return { id: ch.id, name: otherId ? profiles[otherId] || 'Bruger' : 'DM' };
    })).then(results => {
      const map: Record<string, string> = {};
      results.forEach(r => { map[r.id] = r.name; });
      setDmNames(map);
    });
  }, [channels, profiles, user]);

  const threadChannels = channels.filter(c => (c as any).is_thread);
  const openThreads = threadChannels.filter(c => !(c as any).closed);
  const closedThreads = threadChannels.filter(c => (c as any).closed);
  const [showClosedThreads, setShowClosedThreads] = useState(false);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar */}
      <Card className="w-60 flex flex-col p-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Kanaler</h3>
          <Dialog open={showNewChannel} onOpenChange={setShowNewChannel}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6"><Plus className="h-3.5 w-3.5" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ny kanal</DialogTitle></DialogHeader>
              <div className="flex gap-2">
                <Input value={newChannelName} onChange={e => setNewChannelName(e.target.value)} placeholder="Kanalnavn" />
                <Button onClick={createChannel}>Opret</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-0.5">
          {channels.filter(c => !c.is_direct).map(ch => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-1.5 ${activeChannel === ch.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
            >
              <Hash className="h-3.5 w-3.5 shrink-0" />{ch.name}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4 mb-2">
          <h3 className="text-sm font-semibold">Beskeder</h3>
          <Dialog open={showNewDm} onOpenChange={setShowNewDm}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6"><Plus className="h-3.5 w-3.5" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ny besked</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={dmUserId} onValueChange={setDmUserId}>
                  <SelectTrigger><SelectValue placeholder="Vælg bruger" /></SelectTrigger>
                  <SelectContent>
                    {allProfiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={createDm} disabled={!dmUserId}>Start samtale</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-0.5">
          {channels.filter(c => c.is_direct).map(ch => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-1.5 ${activeChannel === ch.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
            >
              <MessageCircle className="h-3.5 w-3.5 shrink-0" />{dmNames[ch.id] || 'DM'}
            </button>
          ))}
        </div>
      </Card>

      {/* Messages */}
      <Card className="flex-1 flex flex-col p-0 overflow-hidden">
        {activeChannel ? (
          <>
            <div className="border-b px-4 py-2.5">
              <h3 className="font-medium text-sm">
                {channels.find(c => c.id === activeChannel)?.is_direct
                  ? dmNames[activeChannel] || 'Besked'
                  : `# ${channels.find(c => c.id === activeChannel)?.name || 'Kanal'}`
                }
              </h3>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map(m => (
                  <div key={m.id} className={`flex flex-col ${m.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                    <p className="text-xs text-muted-foreground mb-0.5">{profiles[m.user_id] || 'Bruger'}</p>
                    <div className={`rounded-lg px-3 py-2 max-w-[70%] text-sm ${m.user_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {m.content}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(m.created_at).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
            <div className="border-t p-3 flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Skriv en besked…"
              />
              <Button size="icon" onClick={sendMessage}><Send className="h-4 w-4" /></Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Vælg eller opret en kanal for at starte
          </div>
        )}
      </Card>
    </div>
  );
}
