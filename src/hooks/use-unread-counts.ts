import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useUnreadCounts() {
  const { user } = useAuth();
  const [unreadChat, setUnreadChat] = useState(0);
  const [unreadTasks, setUnreadTasks] = useState(0);

  const fetchUnreadChat = async () => {
    if (!user) return;

    // Get user's channel memberships
    const { data: memberships } = await supabase
      .from('chat_channel_members')
      .select('channel_id')
      .eq('user_id', user.id);
    if (!memberships?.length) { setUnreadChat(0); return; }

    const channelIds = memberships.map(m => m.channel_id);

    // Get last read timestamps
    const { data: lastReads } = await supabase
      .from('chat_last_read')
      .select('channel_id, last_read_at')
      .eq('user_id', user.id);

    const readMap: Record<string, string> = {};
    lastReads?.forEach(r => { readMap[r.channel_id] = r.last_read_at; });

    // Count unread messages per channel
    let total = 0;
    for (const cid of channelIds) {
      const lastRead = readMap[cid];
      let query = supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('channel_id', cid)
        .neq('user_id', user.id);
      if (lastRead) {
        query = query.gt('created_at', lastRead);
      }
      const { count } = await query;
      total += count ?? 0;
    }
    setUnreadChat(total);
  };

  const fetchUnreadTasks = async () => {
    if (!user) return;
    // Count cards in the first column (backlog) that are unassigned or assigned to current user
    const { data: columns } = await supabase
      .from('todo_columns')
      .select('id')
      .order('sort_order', { ascending: true })
      .limit(1);
    if (!columns?.length) { setUnreadTasks(0); return; }

    const { count } = await supabase
      .from('todo_cards')
      .select('id', { count: 'exact', head: true })
      .eq('column_id', columns[0].id);
    setUnreadTasks(count ?? 0);
  };

  useEffect(() => {
    if (!user) return;
    fetchUnreadChat();
    fetchUnreadTasks();

    // Listen for new messages
    const chatChannel = supabase
      .channel('unread-chat-counter')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, () => { fetchUnreadChat(); })
      .subscribe();

    // Listen for task changes
    const taskChannel = supabase
      .channel('unread-task-counter')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'todo_cards',
      }, () => { fetchUnreadTasks(); })
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(taskChannel);
    };
  }, [user]);

  return { unreadChat, unreadTasks, refreshChat: fetchUnreadChat };
}
