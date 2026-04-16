import type { PaperTemplate } from '@/hooks/notebook/useNotebookTemplates';

interface PaperTemplatePickerProps {
  templates: PaperTemplate[];
  selectedTemplateData: string;
  onSelect: (templateData: string) => void;
}

export function PaperTemplatePicker({
  templates,
  selectedTemplateData,
  onSelect,
}: PaperTemplatePickerProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {templates.map((tpl) => {
        const isSelected = selectedTemplateData === tpl.template_data;
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onSelect(tpl.template_data)}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-md transition ${
              isSelected
                ? 'ring-2 ring-neutral-900 dark:ring-neutral-100'
                : 'ring-1 ring-neutral-300 dark:ring-neutral-700 hover:ring-neutral-500'
            }`}
            title={tpl.name}
          >
            <div className="w-10 h-14 bg-white dark:bg-neutral-100 rounded-sm overflow-hidden">
              <PaperThumbnail kind={tpl.template_data} />
            </div>
            <span className="text-[10px] text-neutral-700 dark:text-neutral-300 truncate w-full text-center">
              {tpl.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PaperThumbnail({ kind }: { kind: string }) {
  const stroke = '#9CA3AF';
  return (
    <svg viewBox="0 0 40 56" className="w-full h-full" preserveAspectRatio="none">
      {kind === 'blank' && null}

      {kind === 'lined' && (
        <>
          {[12, 22, 32, 42, 50].map((y) => (
            <line key={y} x1="4" y1={y} x2="36" y2={y} stroke={stroke} strokeWidth="0.5" />
          ))}
        </>
      )}

      {kind === 'grid' && (
        <>
          {[8, 16, 24, 32, 40, 48].map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="40" y2={y} stroke={stroke} strokeWidth="0.4" />
          ))}
          {[8, 16, 24, 32].map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="56" stroke={stroke} strokeWidth="0.4" />
          ))}
        </>
      )}

      {kind === 'dotted' && (
        <>
          {[8, 16, 24, 32, 40, 48].flatMap((y) =>
            [8, 16, 24, 32].map((x) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="0.6" fill={stroke} />
            ))
          )}
        </>
      )}

      {kind === 'cornell' && (
        <>
          <line x1="14" y1="0" x2="14" y2="44" stroke={stroke} strokeWidth="0.6" />
          <line x1="0" y1="44" x2="40" y2="44" stroke={stroke} strokeWidth="0.6" />
        </>
      )}

      {kind === 'schedule' && (
        <>
          {[14, 28, 42].map((y) => (
            <line key={y} x1="0" y1={y} x2="40" y2={y} stroke={stroke} strokeWidth="0.5" />
          ))}
          {[13, 26].map((x) => (
            <line key={x} x1={x} y1="0" x2={x} y2="56" stroke={stroke} strokeWidth="0.5" />
          ))}
        </>
      )}

      {kind === 'mindmap' && (
        <>
          <circle cx="20" cy="28" r="4" fill="none" stroke={stroke} strokeWidth="0.6" />
          <line x1="20" y1="28" x2="6" y2="14" stroke={stroke} strokeWidth="0.5" />
          <line x1="20" y1="28" x2="34" y2="14" stroke={stroke} strokeWidth="0.5" />
          <line x1="20" y1="28" x2="20" y2="48" stroke={stroke} strokeWidth="0.5" />
          <circle cx="6" cy="14" r="2" fill="none" stroke={stroke} strokeWidth="0.5" />
          <circle cx="34" cy="14" r="2" fill="none" stroke={stroke} strokeWidth="0.5" />
          <circle cx="20" cy="48" r="2" fill="none" stroke={stroke} strokeWidth="0.5" />
        </>
      )}

      {kind === 'flowchart' && (
        <>
          <rect x="10" y="6" width="20" height="8" fill="none" stroke={stroke} strokeWidth="0.5" />
          <rect x="10" y="24" width="20" height="8" fill="none" stroke={stroke} strokeWidth="0.5" />
          <rect x="10" y="42" width="20" height="8" fill="none" stroke={stroke} strokeWidth="0.5" />
          <line x1="20" y1="14" x2="20" y2="24" stroke={stroke} strokeWidth="0.5" />
          <line x1="20" y1="32" x2="20" y2="42" stroke={stroke} strokeWidth="0.5" />
        </>
      )}

      {kind === 'music' && (
        <>
          {[8, 28, 48].map((startY) =>
            [0, 2, 4, 6, 8].map((offset) => (
              <line
                key={`${startY}-${offset}`}
                x1="2"
                y1={startY + offset}
                x2="38"
                y2={startY + offset}
                stroke={stroke}
                strokeWidth="0.3"
              />
            ))
          )}
        </>
      )}

      {kind === 'millimeter' && (
        <>
          {Array.from({ length: 14 }, (_, i) => i * 4).map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="40" y2={y} stroke={stroke} strokeWidth="0.2" />
          ))}
          {Array.from({ length: 10 }, (_, i) => i * 4).map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="56" stroke={stroke} strokeWidth="0.2" />
          ))}
        </>
      )}
    </svg>
  );
}
