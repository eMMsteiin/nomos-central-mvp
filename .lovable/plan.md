
# Plano: Corrigir Exibição do Tempo nos Botões de Dificuldade

## Problema Identificado

A função `formatInterval` não trata adequadamente intervalos curtos (menos de 1 minuto), resultando em todos os botões mostrando "1m" para cards novos ou em learning.

### Por que isso acontece:

Para um card **novo** com config padrão (`learningSteps: ['1', '10']`):
- **De novo**: 1 min → "1m"
- **Difícil**: 1 min × 1.2 = 1.2 min → arredonda para "1m"
- **Bom**: 1 min (primeiro step) → "1m"
- **Fácil**: 4 dias (easyInterval) → "4d" ✓

A função `formatInterval(ms)` converte para minutos e arredonda, então 1.2 min e 1 min resultam no mesmo "1m".

## Solução

### 1. Melhorar a Função formatInterval

Adicionar tratamento para:
- Intervalos menores que 1 minuto: exibir segundos ou "< 1m"
- Diferenciar entre 1m, 1.2m, 10m corretamente

```typescript
export function formatInterval(ms: number): string {
  if (ms <= 0) {
    return '< 1m';
  }
  
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `< 1m`;
  }
  
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  
  const days = Math.round(hours / 24);
  if (days < 30) {
    return `${days}d`;
  }
  
  const months = Math.round(days / 30);
  if (months < 12) {
    return `${months}mo`;
  }
  
  const years = (days / 365).toFixed(1);
  return `${years}y`;
}
```

### 2. Criar Versão Específica para Preview (Opcional)

Para maior precisão nos botões, criar uma função que mostra valores mais detalhados:

```typescript
export function formatIntervalForPreview(ms: number): string {
  if (ms <= 0) {
    return '< 1m';
  }
  
  const totalSeconds = Math.round(ms / 1000);
  
  // Menos de 60 segundos
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  
  // Menos de 60 minutos
  const totalMinutes = totalSeconds / 60;
  if (totalMinutes < 60) {
    // Mostrar com precisão se não for número inteiro
    if (totalMinutes < 10 && totalMinutes % 1 !== 0) {
      return `${totalMinutes.toFixed(1)}m`.replace('.0m', 'm');
    }
    return `${Math.round(totalMinutes)}m`;
  }
  
  // Menos de 24 horas
  const totalHours = totalMinutes / 60;
  if (totalHours < 24) {
    return `${Math.round(totalHours)}h`;
  }
  
  // Dias
  const totalDays = totalHours / 24;
  if (totalDays < 30) {
    return `${Math.round(totalDays)}d`;
  }
  
  // Meses
  const totalMonths = totalDays / 30;
  if (totalMonths < 12) {
    return `${Math.round(totalMonths)}mo`;
  }
  
  // Anos
  return `${(totalDays / 365).toFixed(1)}y`;
}
```

### 3. Atualizar getNextIntervalPreview

Usar a nova função no preview:

```typescript
export function getNextIntervalPreview(
  card: Flashcard,
  config: DeckConfig
): Record<FlashcardRating, string> {
  const ratings: FlashcardRating[] = ['again', 'hard', 'good', 'easy'];
  const result: Record<FlashcardRating, string> = {} as any;

  for (const rating of ratings) {
    const scheduled = scheduleCard(card, rating, config);
    const dueDate = new Date(scheduled.due);
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    result[rating] = formatIntervalForPreview(diffMs);
  }

  return result;
}
```

## Resultado Esperado

Para um card **novo**:
- **De novo**: "1m"
- **Difícil**: "1.2m" (ou "1m" se preferir arredondar)
- **Bom**: "10m" (avança para o próximo step!)
- **Fácil**: "4d"

Para um card em **review** (ex: interval=7 dias, ease=2.5):
- **De novo**: "10m" (entra em relearning)
- **Difícil**: "8d" (interval × hardMultiplier)
- **Bom**: "18d" (interval × ease)
- **Fácil**: "23d" (interval × ease × easyBonus)

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/utils/ankiAlgorithm.ts` | Adicionar `formatIntervalForPreview()` e atualizar `getNextIntervalPreview()` |

## Seção Técnica

### Correção Crítica Identificada

Olhando mais atentamente para `scheduleNewCard`, percebi que o problema pode também estar na lógica:

- **again**: usa step 0 (1 min)
- **hard**: usa step 0 × 1.2 (1.2 min)
- **good**: deveria avançar para step 1, MAS para card NEW, o código inicia no step 0

Na verdade, para um card **NEW** respondido com **good**, ele deveria ir para o estado **learning** step 0, não para step 1. Isso é correto conforme o Anki - o card precisa passar pelos learning steps.

A função `scheduleLearningCard` é que avança os steps. Então para NEW → good:
1. Entra em learning no step 0
2. Due = agora + step[0] = 1 min

Isso explica porque "De novo", "Difícil" e "Bom" mostram valores similares para cards novos.

### Diferenciação Real dos Botões para Cards New

No Anki Desktop, para um card NEW:
- **Again**: 1m (primeiro step)
- **Good**: 1m → 10m (primeiro step, depois segundo)
- **Easy**: 4d (gradua imediatamente)

O Anki mostra apenas o próximo intervalo imediato, então "1m" para Again/Good é correto. A diferença é que:
- Again: fica no step 0
- Good: avança para step 1

Para cards em estados mais avançados (learning step 1, review), as diferenças são maiores.

### Conclusão

O comportamento atual está **quase correto** conforme o Anki. A melhoria necessária é:

1. Mostrar "< 1m" para intervalos muito curtos
2. Garantir que learning cards no step 0 avancem corretamente com "Good"
3. Manter precisão nas exibições de minutos
