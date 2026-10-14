import minimalistaCss from "./minimalista.css?raw";
import softFuturismCss from "./soft-futurism.css?raw";

/**
 * Registro dos templates visuais da plataforma.
 *
 * Para criar um novo template:
 *  1. crie src/themes/<id>.css definindo as variáveis dentro de [data-theme="<id>"]
 *     (use minimalista.css como referência de todos os tokens);
 *  2. importe o CSS em src/main.tsx;
 *  3. registre-o aqui.
 */
export interface ThemeTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  traits: string[];
  /** Cores de amostra (valores CSS completos) mostradas na pré-visualização. */
  swatches: string[];
  /** Cor da barra do navegador/PWA (meta theme-color). */
  themeColor: string;
  /** Código-fonte do template, usado pelo botão "Copiar CSS". */
  css: string;
}

export const THEME_STORAGE_KEY = "nomos-theme";

/**
 * Template aplicado quando o usuário ainda não escolheu nenhum.
 * ATENÇÃO: o mesmo valor está repetido no script inline do index.html
 * (que aplica o tema antes do React carregar, evitando "piscada").
 */
export const DEFAULT_THEME_ID = "soft-futurism";

export const THEMES: ThemeTemplate[] = [
  {
    id: "minimalista",
    name: "Minimalista",
    tagline: "O design original da NOMOS",
    description:
      "Preto, branco e três tons de cinza. A interface desaparece enquanto você pensa.",
    traits: ["Monocromático", "Bordas retas", "Sem sombras", "Fonte do sistema"],
    swatches: ["hsl(0 0% 100%)", "hsl(0 0% 96%)", "hsl(0 0% 45%)", "hsl(0 0% 8%)"],
    themeColor: "#0A0A0A",
    css: minimalistaCss,
  },
  {
    id: "soft-futurism",
    name: "Soft Futurism",
    tagline: "Futuro amigável e sofisticado",
    description:
      "Gradientes suaves, cores bem definidas e formas arredondadas, sem elementos tecnológicos agressivos.",
    traits: ["Gradientes suaves", "Violeta + pastéis", "Cantos arredondados", "Plus Jakarta Sans"],
    swatches: ["hsl(255 100% 98.5%)", "hsl(262 90% 95%)", "hsl(252 85% 62%)", "hsl(20 100% 82%)"],
    themeColor: "#F8F6FF",
    css: softFuturismCss,
  },
];

export function getTheme(id: string | null | undefined): ThemeTemplate {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
}
