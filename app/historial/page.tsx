import Link from "next/link";
import { repo } from "@/lib/db/torneo-repo";
import { Card } from "@/components/ui/Card";
import { Alerta } from "@/components/ui/Alerta";

export const dynamic = "force-dynamic";

export default async function Historial() {
  const historial = await repo.getHistorial();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl">Historial</h1>

      {historial.length === 0 ? (
        <Alerta tono="info">No hay rondas jugadas aún.</Alerta>
      ) : (
        historial.map(({ ronda, enfrentamientos }) => (
          <Card key={ronda} titulo={`Ronda ${ronda}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              {enfrentamientos.map((e) => (
                <div
                  key={e.id}
                  className={`rounded-2xl border p-3 ${
                    e.esDescanso ? "border-ambar" : "border-borde"
                  }`}
                >
                  {e.esDescanso ? (
                    <p>
                      <span className="text-tinta-suave">Han descansado:</span>{" "}
                      <strong>{e.pareja1.nombre}</strong>
                    </p>
                  ) : (
                    <>
                      <p className="font-medium">
                        {e.pareja1.nombre} vs {e.pareja2?.nombre}
                      </p>
                      {e.jugado ? (
                        <p className="mt-1 text-sm">
                          <span className="text-oliva-oscuro">
                            Ganador: {e.ganador?.nombre}
                          </span>
                          {" · "}
                          <span className="text-terracota-oscuro">
                            Perdedor: {e.perdedor?.nombre}
                          </span>
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-tinta-suave">
                          Pendiente
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      <nav className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-2xl border border-borde px-4 py-2 text-sm hover:bg-papel">
          Inicio
        </Link>
        <Link href="/clasificacion" className="rounded-2xl border border-borde px-4 py-2 text-sm hover:bg-papel">
          Clasificación
        </Link>
      </nav>
    </div>
  );
}
