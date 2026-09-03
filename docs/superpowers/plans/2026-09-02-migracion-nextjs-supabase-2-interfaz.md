# Migración TorneoMus a Next.js + Supabase — Plan 2: Interfaz y despliegue

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la interfaz web completa (estética "fiesta de pueblo" moderna y mobile-first) sobre el núcleo del Plan 1, y dejar el proyecto desplegado gratis en Vercel + Supabase, con CI en GitHub Actions.

**Architecture:** Server Components para todas las lecturas (SSR, sin fetch en cliente). Formularios nativos que invocan las Server Actions del Plan 1; los componentes cliente añaden estados de envío y banners con `useActionState` / `useFormStatus`. El modo administrador se calcula en el servidor con `esAdmin()` y se pasa como prop; al desbloquear/bloquear se hace `revalidatePath("/", "layout")`.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS v4, `lucide-react`, `next/font` (Fraunces + Inter), Playwright, GitHub Actions, Vercel, Supabase.

**Requisito previo:** Plan 1 completado (`npm run verify` en verde). Este plan asume que existen:
`lib/db/torneo-repo.ts` (export `repo` con `listarParejas`, `listarEnfrentamientos`, `getEnfrentamiento`, `getEnfrentamientoVista`, `getEstadoTorneo`, `getClasificacion`, `getHistorial`), `lib/auth.ts` (`esAdmin`), `app/actions/torneo.ts` (7 acciones con firma `(_prev: AccionResultado | null, formData: FormData) => Promise<AccionResultado>`), y los tipos de `lib/torneo/types.ts`.

---

## Paleta y tipografía (referencia para todas las tareas)

Tokens de color (definidos en `app/globals.css` en la Task 1):

| Token | Valor | Uso |
|---|---|---|
| `--color-crema` | `#FBF6EE` | Fondo de página |
| `--color-papel` | `#FFFFFF` | Fondo de tarjetas |
| `--color-terracota` | `#B5451B` | Primario (botones, títulos, acentos) |
| `--color-terracota-oscuro` | `#8A3413` | Hover primario, texto de error |
| `--color-oliva` | `#5B6B3A` | Secundario, estados de éxito |
| `--color-ambar` | `#E0A33E` | Acento (badges, banderines) |
| `--color-tinta` | `#3B2A20` | Texto principal |
| `--color-tinta-suave` | `#6B5647` | Texto secundario |
| `--color-borde` | `#E7DDCE` | Bordes de tarjetas y tablas |

Tipografía: **Fraunces** (títulos, `--font-display`), **Inter** (cuerpo, `--font-sans`).

---

## Estructura de ficheros (Plan 2)

| Fichero | Responsabilidad |
|---|---|
| `app/globals.css` | Tailwind v4 + `@theme` con los tokens + estilos base de `body` |
| `app/layout.tsx` | HTML raíz, fuentes, cabecera con banderines y candado |
| `app/page.tsx` | Inicio: dashboard, enfrentamientos de la ronda, panel admin |
| `app/clasificacion/page.tsx` | Tablas de activas y eliminadas + stats |
| `app/historial/page.tsx` | Rondas plegables con sus enfrentamientos |
| `app/resultado/[id]/page.tsx` | Formulario de resultado / corrección |
| `app/resultado/[id]/not-found.tsx` | Enfrentamiento inexistente |
| `app/not-found.tsx` | 404 general |
| `app/error.tsx` | Fallo de infraestructura (BD dormida) |
| `components/ui/Card.tsx` | Tarjeta contenedora |
| `components/ui/Boton.tsx` | Botón con variantes y estado de envío |
| `components/ui/Stat.tsx` | Métrica del dashboard |
| `components/ui/Alerta.tsx` | Banner de éxito/error/info |
| `components/ui/Tabla.tsx` | Tabla responsive |
| `components/ui/Modal.tsx` | Diálogo modal (cliente) |
| `components/Banderines.tsx` | Guirnalda SVG |
| `components/BannerGanador.tsx` | Anuncio de campeón |
| `components/TarjetaEnfrentamiento.tsx` | Tarjeta de un enfrentamiento |
| `components/PanelAdmin.tsx` | Acciones de admin en el inicio (cliente) |
| `components/CandadoAdmin.tsx` | Candado + modal de contraseña (cliente) |
| `components/FormResultado.tsx` | Radios + submit del resultado (cliente) |
| `components/BotonAccion.tsx` | Envuelve una Server Action sin formData con `useActionState` |
| `e2e/torneo.spec.ts` | Playwright: camino feliz |
| `playwright.config.ts` | Config Playwright |
| `.github/workflows/ci.yml` | CI |
| `docs/despliegue.md` | Pasos de despliegue |
| `README.md` | Reescrito para el nuevo stack |

---

