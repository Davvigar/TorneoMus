import { describe, it, expect } from "vitest";
import type {
  Pareja,
  Enfrentamiento,
  Emparejamiento,
  ResultadoRonda,
  EstadoTorneo,
  EnfrentamientoVista,
} from "@/lib/torneo/types";

describe("tipos del dominio", () => {
  it("Pareja tiene los campos esperados", () => {
    const p: Pareja = {
      id: 1,
      nombre: "Los Tigres",
      derrotas: 0,
      eliminada: false,
      descansos: 0,
      rivales: [],
    };
    expect(p.nombre).toBe("Los Tigres");
  });

  it("Enfrentamiento admite descanso con pareja2Id null", () => {
    const e: Enfrentamiento = {
      id: 1,
      pareja1Id: 1,
      pareja2Id: null,
      ronda: 1,
      ganadorId: null,
      jugado: true,
    };
    expect(e.pareja2Id).toBeNull();
  });

  it("ResultadoRonda agrupa descanso y emparejamientos", () => {
    const em: Emparejamiento = { pareja1Id: 1, pareja2Id: 2 };
    const r: ResultadoRonda = { descansaId: 3, emparejamientos: [em] };
    expect(r.emparejamientos).toHaveLength(1);
  });

  it("EstadoTorneo y EnfrentamientoVista son importables", () => {
    const noop = (_: EstadoTorneo | EnfrentamientoVista) => true;
    expect(typeof noop).toBe("function");
  });
});
