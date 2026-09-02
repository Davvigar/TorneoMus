import { z } from "zod";

export const registrarParejaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre no puede estar vacío")
    .max(60, "El nombre es demasiado largo"),
});

export const resultadoSchema = z.object({
  enfrentamientoId: z.coerce.number().int().positive(),
  ganadorId: z.coerce.number().int().positive(),
});

export const enfrentamientoIdSchema = z.object({
  enfrentamientoId: z.coerce.number().int().positive(),
});

export const passwordSchema = z.object({
  password: z.string().min(1),
});
