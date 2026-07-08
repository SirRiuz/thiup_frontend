import { render } from "@testing-library/react";
import ReactionEmoji, { reactionNameFromEmoji } from "./ReactionEmoji";

const NAMES = ["love", "laugh", "wow", "sad", "angry", "applause"];

test("renders an svg for every reaction name", () => {
  NAMES.forEach((name) => {
    const { container, unmount } = render(<ReactionEmoji name={name} size={26} animated />);
    expect(container.querySelector("svg")).not.toBeNull();
    unmount();
  });
});

test("maps legacy emoji chars to names", () => {
  expect(reactionNameFromEmoji("❤️")).toBe("love");
  expect(reactionNameFromEmoji("😂")).toBe("laugh");
  expect(reactionNameFromEmoji("👏")).toBe("applause");
});

test("falls back to the raw char for unknown reactions", () => {
  const { container } = render(<ReactionEmoji emoji="🔥" size={20} />);
  expect(container.textContent).toBe("🔥");
});
