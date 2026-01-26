-- =============================================
-- BLOCO 3: Notes, Templates e Cloze Deletion
-- =============================================

-- 1. Criar tabela de Note Types
CREATE TABLE IF NOT EXISTS public.note_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  -- campos como JSONB array [{name: 'Front', ord: 0}, {name: 'Back', ord: 1}]
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- indica se é tipo cloze (parsing especial)
  is_cloze BOOLEAN NOT NULL DEFAULT false,
  -- indica se é tipo built-in (não pode ser deletado)
  is_builtin BOOLEAN NOT NULL DEFAULT false,
  sort_field_idx INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Criar tabela de Card Templates
CREATE TABLE IF NOT EXISTS public.card_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_type_id UUID NOT NULL REFERENCES public.note_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Template da frente (ex: "{{Front}}")
  front_template TEXT NOT NULL DEFAULT '',
  -- Template do verso (ex: "{{FrontSide}}<hr>{{Back}}")
  back_template TEXT NOT NULL DEFAULT '',
  -- Ordem do template (para Basic Reversed: 0 = normal, 1 = reversed)
  ord INTEGER NOT NULL DEFAULT 0,
  -- CSS customizado para o template
  css TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Criar tabela de Notes
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  deck_id UUID NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
  note_type_id UUID NOT NULL REFERENCES public.note_types(id) ON DELETE RESTRICT,
  -- Campos preenchidos como JSONB {fieldName: value}
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Tags da note (para futuro)
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Atualizar tabela flashcards para vincular a notes
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS template_ord INTEGER DEFAULT 0;

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_note_types_user ON public.note_types(user_id);
CREATE INDEX IF NOT EXISTS idx_card_templates_note_type ON public.card_templates(note_type_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_deck ON public.notes(deck_id);
CREATE INDEX IF NOT EXISTS idx_notes_type ON public.notes(note_type_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_note ON public.flashcards(note_id);

-- 6. RLS para note_types
ALTER TABLE public.note_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own note types"
  ON public.note_types FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own note types"
  ON public.note_types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own note types"
  ON public.note_types FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own note types"
  ON public.note_types FOR DELETE
  USING (auth.uid() = user_id AND is_builtin = false);

-- 7. RLS para card_templates
ALTER TABLE public.card_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates of their note types"
  ON public.card_templates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.note_types nt 
    WHERE nt.id = note_type_id AND nt.user_id = auth.uid()
  ));

CREATE POLICY "Users can create templates for their note types"
  ON public.card_templates FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.note_types nt 
    WHERE nt.id = note_type_id AND nt.user_id = auth.uid()
  ));

CREATE POLICY "Users can update templates of their note types"
  ON public.card_templates FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.note_types nt 
    WHERE nt.id = note_type_id AND nt.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete templates of their note types"
  ON public.card_templates FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.note_types nt 
    WHERE nt.id = note_type_id AND nt.user_id = auth.uid()
  ));

-- 8. RLS para notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id);

-- 9. Trigger para atualizar updated_at em notes
CREATE OR REPLACE FUNCTION public.update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notes_updated_at();

-- 10. Trigger para atualizar updated_at em note_types
CREATE OR REPLACE FUNCTION public.update_note_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_note_types_updated_at
  BEFORE UPDATE ON public.note_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_note_types_updated_at();