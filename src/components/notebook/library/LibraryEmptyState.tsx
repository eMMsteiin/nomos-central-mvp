import { BookOpen, Search, Star } from 'lucide-react';

interface LibraryEmptyStateProps {
  hasSearch: boolean;
  activeTab: 'all' | 'favorites' | 'recent';
}

function EmptyLayout({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-neutral-400 dark:text-neutral-600 mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
        {title}
      </h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">
        {subtitle}
      </p>
    </div>
  );
}

export function LibraryEmptyState({ hasSearch, activeTab }: LibraryEmptyStateProps) {
  if (hasSearch) {
    return (
      <EmptyLayout
        icon={<Search className="w-12 h-12" strokeWidth={1.5} />}
        title="Nenhum resultado"
        subtitle="Tente buscar com outras palavras."
      />
    );
  }

  if (activeTab === 'favorites') {
    return (
      <EmptyLayout
        icon={<Star className="w-12 h-12" strokeWidth={1.5} />}
        title="Sem favoritos"
        subtitle="Marque cadernos com a estrela para acesso rápido."
      />
    );
  }

  return (
    <EmptyLayout
      icon={<BookOpen className="w-12 h-12" strokeWidth={1.5} />}
      title="Nenhum caderno ainda"
      subtitle="Crie seu primeiro caderno e comece a anotar."
    />
  );
}
