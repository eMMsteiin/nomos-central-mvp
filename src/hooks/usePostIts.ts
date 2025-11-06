import { useState, useEffect } from 'react';
import { PostIt } from '@/types/postit';

const STORAGE_KEY = 'nomos-postits';

export const usePostIts = (tab?: string) => {
  const [postIts, setPostIts] = useState<PostIt[]>([]);

  useEffect(() => {
    loadPostIts();
    
    const handleStorageChange = () => {
      loadPostIts();
    };
    
    window.addEventListener('postits-updated', handleStorageChange);
    return () => window.removeEventListener('postits-updated', handleStorageChange);
  }, [tab]);

  const loadPostIts = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const all = JSON.parse(saved) as PostIt[];
      setPostIts(tab ? all.filter(p => p.tab === tab) : all);
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

  const movePostItToTab = (id: string, newTab: PostIt['tab']) => {
    const postIt = postIts.find(p => p.id === id);
    if (postIt) {
      const updated = { ...postIt, tab: newTab };
      
      // Update in global storage
      const saved = localStorage.getItem(STORAGE_KEY);
      const all = saved ? JSON.parse(saved) as PostIt[] : [];
      const newAll = all.map(p => p.id === id ? updated : p);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAll));
      window.dispatchEvent(new Event('postits-updated'));
      
      // Remove from current tab
      setPostIts(postIts.filter(p => p.id !== id));
    }
  };

  return {
    postIts,
    addPostIt,
    updatePostIt,
    deletePostIt,
    movePostItToTab,
    refreshPostIts: loadPostIts
  };
};
