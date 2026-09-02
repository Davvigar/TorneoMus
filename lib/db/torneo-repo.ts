import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db as dbPorDefecto, type Db } from "./client";
import { enfrentamientos, parejas } from "./schema";
import type { EnfrentamientoRow, ParejaRow } from "./schema";
import type { Enfrentamiento, Pareja } from "@/lib/torneo/types";
import { generarEmparejamientos } from "@/lib/torneo/emparejar";
import { rondaActual } from "@/lib/torneo/estado";
import { ganadorParticipa, recomputarEstadoParejas } from "@/lib/torneo/reglas";

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
  async function recomputarYPersistir(tx: Parameters<Parameters<Db["transaction"]>[0]>[0]) {
    const pRows = await tx.select().from(parejas).orderBy(parejas.id);
    const eRows = await tx.select().from(enfrentamientos);
    const recomputadas = recomputarEstadoParejas(
      pRows.map(aPareja),
      eRows.map(aEnfrentamiento),
    );
    for (const p of recomputadas) {
      await tx
        .update(parejas)
        .set({ derrotas: p.derrotas, eliminada: p.eliminada })
        .where(eq(parejas.id, p.id));
    }
  }

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

    async registrarPareja(nombre: string): Promise<void> {
      const existentes = await database
        .select({ id: parejas.id })
        .from(parejas)
        .where(eq(parejas.nombre, nombre));
      if (existentes.length > 0) {
        throw new Error("Ya existe una pareja con ese nombre");
      }
      await database.insert(parejas).values({ nombre });
    },

    async generarSiguienteRonda(): Promise<number> {
      return database.transaction(async (tx) => {
        const pRows = await tx.select().from(parejas).orderBy(parejas.id);
        const eRows = await tx
          .select()
          .from(enfrentamientos)
          .orderBy(enfrentamientos.id);
        const todasParejas = pRows.map(aPareja);
        const todosEnf = eRows.map(aEnfrentamiento);

        const r = rondaActual(todosEnf);
        if (r > 0 && todosEnf.some((e) => e.ronda === r && !e.jugado)) {
          throw new Error(
            "No puedes generar una nueva ronda: hay enfrentamientos pendientes en la ronda actual.",
          );
        }

        const activas = todasParejas.filter((p) => p.derrotas < 2);
        const nuevaRonda = r + 1;
        // Lanza "No hay suficientes parejas activas para generar una ronda" si < 2.
        const { descansaId, emparejamientos } = generarEmparejamientos(activas);

        if (descansaId !== null) {
          await tx
            .update(parejas)
            .set({ descansos: sql`${parejas.descansos} + 1` })
            .where(eq(parejas.id, descansaId));
          await tx.insert(enfrentamientos).values({
            pareja1Id: descansaId,
            pareja2Id: null,
            ronda: nuevaRonda,
            jugado: true,
          });
        }

        const porId = new Map(activas.map((p) => [p.id, p]));
        for (const em of emparejamientos) {
          await tx.insert(enfrentamientos).values({
            pareja1Id: em.pareja1Id,
            pareja2Id: em.pareja2Id,
            ronda: nuevaRonda,
            jugado: false,
          });
          const p1 = porId.get(em.pareja1Id)!;
          const p2 = porId.get(em.pareja2Id)!;
          const rivales1 = p1.rivales.includes(p2.nombre)
            ? p1.rivales
            : [...p1.rivales, p2.nombre];
          const rivales2 = p2.rivales.includes(p1.nombre)
            ? p2.rivales
            : [...p2.rivales, p1.nombre];
          await tx
            .update(parejas)
            .set({ rivales: rivales1 })
            .where(eq(parejas.id, p1.id));
          await tx
            .update(parejas)
            .set({ rivales: rivales2 })
            .where(eq(parejas.id, p2.id));
        }

        return emparejamientos.length;
      });
    },

    async registrarResultado(
      enfrentamientoId: number,
      ganadorId: number,
    ): Promise<void> {
      await database.transaction(async (tx) => {
        const eRows = await tx
          .select()
          .from(enfrentamientos)
          .where(eq(enfrentamientos.id, enfrentamientoId));
        const enf = eRows[0] ? aEnfrentamiento(eRows[0]) : null;
        if (!enf) throw new Error("Enfrentamiento no encontrado");
        if (enf.pareja2Id === null) {
          throw new Error("Un descanso no tiene resultado");
        }
        if (!ganadorParticipa(enf, ganadorId)) {
          throw new Error(
            "La pareja ganadora no participa en este enfrentamiento",
          );
        }

        await tx
          .update(enfrentamientos)
          .set({ ganadorId, jugado: true })
          .where(eq(enfrentamientos.id, enfrentamientoId));

        await recomputarYPersistir(tx);
      });
    },

    async deshacerResultado(enfrentamientoId: number): Promise<void> {
      await database.transaction(async (tx) => {
        const eRows = await tx
          .select()
          .from(enfrentamientos)
          .where(eq(enfrentamientos.id, enfrentamientoId));
        const enf = eRows[0] ? aEnfrentamiento(eRows[0]) : null;
        if (!enf) throw new Error("Enfrentamiento no encontrado");
        if (!enf.jugado || enf.ganadorId === null) {
          throw new Error(
            "Este enfrentamiento no tiene resultado que deshacer",
          );
        }
        await tx
          .update(enfrentamientos)
          .set({ ganadorId: null, jugado: false })
          .where(eq(enfrentamientos.id, enfrentamientoId));

        await recomputarYPersistir(tx);
      });
    },
  };
}

export type TorneoRepo = ReturnType<typeof crearRepo>;

/** Instancia por defecto para la app (usa el cliente de producción). */
export const repo = crearRepo();
