import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api, getGuestId } from "../api";
import { useAuth } from "../auth";
import { tr } from "../../i18n";
import {
  activeDuels,
  forgetDuel,
  hasAutoMatch,
  hasDuelEntry,
  readStored,
  requestAutoMatch,
  socketBase,
  takeAutoMatch,
  writeStored,
} from "./duelStore";
import { play } from "../sound";
import { checkAchievements } from "../achievements";

export { activeDuels, forgetDuel, hasDuelEntry, requestAutoMatch, socketBase };

const ERRORS = {
  get ROOM_NOT_FOUND() {
    return tr("Bu kodla otaq tapılmadı. Kodu yoxla.");
  },
  get ROOM_FULL() {
    return tr("Otaq doludur və ya oyun artıq başlayıb.");
  },
  get ROOM_GAME_MISMATCH() {
    return tr("Bu kod başqa oyunun otağıdır.");
  },
  get NOT_YOUR_TURN() {
    return tr("Növbə səndə deyil.");
  },
  get WRONG_ANSWER() {
    return tr("Səhv cavab.");
  },
  get PLAYER_USED() {
    return tr("Bu futbolçu artıq istifadə olunub.");
  },
  get CELL_TAKEN() {
    return tr("Bu xana artıq doludur.");
  },
  get LOCKED() {
    return tr("Kilidlisən — bir neçə xana açılsın.");
  },
  get ALREADY_ASKED() {
    return tr("Bu sual artıq verilib.");
  },
  get ROUND_OVER() {
    return tr("Raund bitdi.");
  },
  get NOT_STARTED() {
    return tr("Raund hələ başlamayıb.");
  },
  get BID_TOO_LOW() {
    return tr("Təklif cari qiymətdən yüksək olmalıdır.");
  },
  get NOT_ENOUGH_MONEY() {
    return tr("Büdcən çatmır.");
  },
  get OPENER_FIRST() {
    return tr("Əvvəlcə lotu açan təklif verməlidir.");
  },
  get CANNOT_PASS() {
    return tr("İndi keçmək olmur.");
  },
  get CANNOT_BID() {
    return tr("İndi təklif vermək olmur.");
  },
  get LOT_CLOSED() {
    return tr("Bu lot artıq bağlanıb.");
  },
  get GAME_NOT_ACTIVE() {
    return tr("Oyun aktiv deyil.");
  },
  get RATE_LIMITED() {
    return tr("Çox tez-tez göndərirsən, bir az gözlə.");
  },
  get ROOM_BUSY() {
    return tr("Server məşğuldur, yenidən cəhd et.");
  },
  get UNAUTHENTICATED() {
    return tr("Serverə qoşulmaq üçün səhifəni yenilə.");
  },
  get GAME_NOT_AVAILABLE() {
    return tr("Bu oyun üçün onlayn axtarış hələ yoxdur.");
  },
  get NOT_FRIENDS() {
    return tr("Yalnız dostlarını çağıra bilərsən.");
  },
  get NOT_IN_ROOM() {
    return tr("Sən bu otaqda deyilsən.");
  },
  get ALREADY_STARTED() {
    return tr("Oyun artıq başlayıb.");
  },
  get NOT_ENOUGH_PLAYERS() {
    return tr("Oyun üçün iki oyunçu lazımdır.");
  },
};


export const duelErrorText = (code) => ERRORS[code] ?? tr("Xəta baş verdi ({code}).", { code: code || "?" });

