import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ThreadPanel from './ThreadPanel';

interface Props {
  contextType: string;
  contextRef: string;
  contextLabel: string;
}

export default function CommentButton({ contextType, contextRef, contextLabel }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [hasThread, setHasThread] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if a thread already exists for this context
  useEffect(() => {
    if (!user) return;
    supabase
      .from('chat_channels')
      .select('id, closed')
      .eq('context_type', contextType)
      .eq('context_ref', contextRef)
      .eq('is_thread', true)
      .limit(1)
      .then(({ data }) => {
        if (data?.length) {
          setChannelId(data[0].id);
          setHasThread(!data[0].closed);
        }
      });
  }, [contextType, contextRef, user]);

  const openThread = async () => {
    if (!user) return;

    if (channelId) {
      setOpen(true);
      return;
    }

    setLoading(true);
    try {
      const newId = crypto.randomUUID();
      const { error } = await supabase.from('chat_channels').insert({
        id: newId,
        name: contextLabel,
        is_direct: false,
        is_thread: true,
        context_type: contextType,
        context_ref: contextRef,
        context_label: contextLabel,
        closed: false,
      });
      if (error) throw error;

      // Add creator as member
      await supabase.from('chat_channel_members').insert({ channel_id: newId, user_id: user.id });

      // Add all approved users
      const { data: approved } = await supabase.from('profiles').select('id').eq('approved', true);
      if (approved) {
        const inserts = approved.filter(p => p.id !== user.id).map(p => ({ channel_id: newId, user_id: p.id }));
        if (inserts.length) await supabase.from('chat_channel_members').insert(inserts);
      }

      setChannelId(newId);
      setHasThread(true);
      setOpen(true);
    } catch (err: any) {
      console.error('create thread error:', err);
      toast.error('Kunne ikke oprette tråd');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={`h-6 w-6 ${hasThread ? 'text-primary' : 'text-muted-foreground/50 hover:text-muted-foreground'}`}
        onClick={openThread}
        disabled={loading}
        title={hasThread ? 'Åbn tråd' : 'Start kommentar'}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {hasThread && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />}
      </Button>

      {open && channelId && (
        <ThreadPanel
          channelId={channelId}
          label={contextLabel}
          open={open}
          onClose={() => setOpen(false)}
          onClosed={() => { setHasThread(false); }}
        />
      )}
    </>
  );
}
