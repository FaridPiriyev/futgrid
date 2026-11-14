import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { getGuestId } from "../api";

function socketBase() {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const api = import.meta.env.VITE_API_URL || "http://localhost:3000/v1";
  return api.replace(/\/v1\/?$/, "").replace(/\/$/, "");
}

export function useDuelRoom({ game, invitedCode = "" }) {
  const socketRef = useRef(null);
  const roomRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const connect = useCallback(() => {
    setError("");
    const socket = io(socketBase(), {
      auth: { guestId: getGuestId() },
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      if (invitedCode) socket.emit("room:join", { code: invitedCode });
      else socket.emit("room:create", { game });
    });
    socket.on("connect_error", (err) => {
      setConnected(false);
      setError(err?.message || "Serverə qoşulmaq mümkün olmadı");
    });
    socket.on("room:state", (state) => {
      roomRef.current = state;
      setRoom(state);
      setResult(null);
    });
    socket.on("game:state", (state) => {
      roomRef.current = state;
      setRoom(state);
    });
    socket.on("game:result", (state) => {
      roomRef.current = state;
      setRoom(state);
      setResult(state);
    });
    socket.on("disconnect", (reason) => {
      setConnected(false);
      if (!roomRef.current) setError((current) => current || `Socket bağlandı: ${reason}`);
    });
    socket.on("error", (payload) => {
      setError(String(payload?.error?.message ?? payload?.error?.code ?? "ERROR"));
    });
  }, [game, invitedCode]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  const sendMove = useCallback(
    (payload) => {
      if (!socketRef.current || !room?.code) return;
      socketRef.current.emit("game:move", { code: room.code, ...payload });
    },
    [room],
  );

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
    loading: false,
    connected,
    room,
    result,
    error,
    copied,
    inviteLink,
    myId: getGuestId(),
    sendMove,
    rematch,
    copyLink,
    reconnect: connect,
  };
}

