import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const parejas = pgTable("parejas", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
  derrotas: integer("derrotas").notNull().default(0),
  eliminada: boolean("eliminada").notNull().default(false),
  descansos: integer("descansos").notNull().default(0),
  rivales: text("rivales")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const enfrentamientos = pgTable("enfrentamientos", {
  id: serial("id").primaryKey(),
  pareja1Id: integer("pareja1_id")
    .notNull()
    .references(() => parejas.id),
  pareja2Id: integer("pareja2_id").references(() => parejas.id),
  ronda: integer("ronda").notNull(),
  ganadorId: integer("ganador_id").references(() => parejas.id),
  jugado: boolean("jugado").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ParejaRow = typeof parejas.$inferSelect;
export type EnfrentamientoRow = typeof enfrentamientos.$inferSelect;
