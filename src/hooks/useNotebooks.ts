import { useState, useEffect } from 'react';
import { Notebook, NotebookPage } from '@/types/notebook';

const STORAGE_KEY = 'nomos-notebooks';

export const useNotebooks = () => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);

  useEffect(() => {
    loadNotebooks();
    
    const handleStorageChange = () => {
      loadNotebooks();
    };
    
    window.addEventListener('notebooks-updated', handleStorageChange);
    return () => window.removeEventListener('notebooks-updated', handleStorageChange);
  }, []);

  const loadNotebooks = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setNotebooks(JSON.parse(saved) as Notebook[]);
    }
  };

  const saveNotebooks = (updatedNotebooks: Notebook[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotebooks));
    window.dispatchEvent(new Event('notebooks-updated'));
  };

  const createNotebook = (
    title: string, 
    template: 'blank' | 'lined' | 'grid' | 'dotted' = 'blank',
    discipline?: string,
    subject?: string
  ) => {
    const newNotebook: Notebook = {
      id: crypto.randomUUID(),
      title,
      subject,
      discipline,
      color: '#FFD700',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pages: [
        {
          id: crypto.randomUUID(),
          template,
          strokes: [],
          createdAt: new Date().toISOString(),
        }
      ],
    };

    const updated = [...notebooks, newNotebook];
    setNotebooks(updated);
    saveNotebooks(updated);
    return newNotebook;
  };

  const deleteNotebook = (id: string) => {
    const updated = notebooks.filter(n => n.id !== id);
    setNotebooks(updated);
    saveNotebooks(updated);
  };

  const updateNotebook = (id: string, updates: Partial<Notebook>) => {
    const updated = notebooks.map(n => 
      n.id === id 
        ? { ...n, ...updates, updatedAt: new Date().toISOString() } 
        : n
    );
    setNotebooks(updated);
    saveNotebooks(updated);
  };

  const addPage = (notebookId: string, template: NotebookPage['template'] = 'blank') => {
    const newPage: NotebookPage = {
      id: crypto.randomUUID(),
      template,
      strokes: [],
      createdAt: new Date().toISOString(),
    };

    const updated = notebooks.map(n => 
      n.id === notebookId 
        ? { ...n, pages: [...n.pages, newPage], updatedAt: new Date().toISOString() }
        : n
    );
    setNotebooks(updated);
    saveNotebooks(updated);
  };

  const updateTextNotes = (notebookId: string, textNotes: string) => {
    const updated = notebooks.map(n => 
      n.id === notebookId 
        ? { ...n, textNotes, updatedAt: new Date().toISOString() } 
        : n
    );
    setNotebooks(updated);
    saveNotebooks(updated);
  };

  const addTags = (notebookId: string, tags: string[]) => {
    const updated = notebooks.map(n => 
      n.id === notebookId 
        ? { ...n, tags: [...new Set([...(n.tags || []), ...tags])], updatedAt: new Date().toISOString() } 
        : n
    );
    setNotebooks(updated);
    saveNotebooks(updated);
  };

  return {
    notebooks,
    createNotebook,
    deleteNotebook,
    updateNotebook,
    addPage,
    updateTextNotes,
    addTags,
    refreshNotebooks: loadNotebooks,
  };
};
