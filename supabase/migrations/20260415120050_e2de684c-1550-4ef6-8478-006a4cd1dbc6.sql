
-- Create deck_sources table
CREATE TABLE public.deck_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  storage_path text NOT NULL,
  extracted_text text,
  page_count integer,
  status text NOT NULL DEFAULT 'processing',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deck_sources ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own sources"
  ON public.deck_sources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sources"
  ON public.deck_sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sources"
  ON public.deck_sources FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sources"
  ON public.deck_sources FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('deck-sources', 'deck-sources', false);

-- Storage policies: authenticated users can manage their own files
CREATE POLICY "Users can upload deck sources"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'deck-sources' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their deck sources"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'deck-sources' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their deck sources"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'deck-sources' AND auth.uid()::text = (storage.foldername(name))[1]);
