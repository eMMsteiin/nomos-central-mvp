// ============================================================================
// BLOCO 4: Card Browser
// Main card browser component with filters, search, and bulk actions
// ============================================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Trash2,
  Pause,
  Play,
  Archive,
  FolderInput,
  CheckSquare,
  Square,
  Minus,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Flashcard, Deck, CardState } from '@/types/flashcard';
import { NoteType, Note } from '@/types/note';
import { CardBrowserFilters, BrowserFilters } from './CardBrowserFilters';
import { MoveCardsDialog } from './MoveCardsDialog';
import { cn } from '@/lib/utils';

interface CardBrowserProps {
  cards: Flashcard[];
  decks: Deck[];
  notes: Note[];
  noteTypes: NoteType[];
  onBack: () => void;
  onSuspendCards: (cardIds: string[]) => Promise<void>;
  onUnsuspendCards: (cardIds: string[]) => Promise<void>;
  onBuryCards: (cardIds: string[]) => Promise<void>;
  onUnburyCards: (cardIds: string[]) => Promise<void>;
  onDeleteCards: (cardIds: string[]) => Promise<void>;
  onMoveCards: (cardIds: string[], targetDeckId: string) => Promise<void>;
  onEditNote: (noteId: string) => void;
}

interface SortConfig {
  key: 'front' | 'deck' | 'state' | 'interval' | 'ease' | 'due';
  direction: 'asc' | 'desc';
}

// Card state display info
const CARD_STATE_INFO: Record<CardState, { label: string; color: string }> = {
  new: { label: 'Novo', color: 'bg-blue-500/20 text-blue-500' },
  learning: { label: 'Aprendendo', color: 'bg-orange-500/20 text-orange-500' },
  review: { label: 'Revisão', color: 'bg-green-500/20 text-green-500' },
  relearning: { label: 'Reaprendendo', color: 'bg-yellow-500/20 text-yellow-500' },
  suspended: { label: 'Suspenso', color: 'bg-muted text-muted-foreground' },
  buried: { label: 'Enterrado', color: 'bg-purple-500/20 text-purple-500' },
};

