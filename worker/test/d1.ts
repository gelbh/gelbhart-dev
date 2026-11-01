import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";

const MIGRATIONS = new URL("../migrations/", import.meta.url);

/** Minimal D1Database stand-in backed by node:sqlite; D1 is SQLite, so queries behave the same. */
export function createTestDb(): D1Database {
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(MIGRATIONS).sort()) {
    db.exec(readFileSync(new URL(file, MIGRATIONS), "utf8"));
  }
  const prepare = (sql: string) => {
    let params: (string | number | null)[] = [];
    const stmt = {
      bind(...p: (string | number | null)[]) { params = p; return stmt; },
      async all<T>() { return { results: db.prepare(sql).all(...params) as T[], success: true, meta: {} }; },
      async first<T>() { return (db.prepare(sql).get(...params) ?? null) as T | null; },
      async run() { db.prepare(sql).run(...params); return { success: true, meta: {} }; },
    };
    return stmt;
  };
  return { prepare } as unknown as D1Database;
}
