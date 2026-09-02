import Link from "next/link";
import { notFound } from "next/navigation";
import { esAdmin } from "@/lib/auth";
import { repo } from "@/lib/db/torneo-repo";
import { Card } from "@/components/ui/Card";
import { Alerta } from "@/components/ui/Alerta";
import { FormResultado } from "@/components/FormResultado";

export const dynamic = "force-dynamic";

export default async function ResultadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const admin = await esAdmin();
  const enf = await repo.getEnfrentamientoVista(numId);
  if (!enf) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl">Registrar resultado</h1>

      <Card titulo={`Enfrentamiento #${enf.id} · Ronda ${enf.ronda}`}>
        {enf.esDescanso ? (
          <Alerta tono="info">Este enfrentamiento es un descanso; no tiene resultado.</Alerta>
        ) : !admin ? (
          <Alerta tono="error">
            Necesitas desbloquear el modo administrador para registrar resultados.
          </Alerta>
        ) : (
          <FormResultado enf={enf} />
        )}
      </Card>

      <Link
        href="/"
        className="self-center rounded-2xl border border-borde px-4 py-2 text-sm hover:bg-papel"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
