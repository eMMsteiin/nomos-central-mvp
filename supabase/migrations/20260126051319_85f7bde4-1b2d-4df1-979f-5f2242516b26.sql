-- ========================================
-- BLOCO 2: Hierarquia de Decks e Configurações
-- ========================================

-- 1. Criar tabela de presets de configuração
CREATE TABLE IF NOT EXISTS public.deck_option_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  -- Configurações (mesmas do deck)
  learning_steps TEXT[] DEFAULT ARRAY['1', '10'],
  relearning_steps TEXT[] DEFAULT ARRAY['10'],
  graduating_interval INTEGER DEFAULT 1,
  easy_interval INTEGER DEFAULT 4,
  max_interval INTEGER DEFAULT 36500,
  starting_ease NUMERIC DEFAULT 2.5,
  easy_bonus NUMERIC DEFAULT 1.3,
  hard_multiplier NUMERIC DEFAULT 1.2,
  interval_modifier NUMERIC DEFAULT 1.0,
  new_cards_per_day INTEGER DEFAULT 20,
  reviews_per_day INTEGER DEFAULT 200,
  lapse_new_interval NUMERIC DEFAULT 0.0,
  lapse_min_interval INTEGER DEFAULT 1,
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

-- 2. Adicionar suporte a hierarquia nos decks
ALTER TABLE public.flashcard_decks
  ADD COLUMN IF NOT EXISTS parent_deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS preset_id UUID REFERENCES public.deck_option_presets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS config_overrides JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 3. Criar índices para performance de hierarquia
CREATE INDEX IF NOT EXISTS idx_decks_parent ON public.flashcard_decks(parent_deck_id);
CREATE INDEX IF NOT EXISTS idx_decks_full_name ON public.flashcard_decks(full_name);
CREATE INDEX IF NOT EXISTS idx_decks_preset ON public.flashcard_decks(preset_id);

-- 4. Enable RLS on presets
ALTER TABLE public.deck_option_presets ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for presets
CREATE POLICY "Users can view their own presets" 
  ON public.deck_option_presets 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own presets" 
  ON public.deck_option_presets 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets" 
  ON public.deck_option_presets 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets" 
  ON public.deck_option_presets 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- 6. Criar preset padrão para cada usuário existente
-- (Isso será feito via código, não via migração)

-- 7. Atualizar full_name para decks existentes (sem hierarquia = usar título)
UPDATE public.flashcard_decks
SET full_name = title
WHERE full_name IS NULL;