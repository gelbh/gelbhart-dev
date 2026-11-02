import { describe, expect, it, vi } from "vitest";
import { createTestDb } from "./d1";
import { app } from "../src/index";
import type { Env } from "../src/env";

vi.mock("../src/mail", () => ({ sendContactMail: vi.fn() }));

const env = (): Env => ({
  DB: createTestDb(),
  SEND_EMAIL: {} as SendEmail,
  PAGES_ORIGIN: "assets",
  TURNSTILE_SECRET_KEY: "secret",
  IP_SALT: "salt",
});

const postScore = (e: Env, body: unknown) =>
  app.request("/api/pacman_scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, e);

describe("api routes", () => {
  it("creates a score and returns it on the global leaderboard", async () => {
    const e = env();
    const post = await postScore(e, { pacman_score: { player_name: "tom", score: 42, is_win: true } });
    expect(post.status).toBe(201);
    expect(await post.json()).toMatchObject({
      success: true, is_high_score: true, score: { player_name: "tom", score: 42, is_win: true },
    });

    const list = await app.request("/api/pacman_scores/global", {}, e);
    expect((await list.json()).leaderboard).toHaveLength(1);
    expect(list.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("returns one player's scores by url-encoded name", async () => {
    const e = env();
    await postScore(e, { pacman_score: { player_name: "ada l", score: 7, is_win: false } });
    const res = await app.request("/api/pacman_scores/player/ada%20l", {}, e);
    expect(await res.json()).toMatchObject({ player_name: "ada l", scores: [{ score: 7, is_win: false }] });
  });

  it("returns 422 with Rails-style errors for an invalid score", async () => {
    const res = await postScore(env(), { pacman_score: { player_name: "", score: -1, is_win: false } });
    expect(res.status).toBe(422);
    expect((await res.json()).errors).toContain("Player name can't be blank");
  });

  it("returns 400 when pacman_score is missing", async () => {
    expect((await postScore(env(), {})).status).toBe(400);
  });

  it("returns a 503 json error when the database fails", async () => {
    const e = { ...env(), DB: { prepare: () => { throw new Error("d1 down"); } } as unknown as D1Database };
    vi.spyOn(console, "error").mockImplementationOnce(() => {});
    const res = await app.request("/api/pacman_scores/global", {}, e);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ success: false });
  });

  it("serves default analytics with a 5 minute public cache", async () => {
    const res = await app.request("/api/analytics/hevy-tracker", {}, env());
    expect(res.headers.get("cache-control")).toBe("public, max-age=300");
    expect(await res.json()).toMatchObject({ source: "defaults", stale: true });
  });

  it("adds security headers to an immutable assets response for unknown api paths", async () => {
    const immutable = Response.redirect("https://gelbhart.dev/api/other", 301);
    expect(() => immutable.headers.set("x", "y")).toThrow();
    const assets = { fetch: vi.fn(async () => immutable) } as unknown as Fetcher;
    const res = await app.request("https://gelbhart.dev/api/nope", {}, { ...env(), ASSETS: assets });
    expect(res.status).toBe(301);
    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
  });
});
