import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceId } from './useDeviceId';
import { Message, Proposal, ChatAction } from '@/types/chat';
import { Task } from '@/types/task';
import { toast } from 'sonner';
import { collectChatContext } from '@/utils/chatContext';

const TASKS_STORAGE_KEY = "nomos.tasks.today";
const TASKS_EMBREVE_KEY = "nomos.tasks.embreve";
const POSTITS_KEY = "nomos-postits";
const BLOCKS_KEY = "nomos-blocks";

interface UseChatOptions {
  externalConversationId?: string | null;
  onConversationCreated?: (id: string, title?: string) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const { externalConversationId, onConversationCreated } = options;
  const deviceId = useDeviceId();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(externalConversationId || null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentActions, setRecentActions] = useState<ChatAction[]>([]);

  // Update conversationId when external one changes
  useEffect(() => {
    if (externalConversationId !== undefined) {
      setConversationId(externalConversationId);
    }
  }, [externalConversationId]);

  // Load messages for current conversation
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (existingMessages) {
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
    };

    loadMessages();
  }, [conversationId]);

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
      // Collect context from all tabs
      const context = collectChatContext();
      
      const { data, error } = await supabase.functions.invoke('chat-nomos', {
        body: {
          userId: deviceId,
          conversationId,
          message: content.trim(),
          context // Pass full context to AI
        }
      });

      if (error) throw error;

      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId);
        // Notify about new conversation with title
        if (onConversationCreated) {
          onConversationCreated(data.conversationId, data.title);
        }
      }

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
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [deviceId, conversationId, onConversationCreated]);

  const parseDuration = (durationStr: string): number => {
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
    
    if (!hourMatch && !minMatch) {
      const num = parseInt(durationStr);
      if (!isNaN(num)) return num > 10 ? num : num * 60;
    }
    
    return totalMinutes || 60;
  };

  const executeProposalAction = useCallback((action: ChatAction) => {
    const payload = action.payload as Record<string, unknown> | null;
    
    console.log('[executeProposalAction] Iniciando execução');
    console.log('[executeProposalAction] action_type:', action.action_type);
    console.log('[executeProposalAction] payload:', JSON.stringify(payload, null, 2));
    
    switch (action.action_type) {
      case 'create_routine_block': {
        const existingTasks = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) || '[]');
        const newBlocks: Task[] = [];
        
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
              startTime: block.time_start as string || block.start_time as string || block.time as string,
              endTime: block.time_end as string || block.end_time as string,
              durationMinutes: block.duration_minutes as number || parseDuration(block.duration as string || '60'),
              focusSubject: block.focus as string || block.subject as string,
            });
          });
        }
        
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
              startTime: block.time_start as string || block.start_time as string || block.time as string,
              endTime: block.time_end as string || block.end_time as string,
              durationMinutes: block.duration_minutes as number || parseDuration(block.duration as string || '60'),
              focusSubject: block.focus as string || block.subject as string,
            });
          });
        }
        
        if (!newBlocks.length && payload?.evening_study_block) {
          const eveningBlock = payload.evening_study_block as Record<string, unknown>;
          const duration = eveningBlock.duration as string || '1h';
          const focus = eveningBlock.focus as string || 'Estudos';
          const startTime = payload.start_time as string || eveningBlock.time as string || '19:00';
          
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
        
        if (!newBlocks.length && payload) {
          const activity = payload.activity as string || payload.task_name as string || payload.subject as string || payload.focus as string || payload.title as string || payload.name as string;
          const startTime = payload.start_time as string || payload.time_start as string || payload.time as string;
          const endTime = payload.end_time as string || payload.time_end as string;
          const durationRaw = payload.duration as string || payload.duration_minutes?.toString();
          
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
        
        if (!newBlocks.length) {
          console.error('[executeProposalAction] NENHUM BLOCO CRIADO! Payload não reconhecido:', payload);
          toast.warning('Proposta aplicada, mas nenhum bloco foi criado. Verifique o console.');
        }
        
        const finalTasks = [...newBlocks, ...existingTasks];
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(finalTasks));
        window.dispatchEvent(new Event('tasksUpdated'));
        
        if (newBlocks.length > 0) {
          toast.success(`${newBlocks.length} bloco(s) de estudo criado(s)!`, {
            description: newBlocks.map(b => b.text).join(', '),
            action: {
              label: 'Ver em Hoje',
              onClick: () => window.location.href = '/hoje'
            }
          });
        }
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
          timerStartedAt: new Date().toISOString(),
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
      
      case 'create_postit':
      case 'create_task_embreve':
      case 'suggest_choice': {
        // These are now handled by ProposalCard with choices
        // The user clicks a button and is redirected to the appropriate page
        // No action needed here - this case exists for legacy proposals
        toast.info('Use as opções do card para escolher onde salvar.');
        break;
      }
      
      case 'suggest_notebook': {
        const notebookId = payload?.notebookId as string;
        const notebookTitle = payload?.notebookTitle as string || payload?.title as string;
        const reason = payload?.reason as string || 'Este caderno pode ajudar com o que você está estudando.';
        
        toast.info(`📓 Caderno sugerido: "${notebookTitle}"`, {
          description: reason,
          action: {
            label: 'Abrir Caderno',
            onClick: () => window.location.href = `/caderno?id=${notebookId}`
          },
          duration: 10000
        });
        break;
      }
      
      case 'complete_task': {
        const taskId = payload?.taskId as string;
        const category = payload?.category as string || 'hoje';
        
        const storageKey = category === 'em-breve' ? TASKS_EMBREVE_KEY : TASKS_STORAGE_KEY;
        const tasks = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        const updatedTasks = tasks.map((t: Task) => 
          t.id === taskId ? { ...t, completed: true } : t
        );
        
        localStorage.setItem(storageKey, JSON.stringify(updatedTasks));
        window.dispatchEvent(new Event('tasksUpdated'));
        
        toast.success('Tarefa concluída! 🎉');
        break;
      }
      
      case 'move_task': {
        const taskId = payload?.taskId as string;
        const fromCategory = payload?.from as string;
        const toCategory = payload?.to as string;
        
        const fromKey = fromCategory === 'em-breve' ? TASKS_EMBREVE_KEY : TASKS_STORAGE_KEY;
        const toKey = toCategory === 'em-breve' ? TASKS_EMBREVE_KEY : TASKS_STORAGE_KEY;
        
        const fromTasks = JSON.parse(localStorage.getItem(fromKey) || '[]');
        const toTasks = JSON.parse(localStorage.getItem(toKey) || '[]');
        
        const taskIndex = fromTasks.findIndex((t: Task) => t.id === taskId);
        if (taskIndex !== -1) {
          const [task] = fromTasks.splice(taskIndex, 1);
          task.category = toCategory;
          toTasks.push(task);
          
          localStorage.setItem(fromKey, JSON.stringify(fromTasks));
          if (fromKey !== toKey) {
            localStorage.setItem(toKey, JSON.stringify(toTasks));
          }
          window.dispatchEvent(new Event('tasksUpdated'));
          
          toast.success(`Tarefa movida para ${toCategory}!`);
        }
        break;
      }
      
      default:
        toast.info('Ação aplicada!');
    }
  }, []);

  const applyProposal = useCallback(async (actionId: string) => {
    try {
      const actionToApply = recentActions.find(a => a.id === actionId);
      
      if (!actionToApply) {
        toast.error('Ação não encontrada. Tente recarregar a página.');
        return;
      }
      
      const { error } = await supabase
        .from('chat_actions_log')
        .update({ status: 'applied' })
        .eq('id', actionId);

      if (error) throw error;

      setRecentActions(prev => 
        prev.map(a => a.id === actionId ? { ...a, status: 'applied' as const } : a)
      );

      executeProposalAction(actionToApply);
      await sendMessage('Ok, pode aplicar essa mudança!');

    } catch (error) {
      console.error('[applyProposal] Erro:', error);
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
    conversationId,
    sendMessage,
    applyProposal,
    cancelProposal,
    clearConversation,
    recentActions,
    setConversationId
  };
}
