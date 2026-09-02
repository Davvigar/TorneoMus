"use client";

import { Alerta } from "@/components/ui/Alerta";
import type { AccionResultado } from "@/app/actions/torneo";

export function AlertaAccion({ estado }: { estado: AccionResultado | null }) {
  if (!estado) return null;
  if (estado.ok && estado.mensaje) {
    return <Alerta tono="exito">{estado.mensaje}</Alerta>;
  }
  if (!estado.ok && estado.error) {
    return <Alerta tono="error">{estado.error}</Alerta>;
  }
  return null;
}
