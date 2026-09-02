import { describe, it, expect } from "vitest";
import {
  registrarParejaSchema,
  resultadoSchema,
  enfrentamientoIdSchema,
  passwordSchema,
} from "@/lib/validation";

describe("registrarParejaSchema", () => {
  it("recorta y acepta un nombre válido", () => {
    expect(registrarParejaSchema.parse({ nombre: "  Los Tigres  " })).toEqual({
      nombre: "Los Tigres",
    });
  });
  it("rechaza vacío", () => {
    expect(registrarParejaSchema.safeParse({ nombre: "   " }).success).toBe(false);
  });
});

describe("resultadoSchema", () => {
  it("convierte strings de formulario a número", () => {
    expect(
      resultadoSchema.parse({ enfrentamientoId: "3", ganadorId: "5" }),
    ).toEqual({ enfrentamientoId: 3, ganadorId: 5 });
  });
  it("rechaza valores no positivos", () => {
    expect(
      resultadoSchema.safeParse({ enfrentamientoId: "0", ganadorId: "5" }).success,
    ).toBe(false);
  });
});

describe("enfrentamientoIdSchema y passwordSchema", () => {
  it("enfrentamientoIdSchema exige entero positivo", () => {
    expect(enfrentamientoIdSchema.parse({ enfrentamientoId: "9" })).toEqual({
      enfrentamientoId: 9,
    });
  });
  it("passwordSchema exige no vacío", () => {
    expect(passwordSchema.safeParse({ password: "" }).success).toBe(false);
    expect(passwordSchema.parse({ password: "x" })).toEqual({ password: "x" });
  });
});
