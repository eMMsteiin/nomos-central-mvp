
# Plano: Mostrar Tempo de Revisao nos Botoes de Dificuldade

## Resumo

Adicionar preview do tempo ate a proxima revisao em cada botao de dificuldade durante as sessoes de estudo. Igual ao Anki Desktop, onde cada botao mostra quanto tempo falta ate o card aparecer novamente (ex: "1m", "10m", "1d", "4d").

## Exemplo Visual

```text
Antes:                          Depois:
+----------+                    +----------+
|  De novo |                    |  < 1m    |
+----------+                    | De novo  |
                                +----------+

+----------+                    +----------+
|  Dificil |                    |   10m    |
+----------+                    | Dificil  |
                                +----------+

+----------+                    +----------+
|    Bom   |                    |    1d    |
+----------+                    |   Bom    |
                                +----------+

+----------+                    +----------+
|   Facil  |                    |    4d    |
+----------+                    |  Facil   |
                                +----------+
```

## Implementacao

### 1. Modificar StudySession.tsx

**Adicionar import da funcao de preview:**
```typescript
import { getNextIntervalPreview } from '@/utils/ankiAlgorithm';
```

**Criar estado para armazenar os previews:**
```typescript
const [intervalPreviews, setIntervalPreviews] = useState<Record<FlashcardRating, string>>({
  again: '',
  hard: '',
  good: '',
  easy: '',
});
```

**Calcular previews quando o card muda ou e virado:**
Usar `useEffect` para calcular os intervalos projetados quando:
- O card atual muda
- O usuario vira o card para ver a resposta

```typescript
useEffect(() => {
  if (currentCard && isFlipped && deck.config) {
    const previews = getNextIntervalPreview(currentCard, deck.config);
    setIntervalPreviews(previews);
  }
}, [currentCard, isFlipped, deck.config]);
```

**Atualizar layout dos botoes de rating:**
Mostrar o tempo previsto acima do label do botao:

```tsx
<Button key={rating} ...>
  <span className="text-xs font-medium">{intervalPreviews[rating]}</span>
  {icon}
  <span className="text-xs">{label}</span>
</Button>
```

### 2. Ajustar o estilo dos botoes

- Aumentar altura dos botoes para acomodar o novo texto
- Reorganizar o layout para: tempo > icone > label
- Garantir legibilidade com fonte menor para o tempo

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/flashcards/StudySession.tsx` | Adicionar calculo e exibicao do interval preview nos botoes |

## Secao Tecnica

### Funcao getNextIntervalPreview (ja existente)

A funcao `getNextIntervalPreview` em `ankiAlgorithm.ts` ja esta implementada e:
1. Recebe o card atual e a configuracao do deck
2. Simula a revisao para cada rating (again, hard, good, easy)
3. Calcula a diferenca entre o `due` resultante e agora
4. Formata usando `formatInterval()` que retorna strings como "1m", "10m", "1d", "4d", "1mo", "1.5y"

### Fluxo de Dados

```text
currentCard + deck.config
        |
        v
getNextIntervalPreview()
        |
        v
{ again: "1m", hard: "10m", good: "1d", easy: "4d" }
        |
        v
Renderizado nos botoes
```

### Consideracoes de Performance

- O calculo so e feito quando o usuario vira o card
- A funcao `scheduleCard` e chamada 4 vezes (uma para cada rating), mas e muito rapida
- Nao ha chamadas de banco de dados

## Resultado Esperado

- Usuario ve claramente quanto tempo falta ate o card aparecer novamente para cada opcao
- Comportamento identico ao Anki Desktop
- Ajuda o usuario a tomar decisoes mais informadas sobre sua classificacao
