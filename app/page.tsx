import { esAdmin } from "@/lib/auth";
import { repo } from "@/lib/db/torneo-repo";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Alerta } from "@/components/ui/Alerta";
import { BannerGanador } from "@/components/BannerGanador";
import { TarjetaEnfrentamiento } from "@/components/TarjetaEnfrentamiento";
import { PanelAdmin } from "@/components/PanelAdmin";
import { enfrentamientoAVista } from "@/lib/torneo/vista";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const admin = await esAdmin();
  const [estado, parejas] = await Promise.all([
    repo.getEstadoTorneo(),
    repo.listarParejas(),
  ]);
  const indice = new Map(parejas.map((p) => [p.id, p]));
  const enfrentamientos = estado.enfrentamientosActuales.map((e) =>
    enfrentamientoAVista(e, indice),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          etiqueta="Ronda"
          valor={
            estado.rondaAMostrar !== estado.rondaActual
              ? `${estado.rondaAMostrar} · ${estado.rondaActual} disponible`
              : estado.rondaActual
          }
          tono="terracota"
        />
        <Stat
          etiqueta="Parejas activas"
          valor={estado.parejasActivasCount}
          tono="oliva"
        />
        <Stat etiqueta="Total parejas" valor={estado.totalParejas} />
        <Stat
          etiqueta="Estado"
          valor={estado.torneoTerminado ? "Finalizado" : "En curso"}
          tono="ambar"
        />
      </div>

      {estado.torneoTerminado && estado.parejaGanadora && (
        <BannerGanador nombre={estado.parejaGanadora.nombre} />
      )}

      {admin && (
        <PanelAdmin
          puedeGenerarRonda={estado.puedeGenerarNuevaRonda}
          puedeGenerarPrimerasDosRondas={estado.puedeGenerarPrimerasDosRondas}
          pendientes={estado.pendientesRondaActual}
          torneoTerminado={estado.torneoTerminado}
        />
      )}

      <Card titulo={`Enfrentamientos${estado.rondaAMostrar > 0 ? ` · Ronda ${estado.rondaAMostrar}` : ""}`}>
        {enfrentamientos.length === 0 ? (
          <Alerta tono="info">
            Todavía no hay enfrentamientos. {admin ? "Registra parejas y genera la primera ronda." : ""}
          </Alerta>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {enfrentamientos.map((e) => (
              <TarjetaEnfrentamiento key={e.id} enf={e} admin={admin} />
            ))}
          </div>
        )}
      </Card>

      <nav className="flex flex-wrap justify-center gap-3">
        <Link
          href="/clasificacion"
          className="rounded-2xl border border-borde px-4 py-2 text-sm hover:bg-papel"
        >
          Clasificación
        </Link>
        <Link
          href="/historial"
          className="rounded-2xl border border-borde px-4 py-2 text-sm hover:bg-papel"
        >
          Historial
        </Link>
      </nav>
    </div>
  );
}
