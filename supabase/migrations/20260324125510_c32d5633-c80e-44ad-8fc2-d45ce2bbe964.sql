
CREATE OR REPLACE FUNCTION public.is_channel_member(_channel_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_channel_members
    WHERE channel_id = _channel_id AND user_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "Members can read channel members" ON public.chat_channel_members;
CREATE POLICY "Members can read channel members"
ON public.chat_channel_members FOR SELECT
TO authenticated
USING (public.is_channel_member(channel_id, auth.uid()));

DROP POLICY IF EXISTS "Members can read their channels" ON public.chat_channels;
CREATE POLICY "Members can read their channels"
ON public.chat_channels FOR SELECT
TO authenticated
USING (public.is_channel_member(id, auth.uid()));

DROP POLICY IF EXISTS "Members can read messages" ON public.chat_messages;
CREATE POLICY "Members can read messages"
ON public.chat_messages FOR SELECT
TO authenticated
USING (public.is_channel_member(channel_id, auth.uid()));

DROP POLICY IF EXISTS "Members can send messages" ON public.chat_messages;
CREATE POLICY "Members can send messages"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND is_approved(auth.uid())
  AND public.is_channel_member(channel_id, auth.uid())
);
