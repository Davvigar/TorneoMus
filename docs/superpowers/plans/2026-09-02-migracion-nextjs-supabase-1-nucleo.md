# Migración TorneoMus a Next.js + Supabase — Plan 1: Núcleo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el proyecto Spring Boot por un proyecto Next.js con toda la lógica del torneo portada a TypeScript, cubierta por tests, con capa de base de datos (Drizzle + Postgres), autenticación de administrador por contraseña y Server Actions. Sin interfaz visual todavía.

**Architecture:** Next.js 15 (App Router). La lógica del torneo vive en funciones puras en `lib/torneo/` (sin acceso a BD, testeadas con Vitest). `lib/db/torneo-repo.ts` envuelve cada escritura en una transacción Drizzle sobre Postgres. `lib/auth.ts` gestiona una cookie de admin firmada con HMAC. `app/actions/torneo.ts` expone Server Actions que validan entrada con Zod, verifican la cookie de admin y llaman al repo.

**Tech Stack:** Next.js 15, React 19, TypeScript, Drizzle ORM + `postgres` (postgres.js), PostgreSQL, Zod, Vitest, Node 22.

**Comportamiento portado del código Java (referencia — se conserva en el historial de git):**
- `src/main/java/torneomus/service/TorneoService.java`
- `src/main/java/torneomus/entity/Pareja.java`
- `src/main/java/torneomus/entity/Enfrentamiento.java`
- `src/main/java/torneomus/repository/*.java`

**Decisión clave de fidelidad:** se replican **tal cual** las rarezas actuales:
- `eliminada = derrotas >= 2` sin mirar la ronda (réplica de `Pareja.agregarDerrota()`).
- Criterio de "activa" doble: listados usan `derrotas < 2`; recuentos y clasificación usan el flag `eliminada`.
Lo único que cambia de comportamiento: se puede **deshacer/corregir** un resultado, y las escrituras exigen contraseña de admin.

---

## Estructura de ficheros (Plan 1)

| Fichero | Responsabilidad |
|---|---|
| `package.json`, `tsconfig.json`, `next.config.ts` | Proyecto Next.js base |
| `vitest.config.ts` | Configuración de tests |
| `drizzle.config.ts` | Configuración de Drizzle Kit (migraciones) |
| `.env.example`, `.env.local`, `.env.test` | Variables de entorno |
| `lib/torneo/types.ts` | Tipos `Pareja`, `Enfrentamiento`, `Emparejamiento`, `ResultadoRonda`, `EstadoTorneo`, `EnfrentamientoVista` |
| `lib/torneo/estado.ts` | Funciones puras de estado del torneo |
| `lib/torneo/emparejar.ts` | Algoritmo puro de emparejamiento de ronda |
| `lib/torneo/reglas.ts` | Reglas puras de resultado y recómputo de derrotas |
| `lib/torneo/vista.ts` | Transformación pura Enfrentamiento → EnfrentamientoVista |
| `lib/db/schema.ts` | Tablas Drizzle `parejas` y `enfrentamientos` |
| `lib/db/client.ts` | Cliente Drizzle (postgres.js) |
| `lib/db/torneo-repo.ts` | `crearRepo(db)` — lecturas y escrituras transaccionales |
| `lib/db/testing.ts` | Helper para crear BD de test y limpiarla |
| `lib/auth.ts` | Cookie de admin firmada con HMAC |
| `lib/validation.ts` | Esquemas Zod de cada Server Action |
| `app/actions/torneo.ts` | Server Actions |
| `drizzle/` | Migraciones SQL generadas |
| `tests/**` | Tests Vitest (unitarios e integración) |

---

## Task 1: Eliminar el proyecto Spring Boot y preparar el repo

**Files:**
- Delete: `src/`, `pom.xml`, `Dockerfile`, `Procfile`, `database_setup.sql`, `.dockerignore`, `target/`
- Move: `README.md` → `docs/README-spring-boot.md`
- Modify: `.gitignore`

- [ ] **Step 1: Mover el README antiguo como referencia**

```bash
git mv README.md docs/README-spring-boot.md
```

- [ ] **Step 2: Eliminar el código Java y ficheros de build**

```bash
git rm -r src pom.xml Dockerfile Procfile database_setup.sql .dockerignore
rm -rf target
```

- [ ] **Step 3: Reemplazar `.gitignore` por uno de Node/Next**

Contenido completo de `.gitignore`:

```gitignore
# Dependencias
/node_modules
/.pnp
.pnp.js

# Tests
/coverage

# Next.js
/.next/
/out/
next-env.d.ts

# Producción
/build

# Ficheros varios
.DS_Store
Thumbs.db
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Entorno local
.env
.env.local
.env.*.local
.env.test

# IDEs
.idea/
.vscode/
*.iml

# Drizzle
/drizzle/meta/_journal.json.bak
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: eliminar proyecto Spring Boot antes de la migración a Next.js"
```

---

## Task 2: Inicializar el proyecto Next.js

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Create: `.env.example`, `.env.local`

- [ ] **Step 1: Generar el andamiaje con create-next-app en un directorio temporal**

`create-next-app` no acepta un directorio con ficheros en conflicto, así que se genera aparte y se copia.

```bash
cd ..
npx create-next-app@latest torneomus-scaffold --typescript --tailwind --app --no-src-dir --eslint --import-alias "@/*" --use-npm --no-turbopack
```

Cuando pregunte por Turbopack o cualquier extra, aceptar los valores por defecto.

- [ ] **Step 2: Copiar el andamiaje al repo (sin pisar `.git`, `docs/`)**

```bash
cd torneomus-scaffold
cp -r app public package.json package-lock.json tsconfig.json next.config.* postcss.config.* eslint.config.* .gitignore.bak 2>/dev/null || true
# Copiar explícitamente lo necesario:
cp -r app "../TorneoMus/app"
cp -r public "../TorneoMus/public"
cp package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs "../TorneoMus/"
cd ../TorneoMus
rm -rf ../torneomus-scaffold
```

Nota: si `next.config` se generó como `.mjs` en lugar de `.ts`, copiar ese. Ajustar el nombre en pasos posteriores.

- [ ] **Step 3: Limpiar el `app/page.tsx` y `app/globals.css` generados**

Reemplazar `app/page.tsx` por un placeholder mínimo (se sustituye entero en el Plan 2):

```tsx
export default function Home() {
  return <main style={{ padding: 24 }}>TorneoMus — migración en curso.</main>;
}
```

Dejar `app/globals.css` con solo la directiva de Tailwind (el resto de estilos llega en el Plan 2):

```css
@import "tailwindcss";
```

- [ ] **Step 4: Crear `.env.example`**

```bash
# Cadena de conexión a Postgres (Supabase: usar el pooler de transacciones, puerto 6543)
DATABASE_URL="postgresql://usuario:password@localhost:5432/torneomus"

# Contraseña única del modo administrador
ADMIN_PASSWORD="cambia-esto"

# Secreto para firmar la cookie de admin (cadena aleatoria larga)
AUTH_SECRET="cambia-esto-por-algo-aleatorio-y-largo"
```

- [ ] **Step 5: Crear `.env.local` para desarrollo (no se commitea)**

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/torneomus"
ADMIN_PASSWORD="test1234"
AUTH_SECRET="dev-secret-no-usar-en-produccion-1234567890"
```

- [ ] **Step 6: Verificar que el proyecto arranca**

Run: `npm install && npm run build`
Expected: build correcta (con el `page.tsx` placeholder). Warnings de "no content" de Tailwind son aceptables.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: andamiaje inicial de Next.js 15 + Tailwind + TypeScript"
```

---

## Task 3: Configurar Vitest

**Files:**
- Create: `vitest.config.ts`, `tests/setup.ts`
- Modify: `package.json` (scripts y devDependencies)

- [ ] **Step 1: Instalar Vitest y utilidades**

```bash
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths dotenv
```

- [ ] **Step 2: Crear `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    hookTimeout: 30000,
    // Los tests de integración de tests/db/ comparten la BD torneomus_test
    // (TRUNCATE en beforeEach); sin esto corren en paralelo y se pisan.
    fileParallelism: false,
  },
});
```

- [ ] **Step 3: Crear `tests/setup.ts`**

```ts
import { config } from "dotenv";

// Carga .env.test si existe; si no, .env.local
config({ path: ".env.test" });
config({ path: ".env.local" });

// Valores por defecto para los tests unitarios que no tocan BD
process.env.AUTH_SECRET ??= "test-secret-1234567890";
process.env.ADMIN_PASSWORD ??= "test1234";
```

- [ ] **Step 4: Añadir scripts a `package.json`**

En la sección `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 5: Crear un test de humo `tests/humo.test.ts`**

```ts
import { describe, it, expect } from "vitest";

