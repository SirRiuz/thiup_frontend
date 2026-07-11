import { render } from "@testing-library/react";
import "../../i18n";
import ReactionStack from "./ReactionStack";

// The regression this guards: the feed and the thread view ship the same
// reactions in different payload orders; with tied counts, a stable sort
// alone let the cluster's last bubble flip between screens. The tie-break
// is the canonical catalog order, so both orders must render identically.
const REACTIONS_A = [
  { name: "love", emoji: "❤️", count: 4 },
  { name: "angry", emoji: "😡", count: 2 },
  { name: "wow", emoji: "😮", count: 1 },
  { name: "applause", emoji: "👏", count: 1 },
  { name: "sad", emoji: "😢", count: 1 },
  { name: "laugh", emoji: "😂", count: 1 },
];
const REACTIONS_B = [...REACTIONS_A].reverse();

test("tied counts render the same cluster regardless of payload order", () => {
  const a = render(<ReactionStack reactions={REACTIONS_A} />);
  const b = render(<ReactionStack reactions={REACTIONS_B} />);
  // The summary (title) mirrors the bubble order — identical for both payloads.
  const titleA = a.container.firstChild.getAttribute("title");
  const titleB = b.container.firstChild.getAttribute("title");
  expect(titleA).toBe(titleB);
  // Top-3 cluster + the full total (4+2+1+1+1+1).
  expect(a.container.querySelectorAll("svg")).toHaveLength(3);
  expect(a.container.textContent).toContain("10");
});

test("summary lists counts in non-increasing order", () => {
  const { container } = render(<ReactionStack reactions={REACTIONS_B} />);
  const title = container.firstChild.getAttribute("title");
  const counts = title.split(" · ").map((part) => Number(part.match(/\d+$/)[0]));
  expect(counts).toEqual([4, 2, 1, 1, 1, 1]);
});
