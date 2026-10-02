import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "@/config/env.server";
import * as schema from "./schema";

const MAX_CONNECTIONS = 5;

type Database = ReturnType<typeof createDatabase>;

declare global {
  var enchantressDatabase: Database | undefined;
}

function createDatabase() {
  const sql = postgres(serverEnv().DATABASE_URL, {
    max: MAX_CONNECTIONS,
    prepare: false,
  });
  return drizzle(sql, { schema });
}

export function db(): Database {
  globalThis.enchantressDatabase ??= createDatabase();
  return globalThis.enchantressDatabase;
}