## Task 1: Estética base — `globals.css` y fuentes

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`

> **Tailwind v4 — cómo se usan los tokens en este plan.** El bloque `@theme` de
> `globals.css` registra los colores; Tailwind genera automáticamente las
> utilidades semánticas `bg-<nombre>`, `text-<nombre>`, `border-<nombre>`,
> `fill-<nombre>`, etc. (con modificador de opacidad, p. ej. `bg-oliva/10`), y
> `font-sans` / `font-display` para las fuentes. **Todo el código de componentes y
> páginas de este plan usa esas utilidades** (`bg-papel`, `border-borde`,
> `text-terracota`, `font-display`…). La sintaxis v3 `bg-[--color-x]` **no
> funciona en v4**. Las fuentes van en un bloque `@theme inline` aparte porque
> referencian variables que inyecta `next/font` en tiempo de ejecución.

- [ ] **Step 1: Escribir `app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-crema: #fbf6ee;
  --color-papel: #ffffff;
  --color-terracota: #b5451b;
  --color-terracota-oscuro: #8a3413;
  --color-oliva: #5b6b3a;
  --color-oliva-oscuro: #45521f;
  --color-ambar: #e0a33e;
  --color-tinta: #3b2a20;
  --color-tinta-suave: #6b5647;
  --color-borde: #e7ddce;
}

@theme inline {
  --font-sans: var(--fuente-inter), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--fuente-fraunces), ui-serif, Georgia, serif;
}

html {
  color-scheme: light;
}

body {
  background-color: var(--color-crema);
  color: var(--color-tinta);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

h1,
h2,
h3 {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--color-terracota);
  letter-spacing: -0.01em;
}
```

- [ ] **Step 2: Escribir `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { esAdmin } from "@/lib/auth";
import { Banderines } from "@/components/Banderines";
import { CandadoAdmin } from "@/components/CandadoAdmin";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--fuente-inter" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--fuente-fraunces",
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Mus Villamantilla",
  description: "Torneo de Mus de las fiestas del pueblo",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await esAdmin();
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <header className="border-b border-borde bg-papel">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
            <a href="/" className="text-2xl sm:text-3xl">
              🏆 Mus Villamantilla
            </a>
            <CandadoAdmin admin={admin} />
          </div>
          <Banderines />
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">{children}</main>
        <footer className="mx-auto max-w-4xl px-4 pb-8 pt-4 text-center text-sm text-tinta-suave">
          Fiestas del pueblo · Torneo de Mus
        </footer>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verificar el build (fallará por imports que aún no existen — es esperado)**

Run: `npm run build`
Expected: FAIL — `Banderines` y `CandadoAdmin` no existen todavía. Se crean en las Tasks 2-4. (No commitear todavía.)

- [ ] **Step 4: Commit parcial de estilos**

Comentar temporalmente los imports/JSX de `Banderines` y `CandadoAdmin` en `layout.tsx`, verificar `npm run build`, y commitear:

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: estética base (tokens Tailwind, fuentes, layout)"
```

Se descomentan en la Task 4.

---

## Task 2: Primitivas de UI

**Files:**
- Create: `components/ui/Card.tsx`, `components/ui/Boton.tsx`, `components/ui/Stat.tsx`, `components/ui/Alerta.tsx`, `components/ui/Tabla.tsx`

- [ ] **Step 1: `components/ui/Card.tsx`**

```tsx
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
```

- [ ] **Step 2: `components/ui/Boton.tsx`**

```tsx
"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Variante = "primario" | "secundario" | "peligro" | "fantasma";

const estilos: Record<Variante, string> = {
  primario:
    "bg-terracota text-white hover:bg-terracota-oscuro",
  secundario:
    "bg-oliva text-white hover:bg-oliva-oscuro",
  peligro:
    "border border-terracota text-terracota hover:bg-terracota hover:text-white",
  fantasma:
    "border border-borde text-tinta hover:bg-crema",
};

