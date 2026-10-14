/**
 * Interruptores de funcionalidades da plataforma.
 *
 * `false` = desativada temporariamente: some da barra lateral e a rota
 * redireciona para a página inicial. O código e os dados continuam
 * intactos — para reativar, basta trocar para `true`.
 */
export const FEATURES: Record<"resumos" | "caderno" | "ferramentas", boolean> = {
  /** Aba "Resumos" (/resumos) */
  resumos: false,
  /** Aba "Caderno" (/caderno, /caderno/:id) */
  caderno: false,
  /** Seção "Ferramentas" da barra lateral (ferramentas externas do usuário) */
  ferramentas: false,
};
