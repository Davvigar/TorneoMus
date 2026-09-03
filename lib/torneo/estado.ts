import type { Enfrentamiento, Pareja } from "./types";

export function rondaActual(enfrentamientos: Enfrentamiento[]): number {
  return enfrentamientos.reduce((max, e) => Math.max(max, e.ronda), 0);
}

function hayPendientesEnRonda(
  enfrentamientos: Enfrentamiento[],
  ronda: number,
): boolean {
  return enfrentamientos.some((e) => e.ronda === ronda && !e.jugado);
}

/**
 * Ronda que se muestra en la UI. Port de TorneoService.obtenerEstadoTorneo
 * (origin/main): normalmente `rondaActual`, pero si `rondaActual == 2` y la
 * ronda 1 tiene enfrentamientos pendientes, se muestra la ronda 1 (flujo
 * "primeras dos rondas": se generan la 1 y la 2 de golpe, pero hay que
 * completar la 1 antes de que se "active" la 2).
 */
export function rondaAMostrar(enfrentamientos: Enfrentamiento[]): number {
  const r = rondaActual(enfrentamientos);
  if (r === 2 && hayPendientesEnRonda(enfrentamientos, 1)) return 1;
  return r;
}

export function enfrentamientosRondaActual(
  enfrentamientos: Enfrentamiento[],
): Enfrentamiento[] {
  const r = rondaAMostrar(enfrentamientos);
  if (r === 0) return [];
  return enfrentamientos
    .filter((e) => e.ronda === r)
    .sort((a, b) => a.id - b.id);
}

/** Parejas en juego: criterio único `eliminada = false` (flag). */
export function parejasActivasListado(parejas: Pareja[]): Pareja[] {
  return parejas.filter((p) => !p.eliminada);
}

export function contarParejasActivas(parejas: Pareja[]): number {
  return parejas.filter((p) => !p.eliminada).length;
}

export function pendientesRondaActual(enfrentamientos: Enfrentamiento[]): number {
  const r = rondaAMostrar(enfrentamientos);
  if (r === 0) return 0;
  return enfrentamientos.filter((e) => e.ronda === r && !e.jugado).length;
}

/**
 * Port de TorneoService.puedeGenerarNuevaRonda (origin/main).
 * Con `rondaActual == 2` y la ronda 1 aún con pendientes, NO se puede generar la
 * ronda 3 (hay que terminar la 1 primero).
 */
export function puedeGenerarNuevaRonda(
  parejas: Pareja[],
  enfrentamientos: Enfrentamiento[],
): boolean {
  if (contarParejasActivas(parejas) < 2) return false;
  const r = rondaActual(enfrentamientos);
  if (r === 0) return true;
  if (r === 2 && hayPendientesEnRonda(enfrentamientos, 1)) return false;
  return !hayPendientesEnRonda(enfrentamientos, r);
}

/** ≥ 2 parejas activas (flag) y el torneo aún no ha empezado (ronda 0). */
export function puedeGenerarPrimerasDosRondas(
  parejas: Pareja[],
  enfrentamientos: Enfrentamiento[],
): boolean {
  return (
    contarParejasActivas(parejas) >= 2 && rondaActual(enfrentamientos) === 0
  );
}

export function torneoTerminado(
  parejas: Pareja[],
  enfrentamientos: Enfrentamiento[],
): boolean {
  return rondaActual(enfrentamientos) > 0 && contarParejasActivas(parejas) <= 1;
}

export function parejaGanadora(
  parejas: Pareja[],
  enfrentamientos: Enfrentamiento[],
): Pareja | null {
  if (!torneoTerminado(parejas, enfrentamientos)) return null;
  const activas = parejasActivasListado(parejas);
  return activas.length > 0 ? activas[0] : null;
}
