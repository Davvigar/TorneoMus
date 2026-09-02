import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const NOMBRE_COOKIE = "torneomus_admin";
const PAYLOAD = "admin";
const DIAS_30 = 60 * 60 * 24 * 30;

function secreto(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET no está definida");
  return s;
}

function hmac(valor: string): string {
  return createHmac("sha256", secreto()).update(valor).digest("hex");
}

function comparaSegura(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function firmarToken(): string {
  return `${PAYLOAD}.${hmac(PAYLOAD)}`;
}

export function tokenValido(token: string | undefined): boolean {
  if (!token) return false;
  const partes = token.split(".");
  if (partes.length !== 2) return false;
  const [payload, firma] = partes;
  if (payload !== PAYLOAD) return false;
  return comparaSegura(firma, hmac(PAYLOAD));
}

export function passwordCorrecta(input: string): boolean {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) throw new Error("ADMIN_PASSWORD no está definida");
  return comparaSegura(input, real);
}

export async function esAdmin(): Promise<boolean> {
  const store = await cookies();
  return tokenValido(store.get(NOMBRE_COOKIE)?.value);
}

export async function activarAdmin(): Promise<void> {
  const store = await cookies();
  store.set(NOMBRE_COOKIE, firmarToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DIAS_30,
  });
}

export async function desactivarAdmin(): Promise<void> {
  const store = await cookies();
  store.delete(NOMBRE_COOKIE);
}
