import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, GripVertical, User } from 'lucide-react';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TodoColumn {
  id: string;
  title: string;
  sort_order: number;
}

interface TodoCard {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  sort_order: number;
}

export default function Todo() {
  const { user } = useAuth();
  const [columns, setColumns] = useState<TodoColumn[]>([]);
  const [cards, setCards] = useState<TodoCard[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [newColTitle, setNewColTitle] = useState('');
  const [addingCardCol, setAddingCardCol] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDesc, setNewCardDesc] = useState('');
  const [newCardAssign, setNewCardAssign] = useState('');
  const [allProfiles, setAllProfiles] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    const [{ data: cols }, { data: cds }, { data: profs }] = await Promise.all([
      supabase.from('todo_columns').select('*').order('sort_order'),
      supabase.from('todo_cards').select('*').order('sort_order'),
      supabase.from('profiles').select('id, name').eq('approved', true),
    ]);
    setColumns(cols ?? []);
    setCards(cds ?? []);
    if (profs) {
      const map: Record<string, string> = {};
      profs.forEach(p => { map[p.id] = p.name; });
      setProfiles(map);
      setAllProfiles(profs);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime for cards
  useEffect(() => {
    const channel = supabase.channel('todo-cards-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todo_cards' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const addColumn = async () => {
    if (!newColTitle.trim()) return;
    await supabase.from('todo_columns').insert({
      title: newColTitle.trim(),
      sort_order: columns.length,
    });
    setNewColTitle('');
    load();
  };

  const deleteColumn = async (id: string) => {
    await supabase.from('todo_columns').delete().eq('id', id);
    load();
  };

  const addCard = async (columnId: string) => {
    if (!newCardTitle.trim()) return;
    const colCards = cards.filter(c => c.column_id === columnId);
    await supabase.from('todo_cards').insert({
      column_id: columnId,
      title: newCardTitle.trim(),
      description: newCardDesc.trim() || null,
      assigned_to: newCardAssign || null,
      sort_order: colCards.length,
    });
    setNewCardTitle('');
    setNewCardDesc('');
    setNewCardAssign('');
    setAddingCardCol(null);
    load();
  };

  const deleteCard = async (id: string) => {
    await supabase.from('todo_cards').delete().eq('id', id);
    load();
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    const card = cards.find(c => c.id === draggableId);
    if (!card) return;

    // Update column and sort_order
    const destColId = destination.droppableId;
    const destCards = cards
      .filter(c => c.column_id === destColId && c.id !== draggableId)
      .sort((a, b) => a.sort_order - b.sort_order);

    destCards.splice(destination.index, 0, { ...card, column_id: destColId });

    // Batch update
    const updates = destCards.map((c, i) => ({
      id: c.id,
      column_id: destColId,
      sort_order: i,
      title: c.title,
    }));

    // Also re-sort source column if different
    if (source.droppableId !== destColId) {
      const srcCards = cards
        .filter(c => c.column_id === source.droppableId && c.id !== draggableId)
        .sort((a, b) => a.sort_order - b.sort_order);
      srcCards.forEach((c, i) => {
        updates.push({ id: c.id, column_id: source.droppableId, sort_order: i, title: c.title });
      });
    }

    // Optimistic update
    setCards(prev => {
      const next = [...prev];
      for (const u of updates) {
        const idx = next.findIndex(c => c.id === u.id);
        if (idx >= 0) {
          next[idx] = { ...next[idx], column_id: u.column_id, sort_order: u.sort_order };
        }
      }
      return next;
    });

    // Persist
    for (const u of updates) {
      await supabase.from('todo_cards').update({
        column_id: u.column_id,
        sort_order: u.sort_order,
      }).eq('id', u.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Opgavetavle</h1>
        <div className="flex gap-2">
          <Input
            value={newColTitle}
            onChange={e => setNewColTitle(e.target.value)}
            placeholder="Ny kolonne…"
            className="w-40"
            onKeyDown={e => e.key === 'Enter' && addColumn()}
          />
          <Button size="sm" onClick={addColumn}><Plus className="h-3.5 w-3.5 mr-1" />Tilføj</Button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(col => {
            const colCards = cards.filter(c => c.column_id === col.id).sort((a, b) => a.sort_order - b.sort_order);
            return (
              <div key={col.id} className="w-72 shrink-0">
                <Card>
                  <CardHeader className="py-2.5 px-3 flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm">{col.title}</CardTitle>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setAddingCardCol(col.id)}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteColumn(col.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <Droppable droppableId={col.id}>
                    {(provided) => (
                      <CardContent
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="px-2 pb-2 min-h-[60px] space-y-2"
                      >
                        {colCards.map((card, idx) => (
                          <Draggable key={card.id} draggableId={card.id} index={idx}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`rounded-md border bg-card p-2.5 text-sm ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''}`}
                              >
                                <div className="flex items-start gap-1.5">
                                  <div {...provided.dragHandleProps} className="mt-0.5 text-muted-foreground">
                                    <GripVertical className="h-3.5 w-3.5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium leading-tight">{card.title}</p>
                                    {card.description && (
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.description}</p>
                                    )}
                                    {card.assigned_to && (
                                      <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                                        <User className="h-3 w-3" />
                                        {profiles[card.assigned_to] || 'Bruger'}
                                      </div>
                                    )}
                                  </div>
                                  <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => deleteCard(card.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </CardContent>
                    )}
                  </Droppable>
                </Card>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Add card dialog */}
      <Dialog open={!!addingCardCol} onOpenChange={(o) => !o && setAddingCardCol(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ny opgave</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={newCardTitle} onChange={e => setNewCardTitle(e.target.value)} placeholder="Titel" />
            <Textarea value={newCardDesc} onChange={e => setNewCardDesc(e.target.value)} placeholder="Beskrivelse (valgfri)" rows={3} />
            <Select value={newCardAssign} onValueChange={setNewCardAssign}>
              <SelectTrigger><SelectValue placeholder="Tildel til (valgfri)" /></SelectTrigger>
              <SelectContent>
                {allProfiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => addingCardCol && addCard(addingCardCol)} disabled={!newCardTitle.trim()}>
              Tilføj opgave
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
