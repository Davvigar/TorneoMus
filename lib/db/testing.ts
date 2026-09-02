import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

/** Crea un cliente Drizzle contra DATABASE_URL (que en tests apunta a torneomus_test). */
export function crearDbTest() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.includes("test")) {
    throw new Error(
      "Los tests de integración requieren DATABASE_URL apuntando a una BD de test (con 'test' en el nombre).",
    );
  }
  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });
  return { db, cerrar: () => client.end() };
}

/** Vacía las tablas y reinicia los ids. */
export async function limpiar(db: ReturnType<typeof crearDbTest>["db"]) {
  await db.execute(
    sql`TRUNCATE TABLE enfrentamientos, parejas RESTART IDENTITY CASCADE`,
  );
}
