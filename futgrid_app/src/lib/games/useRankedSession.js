import { useCallback, useEffect, useRef, useState } from "react";
import { api, queuePendingResult } from "../api";
import { seeded } from "../random";
import { tr } from "../../i18n";
import { gameName } from "./names";

/** Tell the player when a finished game earned no points, instead of failing silently. */
function announce(result, game) {
  if (result?.rating && typeof window !== "undefined") {
    const { after, delta, overallAfter } = result.rating;
    const sign = delta > 0 ? "+" : "";
    window.dispatchEvent(
      new CustomEvent("fg:notice", {
        detail: tr("{game} reytinqi: {after} ({sign}{delta}) · Ümumi reytinq: {overall}", {
          game: gameName(game),
          after: Math.round(after),
          sign,
          delta: Math.round(delta),
          overall: Math.round(overallAfter),
        }),
      }),
    );
    return;
  }
  const text =
    result?.reason === "flagged"
      ? tr("Bu oyunun nəticəsi avtomatik yoxlamaya düşdü və xal verilmədi. Narahat olma, növbəti oyunlar adi qaydada sayılır.")
      : result?.reason === "daily_limit"
        ? tr("Bu oyun üçün bugünkü reytinq limiti doldu — xallar sabah yenidən sayılacaq.")
        : null;
  if (text && typeof window !== "undefined") window.dispatchEvent(new CustomEvent("fg:notice", { detail: text }));
}

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
      const result = await api.post(`/sessions/${current.sessionId}/finish`, payload);
      announce(result, game);
      return result;
    } catch (error) {
      if (!error?.status || error.status >= 500 || error.status === 429) {
        queuePendingResult({ sessionId: current.sessionId, answers: payload.answers });
      }
      return null;
    } finally {
      sessionRef.current = null;
      setSession(null);
    }
  }, [game]);

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
