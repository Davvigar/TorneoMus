import type { ReactNode } from "react";

export function Alerta({
  tono,
  children,
}: {
  tono: "exito" | "error" | "info";
  children: ReactNode;
}) {
  const estilo = {
    exito: "border-oliva bg-oliva/10 text-oliva-oscuro",
    error:
      "border-terracota bg-terracota/10 text-terracota-oscuro",
    info: "border-ambar bg-ambar/10 text-tinta",
  }[tono];
  return (
    <div
      role="status"
      className={`rounded-2xl border px-4 py-3 text-sm ${estilo}`}
    >
      {children}
    </div>
  );
}
