"use client";

import { Boton } from "@/components/ui/Boton";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <h1 className="text-2xl">Algo ha fallado</h1>
      <p className="text-tinta-suave">
        Puede que la base de datos estuviera despertando. Inténtalo de nuevo en unos
        segundos.
      </p>
      <Boton type="button" onClick={() => reset()}>
        Reintentar
      </Boton>
    </div>
  );
}