export function useDuelRoom({ game, invitedCode = "" }) {
  const { user, loading } = useAuth();
  const socketRef = useRef(null);
  const roomRef = useRef(null);
  const codeRef = useRef(invitedCode || readStored(game));
  const offsetRef = useRef(0);
  const [connected, setConnected] = useState(false);
  const [room, setRoomState] = useState(null);
  const [error, setError] = useState("");
  const [seat, setSeat] = useState(null);
  const [joining, setJoining] = useState(Boolean(codeRef.current));
  const [rating, setRating] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [searching, setSearchingState] = useState(null);
  const searchingRef = useRef(null);
  const setSearching = useCallback((value) => {
    searchingRef.current = value;
    setSearchingState(value);
  }, []);

  const setRoom = useCallback(
    (state) => {
      if (!state) {
        roomRef.current = null;
        setRoomState(null);
        return;
      }
      if (typeof state.serverNow === "number") offsetRef.current = state.serverNow - Date.now();
      if (state.status !== "finished") setRating(null);
      roomRef.current = state;
      codeRef.current = state.code;
      writeStored(game, state.code, state.status);
      setRoomState(state);
    },
    [game],
  );

  const join = useCallback(
    (socket, code, { silent = false } = {}) =>
      new Promise((resolve) => {
        socket.timeout(8000).emit("room:join", { code, game }, (timeoutError, response) => {
          setJoining(false);
          if (timeoutError || response?.error) {
            const codeName = response?.error?.code;
            if (codeName === "ROOM_NOT_FOUND" || codeName === "ROOM_FULL" || codeName === "ROOM_GAME_MISMATCH") {
              codeRef.current = "";
              writeStored(game, "");
            }
            if (!silent) setError(duelErrorText(codeName ?? "ROOM_BUSY"));
            resolve(null);
            return;
          }
          setError("");
          if (response.youId) setSeat(response.youId);
          if (response.room) setRoom(response.room);
          resolve(response.room ?? null);
        });
      }),
    [game, setRoom],
  );

  const connect = useCallback(async () => {
    socketRef.current?.disconnect();
    setError("");
    // Access tokens live 15 minutes. Fetch a fresh one on every (re)connect so a
    // player who comes back after switching apps is not kicked as UNAUTHENTICATED.
    const authFor = async () => {
      if (!user) return { guestId: getGuestId() };
      try {
        const { token } = await api.get("/auth/socket-token");
        return token ? { token } : { guestId: getGuestId() };
      } catch {
        return { guestId: getGuestId() };
      }
    };
    let authRetries = 0;
    const socket = io(socketBase(), {
      auth: (cb) => {
        void authFor().then(cb);
      },
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 800,
      reconnectionDelayMax: 4000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      authRetries = 0;
      setConnected(true);
      if (searchingRef.current && !roomRef.current) {
        socket.emit("queue:join", { game }, (response) => {
          if (response?.error) setSearching(null);
        });
      }
      const code = roomRef.current?.code ?? codeRef.current;
      if (code) void join(socket, code, { silent: Boolean(roomRef.current) || !invitedCode });
      else setJoining(false);
    });
    socket.on("connect_error", () => {
      setConnected(false);
      setJoining(false);
    });
    socket.on("disconnect", (reason) => {
      setConnected(false);
      // The server drops sockets with a stale token; socket.io won't retry those
      // by itself, so try again (a fresh token is fetched in `auth`).
      if (reason === "io server disconnect" && authRetries < 3) {
        authRetries += 1;
        setTimeout(() => socket.connect(), 600 * authRetries);
      }
    });
    socket.on("room:state", setRoom);
    socket.on("game:state", setRoom);
    socket.on("game:result", setRoom);
    socket.on("match:found", (payload) => {
      if (!payload?.code) return;
      setSearching(null);
      if (payload.youId) setSeat(payload.youId);
      codeRef.current = payload.code;
      writeStored(game, payload.code);
      void join(socket, payload.code, { silent: true });
    });
    socket.on("room:reaction", (payload) => {
      if (!payload?.emoji) return;
      const id = `${payload.seat}-${payload.at}-${Math.random()}`;
      setReactions((list) => [...list.slice(-8), { ...payload, id }]);
      play("pop");
      setTimeout(() => setReactions((list) => list.filter((r) => r.id !== id)), 2600);
    });
    socket.on("duel:rating", (payload) => {
      if (!payload || payload.code !== roomRef.current?.code) return;
      setRating(payload);
      checkAchievements();
    });
    socket.on("error", (payload) => {
      const code = payload?.error?.code;
      if (code === "UNAUTHENTICATED") setError(duelErrorText(code));
    });
  }, [game, invitedCode, join, setRoom, setSearching, user]);

  useEffect(() => {
    if (loading) return;
    void connect();
    return () => {
      if (roomRef.current?.status === "finished") writeStored(game, "");
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect, game, loading]);

  // Phones freeze background tabs; reconnect immediately when the player comes back
  // instead of waiting for socket.io's backoff timer.
  useEffect(() => {
    const onVisible = () => {
      const socket = socketRef.current;
      if (document.visibilityState === "visible" && socket && !socket.connected) socket.connect();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, []);

  const emit = useCallback(
    (event, payload) =>
      new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve({ error: { code: "ROOM_BUSY" } });
          return;
        }
        socket.timeout(8000).emit(event, payload, (timeoutError, response) =>
          resolve(timeoutError ? { error: { code: "ROOM_BUSY" } } : response ?? { ok: true }),
        );
      }),
    [],
  );

  const createRoom = useCallback(async (settings = {}) => {
    setError("");
    const response = await emit("room:create", { game, settings });
    if (response?.error) {
      setError(duelErrorText(response.error.code));
      return null;
    }
    if (response.youId) setSeat(response.youId);
    setRoom(response.room);
    return response.room;
  }, [emit, game, setRoom]);

  const joinRoom = useCallback(
    async (code) => {
      const clean = String(code ?? "").replace(/\D/g, "").slice(0, 6);
      if (clean.length !== 6) {
        setError(tr("Otaq ID 6 rəqəm olmalıdır"));
        return null;
      }
      if (!socketRef.current?.connected) {
        setError(duelErrorText("ROOM_BUSY"));
        return null;
      }
      setJoining(true);
      return join(socketRef.current, clean);
    },
    [join],
  );

  const move = useCallback(
    async (payload) => {
      const code = roomRef.current?.code;
      if (!code) return { error: { code: "GAME_NOT_ACTIVE" } };
      return emit("game:move", { code, ...payload });
    },
    [emit],
  );

  const startGame = useCallback(async () => {
    const code = roomRef.current?.code;
    if (!code) return { error: { code: "GAME_NOT_ACTIVE" } };
    return emit("game:start", { code, game });
  }, [emit, game]);

  const rematch = useCallback(async () => {
    const code = roomRef.current?.code;
    if (!code) return;
    const response = await emit("game:rematch", { code });
    if (response?.error) setError(duelErrorText(response.error.code));
  }, [emit]);

  const surrender = useCallback(async () => {
    const code = roomRef.current?.code;
    if (!code) return;
    const response = await emit("game:surrender", { code });
    if (response?.error) setError(duelErrorText(response.error.code));
  }, [emit]);

  const leaveRoom = useCallback(async () => {
    const code = roomRef.current?.code;
    if (code) await emit("room:leave", { code });
    codeRef.current = "";
    writeStored(game, "");
    setSeat(null);
    setRoom(null);
    setError("");
    if (typeof window !== "undefined" && /[?&](otaq|onlayn)=/.test(window.location.search)) {
      const url = new URL(window.location.href);
      url.searchParams.delete("otaq");
      url.searchParams.delete("onlayn");
      window.history.replaceState(null, "", url.toString());
    }
  }, [emit, game, setRoom]);

  const findMatch = useCallback(async () => {
    setError("");
    setRating(null);
    setSearching({ since: Date.now(), searching: 1 });
    const response = await emit("queue:join", { game });
    if (response?.error) {
      setSearching(null);
      setError(duelErrorText(response.error.code));
      return false;
    }
    if (searchingRef.current) setSearching({ ...searchingRef.current, searching: response.searching ?? 1 });
    return true;
  }, [emit, game, setSearching]);

  const cancelMatch = useCallback(async () => {
    setSearching(null);
    await emit("queue:leave", {});
  }, [emit, setSearching]);

  useEffect(() => {
    if (!hasAutoMatch() || !connected || loading || joining || room || searchingRef.current) return;
    if (takeAutoMatch()) void findMatch();
  }, [connected, findMatch, joining, loading, room]);

  const react = useCallback(
    async (emoji) => {
      const code = roomRef.current?.code;
      if (!code) return null;
      return emit("room:react", { code, emoji });
    },
    [emit],
  );

  const invite = useCallback(
    async (username) => {
      const code = roomRef.current?.code;
      if (!code) return { error: { code: "GAME_NOT_ACTIVE" } };
      return emit("invite:send", { code, username });
    },
    [emit],
  );

  const findNext = useCallback(async () => {
    await leaveRoom();
    await findMatch();
  }, [findMatch, leaveRoom]);

  // Haptics + tab title: buzz on own right/wrong answers, and when it becomes your turn
  // while the tab is in the background, show it in the title so you come back.
  const lastEventAt = room?.state?.lastEvent?.at;
  const turnSeat = room?.state?.turn ?? null;
  const status = room?.status;
  useEffect(() => {
    const e = roomRef.current?.state?.lastEvent;
    if (!e || e.seat !== seat || Date.now() + offsetRef.current - (e.at ?? 0) > 3000) return;
    if (e.type === "wrong") play("wrong");
    else if (e.type === "correct" || e.type === "found") play("correct");
    try {
      if (e.type === "wrong") navigator.vibrate?.(120);
      else if (e.type === "correct" || e.type === "found") navigator.vibrate?.([40, 40, 40]);
    } catch {
      // vibration is optional
    }
  }, [lastEventAt, seat]);
  // Match end jingle.
  const winnerId = room?.winnerId;
  useEffect(() => {
    if (status !== "finished" || !seat) return;
    play(winnerId === seat ? "win" : winnerId ? "lose" : "pop");
  }, [status, winnerId, seat]);
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const mine = status === "playing" && turnSeat && turnSeat === seat;
    if (!mine) return undefined;
    play("turn");
    try {
      navigator.vibrate?.(50);
    } catch {
      // vibration is optional
    }
    const base = document.title;
    const flag = () => {
      document.title = document.hidden ? `⚽ ${tr("Növbə səndə!")}` : base;
    };
    flag();
    document.addEventListener("visibilitychange", flag);
    return () => {
      document.removeEventListener("visibilitychange", flag);
      document.title = base;
    };
  }, [turnSeat, seat, status]);

  const players = room?.players ?? [];
  const myId = seat ?? null;
  const me = players.find((player) => player.id === myId) ?? null;
  const opponent = players.find((player) => player.id !== myId) ?? null;

  return {
    loading: loading || joining,
    connected,
    room,
    error,
    setError,
    myId,
    me,
    opponent,
    rating: rating ? { rated: rating.rated, reason: rating.reason, mine: rating.changes?.[myId] ?? null } : null,
    serverNow: () => Date.now() + offsetRef.current,
    offset: offsetRef.current,
    createRoom,
    joinRoom,
    leaveRoom,
    searching,
    findMatch,
    cancelMatch,
    findNext,
    move,
    startGame,
    rematch,
    surrender,
    reconnect: connect,
    invite,
    canInvite: Boolean(user),
    reactions,
    react,
  };
}
