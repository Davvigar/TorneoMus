import Link from "next/link";
import { Alerta } from "@/components/ui/Alerta";

export default function NoEncontrado() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl">Enfrentamiento no encontrado</h1>
      <Alerta tono="error">Ese enfrentamiento no existe.</Alerta>
      <Link href="/" className="self-center rounded-2xl border border-borde px-4 py-2 text-sm">
        Volver al inicio
      </Link>
    </div>
  );
}
