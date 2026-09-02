import type { Enfrentamiento, Pareja } from "./types";

/** Réplica de Enfrentamiento.involucraPareja. */
export function ganadorParticipa(
  enfrentamiento: Enfrentamiento,
  ganadorId: number,
): boolean {
  return (
    enfrentamiento.pareja1Id === ganadorId ||
    enfrentamiento.pareja2Id === ganadorId
  );
}

/** Réplica de Enfrentamiento.getPerdedor (null si es descanso). */
export function perdedorDe(
  enfrentamiento: Enfrentamiento,
  ganadorId: number,
): number | null {
  if (enfrentamiento.pareja2Id === null) return null;
  if (enfrentamiento.pareja1Id === ganadorId) return enfrentamiento.pareja2Id;
  if (enfrentamiento.pareja2Id === ganadorId) return enfrentamiento.pareja1Id;
  return null;
}

/**
 * Recalcula `derrotas` y `eliminada` de cada pareja contando las derrotas
 * reales sobre los enfrentamientos jugados. `eliminada = derrotas >= 2`,
 * réplica de Pareja.agregarDerrota() (sin condición de ronda). No muta la entrada.
 */
export function recomputarEstadoParejas(
  parejas: Pareja[],
  enfrentamientos: Enfrentamiento[],
): Pareja[] {
  const derrotasPorId = new Map<number, number>();
  for (const e of enfrentamientos) {
    if (!e.jugado || e.ganadorId === null || e.pareja2Id === null) continue;
    const perdedor = perdedorDe(e, e.ganadorId);
    if (perdedor === null) continue;
    derrotasPorId.set(perdedor, (derrotasPorId.get(perdedor) ?? 0) + 1);
  }
  return parejas.map((p) => {
    const derrotas = derrotasPorId.get(p.id) ?? 0;
    return { ...p, derrotas, eliminada: derrotas >= 2 };
  });
}
