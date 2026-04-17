import { Search, LayoutGrid, List, ArrowUpDown, SortAsc, SortDesc, FolderPlus } from 'lucide-react';

interface LibraryToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  activeTab: 'all' | 'favorites' | 'recent';
  onTabChange: (tab: 'all' | 'favorites' | 'recent') => void;
  sortBy: 'updated_at' | 'created_at' | 'title';
  onSortByChange: (s: 'updated_at' | 'created_at' | 'title') => void;
  sortDirection: 'asc' | 'desc';
  onSortDirectionChange: (d: 'asc' | 'desc') => void;
  title?: string;
  titleCount?: number;
  showNewFolderButton?: boolean;
  onNewFolder?: () => void;
}

export function LibraryToolbar(props: LibraryToolbarProps) {
  const tabs = [
    { id: 'all' as const, label: 'Todos' },
    { id: 'favorites' as const, label: 'Favoritos' },
    { id: 'recent' as const, label: 'Recentes' },
  ];

  const sortLabel =
    props.sortBy === 'updated_at' ? 'Última edição' :
    props.sortBy === 'title' ? 'Título' : 'Data de criação';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight truncate">
          {props.title ?? 'Caderno'}
          {typeof props.titleCount === 'number' && props.titleCount > 0 && (
            <span className="ml-2 text-base font-normal text-neutral-400">({props.titleCount})</span>
          )}
        </h1>
        {props.showNewFolderButton && props.onNewFolder && (
          <button
            onClick={props.onNewFolder}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition text-neutral-700 dark:text-neutral-300"
          >
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova pasta</span>
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar cadernos..."
            value={props.searchQuery}
            onChange={(e) => props.onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden">
            <button
              onClick={() => props.onViewModeChange('grid')}
              className={`p-2 transition ${
                props.viewMode === 'grid'
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                  : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title="Visualização em grade"
              aria-label="Visualização em grade"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => props.onViewModeChange('list')}
              className={`p-2 transition ${
                props.viewMode === 'list'
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                  : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title="Visualização em lista"
              aria-label="Visualização em lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              const order = ['updated_at', 'title', 'created_at'] as const;
              const idx = order.indexOf(props.sortBy);
              props.onSortByChange(order[(idx + 1) % order.length]);
            }}
            className="p-2 border border-neutral-200 dark:border-neutral-800 rounded-md text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            title={`Ordenar por: ${sortLabel}`}
            aria-label={`Ordenar por: ${sortLabel}`}
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>

          <button
            onClick={() => props.onSortDirectionChange(props.sortDirection === 'asc' ? 'desc' : 'asc')}
            className="p-2 border border-neutral-200 dark:border-neutral-800 rounded-md text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            title={props.sortDirection === 'asc' ? 'Crescente' : 'Decrescente'}
            aria-label={props.sortDirection === 'asc' ? 'Crescente' : 'Decrescente'}
          >
            {props.sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => props.onTabChange(tab.id)}
            className={`relative px-4 py-2 text-sm transition ${
              props.activeTab === tab.id
                ? 'text-neutral-900 dark:text-neutral-100 font-medium'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            {tab.label}
            {props.activeTab === tab.id && (
              <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-neutral-900 dark:bg-neutral-100" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
