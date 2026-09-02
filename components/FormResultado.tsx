"use client";

import { useActionState } from "react";
import { Boton } from "@/components/ui/Boton";
import { AlertaAccion } from "@/components/AlertaAccion";
import { registrarResultadoAction } from "@/app/actions/torneo";
import type { EnfrentamientoVista } from "@/lib/torneo/types";

export function FormResultado({ enf }: { enf: EnfrentamientoVista }) {
  const [estado, accion] = useActionState(registrarResultadoAction, null);
  const opciones = [enf.pareja1, enf.pareja2].filter(
    (p): p is NonNullable<typeof p> => p !== null,
  );

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="enfrentamientoId" value={enf.id} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">¿Quién ganó?</legend>
        {opciones.map((p) => (
          <label
            key={p.id}
            className="flex items-center gap-2 rounded-2xl border border-borde px-3 py-2"
          >
            <input
              type="radio"
              name="ganadorId"
              value={p.id}
              required
              defaultChecked={enf.ganador?.id === p.id}
            />
            {p.nombre}
          </label>
        ))}
      </fieldset>
      <AlertaAccion estado={estado} />
      <Boton type="submit">
        {enf.jugado ? "Corregir resultado" : "Confirmar resultado"}
      </Boton>
    </form>
  );
}
