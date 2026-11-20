#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { io } from "socket.io-client";

const args = process.argv.slice(2);
const command = args[0] ?? "create";

function arg(name, fallback = undefined) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const socketUrl = arg("url", process.env.DUEL_SOCKET_URL ?? "http://localhost:3000");
const appUrl = arg("app", process.env.DUEL_APP_URL ?? "http://localhost:5173");
const game = arg("game", "xox");
const guestId = arg("guest", randomUUID());

if (!["create", "join"].includes(command)) {
  console.error("Usage:");
  console.error("  node scripts/duel.mjs create [--game xox] [--url http://localhost:3000]");
  console.error("  node scripts/duel.mjs join <CODE> [--url http://localhost:3000]");
  process.exit(1);
}

const code = command === "join" ? args[1] : null;
if (command === "join" && !code) {
  console.error("Missing room code. Example: node scripts/duel.mjs join ABC123");
  process.exit(1);
}

const socket = io(socketUrl, {
  auth: { guestId },
  transports: ["websocket"],
  reconnection: false,
});

socket.on("connect", () => {
  console.log(`connected to ${socketUrl} as guest ${guestId}`);
  if (command === "create") {
    socket.emit("room:create", { game }, (response) => {
      if (response?.error) {
        console.error("room:create failed:", response.error);
        process.exit(1);
      }
      const roomCode = response?.room?.code;
      console.log("");
      console.log(`Room code: ${roomCode}`);
      console.log(`Invite link: ${appUrl.replace(/\/$/, "")}/oyunlar/futbol-x0x?otaq=${roomCode}`);
      console.log("");
      console.log("Keep this process running and join from a second terminal:");
      console.log(`  node backend/scripts/duel.mjs join ${roomCode}`);
    });
  } else {
    socket.emit("room:join", { code, game }, (response) => {
      if (response?.error) {
        console.error("room:join failed:", response.error);
        process.exit(1);
      }
      console.log(`joined room ${code}`);
    });
  }
});

socket.on("room:state", (state) => {
  console.log("room:state", JSON.stringify(state, null, 2));
});

socket.on("game:state", (state) => {
  console.log("game:state", JSON.stringify(state, null, 2));
});

socket.on("game:result", (result) => {
  console.log("game:result", JSON.stringify(result, null, 2));
});

socket.on("error", (error) => {
  console.error("socket error:", error);
});

socket.on("disconnect", (reason) => {
  console.log("disconnected:", reason);
});

process.on("SIGINT", () => {
  socket.disconnect();
  process.exit(0);
});
