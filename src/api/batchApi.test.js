/**
 * Tests for the batch engagement API wrapper — same mocking conventions as
 * client.test.js/notificationApi.test.js.
 */
jest.mock("./transport", () => ({
  ensureTransportMode: jest.fn(() => Promise.resolve()),
}));
jest.mock("./transportMode", () => ({
  shouldUseGateway: jest.fn(() => false),
  getMode: jest.fn(() => ({ gateway: false, resolved: true })),
  setMode: jest.fn(),
}));

import { sendEngagementBatch } from "./batchApi";

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: { get: () => "application/json" },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (String(url).includes("/ticket/")) {
      return Promise.resolve(jsonResponse(200, { ticket: "tok" }));
    }
    return Promise.resolve(jsonResponse(201, { status: "ok" }));
  });
});

test("sendEngagementBatch POSTs the events array to /batch/", async () => {
  const events = [
    { target_type: "thread", target_uid: "abc123", type: "qr", count: 2 },
  ];
  await sendEngagementBatch(events);

  const call = global.fetch.mock.calls.find((c) =>
    String(c[0]).includes("/batch/")
  );
  expect(call).toBeDefined();
  expect(call[1].method).toBe("POST");
  expect(JSON.parse(call[1].body)).toEqual({ events });
});

test("sendEngagementBatch forwards keepalive to the underlying fetch call", async () => {
  await sendEngagementBatch(
    [{ target_type: "mask", target_uid: "a1b2c3", type: "view", count: 1 }],
    { keepalive: true }
  );

  const call = global.fetch.mock.calls.find((c) =>
    String(c[0]).includes("/batch/")
  );
  expect(call[1].keepalive).toBe(true);
});
