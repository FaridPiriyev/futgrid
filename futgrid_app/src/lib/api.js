const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3000/v1" : "https://api.futgrid.az/v1");

const GUEST_KEY = "futgrid:guest";
const PENDING_KEY = "futgrid:pending-results";
const LANG_KEY = "fg-lang";

export class ApiError extends Error {
  constructor(status, body) {
    const error = body?.error ?? {};
    super(error.message || "REQUEST_FAILED");
    this.name = "ApiError";
    this.status = status;
    this.code = error.code || "REQUEST_FAILED";
    this.details = error.details;
    this.body = body;
  }
}

function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getGuestId() {
  try {
    let guest = localStorage.getItem(GUEST_KEY);
    if (!guest) {
      guest = uuid();
      localStorage.setItem(GUEST_KEY, guest);
    }
    return guest;
  } catch {
    return uuid();
  }
}

function headersFor(extra = {}) {
  let lang = "az";
  try {
    lang = localStorage.getItem(LANG_KEY) || "az";
  } catch {}
  return {
    "Content-Type": "application/json",
    "Accept-Language": lang,
    "X-Guest-Id": getGuestId(),
    ...extra,
  };
}

async function rawRequest(path, options = {}) {
  const { timeoutMs = 8000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      credentials: "include",
      signal: controller.signal,
      headers: headersFor(fetchOptions.headers),
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function parse(response) {
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) throw new ApiError(response.status, body);
  return body;
}

async function refreshOnce() {
  const response = await rawRequest("/auth/refresh", { method: "POST", body: "{}" });
  if (!response.ok) return false;
  await response.text();
  return true;
}

export async function apiRequest(path, options = {}, retry = true) {
  let response = await rawRequest(path, options);
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    const refreshed = await refreshOnce().catch(() => false);
    if (refreshed) response = await rawRequest(path, options);
  }
  return parse(response);
}

export const api = {
  get: (path) => apiRequest(path, { method: "GET" }),
  post: (path, body) =>
    apiRequest(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: (path, body) =>
    apiRequest(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: (path, body) => apiRequest(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path) => apiRequest(path, { method: "DELETE" }),
};

export function queuePendingResult(payload) {
  try {
    const list = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
    list.push({ ...payload, queuedAt: Date.now() });
    localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-50)));
  } catch {}
}

export async function retryPendingResults() {
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
  } catch {
    return;
  }
  if (!list.length) return;
  const remaining = [];
  for (const item of list) {
    try {
      await api.post(`/sessions/${item.sessionId}/finish`, { answers: item.answers });
    } catch (error) {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) continue;
      remaining.push(item);
    }
  }
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
  } catch {}
}

if (typeof window !== "undefined") {
  getGuestId();
  window.addEventListener("online", () => void retryPendingResults());
  setTimeout(() => void retryPendingResults(), 2500);
}
