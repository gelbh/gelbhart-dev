export interface Env {
  DB: D1Database;
  SEND_EMAIL: SendEmail;
  ASSETS?: Fetcher;
  PAGES_ORIGIN: "render" | "assets";
  TURNSTILE_SECRET_KEY: string;
  IP_SALT: string;
}