export function Boton({
  variante = "primario",
  children,
  className = "",
  enviando,
  ...props
}: ComponentProps<"button"> & {
  variante?: Variante;
  children: ReactNode;
  enviando?: boolean;
}) {
  const { pending } = useFormStatus();
  const ocupado = enviando ?? pending;
  return (
    <button
      {...props}
      disabled={props.disabled || ocupado}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${estilos[variante]} ${className}`}
    >
      {ocupado ? "Enviando…" : children}
    </button>
  );
}
```

- [ ] **Step 3: `components/ui/Stat.tsx`**

```tsx
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
```

- [ ] **Step 4: `components/ui/Alerta.tsx`**

```tsx
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
```

- [ ] **Step 5: `components/ui/Tabla.tsx`**

```tsx
import type { ReactNode } from "react";

export function Tabla({
  cabeceras,
  children,
}: {
  cabeceras: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-borde text-left text-tinta-suave">
            {cabeceras.map((c) => (
              <th key={c} className="whitespace-nowrap px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 6: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores (los componentes no se usan aún, pero deben compilar).

- [ ] **Step 7: Commit**

```bash
git add components/ui
git commit -m "feat: primitivas de UI (Card, Boton, Stat, Alerta, Tabla)"
```

---

## Task 3: Banderines y Modal

**Files:**
- Create: `components/Banderines.tsx`, `components/ui/Modal.tsx`

- [ ] **Step 1: `components/Banderines.tsx`**

```tsx
const colores = ["#B5451B", "#E0A33E", "#5B6B3A", "#B5451B", "#E0A33E", "#5B6B3A"];

export function Banderines() {
  return (
    <svg
      viewBox="0 0 240 20"
      preserveAspectRatio="none"
      className="h-4 w-full"
      aria-hidden="true"
    >
      <line x1="0" y1="3" x2="240" y2="3" stroke="#6B5647" strokeWidth="0.5" />
      {colores.map((c, i) => (
        <polygon
          key={i}
          points={`${i * 40},3 ${i * 40 + 40},3 ${i * 40 + 20},18`}
          fill={c}
        />
      ))}
    </svg>
  );
}
```

- [ ] **Step 2: `components/ui/Modal.tsx`**

```tsx
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
```

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/Banderines.tsx components/ui/Modal.tsx
git commit -m "feat: guirnalda de banderines y modal"
```

---

## Task 4: Candado de administrador

**Files:**
- Create: `components/CandadoAdmin.tsx`, `components/AlertaAccion.tsx`
- Modify: `app/layout.tsx` (descomentar imports de la Task 1)

- [ ] **Step 1: `components/AlertaAccion.tsx` — muestra el resultado de una acción**

```tsx
"use client";

import { Alerta } from "@/components/ui/Alerta";
import type { AccionResultado } from "@/app/actions/torneo";

export function AlertaAccion({ estado }: { estado: AccionResultado | null }) {
  if (!estado) return null;
  if (estado.ok && estado.mensaje) {
    return <Alerta tono="exito">{estado.mensaje}</Alerta>;
  }
  if (!estado.ok && estado.error) {
    return <Alerta tono="error">{estado.error}</Alerta>;
  }
  return null;
}
```

- [ ] **Step 2: `components/CandadoAdmin.tsx`**

```tsx
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
```

- [ ] **Step 3: Descomentar en `app/layout.tsx`**

Restaurar los imports y el JSX de `Banderines` y `CandadoAdmin` (que se comentaron en la Task 1, Step 4).

- [ ] **Step 4: Instalar `lucide-react`**

```bash
npm install lucide-react
```

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: build correcta.

- [ ] **Step 6: Prueba manual**

Run: `npm run dev`
Abrir `http://localhost:3000`. Verificar: cabecera con título y banderines, botón "Admin" con candado. Al pulsarlo, modal con campo contraseña. Con la contraseña de `.env.local` (`test1234`) el modal se cierra y el botón pasa a "Admin" con candado abierto. Volver a pulsar lo bloquea.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: candado de administrador con modal de contraseña"
```

---

## Task 5: `BotonAccion` — envolver acciones sin formulario

Para "generar ronda", "nuevo torneo" y "deshacer resultado", que no llevan campos.

**Files:**
- Create: `components/BotonAccion.tsx`

- [ ] **Step 1: `components/BotonAccion.tsx`**

```tsx
"use client";

import { useActionState, type ReactNode } from "react";
import { Boton } from "@/components/ui/Boton";
import { AlertaAccion } from "@/components/AlertaAccion";
import type { AccionResultado } from "@/app/actions/torneo";

type Accion = (
  prev: AccionResultado | null,
  formData: FormData,
) => Promise<AccionResultado>;

export function BotonAccion({
  accion,
  children,
  variante = "primario",
  confirmar,
  camposOcultos,
  disabled,
}: {
  accion: Accion;
  children: ReactNode;
  variante?: "primario" | "secundario" | "peligro" | "fantasma";
  confirmar?: string;
  camposOcultos?: Record<string, string | number>;
  disabled?: boolean;
}) {
  const [estado, formAction] = useActionState(accion, null);
  return (
    <div className="flex flex-col gap-2">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (confirmar && !window.confirm(confirmar)) e.preventDefault();
        }}
      >
        {camposOcultos &&
          Object.entries(camposOcultos).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        <Boton type="submit" variante={variante} disabled={disabled}>
          {children}
        </Boton>
      </form>
      <AlertaAccion estado={estado} />
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add components/BotonAccion.tsx
git commit -m "feat: BotonAccion para Server Actions sin campos"
```

---

## Task 6: `TarjetaEnfrentamiento` y `BannerGanador`

**Files:**
- Create: `components/TarjetaEnfrentamiento.tsx`, `components/BannerGanador.tsx`

- [ ] **Step 1: `components/TarjetaEnfrentamiento.tsx`**

```tsx
import Link from "next/link";
import { Crown } from "lucide-react";
import type { EnfrentamientoVista } from "@/lib/torneo/types";
import { BotonAccion } from "@/components/BotonAccion";
import { deshacerResultadoAction } from "@/app/actions/torneo";

export function TarjetaEnfrentamiento({
  enf,
  admin,
}: {
  enf: EnfrentamientoVista;
  admin: boolean;
}) {
  const borde = enf.esDescanso
    ? "border-ambar"
    : "border-borde";

  return (
    <div className={`rounded-2xl border ${borde} bg-papel p-4 shadow-sm`}>
      <div className="mb-2 text-xs uppercase tracking-wide text-tinta-suave">
        {enf.esDescanso
          ? `Quien libra · Ronda ${enf.ronda}`
          : `Enfrentamiento #${enf.id}`}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{enf.pareja1.nombre}</span>
        {enf.esDescanso ? (
          <span className="rounded-full bg-ambar/20 px-2 py-0.5 text-sm text-tinta">
            Descanso
          </span>
        ) : (
          <>
            <span className="text-tinta-suave">vs</span>
            <span className="font-medium">{enf.pareja2?.nombre}</span>
          </>
        )}
      </div>

      {!enf.esDescanso && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {enf.jugado ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-oliva/15 px-2 py-0.5 text-oliva-oscuro">
              <Crown size={14} /> {enf.ganador?.nombre}
            </span>
          ) : (
            <span className="rounded-full bg-ambar/20 px-2 py-0.5">
              Pendiente
            </span>
          )}

          {admin && !enf.jugado && (
            <Link
              href={`/resultado/${enf.id}`}
              className="rounded-2xl border border-terracota px-3 py-1 text-terracota hover:bg-terracota hover:text-white"
            >
              Registrar resultado
            </Link>
          )}
          {admin && enf.jugado && (
            <>
              <Link
                href={`/resultado/${enf.id}`}
                className="rounded-2xl border border-borde px-3 py-1 hover:bg-crema"
              >
                Corregir
              </Link>
              <BotonAccion
                accion={deshacerResultadoAction}
                variante="fantasma"
                confirmar="¿Deshacer este resultado?"
                camposOcultos={{ enfrentamientoId: enf.id }}
              >
                Deshacer
              </BotonAccion>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `components/BannerGanador.tsx`**

```tsx
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
```

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/TarjetaEnfrentamiento.tsx components/BannerGanador.tsx
git commit -m "feat: tarjeta de enfrentamiento y banner de ganador"
```

---

## Task 7: `PanelAdmin`

**Files:**
- Create: `components/PanelAdmin.tsx`

- [ ] **Step 1: `components/PanelAdmin.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { Card } from "@/components/ui/Card";
import { Boton } from "@/components/ui/Boton";
import { BotonAccion } from "@/components/BotonAccion";
import { AlertaAccion } from "@/components/AlertaAccion";
import {
  generarRondaAction,
  registrarParejaAction,
  reiniciarTorneoAction,
} from "@/app/actions/torneo";

export function PanelAdmin({
  puedeGenerarRonda,
  pendientes,
  torneoTerminado,
}: {
  puedeGenerarRonda: boolean;
  pendientes: number;
  torneoTerminado: boolean;
}) {
  const [estadoPareja, accionPareja] = useActionState(
    registrarParejaAction,
    null,
  );

  return (
    <Card titulo="Administración">
      <div className="grid gap-4 sm:grid-cols-2">
        <form action={accionPareja} className="flex flex-col gap-2">
          <label htmlFor="nombre" className="text-sm text-tinta-suave">
            Nueva pareja
          </label>
          <input
            id="nombre"
            name="nombre"
            required
            maxLength={60}
            disabled={torneoTerminado}
            placeholder="Ej: Los Tigres"
            className="rounded-2xl border border-borde px-3 py-2"
          />
          <Boton type="submit" disabled={torneoTerminado}>
            Registrar pareja
          </Boton>
          <AlertaAccion estado={estadoPareja} />
        </form>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-tinta-suave">Ronda</span>
          {pendientes > 0 && (
            <span className="rounded-full bg-ambar/20 px-2 py-0.5 text-center text-sm">
              {pendientes} enfrentamiento(s) pendiente(s)
            </span>
          )}
          <BotonAccion
            accion={generarRondaAction}
            variante="secundario"
            disabled={!puedeGenerarRonda || torneoTerminado}
          >
            Generar ronda
          </BotonAccion>
        </div>
      </div>

      <hr className="my-4 border-borde" />

      <BotonAccion
        accion={reiniciarTorneoAction}
        variante="peligro"
        confirmar="¿Seguro que quieres iniciar un nuevo torneo? Se borrarán todas las parejas y enfrentamientos."
      >
        Nuevo torneo
      </BotonAccion>
    </Card>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add components/PanelAdmin.tsx
git commit -m "feat: panel de administración del inicio"
```

---

## Task 8: Página de inicio

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Reemplazar `app/page.tsx` por completo**

```tsx
import { esAdmin } from "@/lib/auth";
import { repo } from "@/lib/db/torneo-repo";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Alerta } from "@/components/ui/Alerta";
import { BannerGanador } from "@/components/BannerGanador";
import { TarjetaEnfrentamiento } from "@/components/TarjetaEnfrentamiento";
import { PanelAdmin } from "@/components/PanelAdmin";
import { enfrentamientoAVista } from "@/lib/torneo/vista";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const admin = await esAdmin();
  const [estado, parejas] = await Promise.all([
    repo.getEstadoTorneo(),
    repo.listarParejas(),
  ]);
  const indice = new Map(parejas.map((p) => [p.id, p]));
  const enfrentamientos = estado.enfrentamientosActuales.map((e) =>
    enfrentamientoAVista(e, indice),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat etiqueta="Ronda" valor={estado.rondaActual} tono="terracota" />
        <Stat
          etiqueta="Parejas activas"
          valor={estado.parejasActivasCount}
          tono="oliva"
        />
        <Stat etiqueta="Total parejas" valor={estado.totalParejas} />
        <Stat
          etiqueta="Estado"
          valor={estado.torneoTerminado ? "Finalizado" : "En curso"}
          tono="ambar"
        />
      </div>

      {estado.torneoTerminado && estado.parejaGanadora && (
        <BannerGanador nombre={estado.parejaGanadora.nombre} />
      )}

      {admin && (
        <PanelAdmin
          puedeGenerarRonda={estado.puedeGenerarNuevaRonda}
          pendientes={estado.pendientesRondaActual}
          torneoTerminado={estado.torneoTerminado}
        />
      )}

      <Card titulo={`Enfrentamientos${estado.rondaActual > 0 ? ` · Ronda ${estado.rondaActual}` : ""}`}>
        {enfrentamientos.length === 0 ? (
          <Alerta tono="info">
            Todavía no hay enfrentamientos. {admin ? "Registra parejas y genera la primera ronda." : ""}
          </Alerta>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {enfrentamientos.map((e) => (
              <TarjetaEnfrentamiento key={e.id} enf={e} admin={admin} />
            ))}
          </div>
        )}
      </Card>

      <nav className="flex flex-wrap justify-center gap-3">
        <Link
          href="/clasificacion"
          className="rounded-2xl border border-borde px-4 py-2 text-sm hover:bg-papel"
        >
          Clasificación
        </Link>
        <Link
          href="/historial"
          className="rounded-2xl border border-borde px-4 py-2 text-sm hover:bg-papel"
        >
          Historial
        </Link>
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Prueba manual del camino completo**

Run: `npm run dev`
1. Desbloquear admin (contraseña `test1234`).
2. Registrar 4 parejas → aparece banner de éxito.
3. "Generar ronda" → aparecen 2 tarjetas de enfrentamiento.
4. "Registrar resultado" en una → (página de resultado aún placeholder; se implementa en la Task 11). De momento comprobar que el enlace navega a `/resultado/<id>`.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: página de inicio (dashboard + enfrentamientos + panel admin)"
```

---

## Task 9: Página de clasificación

**Files:**
- Create: `app/clasificacion/page.tsx`

- [ ] **Step 1: `app/clasificacion/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Prueba manual**

Run: `npm run dev` → `/clasificacion`. Con el torneo de la Task 8, ver 4 parejas activas, 0 eliminadas, columnas correctas.

- [ ] **Step 3: Commit**

```bash
git add app/clasificacion
git commit -m "feat: página de clasificación"
```

---

## Task 10: Página de historial

**Files:**
- Create: `app/historial/page.tsx`

- [ ] **Step 1: `app/historial/page.tsx`**

```tsx
import Link from "next/link";
import { repo } from "@/lib/db/torneo-repo";
import { Card } from "@/components/ui/Card";
import { Alerta } from "@/components/ui/Alerta";

export const dynamic = "force-dynamic";

export default async function Historial() {
  const historial = await repo.getHistorial();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl">Historial</h1>

      {historial.length === 0 ? (
        <Alerta tono="info">No hay rondas jugadas aún.</Alerta>
      ) : (
        historial.map(({ ronda, enfrentamientos }) => (
          <Card key={ronda} titulo={`Ronda ${ronda}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              {enfrentamientos.map((e) => (
                <div
                  key={e.id}
                  className={`rounded-2xl border p-3 ${
                    e.esDescanso ? "border-ambar" : "border-borde"
                  }`}
                >
                  {e.esDescanso ? (
                    <p>
                      <span className="text-tinta-suave">Quien libra:</span>{" "}
                      <strong>{e.pareja1.nombre}</strong>
                    </p>
                  ) : (
                    <>
                      <p className="font-medium">
                        {e.pareja1.nombre} vs {e.pareja2?.nombre}
                      </p>
                      {e.jugado ? (
                        <p className="mt-1 text-sm">
                          <span className="text-oliva-oscuro">
                            Ganador: {e.ganador?.nombre}
                          </span>
                          {" · "}
                          <span className="text-terracota-oscuro">
                            Perdedor: {e.perdedor?.nombre}
                          </span>
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-tinta-suave">
                          Pendiente
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      <nav className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-2xl border border-borde px-4 py-2 text-sm hover:bg-papel">
          Inicio
        </Link>
        <Link href="/clasificacion" className="rounded-2xl border border-borde px-4 py-2 text-sm hover:bg-papel">
          Clasificación
        </Link>
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Prueba manual**

Run: `npm run dev` → `/historial`. Antes de jugar nada: "No hay rondas jugadas aún." Tras generar la ronda 1: sección "Ronda 1" con las tarjetas.

- [ ] **Step 3: Commit**

```bash
git add app/historial
git commit -m "feat: página de historial"
```

---

## Task 11: Página de resultado + `not-found`

**Files:**
- Create: `app/resultado/[id]/page.tsx`, `app/resultado/[id]/not-found.tsx`, `components/FormResultado.tsx`

- [ ] **Step 1: `components/FormResultado.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { Boton } from "@/components/ui/Boton";
import { AlertaAccion } from "@/components/AlertaAccion";
import { registrarResultadoAction } from "@/app/actions/torneo";
import type { EnfrentamientoVista } from "@/lib/torneo/types";

export function FormResultado({ enf }: { enf: EnfrentamientoVista }) {
  const [estado, accion] = useActionState(registrarResultadoAction, null);
  const opciones = [enf.pareja1, enf.pareja2].filter(
    (p): p is NonNullable<typeof p> => p !== null,
  );

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="enfrentamientoId" value={enf.id} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">¿Quién ganó?</legend>
        {opciones.map((p) => (
          <label
            key={p.id}
            className="flex items-center gap-2 rounded-2xl border border-borde px-3 py-2"
          >
            <input
              type="radio"
              name="ganadorId"
              value={p.id}
              required
              defaultChecked={enf.ganador?.id === p.id}
            />
            {p.nombre}
          </label>
        ))}
      </fieldset>
      <AlertaAccion estado={estado} />
      <Boton type="submit">
        {enf.jugado ? "Corregir resultado" : "Confirmar resultado"}
      </Boton>
    </form>
  );
}
```

- [ ] **Step 2: `app/resultado/[id]/page.tsx`**

```tsx
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
```

- [ ] **Step 3: `app/resultado/[id]/not-found.tsx`**

```tsx
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
```

- [ ] **Step 4: Prueba manual del ciclo completo**

Run: `npm run dev`
1. Con admin y ronda generada, "Registrar resultado" en un enfrentamiento.
2. Elegir ganador → "Confirmar resultado" → banner de éxito.
3. Volver al inicio: la tarjeta muestra el ganador y aparecen "Corregir" y "Deshacer".
4. "Deshacer" → confirma → la tarjeta vuelve a "Pendiente".
5. Visitar `/resultado/99999` → página "Enfrentamiento no encontrado".

- [ ] **Step 5: Commit**

```bash
git add app/resultado components/FormResultado.tsx
git commit -m "feat: página de resultado con corrección y not-found"
```

---

## Task 12: `error.tsx` y `not-found.tsx` globales

**Files:**
- Create: `app/error.tsx`, `app/not-found.tsx`

- [ ] **Step 1: `app/error.tsx`**

```tsx
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
```

- [ ] **Step 2: `app/not-found.tsx`**

```tsx
import Link from "next/link";

export default function NoEncontrado() {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <h1 className="text-2xl">Página no encontrada</h1>
      <Link
        href="/"
        className="rounded-2xl border border-borde px-4 py-2 text-sm hover:bg-papel"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build correcta, todas las rutas listadas (`/`, `/clasificacion`, `/historial`, `/resultado/[id]`).

- [ ] **Step 4: Commit**

```bash
git add app/error.tsx app/not-found.tsx
git commit -m "feat: páginas de error y 404 globales"
```

---

## Task 13: Test e2e con Playwright (camino feliz)

**Files:**
- Create: `playwright.config.ts`, `e2e/torneo.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Instalar Playwright**

```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

- [ ] **Step 2: `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run start:e2e",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

- [ ] **Step 3: Añadir scripts a `package.json`**

```json
"start:e2e": "dotenv -e .env.test -- next start -p 3000",
"build:e2e": "dotenv -e .env.test -- next build",
"e2e": "playwright test"
```

- [ ] **Step 4: `e2e/torneo.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

// Requiere: BD de test migrada y vacía, ADMIN_PASSWORD=test1234 en .env.test.
test("camino feliz: registrar, generar ronda, resultado, clasificación", async ({
  page,
}) => {
  await page.goto("/");

  // Desbloquear admin (el botón tiene aria-label "Desbloquear administración")
  await page.getByRole("button", { name: /administración/i }).click();
  await page.getByPlaceholder("Contraseña").fill("test1234");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Administración")).toBeVisible();

  // Registrar 4 parejas
  for (const nombre of ["Alfa", "Beta", "Gamma", "Delta"]) {
    await page.getByPlaceholder("Ej: Los Tigres").fill(nombre);
    await page.getByRole("button", { name: "Registrar pareja" }).click();
    await expect(page.getByText(`Pareja '${nombre}' registrada`)).toBeVisible();
  }

  // Generar ronda
  await page.getByRole("button", { name: "Generar ronda" }).click();
  await expect(page.getByText(/Nueva ronda generada con 2/)).toBeVisible();

  // Registrar el primer resultado
  await page.getByRole("link", { name: "Registrar resultado" }).first().click();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Confirmar resultado" }).click();
  await expect(page.getByText("Resultado registrado correctamente")).toBeVisible();

  // Clasificación
  await page.goto("/clasificacion");
  await expect(page.getByText("Parejas activas")).toBeVisible();
});
```

- [ ] **Step 5: Preparar la BD de test y ejecutar**

El e2e corre contra `torneomus_test` (vía `start:e2e` → `dotenv -e .env.test`). Debe estar
migrada y **vacía** antes de correr (el test registra "Alfa".."Delta"). Vaciarla con el
`psql` local (PG17 nativo, no hay contenedor Docker):

```bash
"/c/Program Files/PostgreSQL/17/bin/psql.exe" "postgresql://postgres:postgres@localhost:5432/torneomus_test" -c "TRUNCATE enfrentamientos, parejas RESTART IDENTITY CASCADE;"
npm run build:e2e
npm run e2e
```

En Windows, `npx playwright install chromium` (sin `--with-deps`, que es solo Linux).

Expected: 1 test PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: e2e Playwright del camino feliz"
```

---

## Task 14: CI en GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main, migracion-nextjs-supabase]
  pull_request:

jobs:
  verificar:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: torneomus_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/torneomus_test
      ADMIN_PASSWORD: test1234
      AUTH_SECRET: ci-secret-1234567890
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run db:migrate
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run build
      # build:e2e / start:e2e usan `dotenv -e .env.test`, que en CI no existe (gitignored).
      - run: |
          printf 'DATABASE_URL=%s\nADMIN_PASSWORD=%s\nAUTH_SECRET=%s\n' \
            "$DATABASE_URL" "$ADMIN_PASSWORD" "$AUTH_SECRET" > .env.test
      - run: npx playwright install --with-deps chromium
      - run: npm run build:e2e
      - run: npm run e2e
```

- [ ] **Step 2: Verificar el YAML localmente**

Run: `npx --yes yaml-lint .github/workflows/ci.yml` (o revisar a ojo la indentación).
Expected: sin errores de sintaxis.

- [ ] **Step 3: Commit y push para disparar CI**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: typecheck, lint, tests, build y e2e en GitHub Actions"
git push -u origin migracion-nextjs-supabase
```

- [ ] **Step 4: Verificar en GitHub que el workflow pasa en verde.**

---

## Task 15: README y documentación de despliegue

**Files:**
- Modify: `README.md`
- Create: `docs/despliegue.md`
- Delete: `docs/README-spring-boot.md` (queda en el historial de git)

- [ ] **Step 1: Reescribir `README.md`**

```markdown
# 🏆 Mus Villamantilla

Gestor del torneo de Mus de las fiestas del pueblo. Un único torneo activo:
registro de parejas, generación de rondas (con descansos para números impares y
sin repetir rivales mientras se pueda), registro y corrección de resultados,
clasificación e historial. Eliminación por 2 derrotas.

## Stack

- **Next.js 15** (App Router, Server Actions) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **PostgreSQL** (Supabase) con **Drizzle ORM**
- Tests: **Vitest** (unitarios + integración) y **Playwright** (e2e)
- Despliegue: **Vercel** (gratis) + **Supabase** (gratis)

## Desarrollo

Ver [`docs/desarrollo.md`](docs/desarrollo.md).

Resumen:
1. `npm install`
2. Postgres local con Docker + BD `torneomus` y `torneomus_test`
3. `.env.local` a partir de `.env.example`
4. `npx dotenv -e .env.local -- npm run db:migrate`
5. `npm run dev`

## Comprobaciones

- `npm run verify` — typecheck + lint + tests
- `npm run e2e` — test end to end

## Despliegue

Ver [`docs/despliegue.md`](docs/despliegue.md).

## Administración

Las acciones que modifican el torneo (registrar pareja, generar ronda, registrar/
deshacer resultado, nuevo torneo) requieren la contraseña de `ADMIN_PASSWORD`.
Botón "Admin" en la cabecera. La consulta es pública.

## Historia

Versión original (2025): Spring Boot + MySQL + Thymeleaf, desplegada en Railway y
Render. Migrada a este stack para poder alojarla gratis de forma estable. El
código Java sigue en el historial de git.
```

- [ ] **Step 2: Crear `docs/despliegue.md`**

```markdown
# Despliegue

## 1. Base de datos (Supabase)

1. Crear un proyecto en https://supabase.com (plan Free).
2. En **Project Settings → Database → Connection string → URI**, copiar la cadena
   del **Transaction pooler** (puerto 6543). Añadir `?pgbouncer=true` si no está.
3. En local, aplicar el esquema:
   ```bash
   DATABASE_URL="<cadena-de-supabase>" npm run db:migrate
   ```

## 2. Aplicación (Vercel)

1. Importar el repo en https://vercel.com (framework: Next.js, detección
   automática).
2. Configurar variables de entorno (Production y Preview):
   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | cadena del pooler de Supabase |
   | `ADMIN_PASSWORD` | la contraseña de administración |
   | `AUTH_SECRET` | cadena aleatoria larga (`openssl rand -hex 32`) |
3. Deploy. Cada `git push` a `main` vuelve a desplegar.

## 3. Migraciones posteriores

Tras cambiar `lib/db/schema.ts`:
```bash
npm run db:generate           # crea el SQL en drizzle/
DATABASE_URL="<supabase>" npm run db:migrate
git add drizzle && git commit -m "db: <cambio>"
```

## Notas

- El plan Free de Supabase suspende la BD tras inactividad; la primera petición
  tarda 1-2 s en despertar. `app/error.tsx` ofrece reintentar.
- No hay datos que migrar desde el despliegue anterior: se empieza de cero.
```

- [ ] **Step 3: Eliminar el README antiguo de referencia**

```bash
git rm docs/README-spring-boot.md
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: README del nuevo stack y guía de despliegue"
```

---

## Task 16: Verificación final e integración

**Files:**
- (ninguno nuevo)

- [ ] **Step 1: Verificación completa**

Run: `npm run verify && npm run build:e2e && npm run e2e`
Expected: todo en verde.

- [ ] **Step 2: Repaso visual en móvil**

Run: `npm run dev`, abrir con DevTools en viewport de móvil (375 px). Comprobar en `/`, `/clasificacion`, `/historial`, `/resultado/[id]`:
- No hay scroll horizontal.
- Las tablas de clasificación scrollean dentro de su contenedor.
- Los banderines y la cabecera se ven bien.

- [ ] **Step 3: Desplegar siguiendo `docs/despliegue.md`**

Crear proyecto Supabase, migrar, importar en Vercel con las 3 variables de entorno, deploy. Verificar la URL pública:
- Se ve el torneo sin contraseña.
- Con `ADMIN_PASSWORD` se pueden hacer las acciones.

- [ ] **Step 4: Abrir PR de `migracion-nextjs-supabase` a `main`**

```bash
gh pr create --title "Migración a Next.js + Supabase" --body "Reescribe TorneoMus (Spring Boot + MySQL + Thymeleaf) como app Next.js desplegable gratis en Vercel + Supabase. Porta la lógica del torneo con tests, añade corregir/deshacer resultados y candado de admin, y rediseña la interfaz.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 5: Tras merge, configurar el deploy de producción de Vercel sobre `main` y borrar la rama.**

---

## Self-Review (autor del plan)

**Cobertura del spec:**
- Estética "fiesta de pueblo" (paleta, Fraunces/Inter, banderines, `rounded-2xl`, solo tema claro) → Tasks 1, 3.
- Primitivas UI → Task 2.
- Candado admin (modal contraseña, mostrar/ocultar acciones) → Task 4; `esAdmin()` en servidor + `revalidatePath("/","layout")` en las acciones (Plan 1).
- Inicio con stats, banner ganador, enfrentamientos, panel admin, nav → Tasks 6-8.
- Clasificación (activas por flag `eliminada`, orden por derrotas; eliminadas) → Task 9, usando `repo.getClasificacion` del Plan 1.
- Historial (todas las rondas, más reciente primero) → Task 10, usando `repo.getHistorial`.
- Resultado en página dedicada, con corrección si ya jugado, solo admin, `not-found` para id inexistente → Task 11.
- `error.tsx` (BD dormida) y `not-found.tsx` → Task 12.
- Banner `{ok,mensaje,error}` vía `useActionState` → `AlertaAccion` (Task 4) usado en todos los formularios.
- e2e Playwright camino feliz → Task 13.
- CI (typecheck, lint, test, build, e2e) con Postgres de servicio → Task 14.
- README reescrito + guía de despliegue Supabase/Vercel → Task 15.
- Cambios de comportamiento (deshacer/corregir; contraseña) reflejados en `TarjetaEnfrentamiento` (Task 6), `FormResultado` (Task 11), `PanelAdmin` (Task 7).

**Escaneo de placeholders:** sin "TBD"/"TODO". Todo el código de componentes y páginas está completo.

**Consistencia de tipos y nombres:**
- `AccionResultado` importado de `@/app/actions/torneo` en `AlertaAccion`, `BotonAccion` — coincide con el export del Plan 1.
- Las 7 Server Actions se usan con firma `(prev, formData)` uniforme (ajuste hecho en el Plan 1): `registrarParejaAction`, `generarRondaAction`, `registrarResultadoAction`, `deshacerResultadoAction`, `reiniciarTorneoAction`, `desbloquearAdminAction`, `bloquearAdminAction`.
- `repo.getEstadoTorneo`, `repo.getClasificacion`, `repo.getHistorial`, `repo.getEnfrentamientoVista`, `repo.listarParejas` — definidos en el Plan 1 (Tasks 11 y 15).
- `EnfrentamientoVista`, `Pareja` importados de `@/lib/torneo/types`.
- `enfrentamientoAVista` de `@/lib/torneo/vista` usado en `app/page.tsx` (coincide con Plan 1 Task 10).
- Componentes: `Card` (prop `titulo`), `Boton` (prop `variante`), `Stat` (`etiqueta`/`valor`/`tono`), `Alerta` (`tono`), `Tabla` (`cabeceras`), `Modal` (`abierto`/`onCerrar`/`titulo`) — nombres de props consistentes entre definición (Tasks 2-3) y uso (Tasks 4-12).

**Nota de riesgo:**
- Tailwind v4 con la sintaxis `bg-x` requiere que los tokens estén en `@theme`; si una utilidad arbitraria no resuelve, usar `bg-[color:var(--color-x)]`. Verificado visualmente en cada Task con prueba manual.
- `useFormStatus` dentro de `Boton` solo refleja `pending` si el `Boton` está dentro del `<form>`; en `BotonAccion` y los formularios lo está. Para el `Boton` de `error.tsx` (fuera de form) se pasa `type="button"` y no depende de `pending`.
