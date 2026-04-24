import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForPg = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>;
  __drizzleDb?: Db;
};

function getDbInternal(): Db {
  if (globalForPg.__drizzleDb) return globalForPg.__drizzleDb;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Configure it in env.");
  }
  const client =
    globalForPg.__pgClient ??
    postgres(url, { max: 1, prepare: false });
  globalForPg.__pgClient = client;
  const db = drizzle(client, { schema });
  globalForPg.__drizzleDb = db;
  return db;
}

export function getDb(): Db {
  return getDbInternal();
}

// Lazy proxy: throws only when a method is actually called without DATABASE_URL.
// Safe to import from modules that may run in build-time contexts.
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDbInternal(), prop, receiver);
  },
});

export { schema };
