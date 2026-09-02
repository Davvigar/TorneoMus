"use client";

import { useActionState, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Boton } from "@/components/ui/Boton";
import { AlertaAccion } from "@/components/AlertaAccion";
import {
  bloquearAdminAction,
  desbloquearAdminAction,
} from "@/app/actions/torneo";

export function CandadoAdmin({ admin }: { admin: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion] = useActionState(desbloquearAdminAction, null);
  const [, accionBloquear] = useActionState(bloquearAdminAction, null);

  if (admin) {
    return (
      <form action={accionBloquear}>
        <Boton variante="fantasma" type="submit" aria-label="Bloquear administración">
          <Unlock size={16} /> Admin
        </Boton>
      </form>
    );
  }

  return (
    <>
      <Boton
        variante="fantasma"
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Desbloquear administración"
      >
        <Lock size={16} /> Admin
      </Boton>
      <Modal
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="Modo administrador"
      >
        <form action={accion} className="flex flex-col gap-3">
          <input
            type="password"
            name="password"
            required
            autoFocus
            placeholder="Contraseña"
            className="rounded-2xl border border-borde px-3 py-2"
          />
          <AlertaAccion estado={estado} />
          <Boton type="submit">Entrar</Boton>
        </form>
      </Modal>
    </>
  );
}
