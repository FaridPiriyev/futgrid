import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api, getGuestId } from "../api";
import { useAuth } from "../auth";
import { tr } from "../../i18n";

function socketBase() {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/v1";
  return apiUrl.replace(/\/v1\/?$/, "").replace(/\/$/, "");
}

// Server xəta kodlarının oxunaqlı mətni.
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
  get NOT_ENOUGH_PLAYERS() {
    return tr("Oyun üçün iki oyunçu lazımdır.");
  },
};

// "Onlayn rəqib" kartı basılanda duel ekranı açılan kimi axtarış avtomatik başlasın.
let autoMatchAt = 0;
export function requestAutoMatch() {
  autoMatchAt = Date.now();
}

export const duelErrorText = (code) => ERRORS[code] ?? tr("Xəta baş verdi ({code}).", { code: code || "?" });

const storeKey = (game) => `fg-duel:${game}`;
const readStored = (game) => {
  try {
    return sessionStorage.getItem(storeKey(game)) ?? "";
  } catch {
    return "";
  }
};
const writeStored = (game, code) => {
  try {
    if (code) sessionStorage.setItem(storeKey(game), code);
    else sessionStorage.removeItem(storeKey(game));
  } catch {
    /* gizli rejimdə sessionStorage olmaya bilər */
  }
};

/**
 * Səhifə açılanda birbaşa duel ekranına keçmək lazımdırmı?
 * Dəvət linki (?otaq=KOD) və ya yenilənmədən əvvəlki aktiv otaq varsa — bəli.
 */
export function hasDuelEntry(game) {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("otaq")) return true;
  } catch {
    /* köhnə brauzer */
  }
  return Boolean(readStored(game));
}

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
  // Son matçın Elo nəticəsi (server "duel:rating" göndərir).
  const [rating, setRating] = useState(null);
  // Təsadüfi rəqib axtarışı: { since, searching } və ya null.
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
      // Yeni oyun başlayanda köhnə reytinq nəticəsi gizlənir.
      if (state.status !== "finished") setRating(null);
      roomRef.current = state;
      codeRef.current = state.code;
      writeStored(game, state.code);
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
    let token = null;
    if (user) {
      try {
        token = (await api.get("/auth/socket-token")).token;
      } catch {
        token = null;
      }
    }
    const socket = io(socketBase(), {
      auth: token ? { token } : { guestId: getGuestId() },
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 800,
      reconnectionDelayMax: 4000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      // Axtarış zamanı internet kəsilib qayıdıbsa, növbəyə yenidən qoşuluruq.
      if (searchingRef.current && !roomRef.current) {
        socket.emit("queue:join", { game }, (response) => {
          if (response?.error) setSearching(null);
        });
      }
      // İnternet kəsilib qayıdanda və ya səhifə yenilənəndə otağa avtomatik qayıdırıq.
      const code = roomRef.current?.code ?? codeRef.current;
      if (code) void join(socket, code, { silent: Boolean(roomRef.current) || !invitedCode });
      else setJoining(false);
    });
    socket.on("connect_error", () => {
      setConnected(false);
      setJoining(false);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("room:state", setRoom);
    socket.on("game:state", setRoom);
    socket.on("game:result", setRoom);
    socket.on("match:found", (payload) => {
      if (!payload?.code) return;
      setSearching(null);
      if (payload.youId) setSeat(payload.youId);
      codeRef.current = payload.code;
      writeStored(game, payload.code);
      // Otağın tam vəziyyətini alırıq (oyun artıq başlayıb).
      void join(socket, payload.code, { silent: true });
    });
    socket.on("duel:rating", (payload) => {
      if (!payload || payload.code !== roomRef.current?.code) return;
      setRating(payload);
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
      // Bitmiş otaq yadda qalmasın — oyuna sonra qayıdanda köhnə nəticə açılmasın.
      if (roomRef.current?.status === "finished") writeStored(game, "");
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect, game, loading]);

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

  /** Oyun hərəkəti. Nəticə: { ok } və ya { error: { code } }. */
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
    if (typeof window !== "undefined" && window.location.search.includes("otaq=")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("otaq");
      window.history.replaceState(null, "", url.toString());
    }
  }, [emit, game, setRoom]);

  /** Təsadüfi rəqib axtar (standart qaydalarla). */
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
    // match:found cavabdan əvvəl gəlibsə, axtarış artıq bitib.
    if (searchingRef.current) setSearching({ ...searchingRef.current, searching: response.searching ?? 1 });
    return true;
  }, [emit, game, setSearching]);

  const cancelMatch = useCallback(async () => {
    setSearching(null);
    await emit("queue:leave", {});
  }, [emit, setSearching]);

  useEffect(() => {
    if (!autoMatchAt || !connected || loading || joining || room || searchingRef.current) return;
    // Köhnə sorğu (məsələn, istifadəçi geri qayıdıb) unudulur.
    const fresh = Date.now() - autoMatchAt < 20_000;
    autoMatchAt = 0;
    if (fresh) void findMatch();
  }, [connected, findMatch, joining, loading, room]);

  /** Bitmiş təsadüfi oyundan sonra yeni rəqib. */
  const findNext = useCallback(async () => {
    await leaveRoom();
    await findMatch();
  }, [findMatch, leaveRoom]);

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
    /** { rated, reason, mine: { before, after, delta, overallAfter, overallDelta } | null } */
    rating: rating ? { rated: rating.rated, reason: rating.reason, mine: rating.changes?.[myId] ?? null } : null,
    /** Serverin indiki vaxtı (taymerlər üçün). */
    serverNow: () => Date.now() + offsetRef.current,
    offset: offsetRef.current,
    createRoom,
    joinRoom,
    leaveRoom,
    /** null və ya { since, searching } — axtarış gedir. */
    searching,
    findMatch,
    cancelMatch,
    findNext,
    move,
    startGame,
    rematch,
    surrender,
    reconnect: connect,
  };
}
