import { useState, useEffect } from 'react';
import { Block, DEFAULT_WEEK_BLOCK_SIZE, DEFAULT_DAY_BLOCK_SIZE, DAYS_OF_WEEK } from '@/types/block';

const STORAGE_KEY = 'nomos-blocks';

export const useBlocks = (tab?: string) => {
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    loadBlocks();
    
    const handleStorageChange = () => {
      loadBlocks();
    };
    
    window.addEventListener('blocks-updated', handleStorageChange);
    return () => window.removeEventListener('blocks-updated', handleStorageChange);
  }, [tab]);

  const loadBlocks = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const all = JSON.parse(saved) as Block[];
      setBlocks(all);
    }
  };

  const saveBlocks = (updatedBlocks: Block[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBlocks));
    window.dispatchEvent(new Event('blocks-updated'));
  };

  const createWeekBlock = (position: { x: number; y: number }, title?: string) => {
    const now = new Date();
    const defaultTitle = title || `Semana de ${now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
    
    const newBlock: Block = {
      id: crypto.randomUUID(),
      type: 'week',
      title: defaultTitle,
      position,
      size: DEFAULT_WEEK_BLOCK_SIZE,
      isExpanded: false,
      createdAt: now.toISOString()
    };

    const updated = [...blocks, newBlock];
    setBlocks(updated);
    saveBlocks(updated);
    return newBlock;
  };

  const expandWeekBlock = (weekId: string) => {
    const weekBlock = blocks.find(b => b.id === weekId);
    if (!weekBlock || weekBlock.type !== 'week') return;

    // Criar 7 blocos diários
    const dayBlocks: Block[] = DAYS_OF_WEEK.map((day, index) => ({
      id: crypto.randomUUID(),
      type: 'day' as const,
      title: day,
      weekId,
      position: {
        x: weekBlock.position.x + (index * DEFAULT_DAY_BLOCK_SIZE.width),
        y: weekBlock.position.y
      },
      size: {
        width: DEFAULT_DAY_BLOCK_SIZE.width,
        height: weekBlock.size.height
      },
      isExpanded: false,
      createdAt: new Date().toISOString()
    }));

    // Marcar bloco semanal como expandido
    const updated = blocks.map(b => 
      b.id === weekId ? { ...b, isExpanded: true } : b
    ).concat(dayBlocks);

    setBlocks(updated);
    saveBlocks(updated);
  };

  const collapseWeekBlock = (weekId: string) => {
    // Remover blocos diários e marcar semanal como não expandido
    const updated = blocks
      .filter(b => b.weekId !== weekId)
      .map(b => b.id === weekId ? { ...b, isExpanded: false } : b);

    setBlocks(updated);
    saveBlocks(updated);
  };

  const updateBlockPosition = (id: string, position: { x: number; y: number }) => {
    const updated = blocks.map(b => 
      b.id === id ? { ...b, position } : b
    );
    setBlocks(updated);
    saveBlocks(updated);
  };

  const updateBlockSize = (id: string, size: { width: number; height: number }) => {
    const updated = blocks.map(b => 
      b.id === id ? { ...b, size } : b
    );
    setBlocks(updated);
    saveBlocks(updated);
  };

  const updateBlockTitle = (id: string, title: string) => {
    const updated = blocks.map(b => 
      b.id === id ? { ...b, title } : b
    );
    setBlocks(updated);
    saveBlocks(updated);
  };

  const deleteBlock = (id: string) => {
    const block = blocks.find(b => b.id === id);
    
    // Se for bloco semanal, remover também os diários
    let updated = blocks.filter(b => b.id !== id);
    if (block?.type === 'week') {
      updated = updated.filter(b => b.weekId !== id);
    }

    setBlocks(updated);
    saveBlocks(updated);
  };

  return {
    blocks,
    createWeekBlock,
    expandWeekBlock,
    collapseWeekBlock,
    updateBlockPosition,
    updateBlockSize,
    updateBlockTitle,
    deleteBlock,
    refreshBlocks: loadBlocks
  };
};
