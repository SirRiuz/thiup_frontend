import { mapBackendThreadToFrontend } from "./threadMapper";

// Minimal backend card — only the fields the mapper reads.
const backendPost = (uid, text) => ({
  uid,
  text,
  create_at: "1h",
  mask: { hash: `${uid}aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`.slice(0, 40) },
  reactions: [],
  responses_count: 0,
  media: [],
});

describe("mapBackendThreadToFrontend", () => {
  it("maps the ancestor chain (comment permalink) preserving root-first order", () => {
    const data = {
      head: backendPost("cccccc", "the focused sub-comment"),
      parents: [
        backendPost("aaaaaa", "the root thread"),
        backendPost("bbbbbb", "the parent comment"),
      ],
      results: [],
      next: null,
      count: 0,
    };

    const { thread } = mapBackendThreadToFrontend(data);
    expect(thread.id).toBe("cccccc");
    expect(thread.ancestors.map((a) => a.id)).toEqual(["aaaaaa", "bbbbbb"]);
    // Ancestors are full cards (same shape as the head/feed post).
    expect(thread.ancestors[0].text).toBe("the root thread");
    expect(thread.ancestors[0].mask.id).toHaveLength(6);
  });

  it("defaults to an empty chain when the backend sends no parents (root thread / legacy)", () => {
    const data = { head: backendPost("aaaaaa", "root"), results: [], next: null, count: 3 };
    const { thread } = mapBackendThreadToFrontend(data);
    expect(thread.ancestors).toEqual([]);
    expect(thread.replyCount).toBe(3);
  });
});
