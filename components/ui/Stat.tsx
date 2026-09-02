import type { ReactNode } from "react";

export function Stat({
  etiqueta,
  valor,
  tono = "tinta",
}: {
  etiqueta: string;
  valor: ReactNode;
  tono?: "tinta" | "terracota" | "oliva" | "ambar";
}) {
  const color = {
    tinta: "text-tinta",
    terracota: "text-terracota",
    oliva: "text-oliva",
    ambar: "text-ambar",
  }[tono];
  return (
    <div className="rounded-2xl border border-borde bg-papel p-4 text-center shadow-sm">
      <div className="text-xs uppercase tracking-wide text-tinta-suave">
        {etiqueta}
      </div>
      <div className={`mt-1 font-display text-3xl ${color}`}>{valor}</div>
    </div>
  );
}
