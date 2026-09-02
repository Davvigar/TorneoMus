import { describe, it, expect } from "vitest";
import type { Enfrentamiento, Pareja } from "@/lib/torneo/types";
import {
  ganadorParticipa,
  perdedorDe,
  recomputarEstadoParejas,
} from "@/lib/torneo/reglas";

function pareja(over: Partial<Pareja> & { id: number; nombre: string }): Pareja {
  return { derrotas: 0, eliminada: false, descansos: 0, rivales: [], ...over };
}
function enf(over: Partial<Enfrentamiento> & { id: number }): Enfrentamiento {
  return { pareja1Id: 1, pareja2Id: 2, ronda: 1, ganadorId: null, jugado: false, ...over };
}

describe("ganadorParticipa", () => {
  it("true si el ganador es una de las dos parejas", () => {
    expect(ganadorParticipa(enf({ id: 1, pareja1Id: 3, pareja2Id: 4 }), 4)).toBe(true);
  });
  it("false si el ganador no participa", () => {
    expect(ganadorParticipa(enf({ id: 1, pareja1Id: 3, pareja2Id: 4 }), 9)).toBe(false);
  });
});

describe("perdedorDe", () => {
  it("devuelve la otra pareja", () => {
    expect(perdedorDe(enf({ id: 1, pareja1Id: 3, pareja2Id: 4 }), 3)).toBe(4);
    expect(perdedorDe(enf({ id: 1, pareja1Id: 3, pareja2Id: 4 }), 4)).toBe(3);
  });
  it("null en un descanso", () => {
    expect(perdedorDe(enf({ id: 1, pareja1Id: 3, pareja2Id: null }), 3)).toBeNull();
  });
});

describe("recomputarEstadoParejas", () => {
  it("cuenta derrotas de los enfrentamientos jugados", () => {
    const ps = [
      pareja({ id: 1, nombre: "A" }),
      pareja({ id: 2, nombre: "B" }),
      pareja({ id: 3, nombre: "C" }),
    ];
    const es = [
      enf({ id: 1, pareja1Id: 1, pareja2Id: 2, jugado: true, ganadorId: 1 }),
      enf({ id: 2, pareja1Id: 2, pareja2Id: 3, jugado: true, ganadorId: 3 }),
      enf({ id: 3, pareja1Id: 1, pareja2Id: 3, jugado: false, ganadorId: null }),
    ];
    const r = recomputarEstadoParejas(ps, es);
    expect(r.find((p) => p.id === 2)!.derrotas).toBe(2);
    expect(r.find((p) => p.id === 2)!.eliminada).toBe(true);
    expect(r.find((p) => p.id === 1)!.derrotas).toBe(0);
    expect(r.find((p) => p.id === 1)!.eliminada).toBe(false);
  });

  it("elimina a las 2 derrotas sin mirar la ronda (réplica de agregarDerrota)", () => {
    const ps = [pareja({ id: 1, nombre: "A" }), pareja({ id: 2, nombre: "B" })];
    const es = [
      enf({ id: 1, ronda: 1, pareja1Id: 1, pareja2Id: 2, jugado: true, ganadorId: 1 }),
      enf({ id: 2, ronda: 2, pareja1Id: 1, pareja2Id: 2, jugado: true, ganadorId: 1 }),
    ];
    const r = recomputarEstadoParejas(ps, es);
    expect(r.find((p) => p.id === 2)!.eliminada).toBe(true);
  });

  it("ignora descansos y no muta la entrada", () => {
    const ps = [pareja({ id: 1, nombre: "A", derrotas: 5, eliminada: true })];
    const es = [enf({ id: 1, pareja1Id: 1, pareja2Id: null, jugado: true, ganadorId: null })];
    const r = recomputarEstadoParejas(ps, es);
    expect(r[0].derrotas).toBe(0);
    expect(r[0].eliminada).toBe(false);
    expect(ps[0].derrotas).toBe(5);
  });

  it("recalcula correctamente tras deshacer (un jugado menos)", () => {
    const ps = [pareja({ id: 1, nombre: "A" }), pareja({ id: 2, nombre: "B" })];
    const esAntes = [
      enf({ id: 1, pareja1Id: 1, pareja2Id: 2, jugado: true, ganadorId: 1 }),
      enf({ id: 2, pareja1Id: 1, pareja2Id: 2, jugado: true, ganadorId: 1 }),
    ];
    expect(recomputarEstadoParejas(ps, esAntes).find((p) => p.id === 2)!.eliminada).toBe(true);
    const esDespues = [
      esAntes[0],
      { ...esAntes[1], jugado: false, ganadorId: null },
    ];
    const r = recomputarEstadoParejas(ps, esDespues);
    expect(r.find((p) => p.id === 2)!.derrotas).toBe(1);
    expect(r.find((p) => p.id === 2)!.eliminada).toBe(false);
  });
});
