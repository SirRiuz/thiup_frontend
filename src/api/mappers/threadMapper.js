/**
 * Mapea la respuesta de GET /threads/<id>/responses/ al shape que consumen
 * Post.js y sus componentes (PostReply, PostReactionPill, PostReplyMedia).
 *
 * Reutiliza mapBackendPostToFrontend de postMapper.js para todos los campos
 * comunes de un post — NO duplica esa lógica. Solo añade lo propio de una
 * respuesta dentro de un thread: media + el contexto de parent (parentId /
 * parentMaskId) que la UI usa para indentar sub-replies y mostrar "re: <mask>".
 *
 * Backend shape de una respuesta (igual que un thread, + anidamiento):
 *   { uid, text, content, create_at, mask, reactions, responses_count,
 *     media, is_op, sub, parent, responses: [ ...sub-replies ] }
 */
import { mapBackendPostToFrontend } from "./postMapper";

/**
 * Reduce los media del backend al shape mínimo que usa PostReplyMedia
 * ({ id, type }). El componente solo lee length + type (rendea placeholders),
 * así que no necesitamos las URLs reales todavía.
 */
function mapMedia(media) {
  if (!Array.isArray(media) || media.length === 0) return null;
  return media.map((m, i) => ({
    id: m.uid || m.id || `media-${i}`,
    type: m.type === "video" || m.is_video ? "video" : "image",
  }));
}

/**
 * Mapea una respuesta (reply o sub-reply) al shape de PostReply.
 *
 * @param {object} backendReply
 * @param {{ parentId?: string|null, parentMaskId?: string|null }} [ctx]
 *        Contexto de anidamiento. Vacío para un reply de primer nivel; con
 *        parentId/parentMaskId para un sub-reply (lo indenta y muestra "re:").
 */
export function mapBackendReplyToFrontend(backendReply, ctx = {}) {
  return {
    ...mapBackendPostToFrontend(backendReply),
    media: mapMedia(backendReply.media),
    parentId: ctx.parentId ?? null,
    parentMaskId: ctx.parentMaskId ?? null,
  };
}

/**
 * Aplana un reply + sus `responses` anidados a una lista de 2 niveles, igual
 * que la versión legacy (flattenSubReplies en src/screens/Thread.js): el reply
 * de primer nivel seguido de todos sus descendientes, cada uno etiquetado con
 * el parent inmediato. No se rendea nivel 3+ visualmente (todos los hijos se
 * muestran como un único nivel de sub-reply indentado).
 */
function flattenReply(backendReply) {
  const top = mapBackendReplyToFrontend(backendReply);
  const subs = [];
  const walk = (node, parentMapped) => {
    (node.responses || []).forEach((child) => {
      if (!child) return;
      const childMapped = mapBackendReplyToFrontend(child, {
        parentId: parentMapped.id,
        parentMaskId: parentMapped.mask?.id || null,
      });
      subs.push(childMapped);
      walk(child, childMapped);
    });
  };
  walk(backendReply, top);
  return [top, ...subs];
}

/**
 * Convierte la página de `results` (cada item con responses anidados) en una
 * lista plana lista para replies.map(...) en Post.js.
 */
export function mapBackendRepliesToFrontend(results) {
  return (results || []).flatMap(flattenReply);
}

/**
 * Mapea la respuesta completa de GET /threads/<id>/responses/.
 *
 * @param {{ head: object, results: object[], next: string|null, count: number }} data
 * @returns {{ thread: object|null, replies: object[], next: string|null, count: number }}
 */
export function mapBackendThreadToFrontend(data) {
  const head = data.head ? mapBackendPostToFrontend(data.head) : null;
  return {
    thread: head
      ? { ...head, replyCount: data.count ?? head.repliesCount ?? 0 }
      : null,
    replies: mapBackendRepliesToFrontend(data.results),
    next: data.next || null,
    count: data.count ?? 0,
  };
}
