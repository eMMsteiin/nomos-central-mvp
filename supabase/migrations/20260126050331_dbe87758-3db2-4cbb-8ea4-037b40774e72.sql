-- ========================================
-- BLOCO 1: Paridade Algorítmica com Anki Desktop
-- ========================================

-- 1. Criar enum para estados do card (Anki Desktop states)
DO $$ BEGIN
  CREATE TYPE public.card_state AS ENUM (
    'new',
    'learning',
    'review',
    'relearning',
    'suspended',
    'buried'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Adicionar novas colunas à tabela flashcards
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS card_state public.card_state DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS steps_left INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS buried_until DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS queue_position INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lapses INTEGER DEFAULT 0;

-- 3. Migrar cards existentes: cards com repetitions > 0 são 'review', senão 'new'
UPDATE public.flashcards
SET card_state = CASE 
  WHEN repetitions > 0 THEN 'review'::public.card_state
  ELSE 'new'::public.card_state
END,
due = next_review
WHERE card_state IS NULL OR card_state = 'new'::public.card_state;

-- 4. Adicionar configurações de deck para Anki parity
ALTER TABLE public.flashcard_decks
  -- Learning steps (em minutos, exceto 'd' para dias)
  ADD COLUMN IF NOT EXISTS learning_steps TEXT[] DEFAULT ARRAY['1', '10'],
  -- Relearning steps
  ADD COLUMN IF NOT EXISTS relearning_steps TEXT[] DEFAULT ARRAY['10'],
  -- Intervalo após graduação (dias)
  ADD COLUMN IF NOT EXISTS graduating_interval INTEGER DEFAULT 1,
  -- Intervalo easy para novos (dias)  
  ADD COLUMN IF NOT EXISTS easy_interval INTEGER DEFAULT 4,
  -- Intervalo máximo (dias)
  ADD COLUMN IF NOT EXISTS max_interval INTEGER DEFAULT 36500,
  -- Ease inicial (2.5 = 250%)
  ADD COLUMN IF NOT EXISTS starting_ease NUMERIC DEFAULT 2.5,
  -- Bonus para Easy
  ADD COLUMN IF NOT EXISTS easy_bonus NUMERIC DEFAULT 1.3,
  -- Modificador Hard
  ADD COLUMN IF NOT EXISTS hard_multiplier NUMERIC DEFAULT 1.2,
  -- Modificador de intervalo global
  ADD COLUMN IF NOT EXISTS interval_modifier NUMERIC DEFAULT 1.0,
  -- Limite de novos cards por dia
  ADD COLUMN IF NOT EXISTS new_cards_per_day INTEGER DEFAULT 20,
  -- Limite de reviews por dia
  ADD COLUMN IF NOT EXISTS reviews_per_day INTEGER DEFAULT 200,
  -- Penalidade de lapso (new interval multiplier após lapso)
  ADD COLUMN IF NOT EXISTS lapse_new_interval NUMERIC DEFAULT 0.0,
  -- Steps mínimos de reaprendizado após lapso
  ADD COLUMN IF NOT EXISTS lapse_min_interval INTEGER DEFAULT 1;

-- 5. Criar tabela para rastrear contagens diárias por deck (limites)
CREATE TABLE IF NOT EXISTS public.deck_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  new_cards_studied INTEGER DEFAULT 0,
  reviews_done INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(deck_id, user_id, stat_date)
);

-- 6. Enable RLS on deck_daily_stats
ALTER TABLE public.deck_daily_stats ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for deck_daily_stats
CREATE POLICY "Users can view their own daily stats" 
  ON public.deck_daily_stats 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily stats" 
  ON public.deck_daily_stats 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily stats" 
  ON public.deck_daily_stats 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- 8. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_flashcards_card_state ON public.flashcards(card_state);
CREATE INDEX IF NOT EXISTS idx_flashcards_due ON public.flashcards(due);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_state ON public.flashcards(deck_id, card_state);
CREATE INDEX IF NOT EXISTS idx_deck_daily_stats_lookup ON public.deck_daily_stats(deck_id, user_id, stat_date);