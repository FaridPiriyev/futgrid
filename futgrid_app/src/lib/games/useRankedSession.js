import { useCallback, useEffect, useRef, useState } from "react";
import { api, queuePendingResult } from "../api";
import { seeded } from "../random";

export function useRankedSession({ game, mode = "ranked", difficulty = "normal", settings = {} }) {
  const sessionRef = useRef(null);
  const startedAtRef = useRef(0);
  const requestIdRef = useRef(0);
  const settingsRef = useRef(settings);
  const [session, setSession] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const start = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setBusy(true);
    try {
      const created = await api.post("/sessions", {
        game,
        mode,
        difficulty,
        settings: settingsRef.current,
      });
      if (requestId !== requestIdRef.current) return null;
      sessionRef.current = created;
      startedAtRef.current = Date.now();
      setSession(created);
      return created;
    } catch {
      if (requestId === requestIdRef.current) {
        sessionRef.current = null;
        setSession(null);
      }
      return null;
    } finally {
      if (requestId === requestIdRef.current) setBusy(false);
    }
  }, [game, mode, difficulty]);

  const cancel = useCallback(() => {
    requestIdRef.current++;
    sessionRef.current = null;
    setSession(null);
    setBusy(false);
  }, []);

  const finish = useCallback(async (answers, durationMs) => {
    const current = sessionRef.current;
    if (!current) return null;
    const payload = {
      answers,
      durationMs: durationMs ?? Math.max(0, Date.now() - startedAtRef.current),
    };
    try {
      return await api.post(`/sessions/${current.sessionId}/finish`, payload);
    } catch (error) {
      if (!error?.status || error.status >= 500 || error.status === 429) {
        queuePendingResult({ sessionId: current.sessionId, answers: payload.answers });
      }
      return null;
    } finally {
      sessionRef.current = null;
      setSession(null);
    }
  }, []);

  const random = session ? seeded(session.seed) : null;

  return { start, finish, cancel, session, random, busy, active: Boolean(session) };
}

export function useRankedGame({ game, difficulty = "normal", settings = {} }) {
  const session = useRankedSession({ game, difficulty, settings });
  const answersRef = useRef([]);

  const begin = useCallback(async () => {
    answersRef.current = [];
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), 1500);
    });
    const started = await Promise.race([session.start(), timeout]);
    clearTimeout(timer);
    if (!started) {
      session.cancel();
      return null;
    }
    return seeded(started.seed);
  }, [session.start, session.cancel]);

  const record = useCallback((answer) => {
    answersRef.current = [...answersRef.current, answer];
  }, []);

  const complete = useCallback(async () => {
    const answers = answersRef.current;
    answersRef.current = [];
    return session.finish(answers);
  }, [session.finish]);

  return { begin, record, complete, session: session.session, busy: session.busy };
}

export function sessionSeed(session) {
  return session?.seed ?? null;
}
