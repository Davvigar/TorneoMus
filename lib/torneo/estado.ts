import type { Enfrentamiento, Pareja } from "./types";

export function rondaActual(enfrentamientos: Enfrentamiento[]): number {
  return enfrentamientos.reduce((max, e) => Math.max(max, e.ronda), 0);
}

export function enfrentamientosRondaActual(
  enfrentamientos: Enfrentamiento[],
): Enfrentamiento[] {
  const r = rondaActual(enfrentamientos);
  if (r === 0) return [];
  return enfrentamientos
    .filter((e) => e.ronda === r)
    .sort((a, b) => a.id - b.id);
}

/** Réplica de ParejaRepository.findParejasActivas(): derrotas < 2. */
export function parejasActivasListado(parejas: Pareja[]): Pareja[] {
  return parejas.filter((p) => p.derrotas < 2);
}

/** Réplica de ParejaRepository.countParejasActivas(): flag eliminada = false. */
export function contarParejasActivas(parejas: Pareja[]): number {
  return parejas.filter((p) => !p.eliminada).length;
}

export function pendientesRondaActual(enfrentamientos: Enfrentamiento[]): number {
  const r = rondaActual(enfrentamientos);
  if (r === 0) return 0;
  return enfrentamientos.filter((e) => e.ronda === r && !e.jugado).length;
}

export function puedeGenerarNuevaRonda(
  parejas: Pareja[],
  enfrentamientos: Enfrentamiento[],
): boolean {
  if (contarParejasActivas(parejas) < 2) return false;
  const r = rondaActual(enfrentamientos);
  if (r === 0) return true;
  return enfrentamientos.filter((e) => e.ronda === r && !e.jugado).length === 0;
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
