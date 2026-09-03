import { describe, it, expect } from "vitest";
import type { Enfrentamiento, Pareja } from "@/lib/torneo/types";
import {
  rondaActual,
  rondaAMostrar,
  enfrentamientosRondaActual,
  parejasActivasListado,
  contarParejasActivas,
  pendientesRondaActual,
  puedeGenerarNuevaRonda,
  puedeGenerarPrimerasDosRondas,
  torneoTerminado,
  parejaGanadora,
} from "@/lib/torneo/estado";

function pareja(over: Partial<Pareja> & { id: number; nombre: string }): Pareja {
  return { derrotas: 0, eliminada: false, descansos: 0, rivales: [], ...over };
}
function enf(
  over: Partial<Enfrentamiento> & { id: number; ronda: number },
): Enfrentamiento {
  return { pareja1Id: 1, pareja2Id: 2, ganadorId: null, jugado: false, ...over };
}

describe("rondaActual", () => {
  it("es 0 sin enfrentamientos y el máximo si hay", () => {
    expect(rondaActual([])).toBe(0);
    expect(rondaActual([enf({ id: 1, ronda: 1 }), enf({ id: 2, ronda: 3 })])).toBe(3);
  });
});

describe("rondaAMostrar", () => {
  it("normalmente es rondaActual", () => {
    expect(rondaAMostrar([enf({ id: 1, ronda: 1, jugado: false })])).toBe(1);
    expect(
      rondaAMostrar([
        enf({ id: 1, ronda: 1, jugado: true }),
        enf({ id: 2, ronda: 3, jugado: false }),
      ]),
    ).toBe(3);
  });
  it("es 1 si rondaActual==2 y la ronda 1 tiene pendientes", () => {
    const es = [
      enf({ id: 1, ronda: 1, jugado: false }),
      enf({ id: 2, ronda: 2, jugado: false }),
    ];
    expect(rondaAMostrar(es)).toBe(1);
  });
  it("es 2 si rondaActual==2 y la ronda 1 está completa", () => {
    const es = [
      enf({ id: 1, ronda: 1, jugado: true }),
      enf({ id: 2, ronda: 2, jugado: false }),
    ];
    expect(rondaAMostrar(es)).toBe(2);
  });
});

describe("enfrentamientosRondaActual / pendientesRondaActual usan rondaAMostrar", () => {
  const es = [
    enf({ id: 1, ronda: 1, jugado: false }),
    enf({ id: 2, ronda: 1, jugado: true }),
    enf({ id: 3, ronda: 2, jugado: false }),
  ];
  it("muestra los de la ronda 1 mientras esté pendiente", () => {
    expect(enfrentamientosRondaActual(es).map((e) => e.id)).toEqual([1, 2]);
    expect(pendientesRondaActual(es)).toBe(1);
  });
  it("vacío / 0 sin rondas", () => {
    expect(enfrentamientosRondaActual([])).toEqual([]);
    expect(pendientesRondaActual([])).toBe(0);
  });
});

describe("criterio de activa: flag eliminada", () => {
  const ps = [
    pareja({ id: 1, nombre: "A", derrotas: 5, eliminada: false }),
    pareja({ id: 2, nombre: "B", derrotas: 0, eliminada: true }),
    pareja({ id: 3, nombre: "C", derrotas: 1 }),
  ];
  it("parejasActivasListado y contarParejasActivas filtran por !eliminada", () => {
    expect(parejasActivasListado(ps).map((p) => p.id)).toEqual([1, 3]);
    expect(contarParejasActivas(ps)).toBe(2);
  });
});

describe("puedeGenerarNuevaRonda", () => {
  const dos = [pareja({ id: 1, nombre: "A" }), pareja({ id: 2, nombre: "B" })];
  it("false con menos de 2 activas", () => {
    const ps = [pareja({ id: 1, nombre: "A", eliminada: true }), pareja({ id: 2, nombre: "B" })];
    expect(puedeGenerarNuevaRonda(ps, [])).toBe(false);
  });
  it("true en ronda 0", () => {
    expect(puedeGenerarNuevaRonda(dos, [])).toBe(true);
  });
  it("false si la ronda actual tiene pendientes", () => {
    expect(puedeGenerarNuevaRonda(dos, [enf({ id: 1, ronda: 1, jugado: false })])).toBe(false);
  });
  it("false si rondaActual==2 y la ronda 1 sigue pendiente (aunque la 2 esté hecha)", () => {
    const es = [
      enf({ id: 1, ronda: 1, jugado: false }),
      enf({ id: 2, ronda: 2, jugado: true }),
    ];
    expect(puedeGenerarNuevaRonda(dos, es)).toBe(false);
  });
  it("true si rondaActual==2, la ronda 1 está hecha y la 2 también", () => {
    const es = [
      enf({ id: 1, ronda: 1, jugado: true }),
      enf({ id: 2, ronda: 2, jugado: true }),
    ];
    expect(puedeGenerarNuevaRonda(dos, es)).toBe(true);
  });
});

describe("puedeGenerarPrimerasDosRondas", () => {
  const dos = [pareja({ id: 1, nombre: "A" }), pareja({ id: 2, nombre: "B" })];
  it("true con >=2 activas y ronda 0", () => {
    expect(puedeGenerarPrimerasDosRondas(dos, [])).toBe(true);
  });
  it("false si ya hay rondas", () => {
    expect(puedeGenerarPrimerasDosRondas(dos, [enf({ id: 1, ronda: 1 })])).toBe(false);
  });
  it("false con menos de 2 activas", () => {
    const ps = [pareja({ id: 1, nombre: "A" })];
    expect(puedeGenerarPrimerasDosRondas(ps, [])).toBe(false);
  });
});

describe("torneoTerminado y parejaGanadora", () => {
  it("no terminado en ronda 0", () => {
    const ps = [pareja({ id: 1, nombre: "A" })];
    expect(torneoTerminado(ps, [])).toBe(false);
    expect(parejaGanadora(ps, [])).toBeNull();
  });
  it("terminado si ronda > 0 y queda 1 activa (flag)", () => {
    const ps = [
      pareja({ id: 1, nombre: "A", derrotas: 1 }),
      pareja({ id: 2, nombre: "B", eliminada: true }),
    ];
    const es = [enf({ id: 1, ronda: 3, jugado: true })];
    expect(torneoTerminado(ps, es)).toBe(true);
    expect(parejaGanadora(ps, es)?.id).toBe(1);
  });
});
