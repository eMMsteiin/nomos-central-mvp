import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceId } from './useDeviceId';
import { Message, Proposal, ChatAction } from '@/types/chat';
import { Task } from '@/types/task';
import { toast } from 'sonner';

const TASKS_STORAGE_KEY = "nomos.tasks.today";

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

  const parseDuration = (durationStr: string): number => {
    // Parse strings like "1h30", "2h", "45min", "1:30"
    if (!durationStr) return 60;
    
    const hourMatch = durationStr.match(/(\d+)\s*h/i);
    const minMatch = durationStr.match(/(\d+)\s*min/i);
    const colonMatch = durationStr.match(/(\d+):(\d+)/);
    
    if (colonMatch) {
      return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
    }
    
    let totalMinutes = 0;
    if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
    if (minMatch) totalMinutes += parseInt(minMatch[1]);
    
    // If just a number, assume minutes
    if (!hourMatch && !minMatch) {
      const num = parseInt(durationStr);
      if (!isNaN(num)) return num > 10 ? num : num * 60; // < 10 assume hours
    }
    
    return totalMinutes || 60;
  };

  const executeProposalAction = useCallback((action: ChatAction) => {
    const payload = action.payload as Record<string, unknown> | null;
    
    switch (action.action_type) {
      case 'create_routine_block': {
        const existingTasks = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) || '[]');
        const newBlocks: Task[] = [];
        
        // Structure 1: study_blocks array (AI format)
        const studyBlocks = payload?.study_blocks as Array<Record<string, unknown>> | undefined;
        if (studyBlocks?.length) {
          studyBlocks.forEach((block, i) => {
            newBlocks.push({
              id: `block-${Date.now()}-${i}`,
              type: 'study-block',
              text: `Bloco de ${block.focus || block.subject || 'Estudo'}`,
              createdAt: new Date().toISOString(),
              category: 'hoje',
              sourceType: 'chat',
              startTime: block.time_start as string || block.start_time as string,
              endTime: block.time_end as string || block.end_time as string,
              durationMinutes: block.duration_minutes as number || parseDuration(block.duration as string || '60'),
              focusSubject: block.focus as string || block.subject as string,
            });
          });
        }
        
        // Structure 2: blocks array (alternative AI format)
        const blocks = payload?.blocks as Array<Record<string, unknown>> | undefined;
        if (blocks?.length && !newBlocks.length) {
          blocks.forEach((block, i) => {
            newBlocks.push({
              id: `block-${Date.now()}-${i}`,
              type: 'study-block',
              text: block.description as string || block.title as string || `Bloco de Estudo`,
              createdAt: new Date().toISOString(),
              category: 'hoje',
              sourceType: 'chat',
              startTime: block.time_start as string || block.start_time as string,
              endTime: block.time_end as string || block.end_time as string,
              durationMinutes: block.duration_minutes as number || parseDuration(block.duration as string || '60'),
              focusSubject: block.focus as string || block.subject as string,
            });
          });
        }
        
        // Structure 3: evening_study_block (original format)
        if (!newBlocks.length && payload?.evening_study_block) {
          const eveningBlock = payload.evening_study_block as Record<string, unknown>;
          const duration = eveningBlock.duration as string || '1h';
          const focus = eveningBlock.focus as string || 'Estudos';
          const startTime = payload.start_time as string || '19:00';
          
          newBlocks.push({
            id: `block-${Date.now()}`,
            type: 'study-block',
            text: `Bloco de ${focus}`,
            createdAt: new Date().toISOString(),
            category: 'hoje',
            sourceType: 'chat',
            startTime: startTime,
            durationMinutes: parseDuration(duration),
            focusSubject: focus,
          });
        }
        
        // Structure 4: Flat payload (activity, task_name, subject, etc. directly in root)
        if (!newBlocks.length && payload) {
          const activity = payload.activity as string || payload.task_name as string || payload.subject as string || payload.focus as string || payload.title as string;
          const startTime = payload.start_time as string || payload.time_start as string;
          const endTime = payload.end_time as string || payload.time_end as string;
          const durationRaw = payload.duration as string || payload.duration_minutes?.toString();
          
          // Only create if we have activity name OR start time
          if (activity || startTime || durationRaw) {
            const durationMinutes = typeof payload.duration_minutes === 'number' 
              ? payload.duration_minutes 
              : parseDuration(durationRaw || '60');
            
            newBlocks.push({
              id: `block-${Date.now()}`,
              type: 'study-block',
              text: activity || 'Bloco de Estudo',
              createdAt: new Date().toISOString(),
              category: 'hoje',
              sourceType: 'chat',
              startTime: startTime,
              endTime: endTime,
              durationMinutes: durationMinutes,
              focusSubject: activity,
            });
          }
        }
        
        // Log para debug se nenhum bloco foi criado
        if (!newBlocks.length) {
          console.warn('[useChat] Payload não reconhecido para create_routine_block:', payload);
        }
        
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([...newBlocks, ...existingTasks]));
        window.dispatchEvent(new Event('tasksUpdated'));
        
        toast.success(`${newBlocks.length} bloco(s) de estudo criado(s)!`, {
          description: newBlocks.map(b => b.text).join(', '),
          action: {
            label: 'Ver em Hoje',
            onClick: () => window.location.href = '/hoje'
          }
        });
        break;
      }
      
      case 'redistribute_tasks': {
        toast.info('Redistribuição de tarefas aplicada!');
        break;
      }
      
      case 'reduce_workload': {
        toast.info('Carga reduzida aplicada!');
        break;
      }
      
      case 'focus_mode': {
        toast.info('Modo foco ativado!');
        break;
      }
      
      case 'start_study_session': {
        // Create immediate study block
        const existingTasks = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) || '[]');
        const duration = payload?.duration as string || '25min';
        const subject = payload?.subject as string || 'Sessão de Estudo';
        
        const newBlock: Task = {
          id: `session-${Date.now()}`,
          type: 'study-block',
          text: subject,
          createdAt: new Date().toISOString(),
          category: 'hoje',
          sourceType: 'chat',
          durationMinutes: parseDuration(duration),
          timerStartedAt: new Date().toISOString(), // Start immediately
        };
        
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([newBlock, ...existingTasks]));
        window.dispatchEvent(new Event('tasksUpdated'));
        
        toast.success('Sessão de estudo iniciada!', {
          action: {
            label: 'Ver em Hoje',
            onClick: () => window.location.href = '/hoje'
          }
        });
        break;
      }
      
      default:
        toast.info('Ação aplicada!');
    }
  }, []);

  const applyProposal = useCallback(async (actionId: string) => {
    try {
      // Find the action to execute
      const actionToApply = recentActions.find(a => a.id === actionId);
      
      const { error } = await supabase
        .from('chat_actions_log')
        .update({ status: 'applied' })
        .eq('id', actionId);

      if (error) throw error;

      setRecentActions(prev => 
        prev.map(a => a.id === actionId ? { ...a, status: 'applied' as const } : a)
      );

      // Execute the actual action
      if (actionToApply) {
        executeProposalAction(actionToApply);
      }
      
      // Send confirmation to chat
      await sendMessage('Ok, pode aplicar essa mudança!');

    } catch (error) {
      console.error('Error applying proposal:', error);
      toast.error('Erro ao aplicar ação.');
    }
  }, [recentActions, executeProposalAction, sendMessage]);

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
