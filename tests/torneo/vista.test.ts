import { describe, it, expect } from "vitest";
import type { Enfrentamiento, Pareja } from "@/lib/torneo/types";
import { enfrentamientoAVista } from "@/lib/torneo/vista";

function pareja(id: number, nombre: string): Pareja {
  return { id, nombre, derrotas: 0, eliminada: false, descansos: 0, rivales: [] };
}
const indice = new Map<number, Pareja>([
  [1, pareja(1, "Los Tigres")],
  [2, pareja(2, "Las Águilas")],
]);

function enf(over: Partial<Enfrentamiento> & { id: number }): Enfrentamiento {
  return { pareja1Id: 1, pareja2Id: 2, ronda: 1, ganadorId: null, jugado: false, ...over };
}

describe("enfrentamientoAVista", () => {
  it("mapea un enfrentamiento normal jugado", () => {
    const v = enfrentamientoAVista(
      enf({ id: 7, jugado: true, ganadorId: 1 }),
      indice,
    );
    expect(v).toMatchObject({
      id: 7,
      ronda: 1,
      jugado: true,
      esDescanso: false,
      pareja1: { id: 1, nombre: "Los Tigres" },
      pareja2: { id: 2, nombre: "Las Águilas" },
      ganador: { id: 1, nombre: "Los Tigres" },
      perdedor: { id: 2, nombre: "Las Águilas" },
    });
  });

  it("marca descanso cuando pareja2Id es null", () => {
    const v = enfrentamientoAVista(
      enf({ id: 8, pareja2Id: null, jugado: true }),
      indice,
    );
    expect(v.esDescanso).toBe(true);
    expect(v.pareja2).toBeNull();
    expect(v.ganador).toBeNull();
    expect(v.perdedor).toBeNull();
  });

  it("sin ganador todavía, perdedor es null", () => {
    const v = enfrentamientoAVista(enf({ id: 9 }), indice);
    expect(v.ganador).toBeNull();
    expect(v.perdedor).toBeNull();
  });
});
