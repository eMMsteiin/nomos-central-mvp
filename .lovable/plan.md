
# Plano: Modo Foco (Desktop MVP)

## Resumo

Implementar um sistema completo de Modo Foco inteiramente dentro da NOMOS, com UI dedicada, timer persistente, listas de sites editaveis, e preparacao para integracao futura com extensao Chrome. A feature sera acessivel via menu lateral e comandos de chat.

## Arquitetura

```text
+------------------+     +-------------------+     +------------------+
|  FocusModeContext|---->| useFocusMode hook |---->| Componentes UI   |
|  (estado global) |     | (logica + localStorage) | (FocusPage, etc) |
+------------------+     +-------------------+     +------------------+
        |                         |
        v                         v
+------------------+     +-------------------+
| window.postMessage|    | Chat Integration  |
| (extensao futura)|     | (comandos rápidos)|
+------------------+     +-------------------+
```

## Componentes a Criar

### 1. Tipo FocusState

Arquivo: `src/types/focusMode.ts`

```typescript
export interface FocusState {
  active: boolean;
  startedAt: number | null;
  until: number | null;
  durationMin: number | null;
  blocklist: string[];
  allowlist: string[];
  lastEndReason: 'completed' | 'ended_early' | null;
}

export const DEFAULT_FOCUS_STATE: FocusState = {
  active: false,
  startedAt: null,
  until: null,
  durationMin: null,
  blocklist: [],
  allowlist: [],
  lastEndReason: null,
};

export const DEFAULT_BLOCKLIST = [
  'instagram.com',
  'tiktok.com',
  'youtube.com',
  'x.com',
  'twitter.com',
  'facebook.com',
  'reddit.com',
];

export const DEFAULT_ALLOWLIST = [
  'docs.google.com',
  'calendar.google.com',
  'web.whatsapp.com',
];
```

### 2. Context FocusModeContext

Arquivo: `src/contexts/FocusModeContext.tsx`

Funcionalidades:
- Estado global do Modo Foco
- Persistencia em localStorage (`nomos_focus_state`)
- Timer com countdown em tempo real
- Funcoes: startSession, endSession, updateBlocklist, updateAllowlist
- Emissao de eventos via `window.postMessage` para extensao futura
- Restauracao automatica ao recarregar (se sessao ativa)

### 3. Hook useFocusMode

Arquivo: `src/hooks/useFocusMode.ts`

- Wrapper para acessar o contexto
- Utilitarios: formatTimeRemaining, formatEndTime

### 4. Pagina ModoFoco

Arquivo: `src/pages/ModoFoco.tsx`

UI Completa:
- Toggle principal (ON/OFF) com status visual
- Duracao: botoes rapidos (25/50/90 min) + campo personalizado
- Lista de sites para bloquear (editavel)
- Lista de excecoes permitidas (editavel)
- Botoes: "Iniciar sessao", "Encerrar sessao", "Editar listas"
- Aviso sobre limitacao atual (bloqueio real via extensao)
- Contador regressivo em tempo real quando ativo

### 5. Componentes de Lista

Arquivo: `src/components/focus/DomainListEditor.tsx`

- Input para adicionar dominio
- Validacao: aceita apenas hostname (remove http/https e paths)
- Lista com botao de remover cada item
- Sugestao de defaults se vazio

### 6. Componente FocusStatusBar

Arquivo: `src/components/focus/FocusStatusBar.tsx`

- Barra fixa no topo (ou flutuante) quando sessao ativa
- Mostra: tempo restante, horario de termino, botao pausar/encerrar
- Visivel em todas as paginas

### 7. Integracao com Chat

Arquivo: `src/hooks/useChat.ts` (modificar)

Adicionar handlers para:
- `focus_mode` action type
- Payload: { duration, action: 'start' | 'stop' }

Modificar edge function `chat-nomos/index.ts`:
- Reconhecer comandos: "ativar foco X min", "desligar foco"
- Gerar proposal com action_type: "focus_mode"

