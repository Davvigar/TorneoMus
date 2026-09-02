import type { Pareja, ResultadoRonda } from "./types";

/** Réplica de TorneoService.encontrarMejorRival. */
function encontrarMejorRival(pareja: Pareja, candidatos: Pareja[]): Pareja {
  const noJugadas = candidatos.filter((c) => !pareja.rivales.includes(c.nombre));
  if (noJugadas.length > 0) return noJugadas[0];
  return candidatos[0];
}

/**
 * Réplica de la parte de emparejamiento de TorneoService.generarSiguienteRonda.
 * No muta la entrada. Devuelve qué pareja descansa (o null) y la lista de
 * emparejamientos. La actualización de `rivales` y `descansos` la hace el repo.
 */
export function generarEmparejamientos(parejasActivas: Pareja[]): ResultadoRonda {
  if (parejasActivas.length < 2) {
    throw new Error("No hay suficientes parejas activas para generar una ronda");
  }

  let disponibles = [...parejasActivas];
  let descansaId: number | null = null;

  if (disponibles.length % 2 === 1) {
    const ordenadas = [...disponibles].sort(
      (a, b) => a.descansos - b.descansos || a.nombre.localeCompare(b.nombre),
    );
    const queDescansa = ordenadas[0];
    descansaId = queDescansa.id;
    disponibles = disponibles.filter((p) => p.id !== queDescansa.id);
  }

  const emparejamientos: ResultadoRonda["emparejamientos"] = [];
  const cola = [...disponibles];
  while (cola.length >= 2) {
    const pareja1 = cola.shift()!;
    const pareja2 = encontrarMejorRival(pareja1, cola);
    const idx = cola.findIndex((p) => p.id === pareja2.id);
    cola.splice(idx, 1);
    emparejamientos.push({ pareja1Id: pareja1.id, pareja2Id: pareja2.id });
  }

  return { descansaId, emparejamientos };
}
