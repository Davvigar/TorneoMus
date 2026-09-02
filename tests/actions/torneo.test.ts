import { describe, it, expect, vi, beforeEach } from "vitest";

const { estadoAuth, repoMock } = vi.hoisted(() => ({
  estadoAuth: { admin: false },
  repoMock: {
    registrarPareja: vi.fn(),
    generarSiguienteRonda: vi.fn(),
    registrarResultado: vi.fn(),
    deshacerResultado: vi.fn(),
    reiniciarTorneo: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  esAdmin: () => Promise.resolve(estadoAuth.admin),
  activarAdmin: vi.fn(() => Promise.resolve()),
  desactivarAdmin: vi.fn(() => Promise.resolve()),
  passwordCorrecta: (p: string) => p === "buena",
}));

vi.mock("@/lib/db/torneo-repo", () => ({ repo: repoMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  registrarParejaAction,
  generarRondaAction,
  registrarResultadoAction,
  desbloquearAdminAction,
} from "@/app/actions/torneo";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

beforeEach(() => {
  estadoAuth.admin = false;
  vi.clearAllMocks();
});

describe("guardas de admin", () => {
  it("registrarParejaAction sin admin devuelve error", async () => {
    const r = await registrarParejaAction(null, fd({ nombre: "A" }));
    expect(r).toEqual({
      ok: false,
      error: "Necesitas desbloquear el modo administrador",
    });
    expect(repoMock.registrarPareja).not.toHaveBeenCalled();
  });

  it("generarRondaAction con admin llama al repo", async () => {
    estadoAuth.admin = true;
    repoMock.generarSiguienteRonda.mockResolvedValue(3);
    const r = await generarRondaAction(null, new FormData());
    expect(r).toEqual({
      ok: true,
      mensaje: "Nueva ronda generada con 3 enfrentamientos",
    });
  });
});

describe("validación y errores de negocio", () => {
  it("registrarParejaAction con nombre vacío devuelve el mensaje de validación", async () => {
    estadoAuth.admin = true;
    const r = await registrarParejaAction(null, fd({ nombre: "  " }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe("El nombre no puede estar vacío");
  });

  it("propaga el error del repo como {ok:false,error}", async () => {
    estadoAuth.admin = true;
    repoMock.registrarPareja.mockRejectedValue(
      new Error("Ya existe una pareja con ese nombre"),
    );
    const r = await registrarParejaAction(null, fd({ nombre: "A" }));
    expect(r).toEqual({
      ok: false,
      error: "Ya existe una pareja con ese nombre",
    });
  });

  it("registrarResultadoAction con datos inválidos no llama al repo", async () => {
    estadoAuth.admin = true;
    const r = await registrarResultadoAction(null, fd({ enfrentamientoId: "x", ganadorId: "1" }));
    expect(r.ok).toBe(false);
    expect(repoMock.registrarResultado).not.toHaveBeenCalled();
  });
});

describe("desbloquearAdminAction", () => {
  it("contraseña correcta => ok", async () => {
    const r = await desbloquearAdminAction(null, fd({ password: "buena" }));
    expect(r.ok).toBe(true);
  });
  it("contraseña incorrecta => error", async () => {
    const r = await desbloquearAdminAction(null, fd({ password: "mala" }));
    expect(r).toEqual({ ok: false, error: "Contraseña incorrecta" });
  });
});
