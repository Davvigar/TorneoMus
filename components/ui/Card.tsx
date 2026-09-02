import type { ReactNode } from "react";

export function Card({
  titulo,
  children,
  className = "",
}: {
  titulo?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-borde bg-papel shadow-sm ${className}`}
    >
      {titulo != null && (
        <header className="border-b border-borde px-4 py-3 font-display text-lg text-terracota">
          {titulo}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
