/**
 * Construye el `content` DraftJS que el backend espera, a partir de texto plano.
 *
 * DraftJS representa cada parrafo como un bloque SEPARADO, asi que dividimos el
 * texto por \n: un bloque por linea preserva los saltos del usuario. Compartido
 * por la creacion de hilos (FeedContext) y de comentarios (useThread) — antes
 * estaba duplicado en ambos.
 */
export function buildDraftJsContent(text) {
  const lines = (text || "").split("\n");
  return {
    blocks: lines.map((line, i) => ({
      key: `thiup_block_${i}`,
      text: line,
      type: "unstyled",
      depth: 0,
      inlineStyleRanges: [],
      entityRanges: [],
      data: {},
    })),
    entityMap: {},
  };
}