export function CardBrowser({
  cards,
  decks,
  notes,
  noteTypes,
  onBack,
  onSuspendCards,
  onUnsuspendCards,
  onBuryCards,
  onUnburyCards,
  onDeleteCards,
  onMoveCards,
  onEditNote,
}: CardBrowserProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<BrowserFilters>({
    deckId: 'all',
    state: 'all',
    noteTypeId: 'all',
    intervalMin: undefined,
    intervalMax: undefined,
    easeMin: undefined,
    easeMax: undefined,
  });
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'due', direction: 'asc' });
  const [showFilters, setShowFilters] = useState(false);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  
  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  
  // Refs for keyboard navigation
  const tableRef = useRef<HTMLTableElement>(null);

  // Get deck name helper
  const getDeckName = useCallback((deckId: string): string => {
    const deck = decks.find(d => d.id === deckId);
    return deck?.fullName || deck?.title || 'Desconhecido';
  }, [decks]);

  // Get note for a card
  const getNoteForCard = useCallback((card: Flashcard): Note | undefined => {
    if (!card.deckId) return undefined;
    return notes.find(n => 
      n.deckId === card.deckId && 
      // Match by content - cards from notes have noteId
      cards.some(c => c.id === card.id)
    );
  }, [notes, cards]);

  // Get note type name for a card
  const getNoteTypeName = useCallback((card: Flashcard): string => {
    // Try to find note for this card
    const noteId = (card as any).noteId;
    if (noteId) {
      const note = notes.find(n => n.id === noteId);
      if (note) {
        const noteType = noteTypes.find(nt => nt.id === note.noteTypeId);
        return noteType?.name || 'Basic';
      }
    }
    return 'Basic';
  }, [notes, noteTypes]);

  // Filter and search cards
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      // Deck filter
      if (filters.deckId !== 'all' && card.deckId !== filters.deckId) {
        return false;
      }

      // State filter
      if (filters.state !== 'all' && card.cardState !== filters.state) {
        return false;
      }

      // Note type filter
      if (filters.noteTypeId !== 'all') {
        const noteTypeName = getNoteTypeName(card);
        const selectedType = noteTypes.find(nt => nt.id === filters.noteTypeId);
        if (selectedType && noteTypeName !== selectedType.name) {
          return false;
        }
      }

      // Interval filter
      if (filters.intervalMin !== undefined && card.interval < filters.intervalMin) {
        return false;
      }
      if (filters.intervalMax !== undefined && card.interval > filters.intervalMax) {
        return false;
      }

      // Ease filter
      if (filters.easeMin !== undefined && card.easeFactor < filters.easeMin) {
        return false;
      }
      if (filters.easeMax !== undefined && card.easeFactor > filters.easeMax) {
        return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchFront = card.front.toLowerCase().includes(query);
        const matchBack = card.back.toLowerCase().includes(query);
        if (!matchFront && !matchBack) {
          return false;
        }
      }

      return true;
    });
  }, [cards, filters, searchQuery, getNoteTypeName, noteTypes]);

  // Sort cards
  const sortedCards = useMemo(() => {
    return [...filteredCards].sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.key) {
        case 'front':
          comparison = a.front.localeCompare(b.front);
          break;
        case 'deck':
          comparison = getDeckName(a.deckId).localeCompare(getDeckName(b.deckId));
          break;
        case 'state':
          comparison = a.cardState.localeCompare(b.cardState);
          break;
        case 'interval':
          comparison = a.interval - b.interval;
          break;
        case 'ease':
          comparison = a.easeFactor - b.easeFactor;
          break;
        case 'due':
          comparison = new Date(a.due).getTime() - new Date(b.due).getTime();
          break;
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredCards, sortConfig, getDeckName]);

  // Selection helpers
  const allSelected = sortedCards.length > 0 && selectedCardIds.size === sortedCards.length;
  const someSelected = selectedCardIds.size > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedCardIds(new Set());
    } else {
      setSelectedCardIds(new Set(sortedCards.map(c => c.id)));
    }
  };

  const toggleCardSelection = (cardId: string, index: number, event: React.MouseEvent) => {
    const newSelected = new Set(selectedCardIds);
    
    if (event.shiftKey && lastClickedIndex !== null) {
      // Shift+click: select range
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      for (let i = start; i <= end; i++) {
        newSelected.add(sortedCards[i].id);
      }
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd+click: toggle individual
      if (newSelected.has(cardId)) {
        newSelected.delete(cardId);
      } else {
        newSelected.add(cardId);
      }
    } else {
      // Regular click: toggle and update last clicked
      if (newSelected.has(cardId)) {
        newSelected.delete(cardId);
      } else {
        newSelected.add(cardId);
      }
    }
    
    setLastClickedIndex(index);
    setSelectedCardIds(newSelected);
  };

  // Handle sort
  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Bulk actions
  const handleSuspend = async () => {
    if (selectedCardIds.size === 0) return;
    setActionInProgress(true);
    try {
      await onSuspendCards(Array.from(selectedCardIds));
      setSelectedCardIds(new Set());
    } finally {
      setActionInProgress(false);
    }
  };

  const handleUnsuspend = async () => {
    if (selectedCardIds.size === 0) return;
    setActionInProgress(true);
    try {
      await onUnsuspendCards(Array.from(selectedCardIds));
      setSelectedCardIds(new Set());
    } finally {
      setActionInProgress(false);
    }
  };

  const handleBury = async () => {
    if (selectedCardIds.size === 0) return;
    setActionInProgress(true);
    try {
      await onBuryCards(Array.from(selectedCardIds));
      setSelectedCardIds(new Set());
    } finally {
      setActionInProgress(false);
    }
  };

  const handleUnbury = async () => {
    if (selectedCardIds.size === 0) return;
    setActionInProgress(true);
    try {
      await onUnburyCards(Array.from(selectedCardIds));
      setSelectedCardIds(new Set());
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDelete = async () => {
    if (selectedCardIds.size === 0) return;
    setActionInProgress(true);
    try {
      await onDeleteCards(Array.from(selectedCardIds));
      setSelectedCardIds(new Set());
      setShowDeleteDialog(false);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleMove = async (targetDeckId: string) => {
    if (selectedCardIds.size === 0) return;
    setActionInProgress(true);
    try {
      await onMoveCards(Array.from(selectedCardIds), targetDeckId);
      setSelectedCardIds(new Set());
      setShowMoveDialog(false);
    } finally {
      setActionInProgress(false);
    }
  };

  // Get selected cards info
  const selectedCards = sortedCards.filter(c => selectedCardIds.has(c.id));
  const hasSuspended = selectedCards.some(c => c.cardState === 'suspended');
  const hasNonSuspended = selectedCards.some(c => c.cardState !== 'suspended');
  const hasBuried = selectedCards.some(c => c.cardState === 'buried');
  const hasNonBuried = selectedCards.some(c => c.cardState !== 'buried');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setSelectedCardIds(new Set(sortedCards.map(c => c.id)));
          }
          break;
        case 'Escape':
          setSelectedCardIds(new Set());
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedCardIds.size > 0) {
            e.preventDefault();
            setShowDeleteDialog(true);
          }
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (hasNonSuspended) {
              handleSuspend();
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedCards, selectedCardIds, hasNonSuspended]);

  // Active filters count
  const activeFiltersCount = [
    filters.deckId !== 'all',
    filters.state !== 'all',
    filters.noteTypeId !== 'all',
    filters.intervalMin !== undefined,
    filters.intervalMax !== undefined,
    filters.easeMin !== undefined,
    filters.easeMax !== undefined,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b bg-background">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Navegador de Cards</h1>
          <p className="text-sm text-muted-foreground">
            {filteredCards.length} de {cards.length} cards
            {selectedCardIds.size > 0 && ` • ${selectedCardIds.size} selecionados`}
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-2 p-4 border-b">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar no conteúdo dos cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Button
          variant={showFilters ? 'secondary' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {/* Bulk Actions */}
        {selectedCardIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  Ações ({selectedCardIds.size})
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover">
                <DropdownMenuItem onClick={() => setShowMoveDialog(true)}>
                  <FolderInput className="h-4 w-4 mr-2" />
                  Mover para deck
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {hasNonSuspended && (
                  <DropdownMenuItem onClick={handleSuspend}>
                    <Pause className="h-4 w-4 mr-2" />
                    Suspender
                  </DropdownMenuItem>
                )}
                {hasSuspended && (
                  <DropdownMenuItem onClick={handleUnsuspend}>
                    <Play className="h-4 w-4 mr-2" />
                    Reativar
                  </DropdownMenuItem>
                )}
                {hasNonBuried && (
                  <DropdownMenuItem onClick={handleBury}>
                    <Archive className="h-4 w-4 mr-2" />
                    Enterrar (hoje)
                  </DropdownMenuItem>
                )}
                {hasBuried && (
                  <DropdownMenuItem onClick={handleUnbury}>
                    <Archive className="h-4 w-4 mr-2" />
                    Desenterrar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedCardIds(new Set())}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <CardBrowserFilters
          filters={filters}
          onFiltersChange={setFilters}
          decks={decks}
          noteTypes={noteTypes}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Cards Table */}
      <ScrollArea className="flex-1">
        <Table ref={tableRef}>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Selecionar todos"
                  className={cn(someSelected && "data-[state=checked]:bg-primary/50")}
                />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('front')}
              >
                <div className="flex items-center gap-1">
                  Frente
                  {sortConfig.key === 'front' && (
                    sortConfig.direction === 'asc' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 rotate-90" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('deck')}
              >
                <div className="flex items-center gap-1">
                  Deck
                  {sortConfig.key === 'deck' && (
                    sortConfig.direction === 'asc' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 rotate-90" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('state')}
              >
                <div className="flex items-center gap-1">
                  Estado
                  {sortConfig.key === 'state' && (
                    sortConfig.direction === 'asc' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 rotate-90" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort('interval')}
              >
                <div className="flex items-center justify-end gap-1">
                  Intervalo
                  {sortConfig.key === 'interval' && (
                    sortConfig.direction === 'asc' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 rotate-90" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort('ease')}
              >
                <div className="flex items-center justify-end gap-1">
                  Facilidade
                  {sortConfig.key === 'ease' && (
                    sortConfig.direction === 'asc' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 rotate-90" />
                  )}
                </div>
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {cards.length === 0 
                    ? 'Nenhum card encontrado'
                    : 'Nenhum card corresponde aos filtros'}
                </TableCell>
              </TableRow>
            ) : (
              sortedCards.map((card, index) => {
                const isSelected = selectedCardIds.has(card.id);
                const stateInfo = CARD_STATE_INFO[card.cardState];
                
                return (
                  <TableRow
                    key={card.id}
                    className={cn(
                      'cursor-pointer',
                      isSelected && 'bg-primary/10'
                    )}
                    onClick={(e) => toggleCardSelection(card.id, index, e)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate font-medium">
                        {card.front.replace(/\{\{c\d+::/g, '[').replace(/\}\}/g, ']')}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {getDeckName(card.deckId)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={stateInfo.color}>
                        {stateInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {card.interval > 0 ? `${card.interval}d` : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {(card.easeFactor * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          {card.cardState === 'suspended' ? (
                            <DropdownMenuItem onClick={() => onUnsuspendCards([card.id])}>
                              <Play className="h-4 w-4 mr-2" />
                              Reativar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => onSuspendCards([card.id])}>
                              <Pause className="h-4 w-4 mr-2" />
                              Suspender
                            </DropdownMenuItem>
                          )}
                          {card.cardState === 'buried' ? (
                            <DropdownMenuItem onClick={() => onUnburyCards([card.id])}>
                              <Archive className="h-4 w-4 mr-2" />
                              Desenterrar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => onBuryCards([card.id])}>
                              <Archive className="h-4 w-4 mr-2" />
                              Enterrar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDeleteCards([card.id])}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cards?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. {selectedCardIds.size} card(s) serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionInProgress}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionInProgress}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionInProgress ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Cards Dialog */}
      <MoveCardsDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        decks={decks}
        selectedCount={selectedCardIds.size}
        onMove={handleMove}
      />
    </div>
  );
}
