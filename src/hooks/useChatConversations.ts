import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Conversation } from '@/types/chat';

const DEVICE_ID_KEY = 'nomos.device.id';

function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function useChatConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const userId = getDeviceId();

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

  // Archive conversation
  const archiveConversation = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status: 'archived' })
        .eq('id', id);

      if (error) throw error;

      setConversations(prev =>
        prev.map(c => c.id === id ? { ...c, status: 'archived' as const } : c)
      );

      // If archived conversation was active, clear it
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    } catch (err) {
      console.error('Error archiving conversation:', err);
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
    activeConversations: conversations.filter(c => c.status === 'active'),
    archivedConversations: conversations.filter(c => c.status === 'archived'),
    activeConversationId,
    createConversation,
    selectConversation,
    archiveConversation,
    updateConversationTitle,
    isLoading,
    refresh: loadConversations
  };
}
