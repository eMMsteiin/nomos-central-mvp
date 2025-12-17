-- Allow users to delete their own conversations
CREATE POLICY "Users can delete their own conversations"
ON public.conversations
FOR DELETE
USING (true);

-- Allow users to delete messages from their conversations
CREATE POLICY "Users can delete messages"
ON public.messages
FOR DELETE
USING (true);