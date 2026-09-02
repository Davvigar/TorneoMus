import { describe, it, expect } from "vitest";
import type { Pareja } from "@/lib/torneo/types";
import { generarEmparejamientos } from "@/lib/torneo/emparejar";

function pareja(over: Partial<Pareja> & { id: number; nombre: string }): Pareja {
  return { derrotas: 0, eliminada: false, descansos: 0, rivales: [], ...over };
}

describe("generarEmparejamientos", () => {
  it("lanza error con menos de 2 parejas", () => {
    expect(() => generarEmparejamientos([pareja({ id: 1, nombre: "A" })])).toThrow(
      "No hay suficientes parejas activas para generar una ronda",
    );
  });

  it("empareja todas cuando el número es par y nadie descansa", () => {
    const ps = [
      pareja({ id: 1, nombre: "A" }),
      pareja({ id: 2, nombre: "B" }),
      pareja({ id: 3, nombre: "C" }),
      pareja({ id: 4, nombre: "D" }),
    ];
    const r = generarEmparejamientos(ps);
    expect(r.descansaId).toBeNull();
    expect(r.emparejamientos).toHaveLength(2);
    const ids = r.emparejamientos.flatMap((e) => [e.pareja1Id, e.pareja2Id]).sort();
    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it("con número impar descansa la de menos descansos", () => {
    const ps = [
      pareja({ id: 1, nombre: "A", descansos: 1 }),
      pareja({ id: 2, nombre: "B", descansos: 0 }),
      pareja({ id: 3, nombre: "C", descansos: 2 }),
    ];
    const r = generarEmparejamientos(ps);
    expect(r.descansaId).toBe(2);
    expect(r.emparejamientos).toHaveLength(1);
  });

  it("desempata el descanso por nombre ascendente", () => {
    const ps = [
      pareja({ id: 1, nombre: "Zeta", descansos: 0 }),
      pareja({ id: 2, nombre: "Alfa", descansos: 0 }),
      pareja({ id: 3, nombre: "Beta", descansos: 0 }),
    ];
    const r = generarEmparejamientos(ps);
    expect(r.descansaId).toBe(2); // "Alfa"
  });

  it("evita emparejar rivales ya jugados si hay alternativa", () => {
    const ps = [
      pareja({ id: 1, nombre: "A", rivales: ["B"] }),
      pareja({ id: 2, nombre: "B", rivales: ["A"] }),
      pareja({ id: 3, nombre: "C" }),
      pareja({ id: 4, nombre: "D" }),
    ];
    const r = generarEmparejamientos(ps);
    const parA = r.emparejamientos.find(
      (e) => e.pareja1Id === 1 || e.pareja2Id === 1,
    )!;
    const rivalDeA = parA.pareja1Id === 1 ? parA.pareja2Id : parA.pareja1Id;
    expect(rivalDeA).not.toBe(2);
  });

  it("repite rival cuando es inevitable", () => {
    const ps = [
      pareja({ id: 1, nombre: "A", rivales: ["B"] }),
      pareja({ id: 2, nombre: "B", rivales: ["A"] }),
    ];
    const r = generarEmparejamientos(ps);
    expect(r.emparejamientos).toEqual([{ pareja1Id: 1, pareja2Id: 2 }]);
  });
});
