import Link from "next/link";
import { repo } from "@/lib/db/torneo-repo";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Tabla } from "@/components/ui/Tabla";
import type { Pareja } from "@/lib/torneo/types";

export const dynamic = "force-dynamic";

function Filas({ parejas, vacio }: { parejas: Pareja[]; vacio: string }) {
  if (parejas.length === 0) {
    return (
      <tr>
        <td colSpan={4} className="px-3 py-4 text-center text-tinta-suave">
          {vacio}
        </td>
      </tr>
    );
  }
  return (
    <>
      {parejas.map((p, i) => (
        <tr key={p.id} className="border-b border-borde">
          <td className="px-3 py-2">{i + 1}</td>
          <td className="px-3 py-2 font-medium">{p.nombre}</td>
          <td className="px-3 py-2">{p.derrotas}</td>
          <td className="px-3 py-2 text-tinta-suave">
            {p.rivales.length ? p.rivales.join(", ") : "—"}
          </td>
        </tr>
      ))}
    </>
  );
}

export default async function Clasificacion() {
  const { activas, eliminadas } = await repo.getClasificacion();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl">Clasificación</h1>

      <div className="grid grid-cols-3 gap-3">
        <Stat etiqueta="Total" valor={activas.length + eliminadas.length} />
        <Stat etiqueta="Activas" valor={activas.length} tono="oliva" />
        <Stat etiqueta="Eliminadas" valor={eliminadas.length} tono="terracota" />
      </div>

      <Card titulo="Parejas activas">
        <Tabla cabeceras={["#", "Nombre", "Derrotas", "Rivales jugados"]}>
          <Filas parejas={activas} vacio="No hay parejas activas" />
        </Tabla>
      </Card>

      <Card titulo="Parejas eliminadas">
        <Tabla cabeceras={["#", "Nombre", "Derrotas", "Rivales jugados"]}>
          <Filas parejas={eliminadas} vacio="No hay parejas eliminadas" />
        </Tabla>
      </Card>

      <nav className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-2xl border border-borde px-4 py-2 text-sm hover:bg-papel">
          Inicio
        </Link>
        <Link href="/historial" className="rounded-2xl border border-borde px-4 py-2 text-sm hover:bg-papel">
          Historial
        </Link>
      </nav>
    </div>
  );
}
