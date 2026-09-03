import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db as dbPorDefecto, type Db } from "./client";
import { enfrentamientos, parejas } from "./schema";
import type { EnfrentamientoRow, ParejaRow } from "./schema";
import type {
  Enfrentamiento,
  EnfrentamientoVista,
  EstadoTorneo,
  Pareja,
} from "@/lib/torneo/types";
import { generarEmparejamientos } from "@/lib/torneo/emparejar";
import {
  contarParejasActivas,
  enfrentamientosRondaActual,
  parejaGanadora,
  parejasActivasListado,
  pendientesRondaActual,
  puedeGenerarNuevaRonda,
  puedeGenerarPrimerasDosRondas,
  rondaActual,
  rondaAMostrar,
  torneoTerminado,
} from "@/lib/torneo/estado";
import { enfrentamientoAVista } from "@/lib/torneo/vista";
import { ganadorParticipa, recomputarEstadoParejas } from "@/lib/torneo/reglas";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

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
  /**
   * Recalcula `derrotas` y `eliminada` de todas las parejas desde los
   * enfrentamientos jugados y lo persiste. Se llama tras cada escritura para
   * mantener el estado consistente (sustituye a verificarEliminacionParejas).
   */
  async function recomputarYPersistir(tx: Tx) {
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

  /**
   * Genera y persiste los enfrentamientos de la ronda `numeroRonda` (emparejado
   * aleatorio con backtracking; una pareja descansa si el número es impar).
   * Anti-duplicado: si ya existen enfrentamientos para esa ronda, no hace nada.
   * No toca `rivales` (eso es en registrarResultado) ni recalcula estado (lo
   * hace el llamador). Devuelve cuántos enfrentamientos (sin contar el descanso).
   */
  async function generarRondaEnTx(tx: Tx, numeroRonda: number): Promise<number> {
    const eRows = await tx
      .select()
      .from(enfrentamientos)
      .orderBy(enfrentamientos.id);
    const todosEnf = eRows.map(aEnfrentamiento);

    if (todosEnf.some((e) => e.ronda === numeroRonda)) {
      return todosEnf.filter((e) => e.ronda === numeroRonda && e.pareja2Id !== null)
        .length;
    }

    const pRows = await tx.select().from(parejas).orderBy(parejas.id);
    const activas = parejasActivasListado(pRows.map(aPareja));

    // ¿ya existe un enfrentamiento entre estas dos parejas? (cualquier ronda)
    const yaSeEnfrentaron = (a: number, b: number) =>
      todosEnf.some(
        (e) =>
          (e.pareja1Id === a && e.pareja2Id === b) ||
          (e.pareja1Id === b && e.pareja2Id === a),
      );

    // Lanza "No hay suficientes parejas activas para generar una ronda" si < 2.
    const { descansaId, emparejamientos } = generarEmparejamientos(
      activas,
      yaSeEnfrentaron,
    );

    if (descansaId !== null) {
      await tx
        .update(parejas)
        .set({ descansos: sql`${parejas.descansos} + 1` })
        .where(eq(parejas.id, descansaId));
      await tx.insert(enfrentamientos).values({
        pareja1Id: descansaId,
        pareja2Id: null,
        ronda: numeroRonda,
        jugado: true,
      });
    }

    for (const em of emparejamientos) {
      await tx.insert(enfrentamientos).values({
        pareja1Id: em.pareja1Id,
        pareja2Id: em.pareja2Id,
        ronda: numeroRonda,
        jugado: false,
      });
    }

    return emparejamientos.length;
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
        const eRows = await tx
          .select()
          .from(enfrentamientos)
          .orderBy(enfrentamientos.id);
        const todosEnf = eRows.map(aEnfrentamiento);
        const r = rondaActual(todosEnf);

        if (r > 0) {
          const bloqueada =
            (r === 2 && todosEnf.some((e) => e.ronda === 1 && !e.jugado)) ||
            todosEnf.some((e) => e.ronda === r && !e.jugado);
          if (bloqueada) {
            throw new Error(
              "No puedes generar una nueva ronda: hay enfrentamientos pendientes en la ronda actual.",
            );
          }
        }

        const n = await generarRondaEnTx(tx, r + 1);
        await recomputarYPersistir(tx);
        return n;
      });
    },

    /**
     * Genera de una vez la ronda 1 y la ronda 2 (solo si el torneo está en
     * ronda 0). El sistema queda en ronda 2, pero la UI muestra la ronda 1
     * hasta completarla. Devuelve el total de enfrentamientos generados.
     */
    async generarPrimerasDosRondas(): Promise<number> {
      return database.transaction(async (tx) => {
        const eRows = await tx.select().from(enfrentamientos);
        if (rondaActual(eRows.map(aEnfrentamiento)) > 0) {
          throw new Error(
            "Solo se pueden generar las primeras dos rondas cuando el torneo está en ronda 0",
          );
        }
        const n1 = await generarRondaEnTx(tx, 1);
        const n2 = await generarRondaEnTx(tx, 2);
        await recomputarYPersistir(tx);
        return n1 + n2;
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
          throw new Error(
            "Este enfrentamiento es un descanso y no admite resultado",
          );
        }
        if (!ganadorParticipa(enf, ganadorId)) {
          throw new Error(
            "La pareja ganadora no participa en este enfrentamiento",
          );
        }
        // Mismo ganador que ya estaba: nada que hacer.
        if (enf.jugado && enf.ganadorId === ganadorId) return;

        await tx
          .update(enfrentamientos)
          .set({ ganadorId, jugado: true })
          .where(eq(enfrentamientos.id, enfrentamientoId));

        // Rivales jugados: se registran al confirmar el resultado.
        const p1 = aPareja(
          (
            await tx
              .select()
              .from(parejas)
              .where(eq(parejas.id, enf.pareja1Id))
          )[0],
        );
        const p2 = aPareja(
          (
            await tx
              .select()
              .from(parejas)
              .where(eq(parejas.id, enf.pareja2Id))
          )[0],
        );
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
          throw new Error("Este enfrentamiento no tiene resultado que deshacer");
        }
        await tx
          .update(enfrentamientos)
          .set({ ganadorId: null, jugado: false })
          .where(eq(enfrentamientos.id, enfrentamientoId));

        await recomputarYPersistir(tx);
      });
    },

    async reiniciarTorneo(): Promise<void> {
      await database.execute(
        sql`TRUNCATE TABLE enfrentamientos, parejas RESTART IDENTITY CASCADE`,
      );
    },

    async getEstadoTorneo(): Promise<EstadoTorneo> {
      const [pRows, eRows] = await Promise.all([
        database.select().from(parejas).orderBy(parejas.id),
        database.select().from(enfrentamientos).orderBy(enfrentamientos.id),
      ]);
      const ps = pRows.map(aPareja);
      const es = eRows.map(aEnfrentamiento);
      return {
        rondaActual: rondaActual(es),
        rondaAMostrar: rondaAMostrar(es),
        totalParejas: ps.length,
        parejasActivasCount: contarParejasActivas(ps),
        enfrentamientosActuales: enfrentamientosRondaActual(es),
        pendientesRondaActual: pendientesRondaActual(es),
        puedeGenerarNuevaRonda: puedeGenerarNuevaRonda(ps, es),
        puedeGenerarPrimerasDosRondas: puedeGenerarPrimerasDosRondas(ps, es),
        torneoTerminado: torneoTerminado(ps, es),
        parejaGanadora: parejaGanadora(ps, es),
      };
    },

    async getClasificacion(): Promise<{ activas: Pareja[]; eliminadas: Pareja[] }> {
      const ps = (
        await database.select().from(parejas).orderBy(parejas.id)
      ).map(aPareja);
      return {
        activas: ps
          .filter((p) => !p.eliminada)
          .sort((a, b) => a.derrotas - b.derrotas),
        eliminadas: ps
          .filter((p) => p.eliminada)
          .sort((a, b) => b.derrotas - a.derrotas),
      };
    },

    async getHistorial(): Promise<
      { ronda: number; enfrentamientos: EnfrentamientoVista[] }[]
    > {
      const [pRows, eRows] = await Promise.all([
        database.select().from(parejas).orderBy(parejas.id),
        database.select().from(enfrentamientos).orderBy(enfrentamientos.id),
      ]);
      const indice = new Map(pRows.map(aPareja).map((p) => [p.id, p]));
      const porRonda = new Map<number, EnfrentamientoVista[]>();
      for (const row of eRows.map(aEnfrentamiento)) {
        const lista = porRonda.get(row.ronda) ?? [];
        lista.push(enfrentamientoAVista(row, indice));
        porRonda.set(row.ronda, lista);
      }
      return [...porRonda.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([ronda, enfrentamientos]) => ({ ronda, enfrentamientos }));
    },

    /** Enfrentamiento enriquecido para la página de resultado. */
    async getEnfrentamientoVista(id: number): Promise<EnfrentamientoVista | null> {
      const eRows = await database
        .select()
        .from(enfrentamientos)
        .where(eq(enfrentamientos.id, id));
      if (!eRows[0]) return null;
      const pRows = await database.select().from(parejas);
      const indice = new Map(pRows.map(aPareja).map((p) => [p.id, p]));
      return enfrentamientoAVista(aEnfrentamiento(eRows[0]), indice);
    },
  };
}

export type TorneoRepo = ReturnType<typeof crearRepo>;

/** Instancia por defecto para la app (usa el cliente de producción). */
export const repo = crearRepo();
