import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { getDocument } from 'pdfjs-dist';
import { Notebook, NotebookPage } from '@/types/notebook';

// Configure PDF.js worker
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ImportPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (notebook: Partial<Notebook>) => void;
  discipline?: string;
}

export const ImportPdfDialog = ({ open, onOpenChange, onImport, discipline }: ImportPdfDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace('.pdf', ''));
      }
    } else {
      toast.error('Por favor, selecione um arquivo PDF');
    }
  };

  const handleImport = async () => {
    if (!file || !title.trim()) {
      toast.error('Preencha o título e selecione um PDF');
      return;
    }

    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      const numPages = Math.min(pdf.numPages, 200); // Limit to 200 pages

      const pages: NotebookPage[] = [];
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        
        // Create canvas to render PDF page
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) continue;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        await page.render(renderContext as any).promise;
        
        // Convert canvas to data URL and store as background
        const imageData = canvas.toDataURL('image/png');
        
        pages.push({
          id: crypto.randomUUID(),
          template: 'blank',
          strokes: [],
          createdAt: new Date().toISOString(),
          backgroundImage: imageData,
        });
      }

      const notebook: Partial<Notebook> = {
        title: title.trim(),
        discipline,
        color: '#FF6B6B',
        pages,
        isPdf: true,
      };

      onImport(notebook);
      toast.success(`PDF importado com ${numPages} páginas`);
      
      // Reset form
      setFile(null);
      setTitle('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error importing PDF:', error);
      toast.error('Erro ao importar PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar PDF</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pdf-file">Arquivo PDF</Label>
            <div className="flex items-center gap-2">
              <Input
                id="pdf-file"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {file && (
                <FileText className="h-5 w-5 text-primary" />
              )}
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pdf-title">Título do Caderno</Label>
            <Input
              id="pdf-title"
              placeholder="Nome do caderno"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!file || !title.trim() || isProcessing}>
            {isProcessing ? (
              <>Processando...</>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
