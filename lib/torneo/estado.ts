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
 * Rondas cuyos enfrentamientos se muestran (y se pueden resolver) en el
 * dashboard: la ronda actual y, hacia atrás, las rondas anteriores que aún
 * tengan enfrentamientos pendientes. Esto cubre el flujo "primeras dos rondas":
 * se generan la 1 y la 2 de golpe y se pueden meter resultados de cualquiera de
 * las dos, en cualquier orden. En cuanto una ronda anterior queda completa,
 * deja de mostrarse.
 */
export function rondasVisibles(enfrentamientos: Enfrentamiento[]): number[] {
  const r = rondaActual(enfrentamientos);
  if (r === 0) return [];
  const visibles = [r];
  for (let ronda = r - 1; ronda >= 1; ronda--) {
    if (!hayPendientesEnRonda(enfrentamientos, ronda)) break;
    visibles.unshift(ronda);
  }
  return visibles;
}

export function enfrentamientosRondaActual(
  enfrentamientos: Enfrentamiento[],
): Enfrentamiento[] {
  const rondas = new Set(rondasVisibles(enfrentamientos));
  return enfrentamientos
    .filter((e) => rondas.has(e.ronda))
    .sort((a, b) => a.ronda - b.ronda || a.id - b.id);
}

/** Parejas en juego: criterio único `eliminada = false` (flag). */
export function parejasActivasListado(parejas: Pareja[]): Pareja[] {
  return parejas.filter((p) => !p.eliminada);
}

export function contarParejasActivas(parejas: Pareja[]): number {
  return parejas.filter((p) => !p.eliminada).length;
}

export function pendientesRondaActual(enfrentamientos: Enfrentamiento[]): number {
  const rondas = new Set(rondasVisibles(enfrentamientos));
  return enfrentamientos.filter((e) => rondas.has(e.ronda) && !e.jugado).length;
}

/**
 * No se puede generar la siguiente ronda hasta que todas las rondas visibles
 * (la actual y las anteriores aún pendientes, p. ej. R1 y R2 del flujo "primeras
 * dos rondas") estén completas.
 */
export function puedeGenerarNuevaRonda(
  parejas: Pareja[],
  enfrentamientos: Enfrentamiento[],
): boolean {
  if (contarParejasActivas(parejas) < 2) return false;
  const r = rondaActual(enfrentamientos);
  if (r === 0) return true;
  return rondasVisibles(enfrentamientos).every(
    (ronda) => !hayPendientesEnRonda(enfrentamientos, ronda),
  );
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
