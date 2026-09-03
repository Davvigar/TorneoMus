import { describe, it, expect } from "vitest";
import type { Pareja } from "@/lib/torneo/types";
import {
  generarEmparejamientos,
  type YaSeEnfrentaron,
} from "@/lib/torneo/emparejar";

function pareja(over: Partial<Pareja> & { id: number; nombre: string }): Pareja {
  return { derrotas: 0, eliminada: false, descansos: 0, rivales: [], ...over };
}

/** PRNG determinista (mulberry32) para tests reproducibles. */
function rngSemilla(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parejasN(n: number): Pareja[] {
  return Array.from({ length: n }, (_, i) =>
    pareja({ id: i + 1, nombre: `P${String(i + 1).padStart(2, "0")}` }),
  );
}

function idsEmparejadas(r: ReturnType<typeof generarEmparejamientos>): number[] {
  return r.emparejamientos.flatMap((e) => [e.pareja1Id, e.pareja2Id]).sort((a, b) => a - b);
}

describe("generarEmparejamientos", () => {
  it("lanza error con menos de 2 parejas", () => {
    expect(() =>
      generarEmparejamientos([pareja({ id: 1, nombre: "A" })]),
    ).toThrow("No hay suficientes parejas activas para generar una ronda");
  });

  it("con número par: nadie descansa y todas quedan emparejadas (varias semillas)", () => {
    for (let s = 1; s <= 20; s++) {
      const ps = parejasN(6);
      const r = generarEmparejamientos(ps, () => false, rngSemilla(s));
      expect(r.descansaId).toBeNull();
      expect(r.emparejamientos).toHaveLength(3);
      expect(idsEmparejadas(r)).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it("con número impar: descansa una y el resto queda emparejado (varias semillas)", () => {
    for (let s = 1; s <= 20; s++) {
      const ps = parejasN(5);
      const r = generarEmparejamientos(ps, () => false, rngSemilla(s));
      expect(r.descansaId).not.toBeNull();
      expect(r.emparejamientos).toHaveLength(2);
      const cubiertas = [...idsEmparejadas(r), r.descansaId!].sort((a, b) => a - b);
      expect(cubiertas).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it("el que descansa es de los que menos han descansado", () => {
    const ps = [
      pareja({ id: 1, nombre: "A", descansos: 2 }),
      pareja({ id: 2, nombre: "B", descansos: 0 }),
      pareja({ id: 3, nombre: "C", descansos: 0 }),
      pareja({ id: 4, nombre: "D", descansos: 1 }),
      pareja({ id: 5, nombre: "E", descansos: 3 }),
    ];
    const vistos = new Set<number>();
    for (let s = 1; s <= 40; s++) {
      const r = generarEmparejamientos(ps, () => false, rngSemilla(s));
      vistos.add(r.descansaId!);
    }
    // Solo B (id 2) y C (id 3) tienen el mínimo (0 descansos).
    expect([...vistos].sort()).toEqual([2, 3]);
  });

  it("no repite rival cuando hay alternativa", () => {
    // A(1) ya jugó contra B(2). Con C(3) y D(4) libres, A no debe emparejarse con B.
    const yaSe: YaSeEnfrentaron = (x, y) =>
      (x === 1 && y === 2) || (x === 2 && y === 1);
    for (let s = 1; s <= 30; s++) {
      const r = generarEmparejamientos(parejasN(4), yaSe, rngSemilla(s));
      const parA = r.emparejamientos.find(
        (e) => e.pareja1Id === 1 || e.pareja2Id === 1,
      )!;
      const rivalDeA = parA.pareja1Id === 1 ? parA.pareja2Id : parA.pareja1Id;
      expect(rivalDeA).not.toBe(2);
    }
  });

  it("repite rival solo cuando es inevitable", () => {
    const yaSe: YaSeEnfrentaron = () => true; // todas se han enfrentado ya
    const r = generarEmparejamientos(parejasN(2), yaSe, rngSemilla(7));
    expect(idsEmparejadas(r)).toEqual([1, 2]);
    expect(r.emparejamientos).toHaveLength(1);
  });

  it("con 8 parejas y muchas restricciones, evita repetir todo lo posible", () => {
    // Cada pareja ya jugó contra su vecina (1-2, 3-4, 5-6, 7-8).
    const parejasYaJugadas = new Set(["1-2", "3-4", "5-6", "7-8"]);
    const yaSe: YaSeEnfrentaron = (x, y) => {
      const k = x < y ? `${x}-${y}` : `${y}-${x}`;
      return parejasYaJugadas.has(k);
    };
    for (let s = 1; s <= 20; s++) {
      const r = generarEmparejamientos(parejasN(8), yaSe, rngSemilla(s));
      expect(r.emparejamientos).toHaveLength(4);
      expect(idsEmparejadas(r)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      // Ninguno de los emparejamientos repite un enfrentamiento previo.
      for (const e of r.emparejamientos) {
        const k =
          e.pareja1Id < e.pareja2Id
            ? `${e.pareja1Id}-${e.pareja2Id}`
            : `${e.pareja2Id}-${e.pareja1Id}`;
        expect(parejasYaJugadas.has(k)).toBe(false);
      }
    }
  });

  it("no muta la entrada", () => {
    const ps = parejasN(5);
    const copia = JSON.parse(JSON.stringify(ps));
    generarEmparejamientos(ps, () => false, rngSemilla(3));
    expect(ps).toEqual(copia);
  });
});
