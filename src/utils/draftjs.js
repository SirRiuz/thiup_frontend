/**
 * Builds the DraftJS `content` the backend expects, from plain text.
 *
 * DraftJS represents each paragraph as a SEPARATE block, so we split the
 * text by \n: one block per line preserves the user's line breaks. Shared
 * by thread creation (FeedContext) and comment creation (useThread) — it was
 * previously duplicated in both.
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
