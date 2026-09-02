import { describe, it, expect, beforeAll } from "vitest";
import { firmarToken, tokenValido, passwordCorrecta } from "@/lib/auth";

beforeAll(() => {
  process.env.AUTH_SECRET = "secreto-de-prueba-largo-1234567890";
  process.env.ADMIN_PASSWORD = "elmus2026";
});

describe("firmarToken / tokenValido", () => {
  it("un token recién firmado es válido", () => {
    expect(tokenValido(firmarToken())).toBe(true);
  });
  it("rechaza undefined", () => {
    expect(tokenValido(undefined)).toBe(false);
  });
  it("rechaza un token manipulado", () => {
    const t = firmarToken();
    expect(tokenValido(t + "x")).toBe(false);
    expect(tokenValido("admin.deadbeef")).toBe(false);
  });
  it("rechaza un token firmado con otro secreto", () => {
    const t = firmarToken();
    process.env.AUTH_SECRET = "otro-secreto-distinto-0987654321";
    expect(tokenValido(t)).toBe(false);
    process.env.AUTH_SECRET = "secreto-de-prueba-largo-1234567890";
  });
});

describe("passwordCorrecta", () => {
  it("true con la contraseña exacta", () => {
    expect(passwordCorrecta("elmus2026")).toBe(true);
  });
  it("false con otra contraseña", () => {
    expect(passwordCorrecta("otra")).toBe(false);
    expect(passwordCorrecta("elmus2026 ")).toBe(false);
  });
});
