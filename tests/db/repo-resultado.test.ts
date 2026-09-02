import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { crearDbTest, limpiar } from "@/lib/db/testing";
import { crearRepo } from "@/lib/db/torneo-repo";

const { db, cerrar } = crearDbTest();
const repo = crearRepo(db);

beforeEach(() => limpiar(db));
afterAll(() => cerrar());

async function torneoConRonda(...nombres: string[]) {
  for (const n of nombres) await repo.registrarPareja(n);
  await repo.generarSiguienteRonda();
  return repo.listarEnfrentamientos();
}

describe("repo.registrarResultado", () => {
  it("marca el enfrentamiento como jugado y suma derrota al perdedor", async () => {
    const [e] = await torneoConRonda("A", "B");
    await repo.registrarResultado(e.id, e.pareja1Id);
    const actualizado = await repo.getEnfrentamiento(e.id);
    expect(actualizado).toMatchObject({ jugado: true, ganadorId: e.pareja1Id });
    const ps = await repo.listarParejas();
    expect(ps.find((p) => p.id === e.pareja2Id)!.derrotas).toBe(1);
    expect(ps.find((p) => p.id === e.pareja1Id)!.derrotas).toBe(0);
  });

  it("elimina al perdedor tras su segunda derrota", async () => {
    const [e1] = await torneoConRonda("A", "B", "C", "D");
    // resolver ronda 1: gana pareja1 en ambos
    const r1 = await repo.listarEnfrentamientos();
    for (const e of r1) await repo.registrarResultado(e.id, e.pareja1Id);
    await repo.generarSiguienteRonda();
    const r2 = (await repo.listarEnfrentamientos()).filter((e) => e.ronda === 2);
    for (const e of r2) await repo.registrarResultado(e.id, e.pareja1Id);
    const ps = await repo.listarParejas();
    const dobleDerrota = ps.filter((p) => p.derrotas >= 2);
    expect(dobleDerrota.every((p) => p.eliminada)).toBe(true);
    expect(dobleDerrota.length).toBeGreaterThan(0);
    void e1;
  });

  it("rechaza un ganador que no participa", async () => {
    const [e] = await torneoConRonda("A", "B");
    await expect(repo.registrarResultado(e.id, 999)).rejects.toThrow(
      "La pareja ganadora no participa en este enfrentamiento",
    );
  });

  it("rechaza un enfrentamiento inexistente", async () => {
    await expect(repo.registrarResultado(999, 1)).rejects.toThrow(
      "Enfrentamiento no encontrado",
    );
  });

  it("permite corregir el ganador de un enfrentamiento ya jugado", async () => {
    const [e] = await torneoConRonda("A", "B");
    await repo.registrarResultado(e.id, e.pareja1Id);
    await repo.registrarResultado(e.id, e.pareja2Id!);
    const ps = await repo.listarParejas();
    expect(ps.find((p) => p.id === e.pareja1Id)!.derrotas).toBe(1);
    expect(ps.find((p) => p.id === e.pareja2Id)!.derrotas).toBe(0);
  });
});

describe("repo.deshacerResultado", () => {
  it("revierte el enfrentamiento y recalcula derrotas", async () => {
    const [e] = await torneoConRonda("A", "B");
    await repo.registrarResultado(e.id, e.pareja1Id);
    await repo.deshacerResultado(e.id);
    const actualizado = await repo.getEnfrentamiento(e.id);
    expect(actualizado).toMatchObject({ jugado: false, ganadorId: null });
    const ps = await repo.listarParejas();
    expect(ps.every((p) => p.derrotas === 0 && !p.eliminada)).toBe(true);
  });

  it("rechaza deshacer un enfrentamiento no jugado", async () => {
    const [e] = await torneoConRonda("A", "B");
    await expect(repo.deshacerResultado(e.id)).rejects.toThrow(
      "Este enfrentamiento no tiene resultado que deshacer",
    );
  });
});
