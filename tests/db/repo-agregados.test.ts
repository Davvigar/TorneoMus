import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { crearDbTest, limpiar } from "@/lib/db/testing";
import { crearRepo } from "@/lib/db/torneo-repo";

const { db, cerrar } = crearDbTest();
const repo = crearRepo(db);

beforeEach(() => limpiar(db));
afterAll(() => cerrar());

describe("repo.reiniciarTorneo", () => {
  it("borra parejas y enfrentamientos y reinicia los ids", async () => {
    await repo.registrarPareja("A");
    await repo.registrarPareja("B");
    await repo.generarSiguienteRonda();
    await repo.reiniciarTorneo();
    expect(await repo.listarParejas()).toEqual([]);
    expect(await repo.listarEnfrentamientos()).toEqual([]);
    await repo.registrarPareja("C");
    expect((await repo.listarParejas())[0].id).toBe(1);
  });
});

describe("repo.getEstadoTorneo", () => {
  it("refleja ronda 0 sin datos", async () => {
    const e = await repo.getEstadoTorneo();
    expect(e).toMatchObject({
      rondaActual: 0,
      totalParejas: 0,
      parejasActivasCount: 0,
      pendientesRondaActual: 0,
      puedeGenerarNuevaRonda: false,
      puedeGenerarPrimerasDosRondas: false,
      torneoTerminado: false,
      parejaGanadora: null,
    });
  });

  it("puedeGenerarPrimerasDosRondas con >=2 parejas y ronda 0", async () => {
    await repo.registrarPareja("A");
    await repo.registrarPareja("B");
    const e = await repo.getEstadoTorneo();
    expect(e.puedeGenerarPrimerasDosRondas).toBe(true);
    expect(e.puedeGenerarNuevaRonda).toBe(true);
  });

  it("cuenta pendientes y permite/deniega nueva ronda", async () => {
    await repo.registrarPareja("A");
    await repo.registrarPareja("B");
    await repo.generarSiguienteRonda();
    const e = await repo.getEstadoTorneo();
    expect(e.rondaActual).toBe(1);
    expect(e.pendientesRondaActual).toBe(1);
    expect(e.puedeGenerarNuevaRonda).toBe(false);
    expect(e.enfrentamientosActuales).toHaveLength(1);
  });
});

describe("repo.getClasificacion", () => {
  it("separa activas (por flag) y eliminadas, ordenadas por derrotas", async () => {
    for (const n of ["A", "B", "C", "D"]) await repo.registrarPareja(n);
    const r1 = (await (async () => {
      await repo.generarSiguienteRonda();
      return repo.listarEnfrentamientos();
    })());
    for (const e of r1) await repo.registrarResultado(e.id, e.pareja1Id);
    const c = await repo.getClasificacion();
    expect(c.activas.length + c.eliminadas.length).toBe(4);
    const derrotasOrdenadas = c.activas.map((p) => p.derrotas);
    expect([...derrotasOrdenadas]).toEqual([...derrotasOrdenadas].sort((a, b) => a - b));
  });
});

describe("repo.getHistorial", () => {
  it("agrupa enfrentamientos por ronda, de la más reciente a la más antigua", async () => {
    await repo.registrarPareja("A");
    await repo.registrarPareja("B");
    await repo.generarSiguienteRonda();
    const [e] = await repo.listarEnfrentamientos();
    await repo.registrarResultado(e.id, e.pareja1Id);
    await repo.generarSiguienteRonda();
    const h = await repo.getHistorial();
    expect(h.map((g) => g.ronda)).toEqual([2, 1]);
    expect(h[0].enfrentamientos.length).toBeGreaterThan(0);
    expect(h[0].enfrentamientos[0]).toHaveProperty("pareja1");
  });
});
