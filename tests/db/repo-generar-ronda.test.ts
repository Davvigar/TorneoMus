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

function clave(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
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
    const ids = es.flatMap((e) => [e.pareja1Id, e.pareja2Id]).sort((a, b) => a! - b!);
    expect(ids).toEqual([1, 2, 3, 4]);
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

  it("NO toca rivales al generar la ronda (se hace al registrar el resultado)", async () => {
    await registrar("A", "B");
    await repo.generarSiguienteRonda();
    const ps = await repo.listarParejas();
    expect(ps.every((p) => p.rivales.length === 0)).toBe(true);
  });

  it("rechaza generar otra ronda si hay pendientes", async () => {
    await registrar("A", "B", "C", "D");
    await repo.generarSiguienteRonda();
    await expect(repo.generarSiguienteRonda()).rejects.toThrow(
      "No puedes generar una nueva ronda: hay enfrentamientos pendientes en la ronda actual.",
    );
  });

  it("permite la siguiente ronda cuando la actual está completa y evita repetir rival", async () => {
    await registrar("A", "B", "C", "D", "E", "F");
    await repo.generarSiguienteRonda();
    let es = await repo.listarEnfrentamientos();
    for (const e of es) await repo.registrarResultado(e.id, e.pareja1Id);

    await repo.generarSiguienteRonda();
    es = await repo.listarEnfrentamientos();
    const ronda2 = es.filter((e) => e.ronda === 2 && e.pareja2Id !== null);
    expect(ronda2).toHaveLength(3);

    // Ningún emparejamiento de la ronda 2 repite uno de la ronda 1.
    const ronda1Claves = new Set(
      es
        .filter((e) => e.ronda === 1 && e.pareja2Id !== null)
        .map((e) => clave(e.pareja1Id, e.pareja2Id!)),
    );
    for (const e of ronda2) {
      expect(ronda1Claves.has(clave(e.pareja1Id, e.pareja2Id!))).toBe(false);
    }
  });

  it("todas las parejas quedan cubiertas (emparejadas o descansando), 20 ejecuciones", async () => {
    for (let intento = 0; intento < 20; intento++) {
      await limpiar(db);
      await registrar("A", "B", "C", "D", "E");
      await repo.generarSiguienteRonda();
      const es = await repo.listarEnfrentamientos();
      const cubiertas = new Set<number>();
      for (const e of es) {
        cubiertas.add(e.pareja1Id);
        if (e.pareja2Id !== null) cubiertas.add(e.pareja2Id);
      }
      expect([...cubiertas].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
    }
  });
});
