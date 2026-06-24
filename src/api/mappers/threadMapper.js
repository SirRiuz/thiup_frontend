/**
 * Maps the response of GET /threads/<id>/responses/ to the shape consumed by
 * Post.js and its components (PostReply, PostReactionPill, ThreadMedia).
 *
 * Reuses mapBackendPostToFrontend from postMapper.js for all the common
 * fields of a post — does NOT duplicate that logic. It only adds what is specific to a
 * response inside a thread: media + the parent context (parentId /
 * parentMaskId) that the UI uses to indent sub-replies and show "re: <mask>".
 *
 * Backend shape of a response (same as a thread, + nesting):
 *   { uid, text, content, create_at, mask, reactions, responses_count,
 *     media, is_op, sub, parent, responses: [ ...sub-replies ] }
 */
import { mapBackendPostToFrontend } from "./postMapper";

/**
 * Maps a response (reply or sub-reply) to the PostReply shape. Media (real URLs
 * + sensitive flag) is already mapped by mapBackendPostToFrontend.
 *
 * @param {object} backendReply
 * @param {{ parentId?: string|null, parentMaskId?: string|null }} [ctx]
 *        Nesting context. Empty for a top-level reply; with
 *        parentId/parentMaskId for a sub-reply (indents it and shows "re:").
 */
export function mapBackendReplyToFrontend(backendReply, ctx = {}) {
  return {
    ...mapBackendPostToFrontend(backendReply),
    parentId: ctx.parentId ?? null,
    parentMaskId: ctx.parentMaskId ?? null,
  };
}

/**
 * Flattens a reply + its nested `responses` into a 2-level list, just like
 * the legacy version (flattenSubReplies in src/screens/Thread.js): the
 * top-level reply followed by all its descendants, each tagged with
 * the immediate parent. Level 3+ is not rendered visually (all children are
 * shown as a single indented sub-reply level).
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
 * Converts the `results` page (each item with nested responses) into a
 * flat list ready for replies.map(...) in Post.js.
 */
export function mapBackendRepliesToFrontend(results) {
  return (results || []).flatMap(flattenReply);
}

/**
 * Maps the complete response of GET /threads/<id>/responses/.
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
