# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Vite, http://localhost:8080)
npm run build      # Production build
npm run build:dev  # Development build
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

No test suite is configured.

## Architecture

**Stack:** React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix), React Router v6, TanStack Query v5, Supabase (PostgreSQL + anonymous auth), Framer Motion, Zod + React Hook Form.

**Path alias:** `@/*` → `src/*`

**Auth:** Anonymous Supabase login on app load. JWT tokens are stored in localStorage. The `AuthContext` exposes the current user and session — everything requiring user isolation queries Supabase with the anonymous user's ID.

**Data flow pattern:** Each major feature has a dedicated hook under `src/hooks/` that owns Supabase queries (CRUD) and exposes typed state + mutation functions to components. Contexts in `src/contexts/` hold global ephemeral UI state (focus mode, external tool tabs, canvas sessions, tab visibility).

**Key feature areas:**

| Directory | Purpose |
|---|---|
| `src/pages/` | Route-level pages (Portuguese names: Hoje=Today, EmBreve=Soon, Caderno=Notebook, Resumos=Summaries, Concluido=Done) |
| `src/components/flashcards/` | Anki-like review UI — deck browser, card study session, statistics |
| `src/components/blocks/` | Calendar week/day scheduling blocks |
| `src/components/canva/` | Drawing canvas with stroke smoothing |
| `src/components/focus/` | Focus mode overlay and status bar |
| `src/components/configuracoes/` | Settings panels |
| `src/hooks/` | Feature hooks: `useFlashcards`, `useNotes`, `useBlocks`, `useStudyStatistics`, `useAuth`, etc. |
| `src/utils/ankiAlgorithm.ts` | SM-2 spaced repetition scheduling (card intervals, ease factors, learning steps) |
| `src/utils/templateRenderer.ts` | Generates flashcards from note templates |
| `src/utils/clozeParser.ts` | Parses `{{cloze}}` deletions in note fields |
| `src/integrations/supabase/types.ts` | Auto-generated Supabase DB schema types — do not edit manually |
| `src/integrations/supabase/client.ts` | Supabase JS client singleton |

**Flashcard system:** Anki-compatible with SM-2 algorithm. Cards have learning, review, and relearn states. Note types (`src/types/note.ts`) define custom fields and card templates; the template renderer expands them into flashcard front/back. Cloze deletions use `{{text}}` syntax.

**Styling:** Tailwind with CSS variables for theming. Dark mode via the `dark` CSS class. Custom sidebar and accent color tokens are defined in `tailwind.config.ts` and `src/index.css`. Always use CSS variable-based color tokens (e.g. `bg-background`, `text-foreground`) rather than hardcoded Tailwind palette values.

**TypeScript:** Strict mode is OFF (`noImplicitAny` and `strictNullChecks` disabled). The Supabase types file at `src/integrations/supabase/types.ts` is auto-generated — regenerate it via the Supabase CLI rather than editing it.

**Lovable.dev:** This project was scaffolded and is also edited via Lovable.dev. The `.lovable/` directory and `lovable-tagger` dev dependency are part of that integration. A Service Worker (`sw.js`) is registered at startup but disabled inside iframes/previews.

**PDF & drawing libs:** `jspdf`/`react-pdf`/`pdfjs-dist` for PDF import/export; `perfect-freehand` + `src/utils/strokeSmoothing.ts` for canvas stroke rendering; `dnd-kit` for drag-and-drop within decks and notebooks.
