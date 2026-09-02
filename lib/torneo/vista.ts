import type { Enfrentamiento, EnfrentamientoVista, Pareja, RefPareja } from "./types";
import { perdedorDe } from "./reglas";

function ref(indice: Map<number, Pareja>, id: number | null): RefPareja | null {
  if (id === null) return null;
  const p = indice.get(id);
  return p ? { id: p.id, nombre: p.nombre } : null;
}

export function enfrentamientoAVista(
  e: Enfrentamiento,
  indice: Map<number, Pareja>,
): EnfrentamientoVista {
  const esDescanso = e.pareja2Id === null;
  const pareja1 = ref(indice, e.pareja1Id) ?? { id: e.pareja1Id, nombre: "—" };
  const pareja2 = esDescanso ? null : ref(indice, e.pareja2Id);
  const ganador = esDescanso ? null : ref(indice, e.ganadorId);
  const perdedorId =
    !esDescanso && e.jugado && e.ganadorId !== null
      ? perdedorDe(e, e.ganadorId)
      : null;
  const perdedor = ref(indice, perdedorId);

  return {
    id: e.id,
    ronda: e.ronda,
    jugado: e.jugado,
    esDescanso,
    pareja1,
    pareja2,
    ganador,
    perdedor,
  };
}
