import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceId } from './useDeviceId';
import { Message, Proposal, ChatAction } from '@/types/chat';
import { toast } from 'sonner';

export function useChat() {
  const deviceId = useDeviceId();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentActions, setRecentActions] = useState<ChatAction[]>([]);

  // Load existing conversation and messages
  useEffect(() => {
    if (!deviceId) return;

    const loadConversation = async () => {
      // Get active conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', deviceId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (conversation) {
        setConversationId(conversation.id);
        
        // Load messages
        const { data: existingMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: true });

        if (existingMessages) {
          // Parse proposal JSON for each message
          const parsedMessages: Message[] = existingMessages.map(msg => ({
            id: msg.id,
            conversation_id: msg.conversation_id,
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
            proposal: msg.proposal as unknown as Proposal | null,
            created_at: msg.created_at
          }));
          setMessages(parsedMessages);
        }
      }
    };

    loadConversation();
  }, [deviceId]);

  // Load recent actions
  useEffect(() => {
    if (!deviceId) return;

    const loadActions = async () => {
      const { data: actions } = await supabase
        .from('chat_actions_log')
        .select('*')
        .eq('user_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (actions) {
        setRecentActions(actions as ChatAction[]);
      }
    };

    loadActions();
  }, [deviceId]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          const newMessage: Message = {
            id: raw.id as string,
            conversation_id: raw.conversation_id as string,
            role: raw.role as 'user' | 'assistant' | 'system',
            content: raw.content as string,
            proposal: raw.proposal as unknown as Proposal | null,
            created_at: raw.created_at as string
          };
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!deviceId || !content.trim()) return;

    setIsLoading(true);

    // Optimistically add user message
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId || '',
      role: 'user',
      content: content.trim(),
      proposal: null,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const { data, error } = await supabase.functions.invoke('chat-nomos', {
        body: {
          userId: deviceId,
          conversationId,
          message: content.trim()
        }
      });

      if (error) throw error;

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      // Refresh actions if a proposal was made
      if (data.proposal) {
        const { data: actions } = await supabase
          .from('chat_actions_log')
          .select('*')
          .eq('user_id', deviceId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (actions) {
          setRecentActions(actions as ChatAction[]);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [deviceId, conversationId]);

  const applyProposal = useCallback(async (actionId: string) => {
    try {
      const { error } = await supabase
        .from('chat_actions_log')
        .update({ status: 'applied' })
        .eq('id', actionId);

      if (error) throw error;

      setRecentActions(prev => 
        prev.map(a => a.id === actionId ? { ...a, status: 'applied' as const } : a)
      );

      toast.success('Ação aplicada com sucesso!');
      
      // Send confirmation to chat
      await sendMessage('Ok, pode aplicar essa mudança!');

    } catch (error) {
      console.error('Error applying proposal:', error);
      toast.error('Erro ao aplicar ação.');
    }
  }, [sendMessage]);

  const cancelProposal = useCallback(async (actionId: string) => {
    try {
      const { error } = await supabase
        .from('chat_actions_log')
        .update({ status: 'cancelled' })
        .eq('id', actionId);

      if (error) throw error;

      setRecentActions(prev => 
        prev.map(a => a.id === actionId ? { ...a, status: 'cancelled' as const } : a)
      );

      toast.info('Ação cancelada.');

    } catch (error) {
      console.error('Error cancelling proposal:', error);
      toast.error('Erro ao cancelar ação.');
    }
  }, []);

  const clearConversation = useCallback(async () => {
    if (!conversationId) return;

    try {
      await supabase
        .from('conversations')
        .update({ status: 'archived' })
        .eq('id', conversationId);

      setMessages([]);
      setConversationId(null);
      toast.success('Conversa arquivada.');

    } catch (error) {
      console.error('Error clearing conversation:', error);
      toast.error('Erro ao arquivar conversa.');
    }
  }, [conversationId]);

  return {
    messages,
    isLoading,
    sendMessage,
    applyProposal,
    cancelProposal,
    clearConversation,
    recentActions
  };
}
