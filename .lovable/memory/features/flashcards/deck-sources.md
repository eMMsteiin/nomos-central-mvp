---
name: Deck Sources (Fontes do Baralho)
description: Upload PDFs/images/PPTX to decks, extract text via Gemini Vision, generate flashcards exclusively from source content
type: feature
---
- Users can attach up to 5 files (PDF, PNG, JPG, HEIC, PPTX) per deck, max 10MB each
- Files stored in `deck-sources` private bucket, metadata in `deck_sources` table
- Edge function `process-deck-source` extracts text using Gemini 2.5 Flash vision
- Edge function `generate-flashcards-from-sources` generates cards exclusively from extracted text
- System prompt enforces NO external knowledge — only source material
- Optional focus field lets user guide generation (e.g., "chapter 3 concepts")
- Processing states: processing → ready/error with polling every 3s
- `useDeckSources` hook manages CRUD, upload, polling, and generation
- `DeckSourcesSection` component rendered via `sourcesSection` prop in DeckDetail
- Coexists with existing topic/text generation — does NOT replace them
- Max 50,000 chars of combined extracted text sent to AI
