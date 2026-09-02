import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { crearDbTest, limpiar } from "@/lib/db/testing";
import { crearRepo } from "@/lib/db/torneo-repo";

const { db, cerrar } = crearDbTest();
const repo = crearRepo(db);

beforeEach(() => limpiar(db));
afterAll(() => cerrar());

describe("repo.registrarPareja", () => {
  it("inserta una pareja nueva", async () => {
    await repo.registrarPareja("Los Tigres");
    const nombres = (await repo.listarParejas()).map((p) => p.nombre);
    expect(nombres).toEqual(["Los Tigres"]);
  });

  it("rechaza un nombre duplicado con el mensaje portado", async () => {
    await repo.registrarPareja("Los Tigres");
    await expect(repo.registrarPareja("Los Tigres")).rejects.toThrow(
      "Ya existe una pareja con ese nombre",
    );
  });
});
