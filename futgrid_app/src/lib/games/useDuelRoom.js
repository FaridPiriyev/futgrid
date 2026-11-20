import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api, getGuestId } from "../api";
import { useAuth } from "../auth";

function socketBase() {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/v1";
  return apiUrl.replace(/\/v1\/?$/, "").replace(/\/$/, "");
}

export function useDuelRoom({ game, invitedCode = "" }) {
  const { user, loading } = useAuth();
  const socketRef = useRef(null);
  const roomRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoomState] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [serverId, setServerId] = useState(null);

  const setRoom = useCallback((state) => {
    roomRef.current = state;
    setRoomState(state);
  }, []);

  const connect = useCallback(async () => {
    setError("");
    let token = null;
    if (user) {
      try {
        const socketAuth = await api.get("/auth/socket-token");
        token = socketAuth.token;
      } catch {
        token = null;
      }
    }
    const socket = io(socketBase(), {
      auth: token ? { token } : { guestId: getGuestId() },
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;

    const accept = (response) => {
      if (response?.error) {
        setError(response.error.message || response.error.code || "ROOM_ERROR");
        return;
      }
      if (response?.youId) setServerId(response.youId);
      if (response?.room) setRoom(response.room);
    };

    socket.on("connect", () => {
      setConnected(true);
      if (invitedCode) socket.emit("room:join", { code: invitedCode, game }, accept);
    });
    socket.on("connect_error", (err) => {
      setConnected(false);
      setError(err?.message || "Serverə qoşulmaq mümkün olmadı");
    });
    socket.on("room:state", (state) => {
      setRoom(state);
      setResult(null);
    });
    socket.on("game:state", setRoom);
    socket.on("game:result", (state) => {
      setRoom(state);
      setResult(state);
    });
    socket.on("error", (payload) => {
      setError(String(payload?.error?.message ?? payload?.error?.code ?? "ERROR"));
    });
    socket.on("disconnect", (reason) => {
      setConnected(false);
      if (!roomRef.current) setError((current) => current || `Socket bağlandı: ${reason}`);
    });
  }, [game, invitedCode, user, setRoom]);

  useEffect(() => {
    if (loading) return;
    void connect();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect, loading]);

  const createRoom = useCallback(
    () =>
      new Promise((resolve) => {
        if (!socketRef.current || !connected) {
          setError("Serverə qoşulmaq mümkün olmadı");
          resolve(null);
          return;
        }
        socketRef.current.emit("room:create", { game }, (response) => {
          if (response?.error) {
            setError(response.error.message || response.error.code || "ROOM_ERROR");
            resolve(null);
            return;
          }
          setError("");
          if (response?.youId) setServerId(response.youId);
          if (response?.room) setRoom(response.room);
          resolve(response?.room ?? null);
        });
      }),
    [connected, game, setRoom],
  );

  const joinRoom = useCallback(
    (code) =>
      new Promise((resolve) => {
        const clean = String(code ?? "").replace(/\D/g, "").slice(0, 6);
        if (clean.length !== 6) {
          setError("Otaq ID 6 rəqəm olmalıdır");
          resolve(null);
          return;
        }
        if (!socketRef.current || !connected) {
          setError("Serverə qoşulmaq mümkün olmadı");
          resolve(null);
          return;
        }
        socketRef.current.emit("room:join", { code: clean, game }, (response) => {
          if (response?.error) {
            setError(response.error.message || response.error.code || "ROOM_ERROR");
            resolve(null);
            return;
          }
          setError("");
          if (response?.youId) setServerId(response.youId);
          if (response?.room) setRoom(response.room);
          resolve(response?.room ?? null);
        });
      }),
    [connected, setRoom],
  );

  const sendMove = useCallback(
    (payload) => {
      if (!socketRef.current || !room?.code) return;
      socketRef.current.emit("game:move", { code: room.code, ...payload });
    },
    [room],
  );

  const startGame = useCallback(() => {
    if (!socketRef.current || !room?.code) return;
    socketRef.current.emit("game:start", { code: room.code }, (response) => {
      if (response?.error) setError(response.error.message || response.error.code);
      if (response?.youId) setServerId(response.youId);
    });
  }, [room]);

  const rematch = useCallback(() => {
    if (!socketRef.current || !room?.code) return;
    setResult(null);
    socketRef.current.emit("game:rematch", { code: room.code });
  }, [room]);

  const copyLink = useCallback(async () => {
    if (!room?.code) return;
    const link = `${window.location.origin}${window.location.pathname}?otaq=${room.code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }, [room]);

  const inviteLink = room?.code
    ? `${window.location.origin}${window.location.pathname}?otaq=${room.code}`
    : "";

  return {
    loading,
    connected,
    room,
    result,
    error,
    copied,
    inviteLink,
    myId: serverId ?? user?.id ?? getGuestId(),
    createRoom,
    joinRoom,
    sendMove,
    startGame,
    rematch,
    copyLink,
    reconnect: connect,
  };
}
