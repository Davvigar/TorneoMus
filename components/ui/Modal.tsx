"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Modal({
  abierto,
  onCerrar,
  titulo,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      onClick={(e) => {
        if (e.target === ref.current) onCerrar();
      }}
      className="m-auto rounded-2xl border border-borde p-0 backdrop:bg-black/30"
    >
      <div className="w-[min(90vw,24rem)] p-5">
        <h2 className="mb-3 text-lg">{titulo}</h2>
        {children}
      </div>
    </dialog>
  );
}
