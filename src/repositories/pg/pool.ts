import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and fill it in."
  );
}

export const pool = new Pool({ connectionString });

// A Postgres connection can drop while sitting idle in the pool (restart, timeout,
// network blip). Without a listener that surfaces as an unhandled 'error' event and
// takes the process down.
pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client", err);
});
