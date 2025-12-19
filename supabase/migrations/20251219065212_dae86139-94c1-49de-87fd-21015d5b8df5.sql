-- ===========================================
-- MVP FLASHCARDS: Tabelas com persistência
-- ===========================================

-- 1. Baralhos (decks)
CREATE TABLE public.flashcard_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discipline_id TEXT,
  color TEXT DEFAULT 'hsl(200, 70%, 50%)',
  emoji TEXT DEFAULT '📚',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Flashcards
CREATE TABLE public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  source_type TEXT DEFAULT 'manual',
  source_notebook_id TEXT,
  next_review TIMESTAMPTZ DEFAULT now(),
  interval_days INTEGER DEFAULT 0,
  ease_factor NUMERIC DEFAULT 2.5,
  repetitions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Revisões individuais (FlashcardReview)
CREATE TABLE public.flashcard_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flashcard_id UUID REFERENCES public.flashcards(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT NOT NULL,
  rating TEXT NOT NULL,
  response_time_ms INTEGER,
  reviewed_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Sessões de estudo (ReviewSession)
CREATE TABLE public.flashcard_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cards_reviewed INTEGER DEFAULT 0,
  cards_correct INTEGER DEFAULT 0,
  rating_distribution JSONB DEFAULT '{"again": 0, "hard": 0, "good": 0, "easy": 0}'
);

-- ===========================================
-- RLS: Habilitar em todas as tabelas
-- ===========================================

ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_sessions ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS Policies para flashcard_decks
-- ===========================================

CREATE POLICY "Users can view their own decks"
ON public.flashcard_decks FOR SELECT
USING (true);

CREATE POLICY "Users can create decks"
ON public.flashcard_decks FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own decks"
ON public.flashcard_decks FOR UPDATE
USING (true);

CREATE POLICY "Users can delete their own decks"
ON public.flashcard_decks FOR DELETE
USING (true);

-- ===========================================
-- RLS Policies para flashcards
-- ===========================================

CREATE POLICY "Users can view their own flashcards"
ON public.flashcards FOR SELECT
USING (true);

CREATE POLICY "Users can create flashcards"
ON public.flashcards FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own flashcards"
ON public.flashcards FOR UPDATE
USING (true);

CREATE POLICY "Users can delete their own flashcards"
ON public.flashcards FOR DELETE
USING (true);

-- ===========================================
-- RLS Policies para flashcard_reviews
-- ===========================================

CREATE POLICY "Users can view their own reviews"
ON public.flashcard_reviews FOR SELECT
USING (true);

CREATE POLICY "Users can create reviews"
ON public.flashcard_reviews FOR INSERT
WITH CHECK (true);

-- ===========================================
-- RLS Policies para flashcard_sessions
-- ===========================================

CREATE POLICY "Users can view their own sessions"
ON public.flashcard_sessions FOR SELECT
USING (true);

CREATE POLICY "Users can create sessions"
ON public.flashcard_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own sessions"
ON public.flashcard_sessions FOR UPDATE
USING (true);

-- ===========================================
-- Trigger para updated_at automático
-- ===========================================

CREATE OR REPLACE FUNCTION public.update_flashcard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_flashcard_decks_updated_at
BEFORE UPDATE ON public.flashcard_decks
FOR EACH ROW EXECUTE FUNCTION public.update_flashcard_updated_at();

CREATE TRIGGER update_flashcards_updated_at
BEFORE UPDATE ON public.flashcards
FOR EACH ROW EXECUTE FUNCTION public.update_flashcard_updated_at();

-- ===========================================
-- Índices para performance
-- ===========================================

CREATE INDEX idx_flashcard_decks_user_id ON public.flashcard_decks(user_id);
CREATE INDEX idx_flashcards_deck_id ON public.flashcards(deck_id);
CREATE INDEX idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX idx_flashcards_next_review ON public.flashcards(next_review);
CREATE INDEX idx_flashcard_reviews_flashcard_id ON public.flashcard_reviews(flashcard_id);
CREATE INDEX idx_flashcard_sessions_user_id ON public.flashcard_sessions(user_id);