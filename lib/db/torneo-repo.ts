import { eq } from "drizzle-orm";
import { db as dbPorDefecto, type Db } from "./client";
import { enfrentamientos, parejas } from "./schema";
import type { EnfrentamientoRow, ParejaRow } from "./schema";
import type { Enfrentamiento, Pareja } from "@/lib/torneo/types";

function aPareja(r: ParejaRow): Pareja {
  return {
    id: r.id,
    nombre: r.nombre,
    derrotas: r.derrotas,
    eliminada: r.eliminada,
    descansos: r.descansos,
    rivales: r.rivales,
  };
}

function aEnfrentamiento(r: EnfrentamientoRow): Enfrentamiento {
  return {
    id: r.id,
    pareja1Id: r.pareja1Id,
    pareja2Id: r.pareja2Id,
    ronda: r.ronda,
    ganadorId: r.ganadorId,
    jugado: r.jugado,
  };
}

export function crearRepo(database: Db = dbPorDefecto) {
  return {
    async listarParejas(): Promise<Pareja[]> {
      const rows = await database.select().from(parejas).orderBy(parejas.id);
      return rows.map(aPareja);
    },

    async listarEnfrentamientos(): Promise<Enfrentamiento[]> {
      const rows = await database
        .select()
        .from(enfrentamientos)
        .orderBy(enfrentamientos.id);
      return rows.map(aEnfrentamiento);
    },

    async getEnfrentamiento(id: number): Promise<Enfrentamiento | null> {
      const rows = await database
        .select()
        .from(enfrentamientos)
        .where(eq(enfrentamientos.id, id));
      return rows[0] ? aEnfrentamiento(rows[0]) : null;
    },
  };
}

export type TorneoRepo = ReturnType<typeof crearRepo>;

/** Instancia por defecto para la app (usa el cliente de producción). */
export const repo = crearRepo();
