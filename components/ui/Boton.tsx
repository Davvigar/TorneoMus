"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Variante = "primario" | "secundario" | "peligro" | "fantasma";

const estilos: Record<Variante, string> = {
  primario:
    "bg-terracota text-white hover:bg-terracota-oscuro",
  secundario:
    "bg-oliva text-white hover:bg-oliva-oscuro",
  peligro:
    "border border-terracota text-terracota hover:bg-terracota hover:text-white",
  fantasma:
    "border border-borde text-tinta hover:bg-crema",
};

export function Boton({
  variante = "primario",
  children,
  className = "",
  enviando,
  ...props
}: ComponentProps<"button"> & {
  variante?: Variante;
  children: ReactNode;
  enviando?: boolean;
}) {
  const { pending } = useFormStatus();
  const ocupado = enviando ?? pending;
  return (
    <button
      {...props}
      disabled={props.disabled || ocupado}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${estilos[variante]} ${className}`}
    >
      {ocupado ? "Enviando…" : children}
    </button>
  );
}