## Estrutura de Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/types/focusMode.ts` | Tipos e defaults |
| `src/contexts/FocusModeContext.tsx` | Provider global |
| `src/hooks/useFocusMode.ts` | Hook de acesso |
| `src/pages/ModoFoco.tsx` | Pagina principal |
| `src/components/focus/DomainListEditor.tsx` | Editor de listas |
| `src/components/focus/FocusStatusBar.tsx` | Barra de status |
| `src/components/focus/FocusDurationSelector.tsx` | Seletor de duracao |
| `src/components/AppSidebar.tsx` | Adicionar link |
| `src/App.tsx` | Adicionar provider e rota |
| `src/hooks/useChat.ts` | Handler focus_mode |
| `supabase/functions/chat-nomos/index.ts` | Comandos de foco |

## Fluxo de Dados

```text
Usuario inicia sessao
        |
        v
FocusModeContext.startSession(durationMin)
        |
        v
localStorage.setItem('nomos_focus_state', {...})
        |
        v
window.postMessage({ source: 'NOMOS', type: 'NOMOS_FOCUS_START', payload })
        |
        v
Timer inicia countdown (useEffect com setInterval)
        |
        v
FocusStatusBar exibe tempo restante
        |
        v
[Ao encerrar ou tempo acabar]
        |
        v
window.postMessage({ type: 'NOMOS_FOCUS_STOP', ... })
        |
        v
Toast: "Sessao concluida. Boa." ou "Tudo bem ajustar..."
```

## UI: Layout da Pagina Modo Foco

```text
+----------------------------------------------------------+
|  MODO FOCO                                               |
+----------------------------------------------------------+
|                                                          |
|  +--------------------------------------------------+    |
|  |  [Toggle OFF/ON]                                 |    |
|  |                                                  |    |
|  |  Estado: Modo Foco desligado                     |    |
|  |  OU                                              |    |
|  |  Estado: Modo Foco ativo - termina as 15:30      |    |
|  |  Tempo restante: 42:15                           |    |
|  +--------------------------------------------------+    |
|                                                          |
|  DURACAO DA SESSAO                                       |
|  +--------+ +--------+ +--------+ +------------+         |
|  | 25 min | | 50 min | | 90 min | | Personaliz |         |
|  +--------+ +--------+ +--------+ +------------+         |
|                                                          |
|  +--------------------------------------------------+    |
|  | SITES PARA BLOQUEAR                      [Editar]|    |
|  | instagram.com  [x]                               |    |
|  | tiktok.com     [x]                               |    |
|  | youtube.com    [x]                               |    |
|  | + Adicionar site...                              |    |
|  +--------------------------------------------------+    |
|                                                          |
|  +--------------------------------------------------+    |
|  | EXCECOES PERMITIDAS                      [Editar]|    |
|  | docs.google.com  [x]                             |    |
|  | + Adicionar excecao...                           |    |
|  +--------------------------------------------------+    |
|                                                          |
|  +--------------------------------------------------+    |
|  |        [ INICIAR SESSAO DE FOCO ]                |    |
|  +--------------------------------------------------+    |
|                                                          |
|  +--------------------------------------------------+    |
|  | ! Aviso: Bloqueio total do navegador sera        |    |
|  |   habilitado com uma extensao. Por enquanto,     |    |
|  |   a NOMOS te ajuda com o ritual, o timer e       |    |
|  |   lembretes - sem monitorar sua navegacao.       |    |
|  +--------------------------------------------------+    |
|                                                          |
+----------------------------------------------------------+
```

## Linguagem Anti-Culpa

- Botao principal: "Iniciar sessao de foco" (nao "Bloquear sites")
- Estado ativo: "Voce escolheu foco por X min"
- Encerrar antes: "Tudo bem ajustar. Quer reiniciar com uma sessao menor?"
- Concluido: "Sessao concluida. Boa."
- Lembrete suave: "Sessao ativa ate HH:MM" (sem "voce nao pode")

## Eventos para Extensao Chrome

