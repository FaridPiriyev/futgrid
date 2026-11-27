import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { signAccessToken } from "../src/lib/crypto.js";
import { prisma } from "../src/lib/prisma.js";
import { closeRedis, getRedis } from "../src/lib/redis.js";

let app: Awaited<ReturnType<typeof buildApp>>;

async function makeUser(username: string) {
  const user = await prisma.user.create({
    data: {
      email: `${username}@example.com`,
      username,
      displayName: username.toUpperCase(),
      emailVerifiedAt: new Date(),
    },
  });
  const token = await signAccessToken(user.id, "user");
  return { user, auth: { authorization: `Bearer ${token}` } };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "friendships", "users" RESTART IDENTITY CASCADE`);
  await (await getRedis()).flushdb();
});

afterAll(async () => {
  await app.close();
  await closeRedis();
  await prisma.$disconnect();
});

describe("public profiles and friends", () => {
  it("shows a public profile without private fields", async () => {
    await makeUser("messi10");
    const res = await app.inject({ method: "GET", url: "/v1/players/MESSI10" });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json();
    expect(body.username).toBe("messi10");
    expect(body.friendStatus).toBe("none");
    expect(res.body).not.toContain("@example.com");
    expect((await app.inject({ method: "GET", url: "/v1/players/nobody" })).statusCode).toBe(404);
  });

  it("sends, accepts and removes a friend request", async () => {
    const a = await makeUser("alpha");
    const b = await makeUser("bravo");
    const sent = await app.inject({ method: "POST", url: "/v1/friends/bravo", headers: a.auth });
    expect(sent.json().status).toBe("outgoing");

    const incoming = await app.inject({ method: "GET", url: "/v1/friends", headers: b.auth });
    expect(incoming.json().incoming.map((f: { username: string }) => f.username)).toEqual(["alpha"]);

    const accepted = await app.inject({ method: "POST", url: "/v1/friends/alpha", headers: b.auth });
    expect(accepted.json().status).toBe("friends");

    const profile = await app.inject({ method: "GET", url: "/v1/players/bravo", headers: a.auth });
    expect(profile.json().friendStatus).toBe("friends");
    expect(profile.json().friendCount).toBe(1);

    const removed = await app.inject({ method: "DELETE", url: "/v1/friends/bravo", headers: a.auth });
    expect(removed.json().status).toBe("none");
    const list = await app.inject({ method: "GET", url: "/v1/friends", headers: b.auth });
    expect(list.json().friends).toEqual([]);
  });

  it("refuses to befriend yourself", async () => {
    const a = await makeUser("solo");
    const res = await app.inject({ method: "POST", url: "/v1/friends/solo", headers: a.auth });
    expect(res.statusCode).toBe(400);
  });
});
