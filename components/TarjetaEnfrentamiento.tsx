import Link from "next/link";
import { Crown } from "lucide-react";
import type { EnfrentamientoVista } from "@/lib/torneo/types";
import { BotonAccion } from "@/components/BotonAccion";
import { deshacerResultadoAction } from "@/app/actions/torneo";

export function TarjetaEnfrentamiento({
  enf,
  admin,
}: {
  enf: EnfrentamientoVista;
  admin: boolean;
}) {
  const borde = enf.esDescanso
    ? "border-ambar"
    : "border-borde";

  return (
    <div className={`rounded-2xl border ${borde} bg-papel p-4 shadow-sm`}>
      <div className="mb-2 text-xs uppercase tracking-wide text-tinta-suave">
        {enf.esDescanso
          ? `Quien libra · Ronda ${enf.ronda}`
          : `Enfrentamiento #${enf.id}`}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{enf.pareja1.nombre}</span>
        {enf.esDescanso ? (
          <span className="rounded-full bg-ambar/20 px-2 py-0.5 text-sm text-tinta">
            Descanso
          </span>
        ) : (
          <>
            <span className="text-tinta-suave">vs</span>
            <span className="font-medium">{enf.pareja2?.nombre}</span>
          </>
        )}
      </div>

      {!enf.esDescanso && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {enf.jugado ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-oliva/15 px-2 py-0.5 text-oliva-oscuro">
              <Crown size={14} /> {enf.ganador?.nombre}
            </span>
          ) : (
            <span className="rounded-full bg-ambar/20 px-2 py-0.5">
              Pendiente
            </span>
          )}

          {admin && !enf.jugado && (
            <Link
              href={`/resultado/${enf.id}`}
              className="rounded-2xl border border-terracota px-3 py-1 text-terracota hover:bg-terracota hover:text-white"
            >
              Registrar resultado
            </Link>
          )}
          {admin && enf.jugado && (
            <>
              <Link
                href={`/resultado/${enf.id}`}
                className="rounded-2xl border border-borde px-3 py-1 hover:bg-crema"
              >
                Corregir
              </Link>
              <BotonAccion
                accion={deshacerResultadoAction}
                variante="fantasma"
                confirmar="¿Deshacer este resultado?"
                camposOcultos={{ enfrentamientoId: enf.id }}
              >
                Deshacer
              </BotonAccion>
            </>
          )}
        </div>
      )}
    </div>
  );
}