```typescript
// Ao iniciar
window.postMessage({
  source: 'NOMOS',
  type: 'NOMOS_FOCUS_START',
  payload: {
    active: true,
    until: timestamp,
    blocklist: ['instagram.com', ...],
    allowlist: ['docs.google.com', ...],
  }
}, '*');

// Ao parar
window.postMessage({
  source: 'NOMOS',
  type: 'NOMOS_FOCUS_STOP',
  payload: { reason: 'completed' | 'ended_early' }
}, '*');

// Ao atualizar listas
window.postMessage({
  source: 'NOMOS',
  type: 'NOMOS_FOCUS_UPDATE',
  payload: { /* estado atual */ }
}, '*');
```

## Detalhes de UX

1. **1-click start**: Se blocklist ja existir, iniciar com ultima duracao usada
2. **Defaults sugeridos**: Se blocklist vazio, perguntar "Quer adicionar Instagram, TikTok e YouTube?"
3. **Horario local**: Mostrar "termina as HH:MM" no fuso do usuario
4. **Validacao de dominio**: Limpar URL (remover http://, www., paths)
5. **Aviso de saida**: beforeunload com lembrete suave (sem bloquear)

## Integracao com Sidebar

Adicionar item no menu principal:
- Icone: `Focus` ou `Shield` do lucide-react
- Titulo: "Modo Foco"
- Indicador: badge quando sessao ativa

## Comandos de Chat

Exemplos que o chat deve reconhecer:
- "ativar foco 50 min" -> inicia sessao de 50 minutos
- "ativar modo foco" -> pergunta duracao
- "desligar foco" -> encerra sessao
- "pausar foco" -> nao implementado (so encerrar ou completar)

## Secao Tecnica

### Persistencia (localStorage)

Chave: `nomos_focus_state`

```typescript
const FOCUS_STORAGE_KEY = 'nomos_focus_state';

// Salvar
const save = (state: FocusState) => {
  localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(state));
};

// Carregar e restaurar
const load = (): FocusState => {
  const saved = localStorage.getItem(FOCUS_STORAGE_KEY);
  if (!saved) return DEFAULT_FOCUS_STATE;
  
  const state = JSON.parse(saved);
  
  // Verificar se sessao expirou
  if (state.active && state.until) {
    if (Date.now() >= state.until) {
      // Sessao expirou enquanto fora
      return {
        ...state,
        active: false,
        lastEndReason: 'completed',
      };
    }
  }
  
  return state;
};
```

### Timer Hook

```typescript
const useFocusTimer = () => {
  const { state, endSession } = useFocusMode();
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!state.active || !state.until) return;

    const interval = setInterval(() => {
      const remaining = state.until - Date.now();
      if (remaining <= 0) {
        endSession('completed');
        clearInterval(interval);
      } else {
        setRemainingMs(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.active, state.until]);

  return {
    remainingMs,
    remainingFormatted: formatTime(remainingMs),
    endTimeFormatted: state.until 
      ? new Date(state.until).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : null,
  };
};
```

### Validacao de Dominio

```typescript
const parseDomain = (input: string): string | null => {
  try {
    // Adiciona protocolo se nao tiver
    const url = input.includes('://') ? input : `https://${input}`;
    const parsed = new URL(url);
    // Retorna hostname limpo (sem www.)
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    // Tenta usar como hostname direto
    const cleaned = input.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    return cleaned || null;
  }
};
```

## Ordem de Implementacao

1. Criar tipos (`focusMode.ts`)
2. Criar contexto (`FocusModeContext.tsx`)
3. Criar hook (`useFocusMode.ts`)
4. Criar componentes UI (DomainListEditor, FocusDurationSelector)
5. Criar pagina principal (`ModoFoco.tsx`)
6. Criar barra de status (`FocusStatusBar.tsx`)
7. Integrar no App.tsx (provider + rota)
8. Adicionar ao sidebar
9. Integrar com chat (useChat.ts + edge function)
10. Testar fluxo completo

## Estimativa

- Tipos e contexto: 1 arquivo cada
- Componentes UI: 4 arquivos
- Pagina: 1 arquivo
- Integracoes: 3 modificacoes
- Total: ~9 arquivos novos/modificados
