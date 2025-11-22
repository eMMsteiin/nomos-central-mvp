import { useState, useEffect } from 'react';
import { PostIt } from '@/types/postit';

const STORAGE_KEY = 'nomos-postits';

export const usePostIts = (blockId?: string) => {
  const [postIts, setPostIts] = useState<PostIt[]>([]);

  useEffect(() => {
    loadPostIts();
    
    const handleStorageChange = () => {
      loadPostIts();
    };
    
    window.addEventListener('postits-updated', handleStorageChange);
    return () => window.removeEventListener('postits-updated', handleStorageChange);
  }, [blockId]);

  const loadPostIts = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const all = JSON.parse(saved) as PostIt[];
      setPostIts(blockId ? all.filter(p => p.blockId === blockId) : all);
    }
  };

  const savePostIts = (updatedPostIts: PostIt[]) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const all = saved ? JSON.parse(saved) as PostIt[] : [];
    
    // Remove old post-its from this tab and add updated ones
    const others = all.filter(p => !updatedPostIts.find(u => u.id === p.id));
    const newAll = [...others, ...updatedPostIts];
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newAll));
    window.dispatchEvent(new Event('postits-updated'));
  };

  const addPostIt = (postIt: PostIt) => {
    const updated = [...postIts, postIt];
    setPostIts(updated);
    savePostIts(updated);
  };

  const updatePostIt = (id: string, updates: Partial<PostIt>) => {
    const updated = postIts.map(p => p.id === id ? { ...p, ...updates } : p);
    setPostIts(updated);
    savePostIts(updated);
  };

  const deletePostIt = (id: string) => {
    const updated = postIts.filter(p => p.id !== id);
    setPostIts(updated);
    savePostIts(updated);
  };

  const movePostItToBlock = (id: string, newBlockId: string) => {
    const postIt = postIts.find(p => p.id === id);
    if (postIt) {
      const updated = { ...postIt, blockId: newBlockId };
      
      // Update in global storage
      const saved = localStorage.getItem(STORAGE_KEY);
      const all = saved ? JSON.parse(saved) as PostIt[] : [];
      const newAll = all.map(p => p.id === id ? updated : p);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAll));
      window.dispatchEvent(new Event('postits-updated'));
      
      // Remove from current block view
      setPostIts(postIts.filter(p => p.id !== id));
    }
  };

  const getPostItsByBlock = (blockId: string): PostIt[] => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const all = JSON.parse(saved) as PostIt[];
      return all.filter(p => p.blockId === blockId);
    }
    return [];
  };

  return {
    postIts,
    addPostIt,
    updatePostIt,
    deletePostIt,
    movePostItToBlock,
    getPostItsByBlock,
    refreshPostIts: loadPostIts
  };
};
