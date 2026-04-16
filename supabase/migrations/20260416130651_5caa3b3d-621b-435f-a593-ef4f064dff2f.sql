
-- ════════════════════════════════════════════
-- TABELA: notebook_element_collections (precisa existir antes de notebook_elements)
-- ════════════════════════════════════════════
CREATE TABLE public.notebook_element_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Sticker',
  position INTEGER DEFAULT 0,
  is_builtin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notebook_element_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or builtin collections"
  ON public.notebook_element_collections FOR SELECT
  USING (auth.uid() = user_id OR is_builtin = TRUE);

CREATE POLICY "Users can create own collections"
  ON public.notebook_element_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON public.notebook_element_collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON public.notebook_element_collections FOR DELETE
  USING (auth.uid() = user_id AND is_builtin = FALSE);

-- ════════════════════════════════════════════
-- TABELA: notebook_folders
-- ════════════════════════════════════════════
CREATE TABLE public.notebook_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  parent_folder_id UUID REFERENCES public.notebook_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#9B9B9B',
  icon TEXT DEFAULT 'Folder',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notebook_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own folders"
  ON public.notebook_folders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ════════════════════════════════════════════
-- TABELA: notebooks
-- ════════════════════════════════════════════
CREATE TABLE public.notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  folder_id UUID REFERENCES public.notebook_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Novo Caderno',
  subject TEXT,
  discipline TEXT,
  cover_type TEXT DEFAULT 'default',
  cover_data TEXT,
  default_paper_template TEXT DEFAULT 'blank',
  scroll_direction TEXT DEFAULT 'vertical',
  is_favorite BOOLEAN DEFAULT FALSE,
  is_pdf_import BOOLEAN DEFAULT FALSE,
  page_order UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notebooks"
  ON public.notebooks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ════════════════════════════════════════════
-- TABELA: notebook_pages
-- ════════════════════════════════════════════
CREATE TABLE public.notebook_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  page_index INTEGER NOT NULL,
  paper_template TEXT DEFAULT 'blank',
  paper_config JSONB DEFAULT '{}',
  background_image_url TEXT,
  is_bookmarked BOOLEAN DEFAULT FALSE,
  outline_title TEXT,
  strokes JSONB DEFAULT '[]',
  text_boxes JSONB DEFAULT '[]',
  shapes JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  elements JSONB DEFAULT '[]',
  highlights JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notebook_id, page_index)
);

ALTER TABLE public.notebook_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pages"
  ON public.notebook_pages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.notebooks WHERE notebooks.id = notebook_pages.notebook_id AND notebooks.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.notebooks WHERE notebooks.id = notebook_pages.notebook_id AND notebooks.user_id = auth.uid())
  );

-- ════════════════════════════════════════════
-- TABELA: notebook_elements
-- ════════════════════════════════════════════
CREATE TABLE public.notebook_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  collection_id UUID REFERENCES public.notebook_element_collections(id) ON DELETE CASCADE,
  name TEXT,
  thumbnail_url TEXT,
  element_data JSONB NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notebook_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own elements"
  ON public.notebook_elements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ════════════════════════════════════════════
-- TABELA: notebook_paper_templates
-- ════════════════════════════════════════════
CREATE TABLE public.notebook_paper_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  template_data TEXT NOT NULL DEFAULT '',
  is_builtin BOOLEAN DEFAULT FALSE,
  group_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notebook_paper_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or builtin templates"
  ON public.notebook_paper_templates FOR SELECT
  USING (auth.uid() = user_id OR is_builtin = TRUE);

CREATE POLICY "Users can create own templates"
  ON public.notebook_paper_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.notebook_paper_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.notebook_paper_templates FOR DELETE
  USING (auth.uid() = user_id AND is_builtin = FALSE);

