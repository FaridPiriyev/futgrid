import { useEffect, useState } from "react";
import { api } from "./api";
import { CATALOG_GAME_ID } from "./games/names";

let last = null;
let pending = null;

function fetchLive() {
  if (last && Date.now() - last.at < 25_000) return Promise.resolve(last.data);
  pending ??= api
    .get("/stats/live")
    .then((data) => {
      last = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** Live "N playing now" numbers, refreshed every 30 seconds while the page is visible. */
export function useLive() {
  const [live, setLive] = useState(last?.data ?? null);
  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      fetchLive()
        .then((data) => alive && setLive(data))
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return live;
}

export const playingNow = (live, catalogKey) => live?.games?.[CATALOG_GAME_ID[catalogKey]] ?? 0;
