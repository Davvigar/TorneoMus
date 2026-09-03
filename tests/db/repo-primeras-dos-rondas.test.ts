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

describe("repo.generarPrimerasDosRondas", () => {
  it("genera la R1 y la R2; ambas quedan disponibles para meter resultados", async () => {
    await registrar("A", "B", "C", "D");
    const n = await repo.generarPrimerasDosRondas();
    expect(n).toBe(4); // 2 enfrentamientos por ronda

    const es = await repo.listarEnfrentamientos();
    expect(es.filter((e) => e.ronda === 1)).toHaveLength(2);
    expect(es.filter((e) => e.ronda === 2)).toHaveLength(2);

    const estado = await repo.getEstadoTorneo();
    expect(estado.rondaActual).toBe(2);
    // El dashboard muestra los 4 enfrentamientos (R1 + R2), en cualquier orden.
    expect(estado.enfrentamientosActuales).toHaveLength(4);
    const rondasMostradas = new Set(
      estado.enfrentamientosActuales.map((e) => e.ronda),
    );
    expect([...rondasMostradas].sort()).toEqual([1, 2]);
    expect(estado.pendientesRondaActual).toBe(4);
    expect(estado.puedeGenerarNuevaRonda).toBe(false); // faltan R1 y R2
    expect(estado.puedeGenerarPrimerasDosRondas).toBe(false);
  });

  it("se puede meter el resultado de un enfrentamiento de la R2 sin haber tocado la R1", async () => {
    await registrar("A", "B", "C", "D");
    await repo.generarPrimerasDosRondas();
    const es = await repo.listarEnfrentamientos();
    const enfR2 = es.find((e) => e.ronda === 2 && e.pareja2Id !== null)!;
    await repo.registrarResultado(enfR2.id, enfR2.pareja1Id);
    const actualizado = await repo.getEnfrentamiento(enfR2.id);
    expect(actualizado).toMatchObject({ jugado: true, ronda: 2 });
    // La R1 sigue intacta y visible.
    const estado = await repo.getEstadoTorneo();
    expect(
      estado.enfrentamientosActuales.filter((e) => e.ronda === 1 && !e.jugado),
    ).toHaveLength(2);
  });

  it("la ronda 2 no repite los emparejamientos de la ronda 1", async () => {
    await registrar("A", "B", "C", "D", "E", "F");
    await repo.generarPrimerasDosRondas();
    const es = await repo.listarEnfrentamientos();
    const cl = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
    const r1 = new Set(
      es.filter((e) => e.ronda === 1 && e.pareja2Id !== null).map((e) => cl(e.pareja1Id, e.pareja2Id!)),
    );
    for (const e of es.filter((e) => e.ronda === 2 && e.pareja2Id !== null)) {
      expect(r1.has(cl(e.pareja1Id, e.pareja2Id!))).toBe(false);
    }
  });

  it("al completar la R1, el dashboard deja de mostrarla; con R1 y R2 hechas se puede generar la 3", async () => {
    await registrar("A", "B", "C", "D");
    await repo.generarPrimerasDosRondas();
    const r1 = (await repo.listarEnfrentamientos()).filter((e) => e.ronda === 1);
    for (const e of r1) await repo.registrarResultado(e.id, e.pareja1Id);

    const estado = await repo.getEstadoTorneo();
    expect(estado.enfrentamientosActuales.every((e) => e.ronda === 2)).toBe(true);
    expect(estado.puedeGenerarNuevaRonda).toBe(false); // R2 pendiente

    const r2 = (await repo.listarEnfrentamientos()).filter((e) => e.ronda === 2);
    for (const e of r2) await repo.registrarResultado(e.id, e.pareja1Id);
    const estado2 = await repo.getEstadoTorneo();
    expect(estado2.puedeGenerarNuevaRonda).toBe(true);
    await repo.generarSiguienteRonda();
    expect(
      (await repo.listarEnfrentamientos()).some((e) => e.ronda === 3),
    ).toBe(true);
  });

  it("rechaza generarlas si el torneo ya empezó", async () => {
    await registrar("A", "B");
    await repo.generarSiguienteRonda();
    await expect(repo.generarPrimerasDosRondas()).rejects.toThrow(
      "Solo se pueden generar las primeras dos rondas cuando el torneo está en ronda 0",
    );
  });
});
