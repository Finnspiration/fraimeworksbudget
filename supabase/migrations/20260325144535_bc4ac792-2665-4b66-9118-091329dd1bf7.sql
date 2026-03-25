
ALTER TABLE public.chat_channels 
  ADD COLUMN context_type text,
  ADD COLUMN context_ref text,
  ADD COLUMN context_label text,
  ADD COLUMN is_thread boolean NOT NULL DEFAULT false,
  ADD COLUMN closed boolean NOT NULL DEFAULT false;

-- Allow members to update channels (for closing threads)
CREATE POLICY "Members can update their channels"
ON public.chat_channels
FOR UPDATE
TO authenticated
USING (is_channel_member(id, auth.uid()))
WITH CHECK (is_channel_member(id, auth.uid()));