describe("infra de tests", () => {
  it("ejecuta Vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Ejecutar los tests**

Run: `npm test`
Expected: 1 test PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: configurar Vitest"
```

---

## Task 4: Añadir Drizzle y el esquema de base de datos

**Files:**
- Create: `lib/db/schema.ts`, `drizzle.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Instalar Drizzle y el driver de Postgres**

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

- [ ] **Step 2: Crear `lib/db/schema.ts`**

```ts
import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const parejas = pgTable("parejas", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
  derrotas: integer("derrotas").notNull().default(0),
  eliminada: boolean("eliminada").notNull().default(false),
  descansos: integer("descansos").notNull().default(0),
  rivales: text("rivales")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const enfrentamientos = pgTable("enfrentamientos", {
  id: serial("id").primaryKey(),
  pareja1Id: integer("pareja1_id")
    .notNull()
    .references(() => parejas.id),
  pareja2Id: integer("pareja2_id").references(() => parejas.id),
  ronda: integer("ronda").notNull(),
  ganadorId: integer("ganador_id").references(() => parejas.id),
  jugado: boolean("jugado").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ParejaRow = typeof parejas.$inferSelect;
export type EnfrentamientoRow = typeof enfrentamientos.$inferSelect;
```

- [ ] **Step 3: Crear `drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 4: Añadir scripts de Drizzle a `package.json`**

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:push": "drizzle-kit push"
```

- [ ] **Step 5: Generar la primera migración**

Run: `npx dotenv -e .env.local -- npm run db:generate`
Expected: se crea `drizzle/0000_*.sql` con `CREATE TABLE "parejas"` y `CREATE TABLE "enfrentamientos"`.

Si `dotenv` CLI no está disponible, exportar la variable manualmente antes: `export DATABASE_URL=...`.

- [ ] **Step 6: Verificar el SQL generado**

Abrir `drizzle/0000_*.sql` y comprobar:
- `"rivales" text[] DEFAULT '{}'::text[] NOT NULL`
- `"pareja2_id" integer` (sin `NOT NULL`)
- `"ganador_id" integer` (sin `NOT NULL`)
- Claves foráneas de `pareja1_id`, `pareja2_id`, `ganador_id` hacia `parejas`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: esquema Drizzle de parejas y enfrentamientos"
```

---

## Task 5: Postgres local y aplicación de migraciones

**Files:**
- Create: `.env.test`
- Create: `docs/desarrollo.md`

- [ ] **Step 1: Levantar un Postgres local**

Opción A (Docker):

```bash
docker run -d --name torneomus-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=torneomus -p 5432:5432 postgres:16
```

Opción B (Supabase CLI): `supabase init && supabase start` y usar la cadena de conexión que imprime.

- [ ] **Step 2: Crear la base de datos de test**

```bash
docker exec torneomus-pg psql -U postgres -c "CREATE DATABASE torneomus_test;"
```

- [ ] **Step 3: Crear `.env.test`**

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/torneomus_test"
ADMIN_PASSWORD="test1234"
AUTH_SECRET="test-secret-1234567890"
```

- [ ] **Step 4: Aplicar migraciones a ambas bases**

```bash
npx dotenv -e .env.local -- npm run db:migrate
npx dotenv -e .env.test -- npm run db:migrate
```

Expected: `[✓] migrations applied` en las dos.

- [ ] **Step 5: Crear `docs/desarrollo.md`**

```markdown
# Desarrollo local

## Requisitos
- Node 22
- Docker (para Postgres local) o Supabase CLI

## Puesta en marcha
1. `npm install`
2. Levantar Postgres: `docker run -d --name torneomus-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=torneomus -p 5432:5432 postgres:16`
3. Crear BD de test: `docker exec torneomus-pg psql -U postgres -c "CREATE DATABASE torneomus_test;"`
4. Copiar `.env.example` a `.env.local` y ajustar.
5. Migrar: `npx dotenv -e .env.local -- npm run db:migrate`
6. `npm run dev`

## Tests
- `npm test` (necesita `.env.test` y la BD `torneomus_test` migrada)
- Migrar la BD de test tras cambiar el esquema: `npx dotenv -e .env.test -- npm run db:migrate`
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: entorno de desarrollo y base de datos local"
```

---

## Task 6: Tipos del dominio

**Files:**
- Create: `lib/torneo/types.ts`
- Test: `tests/torneo/types.test.ts`

- [ ] **Step 1: Escribir el test que fija la forma de los tipos**

`tests/torneo/types.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type {
  Pareja,
  Enfrentamiento,
  Emparejamiento,
  ResultadoRonda,
  EstadoTorneo,
  EnfrentamientoVista,
} from "@/lib/torneo/types";

describe("tipos del dominio", () => {
  it("Pareja tiene los campos esperados", () => {
    const p: Pareja = {
      id: 1,
      nombre: "Los Tigres",
      derrotas: 0,
      eliminada: false,
      descansos: 0,
      rivales: [],
    };
    expect(p.nombre).toBe("Los Tigres");
  });

  it("Enfrentamiento admite descanso con pareja2Id null", () => {
    const e: Enfrentamiento = {
      id: 1,
      pareja1Id: 1,
      pareja2Id: null,
      ronda: 1,
      ganadorId: null,
      jugado: true,
    };
    expect(e.pareja2Id).toBeNull();
  });

  it("ResultadoRonda agrupa descanso y emparejamientos", () => {
    const em: Emparejamiento = { pareja1Id: 1, pareja2Id: 2 };
    const r: ResultadoRonda = { descansaId: 3, emparejamientos: [em] };
    expect(r.emparejamientos).toHaveLength(1);
  });

  it("EstadoTorneo y EnfrentamientoVista son importables", () => {
    const tipoDe = (v: EstadoTorneo | EnfrentamientoVista) => typeof v;
    expect(tipoDe).toBeInstanceOf(Function);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npm test -- tests/torneo/types.test.ts`
Expected: FAIL — `Cannot find module '@/lib/torneo/types'`.

- [ ] **Step 3: Crear `lib/torneo/types.ts`**

```ts
export interface Pareja {
  id: number;
  nombre: string;
  derrotas: number;
  eliminada: boolean;
  descansos: number;
  rivales: string[];
}

export interface Enfrentamiento {
  id: number;
  pareja1Id: number;
  pareja2Id: number | null;
  ronda: number;
  ganadorId: number | null;
  jugado: boolean;
}

export interface Emparejamiento {
  pareja1Id: number;
  pareja2Id: number;
}

export interface ResultadoRonda {
  descansaId: number | null;
  emparejamientos: Emparejamiento[];
}

export interface EstadoTorneo {
  rondaActual: number;
  totalParejas: number;
  parejasActivasCount: number;
  enfrentamientosActuales: Enfrentamiento[];
  pendientesRondaActual: number;
  puedeGenerarNuevaRonda: boolean;
  torneoTerminado: boolean;
  parejaGanadora: Pareja | null;
}

export interface RefPareja {
  id: number;
  nombre: string;
}

export interface EnfrentamientoVista {
  id: number;
  ronda: number;
  jugado: boolean;
  esDescanso: boolean;
  pareja1: RefPareja;
  pareja2: RefPareja | null;
  ganador: RefPareja | null;
  perdedor: RefPareja | null;
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `npm test -- tests/torneo/types.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: tipos del dominio del torneo"
```

---

## Task 7: `lib/torneo/estado.ts` — funciones puras de estado

Porta: `TorneoService.getRondaActual`, `getEnfrentamientosRondaActual`, `puedeGenerarNuevaRonda`, `torneoTerminado`, `getParejaGanadora`, y los dos criterios de "activa" (`findParejasActivas` = `derrotas < 2`; `countParejasActivas` = `eliminada = false`).

**Files:**
- Create: `lib/torneo/estado.ts`
- Test: `tests/torneo/estado.test.ts`

- [ ] **Step 1: Escribir los tests**

`tests/torneo/estado.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Pareja, Enfrentamiento } from "@/lib/torneo/types";
import {
  rondaActual,
  enfrentamientosRondaActual,
  parejasActivasListado,
  contarParejasActivas,
  pendientesRondaActual,
  puedeGenerarNuevaRonda,
  torneoTerminado,
  parejaGanadora,
} from "@/lib/torneo/estado";

function pareja(over: Partial<Pareja> & { id: number; nombre: string }): Pareja {
  return { derrotas: 0, eliminada: false, descansos: 0, rivales: [], ...over };
}
function enf(over: Partial<Enfrentamiento> & { id: number; ronda: number }): Enfrentamiento {
  return { pareja1Id: 1, pareja2Id: 2, ganadorId: null, jugado: false, ...over };
}

describe("rondaActual", () => {
  it("es 0 sin enfrentamientos", () => {
    expect(rondaActual([])).toBe(0);
  });
  it("es el máximo de ronda", () => {
    expect(rondaActual([enf({ id: 1, ronda: 1 }), enf({ id: 2, ronda: 3 })])).toBe(3);
  });
});

describe("enfrentamientosRondaActual", () => {
  it("devuelve vacío si no hay rondas", () => {
    expect(enfrentamientosRondaActual([])).toEqual([]);
  });
  it("filtra por la ronda máxima y ordena por id", () => {
    const lista = [
      enf({ id: 5, ronda: 2 }),
      enf({ id: 3, ronda: 2 }),
      enf({ id: 1, ronda: 1 }),
    ];
    expect(enfrentamientosRondaActual(lista).map((e) => e.id)).toEqual([3, 5]);
  });
});

describe("criterios de activa", () => {
  it("parejasActivasListado usa derrotas < 2", () => {
    const ps = [
      pareja({ id: 1, nombre: "A", derrotas: 1 }),
      pareja({ id: 2, nombre: "B", derrotas: 2 }),
      pareja({ id: 3, nombre: "C", derrotas: 2, eliminada: false }),
    ];
    expect(parejasActivasListado(ps).map((p) => p.id)).toEqual([1]);
  });
  it("contarParejasActivas usa el flag eliminada", () => {
    const ps = [
      pareja({ id: 1, nombre: "A", derrotas: 5, eliminada: false }),
      pareja({ id: 2, nombre: "B", eliminada: true }),
    ];
    expect(contarParejasActivas(ps)).toBe(1);
  });
});

describe("pendientesRondaActual", () => {
  it("cuenta los no jugados de la ronda máxima", () => {
    const lista = [
      enf({ id: 1, ronda: 2, jugado: true }),
      enf({ id: 2, ronda: 2, jugado: false }),
      enf({ id: 3, ronda: 2, jugado: false }),
    ];
    expect(pendientesRondaActual(lista)).toBe(2);
  });
  it("es 0 si no hay rondas", () => {
    expect(pendientesRondaActual([])).toBe(0);
  });
});

describe("puedeGenerarNuevaRonda", () => {
  it("false si hay menos de 2 activas (por flag)", () => {
    const ps = [pareja({ id: 1, nombre: "A", eliminada: true }), pareja({ id: 2, nombre: "B" })];
    expect(puedeGenerarNuevaRonda(ps, [])).toBe(false);
  });
  it("true en ronda 0 con 2+ activas", () => {
    const ps = [pareja({ id: 1, nombre: "A" }), pareja({ id: 2, nombre: "B" })];
    expect(puedeGenerarNuevaRonda(ps, [])).toBe(true);
  });
  it("false si quedan enfrentamientos pendientes en la ronda actual", () => {
    const ps = [pareja({ id: 1, nombre: "A" }), pareja({ id: 2, nombre: "B" })];
    const lista = [enf({ id: 1, ronda: 1, jugado: false })];
    expect(puedeGenerarNuevaRonda(ps, lista)).toBe(false);
  });
  it("true si la ronda actual está completa", () => {
    const ps = [pareja({ id: 1, nombre: "A" }), pareja({ id: 2, nombre: "B" })];
    const lista = [enf({ id: 1, ronda: 1, jugado: true })];
    expect(puedeGenerarNuevaRonda(ps, lista)).toBe(true);
  });
});

describe("torneoTerminado y parejaGanadora", () => {
  it("no terminado en ronda 0", () => {
    const ps = [pareja({ id: 1, nombre: "A" })];
    expect(torneoTerminado(ps, [])).toBe(false);
    expect(parejaGanadora(ps, [])).toBeNull();
  });
  it("terminado si ronda > 0 y activas (flag) <= 1", () => {
    const ps = [
      pareja({ id: 1, nombre: "A", derrotas: 1 }),
      pareja({ id: 2, nombre: "B", eliminada: true }),
    ];
    const lista = [enf({ id: 1, ronda: 3, jugado: true })];
    expect(torneoTerminado(ps, lista)).toBe(true);
    expect(parejaGanadora(ps, lista)?.id).toBe(1);
  });
  it("parejaGanadora usa el listado por derrotas < 2", () => {
    const ps = [
      pareja({ id: 1, nombre: "A", derrotas: 2, eliminada: false }),
      pareja({ id: 2, nombre: "B", derrotas: 2, eliminada: true }),
    ];
    const lista = [enf({ id: 1, ronda: 3, jugado: true })];
    // activas por flag = 1 -> terminado; pero listado (derrotas<2) está vacío -> null
    expect(torneoTerminado(ps, lista)).toBe(true);
    expect(parejaGanadora(ps, lista)).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- tests/torneo/estado.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `lib/torneo/estado.ts`**

```ts
import type { Enfrentamiento, Pareja } from "./types";

export function rondaActual(enfrentamientos: Enfrentamiento[]): number {
  return enfrentamientos.reduce((max, e) => Math.max(max, e.ronda), 0);
}

export function enfrentamientosRondaActual(
  enfrentamientos: Enfrentamiento[],
): Enfrentamiento[] {
  const r = rondaActual(enfrentamientos);
  if (r === 0) return [];
  return enfrentamientos
    .filter((e) => e.ronda === r)
    .sort((a, b) => a.id - b.id);
}

/** Réplica de ParejaRepository.findParejasActivas(): derrotas < 2. */
export function parejasActivasListado(parejas: Pareja[]): Pareja[] {
  return parejas.filter((p) => p.derrotas < 2);
}

/** Réplica de ParejaRepository.countParejasActivas(): flag eliminada = false. */
export function contarParejasActivas(parejas: Pareja[]): number {
  return parejas.filter((p) => !p.eliminada).length;
}

export function pendientesRondaActual(enfrentamientos: Enfrentamiento[]): number {
  const r = rondaActual(enfrentamientos);
  if (r === 0) return 0;
  return enfrentamientos.filter((e) => e.ronda === r && !e.jugado).length;
}

export function puedeGenerarNuevaRonda(
  parejas: Pareja[],
  enfrentamientos: Enfrentamiento[],
): boolean {
  if (contarParejasActivas(parejas) < 2) return false;
  const r = rondaActual(enfrentamientos);
  if (r === 0) return true;
  return enfrentamientos.filter((e) => e.ronda === r && !e.jugado).length === 0;
}

export function torneoTerminado(
  parejas: Pareja[],
  enfrentamientos: Enfrentamiento[],
): boolean {
  return rondaActual(enfrentamientos) > 0 && contarParejasActivas(parejas) <= 1;
}

export function parejaGanadora(
  parejas: Pareja[],
  enfrentamientos: Enfrentamiento[],
): Pareja | null {
  if (!torneoTerminado(parejas, enfrentamientos)) return null;
  const activas = parejasActivasListado(parejas);
  return activas.length > 0 ? activas[0] : null;
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test -- tests/torneo/estado.test.ts`
Expected: todos los tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: funciones puras de estado del torneo"
```

---

## Task 8: `lib/torneo/emparejar.ts` — algoritmo de emparejamiento

Porta `TorneoService.generarSiguienteRonda` (parte de emparejamiento) y `encontrarMejorRival`.

**Files:**
- Create: `lib/torneo/emparejar.ts`
- Test: `tests/torneo/emparejar.test.ts`

- [ ] **Step 1: Escribir los tests**

`tests/torneo/emparejar.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Pareja } from "@/lib/torneo/types";
import { generarEmparejamientos } from "@/lib/torneo/emparejar";

function pareja(over: Partial<Pareja> & { id: number; nombre: string }): Pareja {
  return { derrotas: 0, eliminada: false, descansos: 0, rivales: [], ...over };
}

describe("generarEmparejamientos", () => {
  it("lanza error con menos de 2 parejas", () => {
    expect(() => generarEmparejamientos([pareja({ id: 1, nombre: "A" })])).toThrow(
      "No hay suficientes parejas activas para generar una ronda",
    );
  });

  it("empareja todas cuando el número es par y nadie descansa", () => {
    const ps = [
      pareja({ id: 1, nombre: "A" }),
      pareja({ id: 2, nombre: "B" }),
      pareja({ id: 3, nombre: "C" }),
      pareja({ id: 4, nombre: "D" }),
    ];
    const r = generarEmparejamientos(ps);
    expect(r.descansaId).toBeNull();
    expect(r.emparejamientos).toHaveLength(2);
    const ids = r.emparejamientos.flatMap((e) => [e.pareja1Id, e.pareja2Id]).sort();
    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it("con número impar descansa la de menos descansos", () => {
    const ps = [
      pareja({ id: 1, nombre: "A", descansos: 1 }),
      pareja({ id: 2, nombre: "B", descansos: 0 }),
      pareja({ id: 3, nombre: "C", descansos: 2 }),
    ];
    const r = generarEmparejamientos(ps);
    expect(r.descansaId).toBe(2);
    expect(r.emparejamientos).toHaveLength(1);
  });

  it("desempata el descanso por nombre ascendente", () => {
    const ps = [
      pareja({ id: 1, nombre: "Zeta", descansos: 0 }),
      pareja({ id: 2, nombre: "Alfa", descansos: 0 }),
      pareja({ id: 3, nombre: "Beta", descansos: 0 }),
    ];
    const r = generarEmparejamientos(ps);
    expect(r.descansaId).toBe(2); // "Alfa"
  });

  it("evita emparejar rivales ya jugados si hay alternativa", () => {
    const ps = [
      pareja({ id: 1, nombre: "A", rivales: ["B"] }),
      pareja({ id: 2, nombre: "B", rivales: ["A"] }),
      pareja({ id: 3, nombre: "C" }),
      pareja({ id: 4, nombre: "D" }),
    ];
    const r = generarEmparejamientos(ps);
    // A no debe quedar emparejada con B
    const parA = r.emparejamientos.find(
      (e) => e.pareja1Id === 1 || e.pareja2Id === 1,
    )!;
    const rivalDeA = parA.pareja1Id === 1 ? parA.pareja2Id : parA.pareja1Id;
    expect(rivalDeA).not.toBe(2);
  });

  it("repite rival cuando es inevitable", () => {
    const ps = [
      pareja({ id: 1, nombre: "A", rivales: ["B"] }),
      pareja({ id: 2, nombre: "B", rivales: ["A"] }),
    ];
    const r = generarEmparejamientos(ps);
    expect(r.emparejamientos).toEqual([{ pareja1Id: 1, pareja2Id: 2 }]);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- tests/torneo/emparejar.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `lib/torneo/emparejar.ts`**

```ts
import type { Pareja, ResultadoRonda } from "./types";

/** Réplica de TorneoService.encontrarMejorRival. */
function encontrarMejorRival(pareja: Pareja, candidatos: Pareja[]): Pareja {
  const noJugadas = candidatos.filter((c) => !pareja.rivales.includes(c.nombre));
  if (noJugadas.length > 0) return noJugadas[0];
  return candidatos[0];
}

/**
 * Réplica de la parte de emparejamiento de TorneoService.generarSiguienteRonda.
 * No muta la entrada. Devuelve qué pareja descansa (o null) y la lista de
 * emparejamientos. La actualización de `rivales` y `descansos` la hace el repo.
 */
export function generarEmparejamientos(parejasActivas: Pareja[]): ResultadoRonda {
  if (parejasActivas.length < 2) {
    throw new Error("No hay suficientes parejas activas para generar una ronda");
  }

  let disponibles = [...parejasActivas];
  let descansaId: number | null = null;

  if (disponibles.length % 2 === 1) {
    const ordenadas = [...disponibles].sort(
      (a, b) => a.descansos - b.descansos || a.nombre.localeCompare(b.nombre),
    );
    const queDescansa = ordenadas[0];
    descansaId = queDescansa.id;
    disponibles = disponibles.filter((p) => p.id !== queDescansa.id);
  }

  const emparejamientos: ResultadoRonda["emparejamientos"] = [];
  const cola = [...disponibles];
  while (cola.length >= 2) {
    const pareja1 = cola.shift()!;
    const pareja2 = encontrarMejorRival(pareja1, cola);
    const idx = cola.findIndex((p) => p.id === pareja2.id);
    cola.splice(idx, 1);
    emparejamientos.push({ pareja1Id: pareja1.id, pareja2Id: pareja2.id });
  }

  return { descansaId, emparejamientos };
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test -- tests/torneo/emparejar.test.ts`
Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: algoritmo puro de emparejamiento de ronda"
```

---

## Task 9: `lib/torneo/reglas.ts` — reglas de resultado y recómputo

Porta `TorneoService.registrarResultado` (validación de ganador), `Enfrentamiento.getPerdedor`, `Enfrentamiento.involucraPareja`, `Pareja.agregarDerrota`.

**Files:**
- Create: `lib/torneo/reglas.ts`
- Test: `tests/torneo/reglas.test.ts`

- [ ] **Step 1: Escribir los tests**

`tests/torneo/reglas.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Enfrentamiento, Pareja } from "@/lib/torneo/types";
import {
  ganadorParticipa,
  perdedorDe,
  recomputarEstadoParejas,
} from "@/lib/torneo/reglas";

function pareja(over: Partial<Pareja> & { id: number; nombre: string }): Pareja {
  return { derrotas: 0, eliminada: false, descansos: 0, rivales: [], ...over };
}
function enf(over: Partial<Enfrentamiento> & { id: number }): Enfrentamiento {
  return { pareja1Id: 1, pareja2Id: 2, ronda: 1, ganadorId: null, jugado: false, ...over };
}

describe("ganadorParticipa", () => {
  it("true si el ganador es una de las dos parejas", () => {
    expect(ganadorParticipa(enf({ id: 1, pareja1Id: 3, pareja2Id: 4 }), 4)).toBe(true);
  });
  it("false si el ganador no participa", () => {
    expect(ganadorParticipa(enf({ id: 1, pareja1Id: 3, pareja2Id: 4 }), 9)).toBe(false);
  });
});

describe("perdedorDe", () => {
  it("devuelve la otra pareja", () => {
    expect(perdedorDe(enf({ id: 1, pareja1Id: 3, pareja2Id: 4 }), 3)).toBe(4);
    expect(perdedorDe(enf({ id: 1, pareja1Id: 3, pareja2Id: 4 }), 4)).toBe(3);
  });
  it("null en un descanso", () => {
    expect(perdedorDe(enf({ id: 1, pareja1Id: 3, pareja2Id: null }), 3)).toBeNull();
  });
});

describe("recomputarEstadoParejas", () => {
  it("cuenta derrotas de los enfrentamientos jugados", () => {
    const ps = [
      pareja({ id: 1, nombre: "A" }),
      pareja({ id: 2, nombre: "B" }),
      pareja({ id: 3, nombre: "C" }),
    ];
    const es = [
      enf({ id: 1, pareja1Id: 1, pareja2Id: 2, jugado: true, ganadorId: 1 }),
      enf({ id: 2, pareja1Id: 2, pareja2Id: 3, jugado: true, ganadorId: 3 }),
      enf({ id: 3, pareja1Id: 1, pareja2Id: 3, jugado: false, ganadorId: null }),
    ];
    const r = recomputarEstadoParejas(ps, es);
    expect(r.find((p) => p.id === 2)!.derrotas).toBe(2);
    expect(r.find((p) => p.id === 2)!.eliminada).toBe(true);
    expect(r.find((p) => p.id === 1)!.derrotas).toBe(0);
    expect(r.find((p) => p.id === 1)!.eliminada).toBe(false);
  });

  it("elimina a las 2 derrotas sin mirar la ronda (réplica de agregarDerrota)", () => {
    const ps = [pareja({ id: 1, nombre: "A" }), pareja({ id: 2, nombre: "B" })];
    const es = [
      enf({ id: 1, ronda: 1, pareja1Id: 1, pareja2Id: 2, jugado: true, ganadorId: 1 }),
      enf({ id: 2, ronda: 2, pareja1Id: 1, pareja2Id: 2, jugado: true, ganadorId: 1 }),
    ];
    const r = recomputarEstadoParejas(ps, es);
    expect(r.find((p) => p.id === 2)!.eliminada).toBe(true);
  });

  it("ignora descansos y no muta la entrada", () => {
    const ps = [pareja({ id: 1, nombre: "A", derrotas: 5, eliminada: true })];
    const es = [enf({ id: 1, pareja1Id: 1, pareja2Id: null, jugado: true, ganadorId: null })];
    const r = recomputarEstadoParejas(ps, es);
    expect(r[0].derrotas).toBe(0);
    expect(r[0].eliminada).toBe(false);
    expect(ps[0].derrotas).toBe(5); // entrada intacta
  });

  it("recalcula correctamente tras deshacer (un jugado menos)", () => {
    const ps = [pareja({ id: 1, nombre: "A" }), pareja({ id: 2, nombre: "B" })];
    const esAntes = [
      enf({ id: 1, pareja1Id: 1, pareja2Id: 2, jugado: true, ganadorId: 1 }),
      enf({ id: 2, pareja1Id: 1, pareja2Id: 2, jugado: true, ganadorId: 1 }),
    ];
    expect(recomputarEstadoParejas(ps, esAntes).find((p) => p.id === 2)!.eliminada).toBe(true);
    const esDespues = [
      esAntes[0],
      { ...esAntes[1], jugado: false, ganadorId: null },
    ];
    const r = recomputarEstadoParejas(ps, esDespues);
    expect(r.find((p) => p.id === 2)!.derrotas).toBe(1);
    expect(r.find((p) => p.id === 2)!.eliminada).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- tests/torneo/reglas.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `lib/torneo/reglas.ts`**

```ts
import type { Enfrentamiento, Pareja } from "./types";

/** Réplica de Enfrentamiento.involucraPareja. */
export function ganadorParticipa(
  enfrentamiento: Enfrentamiento,
  ganadorId: number,
): boolean {
  return (
    enfrentamiento.pareja1Id === ganadorId ||
    enfrentamiento.pareja2Id === ganadorId
  );
}

/** Réplica de Enfrentamiento.getPerdedor (null si es descanso). */
export function perdedorDe(
  enfrentamiento: Enfrentamiento,
  ganadorId: number,
): number | null {
  if (enfrentamiento.pareja2Id === null) return null;
  if (enfrentamiento.pareja1Id === ganadorId) return enfrentamiento.pareja2Id;
  if (enfrentamiento.pareja2Id === ganadorId) return enfrentamiento.pareja1Id;
  return null;
}

/**
 * Recalcula `derrotas` y `eliminada` de cada pareja contando las derrotas
 * reales sobre los enfrentamientos jugados. `eliminada = derrotas >= 2`,
 * réplica de Pareja.agregarDerrota() (sin condición de ronda). No muta la entrada.
 */
export function recomputarEstadoParejas(
  parejas: Pareja[],
  enfrentamientos: Enfrentamiento[],
): Pareja[] {
  const derrotasPorId = new Map<number, number>();
  for (const e of enfrentamientos) {
    if (!e.jugado || e.ganadorId === null || e.pareja2Id === null) continue;
    const perdedor = perdedorDe(e, e.ganadorId);
    if (perdedor === null) continue;
    derrotasPorId.set(perdedor, (derrotasPorId.get(perdedor) ?? 0) + 1);
  }
  return parejas.map((p) => {
    const derrotas = derrotasPorId.get(p.id) ?? 0;
    return { ...p, derrotas, eliminada: derrotas >= 2 };
  });
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test -- tests/torneo/reglas.test.ts`
Expected: todos los tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: reglas de resultado y recómputo de derrotas"
```

---

## Task 10: `lib/torneo/vista.ts` — Enfrentamiento a vista enriquecida

Convierte un `Enfrentamiento` (solo ids) en `EnfrentamientoVista` (con nombres), replicando la detección de descanso y de perdedor que hoy hacen las plantillas Thymeleaf.

**Files:**
- Create: `lib/torneo/vista.ts`
- Test: `tests/torneo/vista.test.ts`

- [ ] **Step 1: Escribir los tests**

`tests/torneo/vista.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Enfrentamiento, Pareja } from "@/lib/torneo/types";
import { enfrentamientoAVista } from "@/lib/torneo/vista";

function pareja(id: number, nombre: string): Pareja {
  return { id, nombre, derrotas: 0, eliminada: false, descansos: 0, rivales: [] };
}
const indice = new Map<number, Pareja>([
  [1, pareja(1, "Los Tigres")],
  [2, pareja(2, "Las Águilas")],
]);

function enf(over: Partial<Enfrentamiento> & { id: number }): Enfrentamiento {
  return { pareja1Id: 1, pareja2Id: 2, ronda: 1, ganadorId: null, jugado: false, ...over };
}

describe("enfrentamientoAVista", () => {
  it("mapea un enfrentamiento normal jugado", () => {
    const v = enfrentamientoAVista(
      enf({ id: 7, jugado: true, ganadorId: 1 }),
      indice,
    );
    expect(v).toMatchObject({
      id: 7,
      ronda: 1,
      jugado: true,
      esDescanso: false,
      pareja1: { id: 1, nombre: "Los Tigres" },
      pareja2: { id: 2, nombre: "Las Águilas" },
      ganador: { id: 1, nombre: "Los Tigres" },
      perdedor: { id: 2, nombre: "Las Águilas" },
    });
  });

  it("marca descanso cuando pareja2Id es null", () => {
    const v = enfrentamientoAVista(
      enf({ id: 8, pareja2Id: null, jugado: true }),
      indice,
    );
    expect(v.esDescanso).toBe(true);
    expect(v.pareja2).toBeNull();
    expect(v.ganador).toBeNull();
    expect(v.perdedor).toBeNull();
  });

  it("sin ganador todavía, perdedor es null", () => {
    const v = enfrentamientoAVista(enf({ id: 9 }), indice);
    expect(v.ganador).toBeNull();
    expect(v.perdedor).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- tests/torneo/vista.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `lib/torneo/vista.ts`**

```ts
import type { Enfrentamiento, EnfrentamientoVista, Pareja, RefPareja } from "./types";
import { perdedorDe } from "./reglas";

function ref(indice: Map<number, Pareja>, id: number | null): RefPareja | null {
  if (id === null) return null;
  const p = indice.get(id);
  return p ? { id: p.id, nombre: p.nombre } : null;
}

export function enfrentamientoAVista(
  e: Enfrentamiento,
  indice: Map<number, Pareja>,
): EnfrentamientoVista {
  const esDescanso = e.pareja2Id === null;
  const pareja1 = ref(indice, e.pareja1Id) ?? { id: e.pareja1Id, nombre: "—" };
  const pareja2 = esDescanso ? null : ref(indice, e.pareja2Id);
  const ganador = esDescanso ? null : ref(indice, e.ganadorId);
  const perdedorId =
    !esDescanso && e.jugado && e.ganadorId !== null
      ? perdedorDe(e, e.ganadorId)
      : null;
  const perdedor = ref(indice, perdedorId);

  return {
    id: e.id,
    ronda: e.ronda,
    jugado: e.jugado,
    esDescanso,
    pareja1,
    pareja2,
    ganador,
    perdedor,
  };
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test -- tests/torneo/vista.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: transformación de enfrentamiento a vista enriquecida"
```

---

## Task 11: Cliente de BD y esqueleto del repo (lecturas)

**Files:**
- Create: `lib/db/client.ts`, `lib/db/torneo-repo.ts`, `lib/db/testing.ts`
- Test: `tests/db/repo-lecturas.test.ts`

- [ ] **Step 1: Crear `lib/db/client.ts`**

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no está definida");
}

// `prepare: false` es necesario para el pooler de transacciones de Supabase.
const sqlClient = postgres(connectionString, { prepare: false });

export const db = drizzle(sqlClient, { schema });
export type Db = typeof db;
```

- [ ] **Step 2: Crear `lib/db/testing.ts`**

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

/** Crea un cliente Drizzle contra DATABASE_URL (que en tests apunta a torneomus_test). */
export function crearDbTest() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.includes("test")) {
    throw new Error(
      "Los tests de integración requieren DATABASE_URL apuntando a una BD de test (con 'test' en el nombre).",
    );
  }
  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });
  return { db, cerrar: () => client.end() };
}

/** Vacía las tablas y reinicia los ids. */
export async function limpiar(db: ReturnType<typeof crearDbTest>["db"]) {
  await db.execute(
    sql`TRUNCATE TABLE enfrentamientos, parejas RESTART IDENTITY CASCADE`,
  );
}
```

- [ ] **Step 3: Crear `lib/db/torneo-repo.ts` con solo las lecturas**

```ts
import { eq } from "drizzle-orm";
import { db as dbPorDefecto, type Db } from "./client";
import { enfrentamientos, parejas } from "./schema";
import type { EnfrentamientoRow, ParejaRow } from "./schema";
import type { Enfrentamiento, Pareja } from "@/lib/torneo/types";

function aPareja(r: ParejaRow): Pareja {
  return {
    id: r.id,
    nombre: r.nombre,
    derrotas: r.derrotas,
    eliminada: r.eliminada,
    descansos: r.descansos,
    rivales: r.rivales,
  };
}

function aEnfrentamiento(r: EnfrentamientoRow): Enfrentamiento {
  return {
    id: r.id,
    pareja1Id: r.pareja1Id,
    pareja2Id: r.pareja2Id,
    ronda: r.ronda,
    ganadorId: r.ganadorId,
    jugado: r.jugado,
  };
}

export function crearRepo(database: Db = dbPorDefecto) {
  return {
    async listarParejas(): Promise<Pareja[]> {
      const rows = await database.select().from(parejas).orderBy(parejas.id);
      return rows.map(aPareja);
    },

    async listarEnfrentamientos(): Promise<Enfrentamiento[]> {
      const rows = await database
        .select()
        .from(enfrentamientos)
        .orderBy(enfrentamientos.id);
      return rows.map(aEnfrentamiento);
    },

    async getEnfrentamiento(id: number): Promise<Enfrentamiento | null> {
      const rows = await database
        .select()
        .from(enfrentamientos)
        .where(eq(enfrentamientos.id, id));
      return rows[0] ? aEnfrentamiento(rows[0]) : null;
    },
  };
}

export type TorneoRepo = ReturnType<typeof crearRepo>;

/** Instancia por defecto para la app (usa el cliente de producción). */
export const repo = crearRepo();
```

- [ ] **Step 4: Escribir el test de lecturas**

`tests/db/repo-lecturas.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { crearDbTest, limpiar } from "@/lib/db/testing";
import { crearRepo } from "@/lib/db/torneo-repo";
import { parejas } from "@/lib/db/schema";

const { db, cerrar } = crearDbTest();
const repo = crearRepo(db);

beforeEach(async () => {
  await limpiar(db);
});

afterAll(async () => {
  await cerrar();
});

describe("repo — lecturas", () => {
  it("listarParejas devuelve vacío al inicio", async () => {
    expect(await repo.listarParejas()).toEqual([]);
  });

  it("listarParejas mapea las columnas a Pareja", async () => {
    await db.insert(parejas).values({ nombre: "Los Tigres" });
    const [p] = await repo.listarParejas();
    expect(p).toMatchObject({
      nombre: "Los Tigres",
      derrotas: 0,
      eliminada: false,
      descansos: 0,
      rivales: [],
    });
    expect(typeof p.id).toBe("number");
  });

  it("getEnfrentamiento devuelve null si no existe", async () => {
    expect(await repo.getEnfrentamiento(999)).toBeNull();
  });
});
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `npm test -- tests/db/repo-lecturas.test.ts`
Expected: 3 tests PASS. (Requiere Postgres de test levantado y migrado — Task 5.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: cliente de BD y lecturas del repo del torneo"
```

---

## Task 12: `repo.registrarPareja`

Porta `TorneoService.registrarPareja` (comprobación de nombre único).

**Files:**
- Modify: `lib/db/torneo-repo.ts`
- Test: `tests/db/repo-registrar-pareja.test.ts`

- [ ] **Step 1: Escribir el test**

`tests/db/repo-registrar-pareja.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { crearDbTest, limpiar } from "@/lib/db/testing";
import { crearRepo } from "@/lib/db/torneo-repo";

const { db, cerrar } = crearDbTest();
const repo = crearRepo(db);

beforeEach(() => limpiar(db));
afterAll(() => cerrar());

describe("repo.registrarPareja", () => {
  it("inserta una pareja nueva", async () => {
    await repo.registrarPareja("Los Tigres");
    const nombres = (await repo.listarParejas()).map((p) => p.nombre);
    expect(nombres).toEqual(["Los Tigres"]);
  });

  it("rechaza un nombre duplicado con el mensaje portado", async () => {
    await repo.registrarPareja("Los Tigres");
    await expect(repo.registrarPareja("Los Tigres")).rejects.toThrow(
      "Ya existe una pareja con ese nombre",
    );
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- tests/db/repo-registrar-pareja.test.ts`
Expected: FAIL — `repo.registrarPareja is not a function`.

- [ ] **Step 3: Añadir `registrarPareja` al objeto que devuelve `crearRepo`**

Añadir dentro del `return { ... }` de `crearRepo`, tras `getEnfrentamiento`:

```ts
    async registrarPareja(nombre: string): Promise<void> {
      const existentes = await database
        .select({ id: parejas.id })
        .from(parejas)
        .where(eq(parejas.nombre, nombre));
      if (existentes.length > 0) {
        throw new Error("Ya existe una pareja con ese nombre");
      }
      await database.insert(parejas).values({ nombre });
    },
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test -- tests/db/repo-registrar-pareja.test.ts`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: repo.registrarPareja con validación de nombre único"
```

---

## Task 13: `repo.generarSiguienteRonda`

Porta `TorneoService.generarSiguienteRonda` completo: guardas de pendientes y de nº de activas, creación del descanso, inserción de enfrentamientos y actualización de `rivales`/`descansos`, todo en una transacción.

**Files:**
- Modify: `lib/db/torneo-repo.ts`
- Test: `tests/db/repo-generar-ronda.test.ts`

- [ ] **Step 1: Escribir el test**

`tests/db/repo-generar-ronda.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { crearDbTest, limpiar } from "@/lib/db/testing";
import { crearRepo } from "@/lib/db/torneo-repo";

const { db, cerrar } = crearDbTest();
const repo = crearRepo(db);

beforeEach(() => limpiar(db));
afterAll(() => cerrar());

async function registrar(...nombres: string[]) {
  for (const n of nombres) await repo.registrarPareja(n);
}

describe("repo.generarSiguienteRonda", () => {
  it("lanza error con menos de 2 parejas activas", async () => {
    await registrar("A");
    await expect(repo.generarSiguienteRonda()).rejects.toThrow(
      "No hay suficientes parejas activas para generar una ronda",
    );
  });

  it("genera la ronda 1 con todas emparejadas si el número es par", async () => {
    await registrar("A", "B", "C", "D");
    const n = await repo.generarSiguienteRonda();
    expect(n).toBe(2);
    const es = await repo.listarEnfrentamientos();
    expect(es).toHaveLength(2);
    expect(es.every((e) => e.ronda === 1 && !e.jugado)).toBe(true);
  });

  it("con número impar crea un descanso jugado y actualiza descansos", async () => {
    await registrar("A", "B", "C");
    await repo.generarSiguienteRonda();
    const es = await repo.listarEnfrentamientos();
    const descanso = es.find((e) => e.pareja2Id === null)!;
    expect(descanso.jugado).toBe(true);
    const ps = await repo.listarParejas();
    const queDescansa = ps.find((p) => p.id === descanso.pareja1Id)!;
    expect(queDescansa.descansos).toBe(1);
  });

  it("actualiza rivales de ambas parejas en cada emparejamiento", async () => {
    await registrar("A", "B");
    await repo.generarSiguienteRonda();
    const ps = await repo.listarParejas();
    expect(ps.find((p) => p.nombre === "A")!.rivales).toEqual(["B"]);
    expect(ps.find((p) => p.nombre === "B")!.rivales).toEqual(["A"]);
  });

  it("rechaza generar otra ronda si hay pendientes", async () => {
    await registrar("A", "B", "C", "D");
    await repo.generarSiguienteRonda();
    await expect(repo.generarSiguienteRonda()).rejects.toThrow(
      "No puedes generar una nueva ronda: hay enfrentamientos pendientes en la ronda actual.",
    );
  });

  it("permite la siguiente ronda cuando la actual está completa y evita repetir rival", async () => {
    await registrar("A", "B", "C", "D");
    await repo.generarSiguienteRonda();
    let es = await repo.listarEnfrentamientos();
    for (const e of es) {
      await repo.registrarResultado(e.id, e.pareja1Id);
    }
    await repo.generarSiguienteRonda();
    es = await repo.listarEnfrentamientos();
    const ronda2 = es.filter((e) => e.ronda === 2);
    expect(ronda2).toHaveLength(2);
    // Nadie repite el rival de la ronda 1
    const ps = await repo.listarParejas();
    for (const p of ps) {
      const rivalesUnicos = new Set(p.rivales);
      expect(rivalesUnicos.size).toBe(p.rivales.length);
    }
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- tests/db/repo-generar-ronda.test.ts`
Expected: FAIL — `repo.generarSiguienteRonda is not a function` (y `registrarResultado` tampoco existe aún; ese test concreto se cubrirá al completar la Task 14 — se puede marcar `.skip` temporalmente en el último `it` y quitarlo en la Task 14).

- [ ] **Step 3: Añadir imports en `lib/db/torneo-repo.ts`**

Al principio del fichero, junto a los imports existentes:

```ts
import { sql } from "drizzle-orm";
import { generarEmparejamientos } from "@/lib/torneo/emparejar";
import { rondaActual } from "@/lib/torneo/estado";
```

- [ ] **Step 4: Añadir `generarSiguienteRonda` dentro de `crearRepo`**

```ts
    async generarSiguienteRonda(): Promise<number> {
      return database.transaction(async (tx) => {
        const pRows = await tx.select().from(parejas).orderBy(parejas.id);
        const eRows = await tx
          .select()
          .from(enfrentamientos)
          .orderBy(enfrentamientos.id);
        const todasParejas = pRows.map(aPareja);
        const todosEnf = eRows.map(aEnfrentamiento);

        const r = rondaActual(todosEnf);
        if (r > 0 && todosEnf.some((e) => e.ronda === r && !e.jugado)) {
          throw new Error(
            "No puedes generar una nueva ronda: hay enfrentamientos pendientes en la ronda actual.",
          );
        }

        const activas = todasParejas.filter((p) => p.derrotas < 2);
        const nuevaRonda = r + 1;
        // Lanza "No hay suficientes parejas activas para generar una ronda" si < 2.
        const { descansaId, emparejamientos } = generarEmparejamientos(activas);

        if (descansaId !== null) {
          await tx
            .update(parejas)
            .set({ descansos: sql`${parejas.descansos} + 1` })
            .where(eq(parejas.id, descansaId));
          await tx.insert(enfrentamientos).values({
            pareja1Id: descansaId,
            pareja2Id: null,
            ronda: nuevaRonda,
            jugado: true,
          });
        }

        const porId = new Map(activas.map((p) => [p.id, p]));
        for (const em of emparejamientos) {
          await tx.insert(enfrentamientos).values({
            pareja1Id: em.pareja1Id,
            pareja2Id: em.pareja2Id,
            ronda: nuevaRonda,
            jugado: false,
          });
          const p1 = porId.get(em.pareja1Id)!;
          const p2 = porId.get(em.pareja2Id)!;
          const rivales1 = p1.rivales.includes(p2.nombre)
            ? p1.rivales
            : [...p1.rivales, p2.nombre];
          const rivales2 = p2.rivales.includes(p1.nombre)
            ? p2.rivales
            : [...p2.rivales, p1.nombre];
          await tx
            .update(parejas)
            .set({ rivales: rivales1 })
            .where(eq(parejas.id, p1.id));
          await tx
            .update(parejas)
            .set({ rivales: rivales2 })
            .where(eq(parejas.id, p2.id));
        }

        return emparejamientos.length;
      });
    },
```

- [ ] **Step 5: Ejecutar los tests que no dependen de `registrarResultado`**

Run: `npm test -- tests/db/repo-generar-ronda.test.ts -t "genera la ronda 1"`
Run: `npm test -- tests/db/repo-generar-ronda.test.ts -t "descanso jugado"`
Run: `npm test -- tests/db/repo-generar-ronda.test.ts -t "actualiza rivales"`
Run: `npm test -- tests/db/repo-generar-ronda.test.ts -t "rechaza generar otra ronda"`
Run: `npm test -- tests/db/repo-generar-ronda.test.ts -t "menos de 2 parejas"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: repo.generarSiguienteRonda con transacción y actualización de rivales"
```

---

## Task 14: `repo.registrarResultado` y `repo.deshacerResultado`

Porta `TorneoService.registrarResultado`. **Cambio de comportamiento:** se permite registrar sobre un enfrentamiento ya jugado (corrección). Se añade `deshacerResultado`. Ambos recalculan el estado de las parejas con `recomputarEstadoParejas`.

**Files:**
- Modify: `lib/db/torneo-repo.ts`
- Test: `tests/db/repo-resultado.test.ts`

- [ ] **Step 1: Escribir el test**

`tests/db/repo-resultado.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { crearDbTest, limpiar } from "@/lib/db/testing";
import { crearRepo } from "@/lib/db/torneo-repo";

const { db, cerrar } = crearDbTest();
const repo = crearRepo(db);

beforeEach(() => limpiar(db));
afterAll(() => cerrar());

async function torneoConRonda(...nombres: string[]) {
  for (const n of nombres) await repo.registrarPareja(n);
  await repo.generarSiguienteRonda();
  return repo.listarEnfrentamientos();
}

describe("repo.registrarResultado", () => {
  it("marca el enfrentamiento como jugado y suma derrota al perdedor", async () => {
    const [e] = await torneoConRonda("A", "B");
    await repo.registrarResultado(e.id, e.pareja1Id);
    const actualizado = await repo.getEnfrentamiento(e.id);
    expect(actualizado).toMatchObject({ jugado: true, ganadorId: e.pareja1Id });
    const ps = await repo.listarParejas();
    expect(ps.find((p) => p.id === e.pareja2Id)!.derrotas).toBe(1);
    expect(ps.find((p) => p.id === e.pareja1Id)!.derrotas).toBe(0);
  });

  it("elimina al perdedor tras su segunda derrota", async () => {
    const [e1] = await torneoConRonda("A", "B", "C", "D");
    // resolver ronda 1: gana pareja1 en ambos
    const r1 = await repo.listarEnfrentamientos();
    for (const e of r1) await repo.registrarResultado(e.id, e.pareja1Id);
    await repo.generarSiguienteRonda();
    const r2 = (await repo.listarEnfrentamientos()).filter((e) => e.ronda === 2);
    for (const e of r2) await repo.registrarResultado(e.id, e.pareja1Id);
    const ps = await repo.listarParejas();
    const dobleDerrota = ps.filter((p) => p.derrotas >= 2);
    expect(dobleDerrota.every((p) => p.eliminada)).toBe(true);
    expect(dobleDerrota.length).toBeGreaterThan(0);
    void e1;
  });

  it("rechaza un ganador que no participa", async () => {
    const [e] = await torneoConRonda("A", "B");
    await expect(repo.registrarResultado(e.id, 999)).rejects.toThrow(
      "La pareja ganadora no participa en este enfrentamiento",
    );
  });

  it("rechaza un enfrentamiento inexistente", async () => {
    await expect(repo.registrarResultado(999, 1)).rejects.toThrow(
      "Enfrentamiento no encontrado",
    );
  });

  it("permite corregir el ganador de un enfrentamiento ya jugado", async () => {
    const [e] = await torneoConRonda("A", "B");
    await repo.registrarResultado(e.id, e.pareja1Id);
    await repo.registrarResultado(e.id, e.pareja2Id!);
    const ps = await repo.listarParejas();
    expect(ps.find((p) => p.id === e.pareja1Id)!.derrotas).toBe(1);
    expect(ps.find((p) => p.id === e.pareja2Id)!.derrotas).toBe(0);
  });
});

describe("repo.deshacerResultado", () => {
  it("revierte el enfrentamiento y recalcula derrotas", async () => {
    const [e] = await torneoConRonda("A", "B");
    await repo.registrarResultado(e.id, e.pareja1Id);
    await repo.deshacerResultado(e.id);
    const actualizado = await repo.getEnfrentamiento(e.id);
    expect(actualizado).toMatchObject({ jugado: false, ganadorId: null });
    const ps = await repo.listarParejas();
    expect(ps.every((p) => p.derrotas === 0 && !p.eliminada)).toBe(true);
  });

  it("rechaza deshacer un enfrentamiento no jugado", async () => {
    const [e] = await torneoConRonda("A", "B");
    await expect(repo.deshacerResultado(e.id)).rejects.toThrow(
      "Este enfrentamiento no tiene resultado que deshacer",
    );
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- tests/db/repo-resultado.test.ts`
Expected: FAIL — `repo.registrarResultado is not a function`.

- [ ] **Step 3: Añadir import de reglas en `lib/db/torneo-repo.ts`**

```ts
import { ganadorParticipa, recomputarEstadoParejas } from "@/lib/torneo/reglas";
```

- [ ] **Step 4: Añadir `registrarResultado` y `deshacerResultado` dentro de `crearRepo`**

```ts
    async registrarResultado(
      enfrentamientoId: number,
      ganadorId: number,
    ): Promise<void> {
      await database.transaction(async (tx) => {
        const eRows = await tx
          .select()
          .from(enfrentamientos)
          .where(eq(enfrentamientos.id, enfrentamientoId));
        const enf = eRows[0] ? aEnfrentamiento(eRows[0]) : null;
        if (!enf) throw new Error("Enfrentamiento no encontrado");
        if (enf.pareja2Id === null) {
          throw new Error("Un descanso no tiene resultado");
        }
        if (!ganadorParticipa(enf, ganadorId)) {
          throw new Error(
            "La pareja ganadora no participa en este enfrentamiento",
          );
        }

        await tx
          .update(enfrentamientos)
          .set({ ganadorId, jugado: true })
          .where(eq(enfrentamientos.id, enfrentamientoId));

        await recomputarYPersistir(tx);
      });
    },

    async deshacerResultado(enfrentamientoId: number): Promise<void> {
      await database.transaction(async (tx) => {
        const eRows = await tx
          .select()
          .from(enfrentamientos)
          .where(eq(enfrentamientos.id, enfrentamientoId));
        const enf = eRows[0] ? aEnfrentamiento(eRows[0]) : null;
        if (!enf) throw new Error("Enfrentamiento no encontrado");
        if (!enf.jugado || enf.ganadorId === null) {
          throw new Error(
            "Este enfrentamiento no tiene resultado que deshacer",
          );
        }
        await tx
          .update(enfrentamientos)
          .set({ ganadorId: null, jugado: false })
          .where(eq(enfrentamientos.id, enfrentamientoId));

        await recomputarYPersistir(tx);
      });
    },
```

- [ ] **Step 5: Añadir el helper `recomputarYPersistir` (dentro de `crearRepo`, antes del `return`)**

```ts
  async function recomputarYPersistir(tx: Parameters<Parameters<Db["transaction"]>[0]>[0]) {
    const pRows = await tx.select().from(parejas).orderBy(parejas.id);
    const eRows = await tx.select().from(enfrentamientos);
    const recomputadas = recomputarEstadoParejas(
      pRows.map(aPareja),
      eRows.map(aEnfrentamiento),
    );
    for (const p of recomputadas) {
      await tx
        .update(parejas)
        .set({ derrotas: p.derrotas, eliminada: p.eliminada })
        .where(eq(parejas.id, p.id));
    }
  }
```

Nota: si el tipo de `tx` da problemas, tiparlo como `any` con un comentario — es una transacción Drizzle interna.

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `npm test -- tests/db/repo-resultado.test.ts`
Expected: todos los tests PASS.

- [ ] **Step 7: Ejecutar toda la suite del repo (incluye el `it` de la Task 13 que dependía de `registrarResultado`)**

Run: `npm test -- tests/db/`
Expected: todos PASS. Quitar cualquier `.skip` que se hubiera puesto en la Task 13.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: repo.registrarResultado (con corrección) y deshacerResultado"
```

---

## Task 15: `repo.reiniciarTorneo` y agregados de lectura para las páginas

**Files:**
- Modify: `lib/db/torneo-repo.ts`
- Test: `tests/db/repo-agregados.test.ts`

- [ ] **Step 1: Escribir el test**

`tests/db/repo-agregados.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { crearDbTest, limpiar } from "@/lib/db/testing";
import { crearRepo } from "@/lib/db/torneo-repo";

const { db, cerrar } = crearDbTest();
const repo = crearRepo(db);

beforeEach(() => limpiar(db));
afterAll(() => cerrar());

describe("repo.reiniciarTorneo", () => {
  it("borra parejas y enfrentamientos y reinicia los ids", async () => {
    await repo.registrarPareja("A");
    await repo.registrarPareja("B");
    await repo.generarSiguienteRonda();
    await repo.reiniciarTorneo();
    expect(await repo.listarParejas()).toEqual([]);
    expect(await repo.listarEnfrentamientos()).toEqual([]);
    await repo.registrarPareja("C");
    expect((await repo.listarParejas())[0].id).toBe(1);
  });
});

describe("repo.getEstadoTorneo", () => {
  it("refleja ronda 0 sin datos", async () => {
    const e = await repo.getEstadoTorneo();
    expect(e).toMatchObject({
      rondaActual: 0,
      totalParejas: 0,
      parejasActivasCount: 0,
      pendientesRondaActual: 0,
      puedeGenerarNuevaRonda: false,
      torneoTerminado: false,
      parejaGanadora: null,
    });
  });

  it("cuenta pendientes y permite/deniega nueva ronda", async () => {
    await repo.registrarPareja("A");
    await repo.registrarPareja("B");
    await repo.generarSiguienteRonda();
    const e = await repo.getEstadoTorneo();
    expect(e.rondaActual).toBe(1);
    expect(e.pendientesRondaActual).toBe(1);
    expect(e.puedeGenerarNuevaRonda).toBe(false);
    expect(e.enfrentamientosActuales).toHaveLength(1);
  });
});

describe("repo.getClasificacion", () => {
  it("separa activas (por flag) y eliminadas, ordenadas por derrotas", async () => {
    for (const n of ["A", "B", "C", "D"]) await repo.registrarPareja(n);
    const r1 = (await (async () => {
      await repo.generarSiguienteRonda();
      return repo.listarEnfrentamientos();
    })());
    for (const e of r1) await repo.registrarResultado(e.id, e.pareja1Id);
    const c = await repo.getClasificacion();
    expect(c.activas.length + c.eliminadas.length).toBe(4);
    const derrotasOrdenadas = c.activas.map((p) => p.derrotas);
    expect([...derrotasOrdenadas]).toEqual([...derrotasOrdenadas].sort((a, b) => a - b));
  });
});

describe("repo.getHistorial", () => {
  it("agrupa enfrentamientos por ronda, de la más reciente a la más antigua", async () => {
    await repo.registrarPareja("A");
    await repo.registrarPareja("B");
    await repo.generarSiguienteRonda();
    const [e] = await repo.listarEnfrentamientos();
    await repo.registrarResultado(e.id, e.pareja1Id);
    await repo.generarSiguienteRonda();
    const h = await repo.getHistorial();
    expect(h.map((g) => g.ronda)).toEqual([2, 1]);
    expect(h[0].enfrentamientos.length).toBeGreaterThan(0);
    expect(h[0].enfrentamientos[0]).toHaveProperty("pareja1");
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- tests/db/repo-agregados.test.ts`
Expected: FAIL — funciones no definidas.

- [ ] **Step 3: Añadir imports en `lib/db/torneo-repo.ts`**

```ts
import {
  contarParejasActivas,
  enfrentamientosRondaActual,
  parejaGanadora,
  pendientesRondaActual,
  puedeGenerarNuevaRonda,
  rondaActual,
  torneoTerminado,
} from "@/lib/torneo/estado";
import { enfrentamientoAVista } from "@/lib/torneo/vista";
```

Y **amplía** el `import type` de `@/lib/torneo/types` que ya existe (Task 11) para que incluya `EnfrentamientoVista` y `EstadoTorneo` además de `Enfrentamiento` y `Pareja` — un único import, sin duplicar `Pareja`:

```ts
import type {
  Enfrentamiento,
  EnfrentamientoVista,
  EstadoTorneo,
  Pareja,
} from "@/lib/torneo/types";
```

(La línea de `rondaActual` sustituye al import parcial que ya existía en la Task 13 — dejar un único import de `@/lib/torneo/estado`.)

- [ ] **Step 4: Añadir las funciones dentro de `crearRepo`**

```ts
    async reiniciarTorneo(): Promise<void> {
      await database.execute(
        sql`TRUNCATE TABLE enfrentamientos, parejas RESTART IDENTITY CASCADE`,
      );
    },

    async getEstadoTorneo(): Promise<EstadoTorneo> {
      const [pRows, eRows] = await Promise.all([
        database.select().from(parejas).orderBy(parejas.id),
        database.select().from(enfrentamientos).orderBy(enfrentamientos.id),
      ]);
      const ps = pRows.map(aPareja);
      const es = eRows.map(aEnfrentamiento);
      return {
        rondaActual: rondaActual(es),
        totalParejas: ps.length,
        parejasActivasCount: contarParejasActivas(ps),
        enfrentamientosActuales: enfrentamientosRondaActual(es),
        pendientesRondaActual: pendientesRondaActual(es),
        puedeGenerarNuevaRonda: puedeGenerarNuevaRonda(ps, es),
        torneoTerminado: torneoTerminado(ps, es),
        parejaGanadora: parejaGanadora(ps, es),
      };
    },

    async getClasificacion(): Promise<{ activas: Pareja[]; eliminadas: Pareja[] }> {
      const ps = (
        await database.select().from(parejas).orderBy(parejas.id)
      ).map(aPareja);
      return {
        activas: ps
          .filter((p) => !p.eliminada)
          .sort((a, b) => a.derrotas - b.derrotas),
        eliminadas: ps
          .filter((p) => p.eliminada)
          .sort((a, b) => b.derrotas - a.derrotas),
      };
    },

    async getHistorial(): Promise<
      { ronda: number; enfrentamientos: EnfrentamientoVista[] }[]
    > {
      const [pRows, eRows] = await Promise.all([
        database.select().from(parejas).orderBy(parejas.id),
        database.select().from(enfrentamientos).orderBy(enfrentamientos.id),
      ]);
      const indice = new Map(pRows.map(aPareja).map((p) => [p.id, p]));
      const porRonda = new Map<number, EnfrentamientoVista[]>();
      for (const row of eRows.map(aEnfrentamiento)) {
        const lista = porRonda.get(row.ronda) ?? [];
        lista.push(enfrentamientoAVista(row, indice));
        porRonda.set(row.ronda, lista);
      }
      return [...porRonda.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([ronda, enfrentamientos]) => ({ ronda, enfrentamientos }));
    },

    /** Enfrentamiento enriquecido para la página de resultado. */
    async getEnfrentamientoVista(id: number): Promise<EnfrentamientoVista | null> {
      const eRows = await database
        .select()
        .from(enfrentamientos)
        .where(eq(enfrentamientos.id, id));
      if (!eRows[0]) return null;
      const pRows = await database.select().from(parejas);
      const indice = new Map(pRows.map(aPareja).map((p) => [p.id, p]));
      return enfrentamientoAVista(aEnfrentamiento(eRows[0]), indice);
    },
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `npm test -- tests/db/repo-agregados.test.ts`
Expected: todos PASS.

- [ ] **Step 6: Ejecutar toda la suite**

Run: `npm test`
Expected: todos los tests (unitarios + integración) PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: reiniciar torneo y agregados de lectura (estado, clasificación, historial)"
```

---

## Task 16: Autenticación de administrador

**Files:**
- Create: `lib/auth.ts`
- Test: `tests/auth.test.ts`

- [ ] **Step 1: Escribir el test de firma/verificación**

`tests/auth.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { firmarToken, tokenValido, passwordCorrecta } from "@/lib/auth";

beforeAll(() => {
  process.env.AUTH_SECRET = "secreto-de-prueba-largo-1234567890";
  process.env.ADMIN_PASSWORD = "elmus2026";
});

describe("firmarToken / tokenValido", () => {
  it("un token recién firmado es válido", () => {
    expect(tokenValido(firmarToken())).toBe(true);
  });
  it("rechaza undefined", () => {
    expect(tokenValido(undefined)).toBe(false);
  });
  it("rechaza un token manipulado", () => {
    const t = firmarToken();
    expect(tokenValido(t + "x")).toBe(false);
    expect(tokenValido("admin.deadbeef")).toBe(false);
  });
  it("rechaza un token firmado con otro secreto", () => {
    const t = firmarToken();
    process.env.AUTH_SECRET = "otro-secreto-distinto-0987654321";
    expect(tokenValido(t)).toBe(false);
    process.env.AUTH_SECRET = "secreto-de-prueba-largo-1234567890";
  });
});

describe("passwordCorrecta", () => {
  it("true con la contraseña exacta", () => {
    expect(passwordCorrecta("elmus2026")).toBe(true);
  });
  it("false con otra contraseña", () => {
    expect(passwordCorrecta("otra")).toBe(false);
    expect(passwordCorrecta("elmus2026 ")).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- tests/auth.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `lib/auth.ts`**

```ts
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const NOMBRE_COOKIE = "torneomus_admin";
const PAYLOAD = "admin";
const DIAS_30 = 60 * 60 * 24 * 30;

function secreto(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET no está definida");
  return s;
}

function hmac(valor: string): string {
  return createHmac("sha256", secreto()).update(valor).digest("hex");
}

function comparaSegura(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function firmarToken(): string {
  return `${PAYLOAD}.${hmac(PAYLOAD)}`;
}

export function tokenValido(token: string | undefined): boolean {
  if (!token) return false;
  const partes = token.split(".");
  if (partes.length !== 2) return false;
  const [payload, firma] = partes;
  if (payload !== PAYLOAD) return false;
  return comparaSegura(firma, hmac(PAYLOAD));
}

export function passwordCorrecta(input: string): boolean {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) throw new Error("ADMIN_PASSWORD no está definida");
  return comparaSegura(input, real);
}

export async function esAdmin(): Promise<boolean> {
  const store = await cookies();
  return tokenValido(store.get(NOMBRE_COOKIE)?.value);
}

export async function activarAdmin(): Promise<void> {
  const store = await cookies();
  store.set(NOMBRE_COOKIE, firmarToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DIAS_30,
  });
}

export async function desactivarAdmin(): Promise<void> {
  const store = await cookies();
  store.delete(NOMBRE_COOKIE);
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test -- tests/auth.test.ts`
Expected: todos PASS. (`firmarToken`, `tokenValido`, `passwordCorrecta` no tocan `cookies()`, así que funcionan en Vitest sin contexto de request.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: autenticación de administrador por cookie firmada"
```

---

## Task 17: Esquemas de validación Zod

**Files:**
- Create: `lib/validation.ts`
- Test: `tests/validation.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Instalar Zod**

```bash
npm install zod
```

- [ ] **Step 2: Escribir el test**

`tests/validation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  registrarParejaSchema,
  resultadoSchema,
  enfrentamientoIdSchema,
  passwordSchema,
} from "@/lib/validation";

describe("registrarParejaSchema", () => {
  it("recorta y acepta un nombre válido", () => {
    expect(registrarParejaSchema.parse({ nombre: "  Los Tigres  " })).toEqual({
      nombre: "Los Tigres",
    });
  });
  it("rechaza vacío", () => {
    expect(registrarParejaSchema.safeParse({ nombre: "   " }).success).toBe(false);
  });
});

describe("resultadoSchema", () => {
  it("convierte strings de formulario a número", () => {
    expect(
      resultadoSchema.parse({ enfrentamientoId: "3", ganadorId: "5" }),
    ).toEqual({ enfrentamientoId: 3, ganadorId: 5 });
  });
  it("rechaza valores no positivos", () => {
    expect(
      resultadoSchema.safeParse({ enfrentamientoId: "0", ganadorId: "5" }).success,
    ).toBe(false);
  });
});

describe("enfrentamientoIdSchema y passwordSchema", () => {
  it("enfrentamientoIdSchema exige entero positivo", () => {
    expect(enfrentamientoIdSchema.parse({ enfrentamientoId: "9" })).toEqual({
      enfrentamientoId: 9,
    });
  });
  it("passwordSchema exige no vacío", () => {
    expect(passwordSchema.safeParse({ password: "" }).success).toBe(false);
    expect(passwordSchema.parse({ password: "x" })).toEqual({ password: "x" });
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `npm test -- tests/validation.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 4: Implementar `lib/validation.ts`**

```ts
import { z } from "zod";

export const registrarParejaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre no puede estar vacío")
    .max(60, "El nombre es demasiado largo"),
});

export const resultadoSchema = z.object({
  enfrentamientoId: z.coerce.number().int().positive(),
  ganadorId: z.coerce.number().int().positive(),
});

export const enfrentamientoIdSchema = z.object({
  enfrentamientoId: z.coerce.number().int().positive(),
});

export const passwordSchema = z.object({
  password: z.string().min(1),
});
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `npm test -- tests/validation.test.ts`
Expected: todos PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: esquemas de validación Zod para las acciones"
```

---

## Task 18: Server Actions

**Files:**
- Create: `app/actions/torneo.ts`
- Test: `tests/actions/torneo.test.ts`

- [ ] **Step 1: Escribir el test (a nivel de lógica, mockeando auth y repo)**

`tests/actions/torneo.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const estadoAuth = { admin: false };
const repoMock = {
  registrarPareja: vi.fn(),
  generarSiguienteRonda: vi.fn(),
  registrarResultado: vi.fn(),
  deshacerResultado: vi.fn(),
  reiniciarTorneo: vi.fn(),
};

vi.mock("@/lib/auth", () => ({
  esAdmin: () => Promise.resolve(estadoAuth.admin),
  activarAdmin: vi.fn(() => Promise.resolve()),
  desactivarAdmin: vi.fn(() => Promise.resolve()),
  passwordCorrecta: (p: string) => p === "buena",
}));

vi.mock("@/lib/db/torneo-repo", () => ({ repo: repoMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  registrarParejaAction,
  generarRondaAction,
  registrarResultadoAction,
  desbloquearAdminAction,
} from "@/app/actions/torneo";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

beforeEach(() => {
  estadoAuth.admin = false;
  vi.clearAllMocks();
});

describe("guardas de admin", () => {
  it("registrarParejaAction sin admin devuelve error", async () => {
    const r = await registrarParejaAction(null, fd({ nombre: "A" }));
    expect(r).toEqual({
      ok: false,
      error: "Necesitas desbloquear el modo administrador",
    });
    expect(repoMock.registrarPareja).not.toHaveBeenCalled();
  });

  it("generarRondaAction con admin llama al repo", async () => {
    estadoAuth.admin = true;
    repoMock.generarSiguienteRonda.mockResolvedValue(3);
    const r = await generarRondaAction(null, new FormData());
    expect(r).toEqual({
      ok: true,
      mensaje: "Nueva ronda generada con 3 enfrentamientos",
    });
  });
});

describe("validación y errores de negocio", () => {
  it("registrarParejaAction con nombre vacío devuelve el mensaje de validación", async () => {
    estadoAuth.admin = true;
    const r = await registrarParejaAction(null, fd({ nombre: "  " }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe("El nombre no puede estar vacío");
  });

  it("propaga el error del repo como {ok:false,error}", async () => {
    estadoAuth.admin = true;
    repoMock.registrarPareja.mockRejectedValue(
      new Error("Ya existe una pareja con ese nombre"),
    );
    const r = await registrarParejaAction(null, fd({ nombre: "A" }));
    expect(r).toEqual({
      ok: false,
      error: "Ya existe una pareja con ese nombre",
    });
  });

  it("registrarResultadoAction con datos inválidos no llama al repo", async () => {
    estadoAuth.admin = true;
    const r = await registrarResultadoAction(null, fd({ enfrentamientoId: "x", ganadorId: "1" }));
    expect(r.ok).toBe(false);
    expect(repoMock.registrarResultado).not.toHaveBeenCalled();
  });
});

describe("desbloquearAdminAction", () => {
  it("contraseña correcta => ok", async () => {
    const r = await desbloquearAdminAction(null, fd({ password: "buena" }));
    expect(r.ok).toBe(true);
  });
  it("contraseña incorrecta => error", async () => {
    const r = await desbloquearAdminAction(null, fd({ password: "mala" }));
    expect(r).toEqual({ ok: false, error: "Contraseña incorrecta" });
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test -- tests/actions/torneo.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `app/actions/torneo.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import {
  activarAdmin,
  desactivarAdmin,
  esAdmin,
  passwordCorrecta,
} from "@/lib/auth";
import { repo } from "@/lib/db/torneo-repo";
import {
  enfrentamientoIdSchema,
  passwordSchema,
  registrarParejaSchema,
  resultadoSchema,
} from "@/lib/validation";

export type AccionResultado = {
  ok: boolean;
  mensaje?: string;
  error?: string;
};

const SIN_ADMIN: AccionResultado = {
  ok: false,
  error: "Necesitas desbloquear el modo administrador",
};

function mensajeError(e: unknown, porDefecto: string): AccionResultado {
  return { ok: false, error: e instanceof Error ? e.message : porDefecto };
}

function revalidarTorneo() {
  revalidatePath("/");
  revalidatePath("/clasificacion");
  revalidatePath("/historial");
}

export async function desbloquearAdminAction(
  _prev: AccionResultado | null,
  formData: FormData,
): Promise<AccionResultado> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success || !passwordCorrecta(parsed.data.password)) {
    return { ok: false, error: "Contraseña incorrecta" };
  }
  await activarAdmin();
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Modo administrador activado" };
}

export async function bloquearAdminAction(
  _prev: AccionResultado | null,
  _formData: FormData,
): Promise<AccionResultado> {
  await desactivarAdmin();
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Modo administrador desactivado" };
}

export async function registrarParejaAction(
  _prev: AccionResultado | null,
  formData: FormData,
): Promise<AccionResultado> {
  if (!(await esAdmin())) return SIN_ADMIN;
  const parsed = registrarParejaSchema.safeParse({
    nombre: formData.get("nombre"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  try {
    await repo.registrarPareja(parsed.data.nombre);
    revalidarTorneo();
    return {
      ok: true,
      mensaje: `Pareja '${parsed.data.nombre}' registrada correctamente`,
    };
  } catch (e) {
    return mensajeError(e, "Error al registrar la pareja");
  }
}

export async function generarRondaAction(
  _prev: AccionResultado | null,
  _formData: FormData,
): Promise<AccionResultado> {
  if (!(await esAdmin())) return SIN_ADMIN;
  try {
    const n = await repo.generarSiguienteRonda();
    revalidarTorneo();
    return { ok: true, mensaje: `Nueva ronda generada con ${n} enfrentamientos` };
  } catch (e) {
    return mensajeError(e, "Error al generar la ronda");
  }
}

export async function registrarResultadoAction(
  _prev: AccionResultado | null,
  formData: FormData,
): Promise<AccionResultado> {
  if (!(await esAdmin())) return SIN_ADMIN;
  const parsed = resultadoSchema.safeParse({
    enfrentamientoId: formData.get("enfrentamientoId"),
    ganadorId: formData.get("ganadorId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Datos del resultado no válidos" };
  }
  try {
    await repo.registrarResultado(
      parsed.data.enfrentamientoId,
      parsed.data.ganadorId,
    );
    revalidarTorneo();
    return { ok: true, mensaje: "Resultado registrado correctamente" };
  } catch (e) {
    return mensajeError(e, "Error al registrar el resultado");
  }
}

export async function deshacerResultadoAction(
  _prev: AccionResultado | null,
  formData: FormData,
): Promise<AccionResultado> {
  if (!(await esAdmin())) return SIN_ADMIN;
  const parsed = enfrentamientoIdSchema.safeParse({
    enfrentamientoId: formData.get("enfrentamientoId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Enfrentamiento no válido" };
  }
  try {
    await repo.deshacerResultado(parsed.data.enfrentamientoId);
    revalidarTorneo();
    return { ok: true, mensaje: "Resultado deshecho" };
  } catch (e) {
    return mensajeError(e, "Error al deshacer el resultado");
  }
}

export async function reiniciarTorneoAction(
  _prev: AccionResultado | null,
  _formData: FormData,
): Promise<AccionResultado> {
  if (!(await esAdmin())) return SIN_ADMIN;
  try {
    await repo.reiniciarTorneo();
    revalidarTorneo();
    return {
      ok: true,
      mensaje: "Torneo reiniciado. Puedes registrar nuevas parejas.",
    };
  } catch (e) {
    return mensajeError(e, "No se pudo reiniciar");
  }
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test -- tests/actions/torneo.test.ts`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Server Actions del torneo con guardas de admin y validación"
```

---

## Task 19: Script de seed para desarrollo

**Files:**
- Create: `scripts/seed.ts`
- Modify: `package.json`

- [ ] **Step 1: Instalar `tsx` para ejecutar el script**

```bash
npm install -D tsx
```

- [ ] **Step 2: Crear `scripts/seed.ts`**

```ts
import { repo } from "@/lib/db/torneo-repo";

async function main() {
  const nombres = ["Los Tigres", "Las Águilas", "Los Lobos", "Las Panteras"];
  const existentes = new Set((await repo.listarParejas()).map((p) => p.nombre));
  for (const nombre of nombres) {
    if (!existentes.has(nombre)) {
      await repo.registrarPareja(nombre);
      console.log(`Insertada pareja de ejemplo: ${nombre}`);
    }
  }
  console.log("Seed completado.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 3: Añadir el script a `package.json`**

```json
"seed": "dotenv -e .env.local -- tsx scripts/seed.ts"
```

Si `dotenv` CLI no está instalado como binario, añadir `npm install -D dotenv-cli` y usar `dotenv-cli` / `dotenv` según corresponda.

- [ ] **Step 4: Probar el seed**

Run: `npm run seed`
Expected: imprime "Insertada pareja de ejemplo" x4 y "Seed completado". Ejecutarlo otra vez no duplica.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: script de seed para desarrollo"
```

---

## Task 20: Cierre del Plan 1 — verificación completa

**Files:**
- Modify: `package.json` (script `verify`)

- [ ] **Step 1: Añadir un script `verify`**

```json
"verify": "npm run typecheck && npm run lint && npm test"
```

- [ ] **Step 2: Ejecutar la verificación completa**

Run: `npm run verify`
Expected:
- `tsc --noEmit` sin errores.
- `next lint` sin errores.
- Todos los tests PASS (unitarios de `lib/torneo/`, `lib/auth`, `lib/validation`, `app/actions`, e integración de `lib/db`).

- [ ] **Step 3: Ejecutar el build de Next**

Run: `npm run build`
Expected: build correcta. La app solo tiene el `page.tsx` placeholder; eso es esperado — la interfaz llega en el Plan 2.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore: script de verificación y cierre del núcleo (Plan 1)"
```

- [ ] **Step 5: Anotar el estado para el Plan 2**

El Plan 2 parte de aquí y añade: componentes UI, `app/globals.css` con la estética "fiesta de pueblo", páginas (`/`, `/clasificacion`, `/historial`, `/resultado/[id]`), `error.tsx` / `not-found.tsx`, test e2e Playwright, GitHub Actions y despliegue en Vercel + reescritura del `README.md`.

---

## Self-Review (autor del plan)

**Cobertura del spec:**
- Modelo de datos (`parejas`, `enfrentamientos`, `rivales` como `text[]`, `pareja2_id` nullable) → Task 4.
- `lib/torneo/emparejar|estado|reglas` puros y testeados → Tasks 7-9.
- Vista enriquecida de enfrentamiento → Task 10 (soporta las plantillas del Plan 2).
- Repo transaccional con todas las operaciones (`registrarPareja`, `generarSiguienteRonda`, `registrarResultado`, `deshacerResultado`, `reiniciarTorneo`, agregados) → Tasks 11-15.
- Recomputación de estado para deshacer/corregir → Task 9 + Task 14.
- Fidelidad de rarezas (eliminada a 2 sin ronda; doble criterio de activa) → Tasks 7 y 9, con tests explícitos.
- Auth de admin por cookie firmada → Task 16.
- Validación Zod → Task 17.
- Server Actions con `{ok,mensaje,error}`, guarda de admin, mensajes portados → Task 18.
- Sin auto-seed; script `npm run seed` → Task 19.
- Eliminación del proyecto Java → Task 1.
- Pendiente para Plan 2 (declarado): UI, estética, páginas, `error.tsx`/`not-found.tsx`, e2e, CI, despliegue, README.

**Escaneo de placeholders:** sin "TBD"/"TODO". Todos los pasos de código llevan el código completo. Los comandos llevan salida esperada.

**Consistencia de tipos:** `Pareja`, `Enfrentamiento`, `Emparejamiento`, `ResultadoRonda`, `EstadoTorneo`, `EnfrentamientoVista`, `RefPareja` se definen en Task 6 y se usan igual después. `crearRepo(db)` / `TorneoRepo` / `repo` consistentes entre Tasks 11-18. `AccionResultado` definido en Task 18 y usado en todas las acciones. Funciones de `estado.ts` (`rondaActual`, `contarParejasActivas`, `parejasActivasListado`, `pendientesRondaActual`, `puedeGenerarNuevaRonda`, `torneoTerminado`, `parejaGanadora`, `enfrentamientosRondaActual`) nombradas igual en definición (Task 7) y uso (Tasks 13, 15). `firmarToken`/`tokenValido`/`passwordCorrecta`/`esAdmin`/`activarAdmin`/`desactivarAdmin` consistentes entre Task 16 y Task 18.

**Nota de riesgo:** el tipo del parámetro `tx` en `recomputarYPersistir` (Task 14) puede requerir `any` según la versión de `drizzle-orm`; se indica en el paso. El import de `@/lib/torneo/estado` se consolida en Task 15 (evitar dos imports del mismo módulo introducidos en Tasks 13 y 15).
