import { render, fireEvent, screen } from "@testing-library/react";
import "../../i18n";
import PostReactionPicker from "./PostReactionPicker";

test("opens the popover with the 6 reaction options", () => {
  render(
    <PostReactionPicker variant="action" contextId="x" onSelect={() => {}} />
  );
  const trigger = screen.getByRole("button", { expanded: false });
  fireEvent.click(trigger);
  const options = screen.getAllByRole("menuitem");
  expect(options).toHaveLength(6);
  options.forEach((o) => {
    expect(o.querySelector("svg")).not.toBeNull();
  });
});

test("selecting an option calls onSelect with the reaction", () => {
  const onSelect = jest.fn();
  render(
    <PostReactionPicker variant="action" contextId="x" onSelect={onSelect} />
  );
  fireEvent.click(screen.getByRole("button", { expanded: false }));
  fireEvent.click(screen.getAllByRole("menuitem")[0]);
  expect(onSelect).toHaveBeenCalledWith(
    expect.objectContaining({ id: "love", label: "love" })
  );
});
