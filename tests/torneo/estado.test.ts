import { describe, it, expect } from "vitest";
import type { Pareja, Enfrentamiento } from "@/lib/torneo/types";
import {
  rondaActual,
  enfrentamientosRondaActual,
  parejasActivasListado,
  contarParejasActivas,
  pendientesRondaActual,
  puedeGenerarNuevaRonda,
  torneoTerminado,
  parejaGanadora,
} from "@/lib/torneo/estado";

function pareja(over: Partial<Pareja> & { id: number; nombre: string }): Pareja {
  return { derrotas: 0, eliminada: false, descansos: 0, rivales: [], ...over };
}
function enf(over: Partial<Enfrentamiento> & { id: number; ronda: number }): Enfrentamiento {
  return { pareja1Id: 1, pareja2Id: 2, ganadorId: null, jugado: false, ...over };
}

describe("rondaActual", () => {
  it("es 0 sin enfrentamientos", () => {
    expect(rondaActual([])).toBe(0);
  });
  it("es el máximo de ronda", () => {
    expect(rondaActual([enf({ id: 1, ronda: 1 }), enf({ id: 2, ronda: 3 })])).toBe(3);
  });
});

describe("enfrentamientosRondaActual", () => {
  it("devuelve vacío si no hay rondas", () => {
    expect(enfrentamientosRondaActual([])).toEqual([]);
  });
  it("filtra por la ronda máxima y ordena por id", () => {
    const lista = [
      enf({ id: 5, ronda: 2 }),
      enf({ id: 3, ronda: 2 }),
      enf({ id: 1, ronda: 1 }),
    ];
    expect(enfrentamientosRondaActual(lista).map((e) => e.id)).toEqual([3, 5]);
  });
});

describe("criterios de activa", () => {
  it("parejasActivasListado usa derrotas < 2", () => {
    const ps = [
      pareja({ id: 1, nombre: "A", derrotas: 1 }),
      pareja({ id: 2, nombre: "B", derrotas: 2 }),
      pareja({ id: 3, nombre: "C", derrotas: 2, eliminada: false }),
    ];
    expect(parejasActivasListado(ps).map((p) => p.id)).toEqual([1]);
  });
  it("contarParejasActivas usa el flag eliminada", () => {
    const ps = [
      pareja({ id: 1, nombre: "A", derrotas: 5, eliminada: false }),
      pareja({ id: 2, nombre: "B", eliminada: true }),
    ];
    expect(contarParejasActivas(ps)).toBe(1);
  });
});

describe("pendientesRondaActual", () => {
  it("cuenta los no jugados de la ronda máxima", () => {
    const lista = [
      enf({ id: 1, ronda: 2, jugado: true }),
      enf({ id: 2, ronda: 2, jugado: false }),
      enf({ id: 3, ronda: 2, jugado: false }),
    ];
    expect(pendientesRondaActual(lista)).toBe(2);
  });
  it("es 0 si no hay rondas", () => {
    expect(pendientesRondaActual([])).toBe(0);
  });
});

describe("puedeGenerarNuevaRonda", () => {
  it("false si hay menos de 2 activas (por flag)", () => {
    const ps = [pareja({ id: 1, nombre: "A", eliminada: true }), pareja({ id: 2, nombre: "B" })];
    expect(puedeGenerarNuevaRonda(ps, [])).toBe(false);
  });
  it("true en ronda 0 con 2+ activas", () => {
    const ps = [pareja({ id: 1, nombre: "A" }), pareja({ id: 2, nombre: "B" })];
    expect(puedeGenerarNuevaRonda(ps, [])).toBe(true);
  });
  it("false si quedan enfrentamientos pendientes en la ronda actual", () => {
    const ps = [pareja({ id: 1, nombre: "A" }), pareja({ id: 2, nombre: "B" })];
    const lista = [enf({ id: 1, ronda: 1, jugado: false })];
    expect(puedeGenerarNuevaRonda(ps, lista)).toBe(false);
  });
  it("true si la ronda actual está completa", () => {
    const ps = [pareja({ id: 1, nombre: "A" }), pareja({ id: 2, nombre: "B" })];
    const lista = [enf({ id: 1, ronda: 1, jugado: true })];
    expect(puedeGenerarNuevaRonda(ps, lista)).toBe(true);
  });
});

describe("torneoTerminado y parejaGanadora", () => {
  it("no terminado en ronda 0", () => {
    const ps = [pareja({ id: 1, nombre: "A" })];
    expect(torneoTerminado(ps, [])).toBe(false);
    expect(parejaGanadora(ps, [])).toBeNull();
  });
  it("terminado si ronda > 0 y activas (flag) <= 1", () => {
    const ps = [
      pareja({ id: 1, nombre: "A", derrotas: 1 }),
      pareja({ id: 2, nombre: "B", eliminada: true }),
    ];
    const lista = [enf({ id: 1, ronda: 3, jugado: true })];
    expect(torneoTerminado(ps, lista)).toBe(true);
    expect(parejaGanadora(ps, lista)?.id).toBe(1);
  });
  it("parejaGanadora usa el listado por derrotas < 2", () => {
    const ps = [
      pareja({ id: 1, nombre: "A", derrotas: 2, eliminada: false }),
      pareja({ id: 2, nombre: "B", derrotas: 2, eliminada: true }),
    ];
    const lista = [enf({ id: 1, ronda: 3, jugado: true })];
    // activas por flag = 1 -> terminado; pero listado (derrotas<2) está vacío -> null
    expect(torneoTerminado(ps, lista)).toBe(true);
    expect(parejaGanadora(ps, lista)).toBeNull();
  });
});
