/**
 * engagementQueue registers its flush interval and visibilitychange
 * listener as a MODULE-LEVEL side effect on import (it must survive route
 * changes, see the file's own header comment) — so:
 *   1. Fake timers must be installed BEFORE the module is required (so its
 *      top-level setInterval is captured by them).
 *   2. The module is required exactly ONCE for the whole file (in
 *      beforeAll, not per-test): re-requiring it per test via
 *      jest.resetModules() would register a NEW document-level
 *      visibilitychange listener on every test without ever removing the
 *      previous ones (there's no unmount for a module-level side effect),
 *      leaking state across tests. Each test instead starts from a
 *      guaranteed-empty queue via an explicit flush() in beforeEach.
 */
jest.mock("../api/batchApi", () => ({
  sendEngagementBatch: jest.fn(() => Promise.resolve({ status: "ok" })),
}));

let engagementQueue;
let sendEngagementBatch;

function setDocumentHidden(hidden) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
}

beforeAll(() => {
  jest.useFakeTimers();
  // eslint-disable-next-line global-require
  engagementQueue = require("./engagementQueue");
  // eslint-disable-next-line global-require
  sendEngagementBatch = require("../api/batchApi").sendEngagementBatch;
});

beforeEach(() => {
  setDocumentHidden(false);
  // CRA's default jest config sets resetMocks:true — the mock's
  // implementation (not just its call history) is wiped before every
  // test, so it must be reinstated here, BEFORE the drain below (which
  // itself calls sendEngagementBatch if a previous test left the queue
  // non-empty).
  sendEngagementBatch.mockResolvedValue({ status: "ok" });
  // Drain any state left over from a previous test, then discard that
  // drain's own call from this test's assertions.
  engagementQueue.flush({ keepalive: false });
  sendEngagementBatch.mockClear();
});

afterAll(() => {
  jest.useRealTimers();
});

test("an empty queue never flushes on the interval tick", () => {
  jest.advanceTimersByTime(75000);
  expect(sendEngagementBatch).not.toHaveBeenCalled();
});

test("track() accumulates in memory only — no network call", () => {
  engagementQueue.track("thread", "abc123", "qr");
  expect(sendEngagementBatch).not.toHaveBeenCalled();
});

test("the interval tick flushes a non-empty queue with the summed payload, then clears it", () => {
  engagementQueue.track("thread", "abc123", "qr");
  engagementQueue.track("thread", "abc123", "qr");
  engagementQueue.track("mask", "a1b2c3", "view");

  jest.advanceTimersByTime(75000);

  expect(sendEngagementBatch).toHaveBeenCalledTimes(1);
  const [events, options] = sendEngagementBatch.mock.calls[0];
  expect(events).toEqual(
    expect.arrayContaining([
      { target_type: "thread", target_uid: "abc123", type: "qr", count: 2 },
      { target_type: "mask", target_uid: "a1b2c3", type: "view", count: 1 },
    ])
  );
  expect(options).toEqual({ keepalive: false });

  // Cleared: a second tick with nothing new tracked flushes nothing more.
  jest.advanceTimersByTime(75000);
  expect(sendEngagementBatch).toHaveBeenCalledTimes(1);
});

test("tab going hidden flushes immediately with keepalive:true", () => {
  engagementQueue.track("thread", "abc123", "download");

  setDocumentHidden(true);
  document.dispatchEvent(new Event("visibilitychange"));

  expect(sendEngagementBatch).toHaveBeenCalledTimes(1);
  const [, options] = sendEngagementBatch.mock.calls[0];
  expect(options).toEqual({ keepalive: true });
});

test("the tab going hidden with an empty queue does not flush", () => {
  setDocumentHidden(true);
  document.dispatchEvent(new Event("visibilitychange"));
  expect(sendEngagementBatch).not.toHaveBeenCalled();
});
