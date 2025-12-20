import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceId } from './useDeviceId';
import { Message, Proposal, ChatAction } from '@/types/chat';
import { Task } from '@/types/task';
import { toast } from 'sonner';
import { collectChatContext, extractSourceContentForSummary } from '@/utils/chatContext';

const TASKS_STORAGE_KEY = "nomos.tasks.today";
const TASKS_EMBREVE_KEY = "nomos.tasks.embreve";
const POSTITS_KEY = "nomos-postits";
const BLOCKS_KEY = "nomos-blocks";
const SUMMARIES_KEY = "nomos-summaries";

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
      
      // ===== NEW CONSOLIDATION ACTIONS =====
      
      case 'suggest_consolidation': {
        // This action presents choices to the user via ProposalCard
        // The actual consolidation happens when they pick an option
        const subject = payload?.subject as string || 'seu estudo';
        toast.info(`📚 Sugestão de consolidação para "${subject}"`, {
          description: 'Escolha uma das opções no card acima.',
          duration: 5000
        });
        break;
      }
      
      case 'create_summary': {
        const summaryType = (payload?.type as string || 'essential') as 'essential' | 'exam';
        const subject = payload?.subject as string || 'Estudo';
        
        // Show loading toast
        const loadingToastId = toast.loading(`Gerando resumo ${summaryType === 'exam' ? 'para prova' : 'essencial'}...`, {
          description: `Tema: ${subject}`
        });
        
        // Extract source content from context
        const sourceContent = extractSourceContentForSummary(subject);
        
        // Call edge function to generate summary
        supabase.functions.invoke('generate-summary', {
          body: {
            subject,
            type: summaryType,
            sourceContent,
            sourceType: 'chat'
          }
        }).then(({ data, error }) => {
          toast.dismiss(loadingToastId);
          
          if (error || data?.error) {
            console.error('[create_summary] Error:', error || data?.error);
            toast.error('Erro ao gerar resumo', {
              description: 'Tente novamente em alguns segundos.'
            });
            return;
          }
          
          // Save summary to localStorage
          const existingSummaries = JSON.parse(localStorage.getItem(SUMMARIES_KEY) || '[]');
          const newSummary = {
            id: `summary-${Date.now()}`,
            title: data.title,
            subject: data.subject,
            content: data.content,
            type: data.type as 'essential' | 'exam',
            sourceType: data.sourceType || 'chat',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          localStorage.setItem(SUMMARIES_KEY, JSON.stringify([newSummary, ...existingSummaries]));
          
          // Store the new summary ID for auto-selection
          localStorage.setItem('nomos-new-summary-id', newSummary.id);
          
          // Dispatch event to notify Resumos page
          window.dispatchEvent(new Event('summariesUpdated'));
          
          toast.success(`📋 Resumo ${summaryType === 'exam' ? 'para prova' : 'essencial'} criado!`, {
            description: `"${data.title}"`,
            action: {
              label: 'Ver Resumo',
              onClick: () => window.location.href = '/resumos'
            },
            duration: 10000
          });
        }).catch(err => {
          toast.dismiss(loadingToastId);
          console.error('[create_summary] Exception:', err);
          toast.error('Erro ao gerar resumo');
        });
        
        break;
      }
      
      case 'create_flashcards_from_study': {
        const subject = payload?.subject as string || 'Estudo';
        const flashcards = payload?.flashcards as Array<{front: string, back: string}> || [];
        
        if (flashcards.length > 0) {
          // Store flashcards temporarily for the Flashcards page to pick up
          localStorage.setItem('nomos-pending-flashcards', JSON.stringify({
            subject,
            flashcards,
            createdAt: new Date().toISOString()
          }));
          
          toast.success(`🎴 ${flashcards.length} flashcards criados!`, {
            description: `Tema: ${subject}`,
            action: {
              label: 'Estudar Agora',
              onClick: () => window.location.href = '/flashcards?fromChat=true'
            },
            duration: 8000
          });
        } else {
          toast.info('Flashcards serão criados. Vá para a aba Flashcards para visualizar.', {
            action: {
              label: 'Ir para Flashcards',
              onClick: () => window.location.href = '/flashcards'
            }
          });
        }
        break;
      }
      
      case 'defer_consolidation': {
        const subject = payload?.subject as string || 'o estudo';
        const deferTo = payload?.deferTo as string || 'later_today';
        const createReminder = payload?.createReminder as boolean;
        
        const deferLabels: Record<string, string> = {
          'later_today': 'mais tarde hoje',
          'tomorrow': 'amanhã',
          'next_week': 'próxima semana'
        };
        
        if (createReminder) {
          // Create a post-it reminder
          const postIts = JSON.parse(localStorage.getItem(POSTITS_KEY) || '[]');
          postIts.push({
            id: `reminder-${Date.now()}`,
            text: `📚 Consolidar: ${subject}`,
            color: '#FEF3C7', // Yellow
            createdAt: new Date().toISOString()
          });
          localStorage.setItem(POSTITS_KEY, JSON.stringify(postIts));
          window.dispatchEvent(new Event('postItsUpdated'));
        }
        
        toast.info(`⏰ Consolidação de "${subject}" adiada para ${deferLabels[deferTo] || deferTo}`, {
          description: createReminder ? 'Lembrete criado nos Post-its!' : undefined
        });
        break;
      }
      
      case 'create_review_block': {
        const subject = payload?.subject as string || 'Revisão';
        const duration = payload?.duration as string || '25min';
        const reviewType = payload?.type as string || 'mixed';
        
        const existingTasks = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) || '[]');
        
        const reviewBlock: Task = {
          id: `review-${Date.now()}`,
          type: 'study-block',
          text: `Revisão: ${subject}`,
          createdAt: new Date().toISOString(),
          category: 'hoje',
          sourceType: 'chat',
          durationMinutes: parseDuration(duration),
          focusSubject: subject,
        };
        
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([reviewBlock, ...existingTasks]));
        window.dispatchEvent(new Event('tasksUpdated'));
        
        const typeLabels: Record<string, string> = {
          'flashcard_review': 'com flashcards',
          'summary_review': 'de resumos',
          'mixed': 'geral'
        };
        
        toast.success(`📖 Bloco de revisão ${typeLabels[reviewType] || ''} criado!`, {
          description: `${subject} - ${duration}`,
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

  const getActionDescription = useCallback((action: ChatAction): string => {
    const payload = action.payload as Record<string, unknown> | null;
    
    switch (action.action_type) {
      case 'create_routine_block': {
        // Try to extract block info from various payload formats
        const studyBlocks = payload?.study_blocks as Array<Record<string, unknown>> | undefined;
        const blocks = payload?.blocks as Array<Record<string, unknown>> | undefined;
        const block = studyBlocks?.[0] || blocks?.[0] || payload?.evening_study_block as Record<string, unknown>;
        
        if (block) {
          const focus = block.focus || block.subject || payload?.focus || payload?.subject || 'Estudos';
          const duration = block.duration || block.duration_minutes || payload?.duration || payload?.duration_minutes || '1h';
          const time = block.time_start || block.start_time || block.time || payload?.start_time || payload?.time || '';
          return `Bloco de estudo de ${focus} (${duration}) ${time ? `às ${time}` : ''} criado com sucesso`;
        }
        
        const activity = payload?.activity || payload?.task_name || payload?.subject || payload?.focus || 'Estudos';
        const duration = payload?.duration || payload?.duration_minutes || '1h';
        const startTime = payload?.start_time || payload?.time_start || payload?.time || '';
        return `Bloco de estudo de ${activity} (${duration}) ${startTime ? `às ${startTime}` : ''} criado com sucesso`;
      }
      case 'start_study_session': {
        const subject = payload?.subject as string || 'Sessão de Estudo';
        const duration = payload?.duration as string || '25min';
        return `Sessão de estudo "${subject}" (${duration}) iniciada`;
      }
      case 'complete_task':
        return 'Tarefa marcada como concluída';
      case 'move_task': {
        const to = payload?.to as string || 'destino';
        return `Tarefa movida para ${to}`;
      }
      case 'redistribute_tasks':
        return 'Redistribuição de tarefas aplicada';
      case 'reduce_workload':
        return 'Carga de trabalho reduzida';
      case 'focus_mode':
        return 'Modo foco ativado';
      case 'suggest_notebook': {
        const title = payload?.notebookTitle || payload?.title || 'caderno';
        return `Sugestão de caderno "${title}" registrada`;
      }
      case 'suggest_consolidation':
        return `Sugestão de consolidação para "${payload?.subject || 'estudo'}"`;
      case 'create_summary':
        return `Resumo ${payload?.type === 'exam' ? 'para prova' : 'essencial'} criado`;
      case 'create_flashcards_from_study':
        return `Flashcards criados a partir do estudo`;
      case 'defer_consolidation':
        return `Consolidação adiada para ${payload?.deferTo || 'depois'}`;
      case 'create_review_block':
        return `Bloco de revisão criado`;
      default:
        return 'Ação aplicada com sucesso';
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
      
      // Send specific message so AI knows what was done and can continue conversation
      const actionDescription = getActionDescription(actionToApply);
      await sendMessage(`[AÇÃO APLICADA: ${actionDescription}]`);

    } catch (error) {
      console.error('[applyProposal] Erro:', error);
      toast.error('Erro ao aplicar ação.');
    }
  }, [recentActions, executeProposalAction, sendMessage, getActionDescription]);

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
