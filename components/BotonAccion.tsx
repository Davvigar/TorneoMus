"use client";

import { useActionState, type ReactNode } from "react";
import { Boton } from "@/components/ui/Boton";
import { AlertaAccion } from "@/components/AlertaAccion";
import type { AccionResultado } from "@/app/actions/torneo";

type Accion = (
  prev: AccionResultado | null,
  formData: FormData,
) => Promise<AccionResultado>;

export function BotonAccion({
  accion,
  children,
  variante = "primario",
  confirmar,
  camposOcultos,
  disabled,
}: {
  accion: Accion;
  children: ReactNode;
  variante?: "primario" | "secundario" | "peligro" | "fantasma";
  confirmar?: string;
  camposOcultos?: Record<string, string | number>;
  disabled?: boolean;
}) {
  const [estado, formAction] = useActionState(accion, null);
  return (
    <div className="flex flex-col gap-2">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (confirmar && !window.confirm(confirmar)) e.preventDefault();
        }}
      >
        {camposOcultos &&
          Object.entries(camposOcultos).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        <Boton type="submit" variante={variante} disabled={disabled}>
          {children}
        </Boton>
      </form>
      <AlertaAccion estado={estado} />
    </div>
  );
}
