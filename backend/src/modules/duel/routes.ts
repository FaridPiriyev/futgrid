import type { FastifyInstance } from "fastify";
import { config } from "../../config.js";
import { getRedis } from "../../lib/redis.js";
import { readRoom } from "./store.js";

/**
 * "Kimdir bu" photos are served through an opaque URL so the file name
 * (which is the player's slug) never reaches the browser while a round is live.
 *
 * Production (behind nginx): replies with X-Accel-Redirect to an `internal`
 * nginx location that maps onto the static player-photo directory.
 * Development: falls back to a redirect to the public file (leaks the name,
 * but keeps local testing simple).
 */
export async function registerDuelRoutes(app: FastifyInstance) {
  app.get<{ Params: { code: string; round: string } }>(
    "/duel/photo/:code/:round",
    { schema: { hide: true } },
    async (request, reply) => {
      const code = String(request.params.code).replace(/\D/g, "").slice(0, 6);
      const round = Number(request.params.round);
      if (code.length !== 6 || !Number.isInteger(round)) return reply.status(404).send();
      const room = await readRoom(await getRedis(), code);
      if (!room || room.game !== "sekil" || Number(room.state?.round) !== round) {
        return reply.status(404).send();
      }
      const path = String(room.state.photoUrl ?? "");
      reply.header("Cache-Control", "private, no-store");
      reply.header("Referrer-Policy", "no-referrer");

      // Photos uploaded via admin may live on an external CDN: proxy the bytes.
      if (/^https?:\/\//i.test(path)) {
        const upstream = await fetch(path).catch(() => null);
        if (!upstream?.ok) return reply.status(404).send();
        reply.header("Content-Type", upstream.headers.get("content-type") ?? "image/jpeg");
        return reply.send(Buffer.from(await upstream.arrayBuffer()));
      }

      const file = path.split("/").pop() ?? "";
      if (!/^[\w.-]+\.(jpe?g|png|webp)$/i.test(file)) return reply.status(404).send();
      if (config.PLAYER_PHOTO_MODE === "accel") {
        reply.header("X-Accel-Redirect", `${config.PLAYER_PHOTO_ACCEL_PREFIX}${file}`);
        return reply.send();
      }
      return reply.redirect(`${config.APP_URL.replace(/\/$/, "")}${path}`);
    },
  );
}