-- ════════════════════════════════════════════
-- TABELA: notebook_user_preferences
-- ════════════════════════════════════════════
CREATE TABLE public.notebook_user_preferences (
  user_id UUID PRIMARY KEY,
  default_pen_style TEXT DEFAULT 'fountain',
  default_pen_color TEXT DEFAULT '#000000',
  default_pen_width NUMERIC DEFAULT 2.0,
  fountain_pen_config JSONB DEFAULT '{"tipSharpness":50,"pressureSensitivity":50,"color":"#000000","width":2}',
  ball_pen_config JSONB DEFAULT '{"color":"#000000","width":2}',
  brush_pen_config JSONB DEFAULT '{"pressureSensitivity":70,"color":"#000000","width":4}',
  highlighter_config JSONB DEFAULT '{"color":"#FFEB3B","width":20,"opacity":0.35}',
  eraser_size TEXT DEFAULT 'medium',
  eraser_mode TEXT DEFAULT 'stroke',
  show_zoom_window BOOLEAN DEFAULT FALSE,
  auto_advance_zoom BOOLEAN DEFAULT TRUE,
  palm_rejection BOOLEAN DEFAULT TRUE,
  stroke_stabilization INTEGER DEFAULT 50,
  gesture_circle_to_select BOOLEAN DEFAULT TRUE,
  gesture_scribble_to_erase BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notebook_user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prefs"
  ON public.notebook_user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ════════════════════════════════════════════
-- ÍNDICES
-- ════════════════════════════════════════════
CREATE INDEX idx_notebooks_user_updated ON public.notebooks(user_id, updated_at DESC);
CREATE INDEX idx_notebooks_folder ON public.notebooks(folder_id);
CREATE INDEX idx_notebook_pages_notebook ON public.notebook_pages(notebook_id, page_index);
CREATE INDEX idx_notebook_elements_collection ON public.notebook_elements(collection_id, position);

-- ════════════════════════════════════════════
-- TRIGGERS de updated_at
-- ════════════════════════════════════════════
CREATE TRIGGER update_notebooks_updated_at
  BEFORE UPDATE ON public.notebooks
  FOR EACH ROW EXECUTE FUNCTION public.update_tasks_updated_at();

CREATE TRIGGER update_notebook_folders_updated_at
  BEFORE UPDATE ON public.notebook_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_tasks_updated_at();

CREATE TRIGGER update_notebook_pages_updated_at
  BEFORE UPDATE ON public.notebook_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_tasks_updated_at();

CREATE TRIGGER update_notebook_prefs_updated_at
  BEFORE UPDATE ON public.notebook_user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_tasks_updated_at();

-- ════════════════════════════════════════════
-- STORAGE BUCKET
-- ════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public) VALUES ('notebook-assets', 'notebook-assets', false);

CREATE POLICY "Users can upload own notebook assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'notebook-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own notebook assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'notebook-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own notebook assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'notebook-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own notebook assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'notebook-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ════════════════════════════════════════════
-- SEEDS: Coleções builtin de elementos
-- ════════════════════════════════════════════
INSERT INTO public.notebook_element_collections (user_id, name, icon, position, is_builtin) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Post-its', 'StickyNote', 0, TRUE),
  ('00000000-0000-0000-0000-000000000000', 'Setas e Flechas', 'ArrowRight', 1, TRUE),
  ('00000000-0000-0000-0000-000000000000', 'Formas de Mapa Mental', 'GitBranch', 2, TRUE),
  ('00000000-0000-0000-0000-000000000000', 'Carimbos Acadêmicos', 'Stamp', 3, TRUE),
  ('00000000-0000-0000-0000-000000000000', 'Emojis de Estudo', 'Smile', 4, TRUE);

-- ════════════════════════════════════════════
-- SEEDS: Templates builtin de papel
-- ════════════════════════════════════════════
INSERT INTO public.notebook_paper_templates (user_id, name, template_type, template_data, is_builtin, group_name) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Em branco', 'paper', 'blank', TRUE, 'Básicos'),
  ('00000000-0000-0000-0000-000000000000', 'Pautado', 'paper', 'lined', TRUE, 'Básicos'),
  ('00000000-0000-0000-0000-000000000000', 'Quadriculado', 'paper', 'grid', TRUE, 'Básicos'),
  ('00000000-0000-0000-0000-000000000000', 'Pontilhado', 'paper', 'dotted', TRUE, 'Básicos'),
  ('00000000-0000-0000-0000-000000000000', 'Cornell', 'paper', 'cornell', TRUE, 'Acadêmico'),
  ('00000000-0000-0000-0000-000000000000', 'Cronograma', 'paper', 'schedule', TRUE, 'Acadêmico'),
  ('00000000-0000-0000-0000-000000000000', 'Mapa Mental', 'paper', 'mindmap', TRUE, 'Acadêmico'),
  ('00000000-0000-0000-0000-000000000000', 'Fluxograma', 'paper', 'flowchart', TRUE, 'Acadêmico'),
  ('00000000-0000-0000-0000-000000000000', 'Pauta Musical', 'paper', 'music', TRUE, 'Especial'),
  ('00000000-0000-0000-0000-000000000000', 'Milimetrado', 'paper', 'millimeter', TRUE, 'Especial');

-- ════════════════════════════════════════════
-- Habilitar realtime para notebooks e pages
-- ════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.notebooks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notebook_pages;
