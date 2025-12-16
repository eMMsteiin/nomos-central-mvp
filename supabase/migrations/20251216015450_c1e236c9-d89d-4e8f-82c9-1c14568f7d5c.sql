-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  proposal JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create chat_actions_log table
CREATE TABLE public.chat_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'applied', 'cancelled', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_actions_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations (permissive for MVP with device_id)
CREATE POLICY "Users can view their own conversations"
ON public.conversations FOR SELECT
USING (true);

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own conversations"
ON public.conversations FOR UPDATE
USING (true);

-- RLS Policies for messages
CREATE POLICY "Users can view messages from their conversations"
ON public.messages FOR SELECT
USING (true);

CREATE POLICY "Users can create messages"
ON public.messages FOR INSERT
WITH CHECK (true);

-- RLS Policies for chat_actions_log
CREATE POLICY "Users can view their action logs"
ON public.chat_actions_log FOR SELECT
USING (true);

CREATE POLICY "Users can create action logs"
ON public.chat_actions_log FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their action logs"
ON public.chat_actions_log FOR UPDATE
USING (true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create indexes for performance
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_chat_actions_log_user_id ON public.chat_actions_log(user_id);
CREATE INDEX idx_chat_actions_log_conversation_id ON public.chat_actions_log(conversation_id);