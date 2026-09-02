import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no está definida");
}

// `prepare: false` es necesario para el pooler de transacciones de Supabase.
const sqlClient = postgres(connectionString, { prepare: false });

export const db = drizzle(sqlClient, { schema });
export type Db = typeof db;
