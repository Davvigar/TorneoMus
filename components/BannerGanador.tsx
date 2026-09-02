import { Crown } from "lucide-react";

export function BannerGanador({ nombre }: { nombre: string }) {
  return (
    <div className="rounded-2xl border border-ambar bg-ambar/15 p-5 text-center">
      <div className="flex items-center justify-center gap-2 font-display text-xl text-terracota">
        <Crown /> ¡Torneo finalizado!
      </div>
      <p className="mt-1 text-lg">
        Ganador: <strong>{nombre}</strong>
      </p>
    </div>
  );
}
