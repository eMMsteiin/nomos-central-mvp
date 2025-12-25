-- Step 0: Clear existing data (old device-based data cannot be migrated)
DELETE FROM public.flashcard_reviews;
DELETE FROM public.flashcard_sessions;
DELETE FROM public.flashcards;
DELETE FROM public.flashcard_decks;
DELETE FROM public.chat_actions_log;
DELETE FROM public.messages;
DELETE FROM public.conversations;

-- Step 1: Drop existing RLS policies
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can create messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.messages;

DROP POLICY IF EXISTS "Users can create action logs" ON public.chat_actions_log;
DROP POLICY IF EXISTS "Users can update their action logs" ON public.chat_actions_log;
DROP POLICY IF EXISTS "Users can view their action logs" ON public.chat_actions_log;

DROP POLICY IF EXISTS "Users can create decks" ON public.flashcard_decks;
DROP POLICY IF EXISTS "Users can delete their own decks" ON public.flashcard_decks;
DROP POLICY IF EXISTS "Users can update their own decks" ON public.flashcard_decks;
DROP POLICY IF EXISTS "Users can view their own decks" ON public.flashcard_decks;

DROP POLICY IF EXISTS "Users can create flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can delete their own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can update their own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can view their own flashcards" ON public.flashcards;

DROP POLICY IF EXISTS "Users can create reviews" ON public.flashcard_reviews;
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.flashcard_reviews;

DROP POLICY IF EXISTS "Users can create sessions" ON public.flashcard_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.flashcard_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.flashcard_sessions;

-- Step 2: Alter user_id columns from text to uuid
ALTER TABLE public.conversations ALTER COLUMN user_id TYPE uuid USING NULL;
ALTER TABLE public.chat_actions_log ALTER COLUMN user_id TYPE uuid USING NULL;
ALTER TABLE public.flashcard_decks ALTER COLUMN user_id TYPE uuid USING NULL;
ALTER TABLE public.flashcards ALTER COLUMN user_id TYPE uuid USING NULL;
ALTER TABLE public.flashcard_reviews ALTER COLUMN user_id TYPE uuid USING NULL;
ALTER TABLE public.flashcard_sessions ALTER COLUMN user_id TYPE uuid USING NULL;

-- Step 3: Create proper RLS policies using auth.uid()

-- Conversations policies
CREATE POLICY "Users can create their own conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
ON public.conversations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Messages policies (via conversation ownership)
CREATE POLICY "Users can create messages in their conversations"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view messages from their conversations"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete messages from their conversations"
ON public.messages FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);

-- Chat actions log policies
CREATE POLICY "Users can create their own action logs"
ON public.chat_actions_log FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own action logs"
ON public.chat_actions_log FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own action logs"
ON public.chat_actions_log FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Flashcard decks policies
CREATE POLICY "Users can create their own decks"
ON public.flashcard_decks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own decks"
ON public.flashcard_decks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own decks"
ON public.flashcard_decks FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decks"
ON public.flashcard_decks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Flashcards policies
CREATE POLICY "Users can create their own flashcards"
ON public.flashcards FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own flashcards"
ON public.flashcards FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards"
ON public.flashcards FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards"
ON public.flashcards FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Flashcard reviews policies
CREATE POLICY "Users can create their own reviews"
ON public.flashcard_reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reviews"
ON public.flashcard_reviews FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Flashcard sessions policies
CREATE POLICY "Users can create their own sessions"
ON public.flashcard_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own sessions"
ON public.flashcard_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.flashcard_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);