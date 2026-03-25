import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface Props {
  channelId: string;
  label: string;
  open: boolean;
  onClose: () => void;
  onClosed: () => void;
}

export default function ThreadPanel({ channelId, label, open, onClose, onClosed }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [closed, setClosed] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load profiles
  useEffect(() => {
    supabase.from('profiles').select('id, name').then(({ data }) => {
      if (!data) return;
      const map: Record<string, string> = {};
      data.forEach(p => { map[p.id] = p.name; });
      setProfiles(map);
    });
  }, []);

  // Load channel status + messages
  useEffect(() => {
    if (!channelId) return;

    supabase.from('chat_channels').select('closed').eq('id', channelId).single().then(({ data }) => {
      if (data) setClosed(data.closed);
    });

    supabase.from('chat_messages').select('*').eq('channel_id', channelId).order('created_at').then(({ data }) => {
      setMessages(data ?? []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    const channel = supabase.channel(`thread-${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [channelId]);

  const sendMessage = async () => {
    if (!input.trim() || !user || closed) return;
    const { error } = await supabase.from('chat_messages').insert({
      channel_id: channelId,
      user_id: user.id,
      content: input.trim(),
    });
    if (error) {
      toast.error('Kunne ikke sende besked');
      return;
    }
    setInput('');
  };

  const toggleClosed = async () => {
    const newVal = !closed;
    const { error } = await supabase.from('chat_channels').update({ closed: newVal }).eq('id', channelId);
    if (error) {
      toast.error('Kunne ikke opdatere tråd');
      return;
    }
    setClosed(newVal);
    if (newVal) {
      onClosed();
      toast.success('Tråd lukket');
    } else {
      toast.success('Tråd genåbnet');
    }
  };

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent className="flex flex-col p-0 w-[400px] sm:max-w-[400px]">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm truncate pr-2">{label}</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs shrink-0"
              onClick={toggleClosed}
            >
              {closed ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {closed ? 'Genåbn' : 'Luk tråd'}
            </Button>
          </div>
          {closed && <p className="text-xs text-muted-foreground">Denne tråd er lukket</p>}
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-3">
          <div className="space-y-3">
            {messages.map(m => (
              <div key={m.id} className={`flex flex-col ${m.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                <p className="text-xs text-muted-foreground mb-0.5">{profiles[m.user_id] || 'Bruger'}</p>
                <div className={`rounded-lg px-3 py-2 max-w-[85%] text-sm ${m.user_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
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

        {!closed && (
          <div className="border-t p-3 flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Skriv en kommentar…"
            />
            <Button size="icon" onClick={sendMessage}><Send className="h-4 w-4" /></Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
