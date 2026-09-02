import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { crearDbTest, limpiar } from "@/lib/db/testing";
import { crearRepo } from "@/lib/db/torneo-repo";

const { db, cerrar } = crearDbTest();
const repo = crearRepo(db);

beforeEach(() => limpiar(db));
afterAll(() => cerrar());

async function registrar(...nombres: string[]) {
  for (const n of nombres) await repo.registrarPareja(n);
}

describe("repo.generarSiguienteRonda", () => {
  it("lanza error con menos de 2 parejas activas", async () => {
    await registrar("A");
    await expect(repo.generarSiguienteRonda()).rejects.toThrow(
      "No hay suficientes parejas activas para generar una ronda",
    );
  });

  it("genera la ronda 1 con todas emparejadas si el número es par", async () => {
    await registrar("A", "B", "C", "D");
    const n = await repo.generarSiguienteRonda();
    expect(n).toBe(2);
    const es = await repo.listarEnfrentamientos();
    expect(es).toHaveLength(2);
    expect(es.every((e) => e.ronda === 1 && !e.jugado)).toBe(true);
  });

  it("con número impar crea un descanso jugado y actualiza descansos", async () => {
    await registrar("A", "B", "C");
    await repo.generarSiguienteRonda();
    const es = await repo.listarEnfrentamientos();
    const descanso = es.find((e) => e.pareja2Id === null)!;
    expect(descanso.jugado).toBe(true);
    const ps = await repo.listarParejas();
    const queDescansa = ps.find((p) => p.id === descanso.pareja1Id)!;
    expect(queDescansa.descansos).toBe(1);
  });

  it("actualiza rivales de ambas parejas en cada emparejamiento", async () => {
    await registrar("A", "B");
    await repo.generarSiguienteRonda();
    const ps = await repo.listarParejas();
    expect(ps.find((p) => p.nombre === "A")!.rivales).toEqual(["B"]);
    expect(ps.find((p) => p.nombre === "B")!.rivales).toEqual(["A"]);
  });

  it("rechaza generar otra ronda si hay pendientes", async () => {
    await registrar("A", "B", "C", "D");
    await repo.generarSiguienteRonda();
    await expect(repo.generarSiguienteRonda()).rejects.toThrow(
      "No puedes generar una nueva ronda: hay enfrentamientos pendientes en la ronda actual.",
    );
  });

  it("permite la siguiente ronda cuando la actual está completa y evita repetir rival", async () => {
    await registrar("A", "B", "C", "D");
    await repo.generarSiguienteRonda();
    let es = await repo.listarEnfrentamientos();
    for (const e of es) {
      await repo.registrarResultado(e.id, e.pareja1Id);
    }
    await repo.generarSiguienteRonda();
    es = await repo.listarEnfrentamientos();
    const ronda2 = es.filter((e) => e.ronda === 2);
    expect(ronda2).toHaveLength(2);
    // Nadie repite el rival de la ronda 1
    const ps = await repo.listarParejas();
    for (const p of ps) {
      const rivalesUnicos = new Set(p.rivales);
      expect(rivalesUnicos.size).toBe(p.rivales.length);
    }
  });
});
