import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Conversation } from '@/types/chat';
import { useAuthContext } from '@/contexts/AuthContext';

export function useChatConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { userId } = useAuthContext();

  // Load all conversations for user
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedData = (data || []).map(conv => ({
        ...conv,
        status: conv.status as 'active' | 'archived'
      }));

      setConversations(typedData);
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Create new conversation
  const createConversation = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: userId, status: 'active' })
        .select()
        .single();

      if (error) throw error;

      const newConv: Conversation = {
        ...data,
        status: data.status as 'active' | 'archived'
      };

      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      return newConv.id;
    } catch (err) {
      console.error('Error creating conversation:', err);
      return null;
    }
  }, [userId]);

  // Select existing conversation
  const selectConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
  }, []);

  // Delete conversation permanently
  const deleteConversation = useCallback(async (id: string) => {
    try {
      // First delete all messages from the conversation
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', id);

      // Then delete the conversation itself
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== id));

      // If deleted conversation was active, clear selection
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  }, [activeConversationId]);

  // Update conversation title
  const updateConversationTitle = useCallback((id: string, title: string) => {
    setConversations(prev =>
      prev.map(c => c.id === id ? { ...c, title } : c)
    );
  }, []);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    activeConversationId,
    createConversation,
    selectConversation,
    deleteConversation,
    updateConversationTitle,
    isLoading,
    refresh: loadConversations
  };
}
