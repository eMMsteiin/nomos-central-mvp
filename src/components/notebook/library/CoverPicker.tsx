import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { NotebookCover } from './NotebookCover';

interface CoverPickerProps {
  selectedCoverType: string;
  selectedCoverData: string | null;
  onSelect: (coverType: string, coverData: string | null) => void;
  onCustomUpload: (file: File) => Promise<void>;
}

const BUILTIN_COVERS: Array<{ id: string; label: string }> = [
  { id: 'cover-black', label: 'Preta' },
  { id: 'cover-white', label: 'Branca' },
  { id: 'cover-gray', label: 'Cinza' },
  { id: 'cover-lines', label: 'Linhas' },
];

export function CoverPicker({
  selectedCoverType,
  selectedCoverData,
  onSelect,
  onCustomUpload,
}: CoverPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onCustomUpload(file);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isCustomSelected = selectedCoverType === 'custom';

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {BUILTIN_COVERS.map((cover) => {
        const isSelected = !isCustomSelected && selectedCoverData === cover.id;
        return (
          <button
            key={cover.id}
            type="button"
            onClick={() => onSelect('default', cover.id)}
            className={`flex-shrink-0 w-16 h-20 rounded-md overflow-hidden transition ${
              isSelected
                ? 'ring-2 ring-neutral-900 dark:ring-neutral-100'
                : 'ring-1 ring-neutral-300 dark:ring-neutral-700 hover:ring-neutral-500'
            }`}
            title={cover.label}
            aria-label={`Capa ${cover.label}`}
          >
            <NotebookCover coverType="default" coverData={cover.id} title="" mini />
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={`flex-shrink-0 w-16 h-20 rounded-md flex flex-col items-center justify-center gap-1 transition ${
          isCustomSelected
            ? 'ring-2 ring-neutral-900 dark:ring-neutral-100'
            : 'ring-1 ring-neutral-300 dark:ring-neutral-700 hover:ring-neutral-500'
        } ${isCustomSelected && selectedCoverData ? '' : 'bg-neutral-50 dark:bg-neutral-900'}`}
        title="Capa personalizada"
        aria-label="Enviar capa personalizada"
      >
        {isCustomSelected && selectedCoverData ? (
          <img src={selectedCoverData} alt="Capa custom" className="w-full h-full object-cover" />
        ) : uploading ? (
          <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
        ) : (
          <>
            <Upload className="w-4 h-4 text-neutral-500" />
            <span className="text-[9px] text-neutral-500">Custom</span>
          </>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
