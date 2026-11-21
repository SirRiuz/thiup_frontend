/**
 * Tests for the notification API wrappers, mocking global.fetch — same
 * conventions as client.test.js (direct mode forced so the URL is
 * inspectable).
 */
jest.mock("./transport", () => ({
  ensureTransportMode: jest.fn(() => Promise.resolve()),
}));
jest.mock("./transportMode", () => ({
  shouldUseGateway: jest.fn(() => false),
  getMode: jest.fn(() => ({ gateway: false, resolved: true })),
  setMode: jest.fn(),
}));

import {
  fetchNotifications,
  fetchNotificationsPage,
  fetchUnreadCount,
  markNotificationsRead,
  dismissNotification,
} from "./notificationApi";

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
    return Promise.resolve(
      jsonResponse(200, { count: 0, next: null, previous: null, results: [] })
    );
  });
});

test("fetchNotifications hits GET /notifications/", async () => {
  await fetchNotifications();
  const call = global.fetch.mock.calls.find((c) =>
    String(c[0]).includes("/notifications/")
  );
  expect(call).toBeDefined();
  expect(call[1].method || "GET").toBe("GET");
});

test("fetchNotificationsPage follows the backend's own next-page URL (pagination by link, not page-number bookkeeping)", async () => {
  const nextUrl = "http://api.test/notifications/?page=2";
  await fetchNotificationsPage(nextUrl);
  // apiFetch rebuilds the request against its own BASE_URL (dispatch.js's
  // job), so only the path+query survive intact — that's the part that
  // actually encodes "which page".
  const call = global.fetch.mock.calls.find((c) =>
    String(c[0]).includes("/notifications/?page=2")
  );
  expect(call).toBeDefined();
});

test("fetchUnreadCount hits GET /notifications/unread-count/", async () => {
  global.fetch = jest.fn((url) => {
    if (String(url).includes("/ticket/")) {
      return Promise.resolve(jsonResponse(200, { ticket: "tok" }));
    }
    return Promise.resolve(jsonResponse(200, { unread_count: 3 }));
  });
  const data = await fetchUnreadCount();
  expect(data.unread_count).toBe(3);
  const call = global.fetch.mock.calls.find((c) =>
    String(c[0]).includes("/notifications/unread-count/")
  );
  expect(call).toBeDefined();
});

test("markNotificationsRead POSTs to /notifications/mark-read/", async () => {
  global.fetch = jest.fn((url) => {
    if (String(url).includes("/ticket/")) {
      return Promise.resolve(jsonResponse(200, { ticket: "tok" }));
    }
    return Promise.resolve(jsonResponse(200, { status: "ok" }));
  });
  await markNotificationsRead();
  const call = global.fetch.mock.calls.find((c) =>
    String(c[0]).includes("/notifications/mark-read/")
  );
  expect(call).toBeDefined();
  expect(call[1].method).toBe("POST");
});

test("dismissNotification POSTs the thread_uid + verb to /notifications/dismiss/", async () => {
  global.fetch = jest.fn((url) => {
    if (String(url).includes("/ticket/")) {
      return Promise.resolve(jsonResponse(200, { ticket: "tok" }));
    }
    return Promise.resolve(jsonResponse(200, { status: "ok", deleted: 1 }));
  });
  await dismissNotification({ threadUid: "abc123456789", verb: "reaction" });
  const call = global.fetch.mock.calls.find((c) =>
    String(c[0]).includes("/notifications/dismiss/")
  );
  expect(call).toBeDefined();
  expect(call[1].method).toBe("POST");
  expect(JSON.parse(call[1].body)).toEqual({
    thread_uid: "abc123456789",
    verb: "reaction",
  });
});
