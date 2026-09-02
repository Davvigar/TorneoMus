import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { crearDbTest, limpiar } from "@/lib/db/testing";
import { crearRepo } from "@/lib/db/torneo-repo";
import { parejas } from "@/lib/db/schema";

const { db, cerrar } = crearDbTest();
const repo = crearRepo(db);

beforeEach(async () => {
  await limpiar(db);
});

afterAll(async () => {
  await cerrar();
});

describe("repo — lecturas", () => {
  it("listarParejas devuelve vacío al inicio", async () => {
    expect(await repo.listarParejas()).toEqual([]);
  });

  it("listarParejas mapea las columnas a Pareja", async () => {
    await db.insert(parejas).values({ nombre: "Los Tigres" });
    const [p] = await repo.listarParejas();
    expect(p).toMatchObject({
      nombre: "Los Tigres",
      derrotas: 0,
      eliminada: false,
      descansos: 0,
      rivales: [],
    });
    expect(typeof p.id).toBe("number");
  });

  it("getEnfrentamiento devuelve null si no existe", async () => {
    expect(await repo.getEnfrentamiento(999)).toBeNull();
  });
});
