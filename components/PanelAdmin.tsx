"use client";

import { useActionState } from "react";
import { Card } from "@/components/ui/Card";
import { Boton } from "@/components/ui/Boton";
import { BotonAccion } from "@/components/BotonAccion";
import { AlertaAccion } from "@/components/AlertaAccion";
import {
  generarPrimerasDosRondasAction,
  generarRondaAction,
  registrarParejaAction,
  reiniciarTorneoAction,
} from "@/app/actions/torneo";

export function PanelAdmin({
  puedeGenerarRonda,
  puedeGenerarPrimerasDosRondas,
  pendientes,
  torneoTerminado,
}: {
  puedeGenerarRonda: boolean;
  puedeGenerarPrimerasDosRondas: boolean;
  pendientes: number;
  torneoTerminado: boolean;
}) {
  const [estadoPareja, accionPareja] = useActionState(
    registrarParejaAction,
    null,
  );

  return (
    <Card titulo="Administración">
      <div className="grid gap-4 sm:grid-cols-2">
        <form action={accionPareja} className="flex flex-col gap-2">
          <label htmlFor="nombre" className="text-sm text-tinta-suave">
            Nueva pareja
          </label>
          <input
            id="nombre"
            name="nombre"
            required
            maxLength={60}
            disabled={torneoTerminado}
            placeholder="Ej: Los Tigres"
            className="rounded-2xl border border-borde px-3 py-2"
          />
          <Boton type="submit" disabled={torneoTerminado}>
            Registrar pareja
          </Boton>
          <AlertaAccion estado={estadoPareja} />
        </form>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-tinta-suave">Ronda</span>
          {pendientes > 0 && (
            <span className="rounded-full bg-ambar/20 px-2 py-0.5 text-center text-sm">
              {pendientes} enfrentamiento(s) pendiente(s)
            </span>
          )}
          <BotonAccion
            accion={generarPrimerasDosRondasAction}
            variante="primario"
            disabled={!puedeGenerarPrimerasDosRondas || torneoTerminado}
          >
            Generar primeras 2 rondas
          </BotonAccion>
          <BotonAccion
            accion={generarRondaAction}
            variante="secundario"
            disabled={!puedeGenerarRonda || torneoTerminado}
          >
            Generar ronda
          </BotonAccion>
        </div>
      </div>

      <hr className="my-4 border-borde" />

      <BotonAccion
        accion={reiniciarTorneoAction}
        variante="peligro"
        confirmar="¿Seguro que quieres iniciar un nuevo torneo? Se borrarán todas las parejas y enfrentamientos."
      >
        Nuevo torneo
      </BotonAccion>
    </Card>
  );
}
