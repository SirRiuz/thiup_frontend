/* eslint-disable testing-library/no-node-access --
   The ring is pure SVG geometry: its drained state lives in stroke-dashoffset,
   which no semantic query can reach. */
import { render, screen, act } from "@testing-library/react";
import "../i18n";
import RateLimitNotice from "./RateLimitNotice";
import { getRetryAfterSeconds, isRateLimitError } from "../utils/rateLimit";

const throttled = (extra) =>
  Object.assign(new Error("throttled"), { status: 429 }, extra);

test("counts the backend wait down and reports the expiry", () => {
  jest.useFakeTimers();
  const onExpire = jest.fn();
  render(
    <RateLimitNotice
      variant="reply"
      error={throttled({ retryAfter: 3 })}
      onExpire={onExpire}
    />
  );

  expect(screen.getByText("You can reply again in 3 s")).toBeTruthy();
  act(() => jest.advanceTimersByTime(2000));
  expect(screen.getByText("You can reply again in 1 s")).toBeTruthy();
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByText("You can reply again now")).toBeTruthy();
  expect(onExpire).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1600));
  expect(onExpire).toHaveBeenCalled();
  jest.useRealTimers();
});

// The reply notice unmounts and remounts every time the composer collapses or
// expands while the same 429 stands — both the seconds AND the ring must resume.
test("resumes the countdown and the ring after a remount", () => {
  jest.useFakeTimers();
  const error = throttled({ retryAfter: 20 });
  const ringOffset = () =>
    Number(
      screen.getByRole("status").querySelectorAll("circle")[1]
        .getAttribute("stroke-dashoffset")
    );

  const view = render(<RateLimitNotice variant="reply" error={error} />);
  expect(ringOffset()).toBe(0); // full ring at the start
  act(() => jest.advanceTimersByTime(15000));
  expect(screen.getByText("You can reply again in 5 s")).toBeTruthy();
  const drained = ringOffset();
  expect(drained).toBeGreaterThan(0);
  view.unmount();

  render(<RateLimitNotice variant="reply" error={error} />);
  expect(screen.getByText("You can reply again in 5 s")).toBeTruthy();
  expect(ringOffset()).toBeCloseTo(drained, 5);
  jest.useRealTimers();
});

test("drops the countdown when the backend didn't say how long", () => {
  render(<RateLimitNotice variant="post" error={throttled({})} />);
  expect(screen.getByText("Wait a few seconds and try again")).toBeTruthy();
  const notice = screen.getByRole("status");
  expect(notice.querySelector("circle")).toBeNull();
});

test("reads the wait from the header, the payload or the throttle sentence", () => {
  expect(getRetryAfterSeconds(throttled({ retryAfter: 12 }))).toBe(12);
  expect(getRetryAfterSeconds(throttled({ payload: { retry_after: "7" } }))).toBe(
    7
  );
  expect(
    getRetryAfterSeconds(
      throttled({ payload: { detail: "Expected available in 27 seconds." } })
    )
  ).toBe(27);
  expect(
    getRetryAfterSeconds(throttled({ payload: { detail: "slow down" } }))
  ).toBeNull();
  expect(isRateLimitError(throttled({}))).toBe(true);
  expect(isRateLimitError(Object.assign(new Error("x"), { status: 500 }))).toBe(
    false
  );
});
