import { useEffect, useState } from "react";
import { api } from "./api";

// Small in-memory cache so the match header and the profile modal don't refetch on every render.
const cache = new Map();
const TTL_MS = 60_000;

export function fetchProfile(username, { fresh = false } = {}) {
  const key = String(username).toLowerCase();
  const hit = cache.get(key);
  if (!fresh && hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise = api.get(`/players/${encodeURIComponent(username)}`).catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, { at: Date.now(), promise });
  return promise;
}

/** Public profile for a registered player; `version` changes force a refresh (e.g. after a rated match). */
export function useProfile(username, version = 0) {
  const [state, setState] = useState({ username: null, profile: null });
  useEffect(() => {
    if (!username) return undefined;
    let alive = true;
    fetchProfile(username, { fresh: version > 0 })
      .then((profile) => alive && setState({ username, profile }))
      .catch(() => alive && setState({ username, profile: null }));
    return () => {
      alive = false;
    };
  }, [username, version]);
  return state.username === username ? state.profile : null;
}
