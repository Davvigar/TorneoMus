"use server";

import { revalidatePath } from "next/cache";
import {
  activarAdmin,
  desactivarAdmin,
  esAdmin,
  passwordCorrecta,
} from "@/lib/auth";
import { repo } from "@/lib/db/torneo-repo";
import {
  enfrentamientoIdSchema,
  passwordSchema,
  registrarParejaSchema,
  resultadoSchema,
} from "@/lib/validation";

export type AccionResultado = {
  ok: boolean;
  mensaje?: string;
  error?: string;
};

const SIN_ADMIN: AccionResultado = {
  ok: false,
  error: "Necesitas desbloquear el modo administrador",
};

function mensajeError(e: unknown, porDefecto: string): AccionResultado {
  return { ok: false, error: e instanceof Error ? e.message : porDefecto };
}

function revalidarTorneo() {
  revalidatePath("/");
  revalidatePath("/clasificacion");
  revalidatePath("/historial");
}

export async function desbloquearAdminAction(
  _prev: AccionResultado | null,
  formData: FormData,
): Promise<AccionResultado> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success || !passwordCorrecta(parsed.data.password)) {
    return { ok: false, error: "Contraseña incorrecta" };
  }
  await activarAdmin();
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Modo administrador activado" };
}

export async function bloquearAdminAction(
  _prev: AccionResultado | null,
  _formData: FormData,
): Promise<AccionResultado> {
  await desactivarAdmin();
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Modo administrador desactivado" };
}

export async function registrarParejaAction(
  _prev: AccionResultado | null,
  formData: FormData,
): Promise<AccionResultado> {
  if (!(await esAdmin())) return SIN_ADMIN;
  const parsed = registrarParejaSchema.safeParse({
    nombre: formData.get("nombre"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  try {
    await repo.registrarPareja(parsed.data.nombre);
    revalidarTorneo();
    return {
      ok: true,
      mensaje: `Pareja '${parsed.data.nombre}' registrada correctamente`,
    };
  } catch (e) {
    return mensajeError(e, "Error al registrar la pareja");
  }
}

export async function generarRondaAction(
  _prev: AccionResultado | null,
  _formData: FormData,
): Promise<AccionResultado> {
  if (!(await esAdmin())) return SIN_ADMIN;
  try {
    const n = await repo.generarSiguienteRonda();
    revalidarTorneo();
    return { ok: true, mensaje: `Nueva ronda generada con ${n} enfrentamientos` };
  } catch (e) {
    return mensajeError(e, "Error al generar la ronda");
  }
}

export async function registrarResultadoAction(
  _prev: AccionResultado | null,
  formData: FormData,
): Promise<AccionResultado> {
  if (!(await esAdmin())) return SIN_ADMIN;
  const parsed = resultadoSchema.safeParse({
    enfrentamientoId: formData.get("enfrentamientoId"),
    ganadorId: formData.get("ganadorId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Datos del resultado no válidos" };
  }
  try {
    await repo.registrarResultado(
      parsed.data.enfrentamientoId,
      parsed.data.ganadorId,
    );
    revalidarTorneo();
    return { ok: true, mensaje: "Resultado registrado correctamente" };
  } catch (e) {
    return mensajeError(e, "Error al registrar el resultado");
  }
}

export async function deshacerResultadoAction(
  _prev: AccionResultado | null,
  formData: FormData,
): Promise<AccionResultado> {
  if (!(await esAdmin())) return SIN_ADMIN;
  const parsed = enfrentamientoIdSchema.safeParse({
    enfrentamientoId: formData.get("enfrentamientoId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Enfrentamiento no válido" };
  }
  try {
    await repo.deshacerResultado(parsed.data.enfrentamientoId);
    revalidarTorneo();
    return { ok: true, mensaje: "Resultado deshecho" };
  } catch (e) {
    return mensajeError(e, "Error al deshacer el resultado");
  }
}

export async function reiniciarTorneoAction(
  _prev: AccionResultado | null,
  _formData: FormData,
): Promise<AccionResultado> {
  if (!(await esAdmin())) return SIN_ADMIN;
  try {
    await repo.reiniciarTorneo();
    revalidarTorneo();
    return {
      ok: true,
      mensaje: "Torneo reiniciado. Puedes registrar nuevas parejas.",
    };
  } catch (e) {
    return mensajeError(e, "No se pudo reiniciar");
  }
}
