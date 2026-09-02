# Migración de TorneoMus a Next.js + Supabase

**Fecha:** 2026-09-02
**Estado:** Diseño aprobado
**Autor:** David Vigara (con Claude)

## Contexto y motivación

TorneoMus es una aplicación de gestión de un torneo de Mus ("Mus Villamantilla"),
hecha hace un año para un amigo. Stack actual:

- **Backend:** Spring Boot 3.2, Java 17, Spring Data JPA / Hibernate
- **Base de datos:** MySQL 8
- **Frontend:** Thymeleaf + Bootstrap 5 + Font Awesome (renderizado en servidor)
- **Despliegue:** Railway y Render (Docker)

El problema: Railway retiró su capa gratuita y la base de datos gratuita de Render
caduca a los 90 días. Se quiere un despliegue **gratuito y estable en el tiempo**,
idealmente "hacer `git push` y ya".

## Objetivo

Reescribir la aplicación como un proyecto **Next.js desplegable en Vercel (plan
Hobby)** con **Supabase Postgres** como base de datos (ambos con capa gratuita
permanente), preservando el comportamiento actual del torneo y añadiendo dos
mejoras acotadas:

1. Poder **corregir / deshacer** un resultado mal introducido.
2. Un **candado de administrador** (contraseña única compartida) para las acciones
   que modifican el torneo. La consulta sigue siendo pública.

Además, **rediseño visual**: estética "fiesta de pueblo" moderna, cálida y
mobile-first.

## Fuera de alcance (YAGNI)

- Multi-torneo / histórico por años. Sigue habiendo **un único torneo global**;
  "Nuevo torneo" borra el anterior, como ahora.
- Login real con usuarios (Supabase Auth). Solo contraseña de admin.
- Actualización en tiempo real (Supabase Realtime). Recarga manual.
- Modo oscuro. Solo tema claro (posible mejora futura).
- Migración de datos desde la BD actual de Railway/Render. Se empieza de cero.
- Auto-seed de parejas de ejemplo (el `DataLoader` actual). Queda un script
  `npm run seed` solo para desarrollo.

## Arquitectura elegida

**Next.js 15 (App Router) + React 19 + Server Actions + Supabase Postgres**, con
toda la lógica del torneo en TypeScript **en el servidor**.

- Supabase actúa **solo como base de datos Postgres**.
- **Drizzle ORM** para esquema y migraciones (lo más parecido a la experiencia
  JPA anterior, pero ligero), con el driver `postgres.js` conectado directamente
  a Postgres → **transacciones reales**.
- Las páginas de consulta se renderizan en el servidor (SSR): nadie necesita
  contraseña para mirar.
- Las escrituras son **Server Actions** que verifican la cookie de admin antes de
  actuar.
- Todo funciona **sin JavaScript** (formularios nativos); el JS solo mejora
  (estados "enviando…", modales).

### Alternativas descartadas

- **React (Vite) puro hablando directo con Supabase desde el navegador:** obligaría
  a meter la lógica de emparejamiento en funciones PL/pgSQL o en el cliente;
  retorcido de escribir y testear, y proteger escrituras con contraseña vía RLS es
  incómodo.
- **Neon + Prisma en vez de Supabase + Drizzle:** equivalente. Supabase gana por
  su explorador de datos visual y por dejar la puerta abierta a añadir login real
  sin cambiar de proveedor.

## Modelo de datos (Supabase Postgres)

Un solo torneo global, sin entidad `Torneo`.

### Tabla `parejas`

| columna | tipo | notas |
|---|---|---|
| `id` | `serial` PK | |
| `nombre` | `text` unique not null | |
| `derrotas` | `int` not null default 0 | |
| `eliminada` | `boolean` not null default false | |
| `descansos` | `int` not null default 0 | |
| `rivales` | `text[]` not null default `'{}'` | Colapsa la tabla `pareja_rivales` de JPA en un array nativo de Postgres. Guarda **nombres** de rival, igual que ahora. |
| `created_at` | `timestamptz` default `now()` | |

### Tabla `enfrentamientos`

| columna | tipo | notas |
|---|---|---|
| `id` | `serial` PK | |
| `pareja1_id` | `int` not null → `parejas(id)` | |
| `pareja2_id` | `int` **null** → `parejas(id)` | `null` = descanso. El código Java actual mete `pareja1 == pareja2` para esquivar el `NULL`; las plantillas ya comprueban `pareja2 == null`, así que `null` es la representación natural. |
| `ronda` | `int` not null | |
| `ganador_id` | `int` null → `parejas(id)` | |
| `jugado` | `boolean` not null default false | |
| `created_at` | `timestamptz` default `now()` | |

### Notas

- **Migraciones con Drizzle Kit.** El esquema vive en `lib/db/schema.ts`.
- **"Nuevo torneo"** = `TRUNCATE parejas, enfrentamientos RESTART IDENTITY CASCADE`.
- Estas diferencias frente al modelo Java (`rivales` como array, `pareja2_id`
  nullable) son mejoras de **representación**; el comportamiento observable no
  cambia.

## Lógica del torneo

Carpeta `lib/torneo/` con funciones **puras y testeables**, sin acceso a BD.
Escrita *test-first*; los casos se derivan del comportamiento del código Java
actual (`TorneoService`, `Pareja`, `Enfrentamiento`).

### `lib/torneo/types.ts`

Tipos `Pareja`, `Enfrentamiento`, `EstadoTorneo`, `Emparejamiento`.

### `lib/torneo/emparejar.ts`

`generarEmparejamientos(parejasActivas, rondaActual): { descansa: Pareja | null, emparejamientos: Emparejamiento[] }`

Porta `TorneoService.generarSiguienteRonda` + `encontrarMejorRival`:

- Nueva ronda = `rondaActual + 1`.
- Si el nº de parejas activas es **impar**, una descansa: la de menos `descansos`,
  desempate por `nombre` ascendente. Se le incrementa `descansos`.
- Empareja iterando: coge la primera pareja disponible y busca rival que **no
  haya jugado contra ella**; si no hay, coge el primero disponible.
- Al emparejar, cada pareja añade a la otra a su lista `rivales` (por nombre, sin
  duplicados).
- Requiere ≥ 2 parejas activas; si no, error.

### `lib/torneo/estado.ts`

Funciones puras sobre arrays de parejas/enfrentamientos:

- `rondaActual(enfrentamientos)` → `max(ronda)` o `0`.
- `getEnfrentamientosRondaActual(enfrentamientos)`.
- `puedeGenerarNuevaRonda(parejas, enfrentamientos)` → `false` si activas < 2;
  `true` si ronda actual = 0; si no, `true` solo si no hay enfrentamientos
  pendientes (`jugado = false`) en la ronda actual.
- `torneoTerminado(parejas, enfrentamientos)` → `rondaActual > 0 && activas <= 1`.
- `getParejaGanadora(parejas, enfrentamientos)` → la única activa si el torneo
  terminó, si no `null`.
- Definición de **activa**: se replican los **dos** criterios actuales tal cual
  (portar sin arreglar):
  - `findParejasActivas` (listado) → `derrotas < 2`.
  - `countParejasActivas` (recuento) → `eliminada = false`.

### `lib/torneo/reglas.ts`

- `aplicarResultado(enfrentamiento, ganadorId, parejas)`: valida que el ganador
  participa; el perdedor suma una derrota; `eliminada = derrotas >= 2` (réplica
  exacta de `Pareja.agregarDerrota()` actual, **sin mirar la ronda**).
- `recomputarEstadoParejas(parejas, enfrentamientos)`: recalcula `derrotas` y
  `eliminada` de todas las parejas contando las derrotas reales sobre los
  enfrentamientos con `jugado = true`. Es la base de **deshacer/corregir**:
  mismo comportamiento observable que hoy, pero deshacer un resultado pasa a ser
  trivial (poner `jugado = false`, `ganador_id = null` y recomputar).
- El descanso (`pareja2_id = null`) nunca genera perdedor.

### `lib/db/torneo-repo.ts`

Capa que toca BD (Drizzle). Cada operación de escritura va en una **transacción**:

- `listarParejas()`, `listarEnfrentamientos()`, `getEnfrentamiento(id)`.
- `registrarPareja(nombre)` — comprueba nombre único.
- `generarSiguienteRonda()` — lee estado, llama a `emparejar`, inserta
  enfrentamientos + actualiza `rivales`/`descansos`, todo en una transacción.
- `registrarResultado(enfrentamientoId, ganadorId)` — set ganador + `jugado`,
  luego `recomputarEstadoParejas` y persistir.
- `deshacerResultado(enfrentamientoId)` — limpia ganador + `jugado`, recomputa.
- `reiniciarTorneo()` — `TRUNCATE ... RESTART IDENTITY`.

## Estructura del proyecto

```
app/
  layout.tsx                  · cabecera con banderines + fuentes (Fraunces, Inter)
  page.tsx                    · Inicio (dashboard)
  clasificacion/page.tsx
  historial/page.tsx
  resultado/[id]/page.tsx
  resultado/[id]/not-found.tsx
  error.tsx                   · fallo de infra (BD dormida, etc.)
  actions/torneo.ts           · Server Actions (todas las escrituras)
  globals.css                 · Tailwind v4 + tokens de color
lib/
  torneo/  types.ts · emparejar.ts · estado.ts · reglas.ts
  db/      schema.ts · client.ts · torneo-repo.ts
  auth.ts                     · cookie firmada de admin (verificar/crear/borrar)
  validation.ts               · esquemas zod de cada acción
components/
  ui/      Card.tsx · Boton.tsx · Stat.tsx · Modal.tsx · Alerta.tsx · Tabla.tsx
  Banderines.tsx
  BannerGanador.tsx
  TarjetaEnfrentamiento.tsx
  PanelAdmin.tsx
  CandadoAdmin.tsx
drizzle/                      · migraciones generadas
scripts/seed.ts               · npm run seed (solo desarrollo)
```

### Flujo de datos

- **Lecturas:** los Server Components llaman directo a `torneo-repo.ts` → render
  en servidor. Sin capa API, sin fetch en cliente, sin spinners.
- **Escrituras:** cada Server Action:
  1. Valida entrada con `zod`.
  2. Verifica la cookie de admin (`lib/auth.ts`). Sin ella → error.
  3. Ejecuta lógica + repo en transacción.
  4. `revalidatePath` de las rutas afectadas.
  5. Devuelve `{ ok, mensaje?, error? }`.
- **Estados de envío:** `useFormStatus` / `useActionState` en los botones y banners.

### Autenticación de admin (`lib/auth.ts`)

- Variable de entorno `ADMIN_PASSWORD` y `AUTH_SECRET`.
- Acción `desbloquearAdmin(password)`: si coincide, setea cookie `admin`
  httpOnly + firmada (HMAC con `AUTH_SECRET`), `SameSite=Lax`, 30 días.
- Acción `bloquearAdmin()`: borra la cookie.
- `esAdmin()`: helper que lee y verifica la cookie; usado por Server Components
  (para mostrar/ocultar UI) y por cada Server Action de escritura (defensa en
  profundidad).

## Pantallas y estética

### Dirección visual

"Fiesta de pueblo" moderna: cálida, acogedora, no corporativa; ejecución limpia
y **mobile-first** (se consultará desde el móvil).

- **Paleta:** fondo crema `#FBF6EE`, primario terracota `#B5451B`, verde oliva
  secundario `#5B6B3A`, ámbar/mostaza de acento `#E0A33E`, texto marrón oscuro
  `#3B2A20`. Semánticos: éxito verde oliva, error terracota más intenso.
- **Tipografía (Google Fonts):** **Fraunces** para títulos (serif con carácter),
  **Inter** para el cuerpo. Cargadas con `next/font`.
- **Detalles:** esquinas `rounded-2xl`, sombras suaves, **guirnalda de banderines
  en SVG** bajo la cabecera (`components/Banderines.tsx`), iconos `lucide-react`
  (trofeo, corona, candado…). Solo tema claro.
- **Tailwind CSS v4** con tokens de color en `globals.css`. Componentes `ui/`
  hechos a mano (sin librería de componentes, para minimizar dependencias).

### Mapa de pantallas (1:1 con las plantillas Thymeleaf actuales)

| Pantalla | Contenido |
|---|---|
| **Inicio `/`** (`index.html`) | Cabecera con banderines y título "Mus Villamantilla". Fila de stats: *Ronda actual · Parejas activas · Total parejas · Estado* (En curso / Finalizado). Si terminó: `BannerGanador` con corona. **Enfrentamientos de la ronda actual** en tarjetas (`TarjetaEnfrentamiento`): pareja1 vs pareja2 o "Descanso"; badge jugado/pendiente; en modo admin, botón *Registrar resultado* (pendiente) o *Deshacer* (jugado). `PanelAdmin` (solo admin): formulario registrar pareja, botón generar ronda (con aviso de nº de pendientes), botón nuevo torneo (con `confirm`). Enlaces a Clasificación e Historial. |
| **Clasificación `/clasificacion`** (`clasificacion.html`) | Tabla de parejas activas (posición, nombre, derrotas, rivales jugados) ordenada por derrotas asc. Tabla de eliminadas ordenada por derrotas desc. Tres stat cards: total / activas / eliminadas. |
| **Historial `/historial`** (`historial.html`) | Todas las rondas, de la más reciente a la más antigua, secciones plegables. Por ronda, tarjetas de cada enfrentamiento con ganador/perdedor o "Descanso". (El actual muestra solo las últimas 5; al ser un único torneo se muestran todas.) |
| **Resultado `/resultado/[id]`** (`resultado.html`) | Página dedicada reestilizada: detalles del enfrentamiento + elegir ganador (radios) + confirmar. Si el enfrentamiento ya está jugado y hay admin, el formulario permite **corregir** el ganador. Solo accesible con admin desbloqueado; id inexistente → `not-found.tsx`. |
| **Candado admin** | `CandadoAdmin` en la cabecera. Abre `Modal` con campo contraseña → `desbloquearAdmin`. Si ya está desbloqueado, muestra botón de bloquear. |

### Cambios de comportamiento respecto a hoy

1. Se puede **deshacer / corregir** un resultado ya introducido.
2. Las acciones de modificación requieren la contraseña de admin.

Nada más cambia: algoritmo de emparejamiento, reglas de derrota/eliminación,
condición de fin de torneo, textos y flujo se portan tal cual.

## Manejo de errores

**UX:** cada Server Action devuelve `{ ok, mensaje?, error? }`, mostrado vía
`useActionState` como banner descartable (verde éxito / rojo error), en sustitución
de los `RedirectAttributes` flash actuales.

### Casos de negocio (mensajes portados del código Java)

| Situación | Respuesta |
|---|---|
| Registrar pareja con nombre duplicado | *"Ya existe una pareja con ese nombre"* |
| Registrar pareja con nombre vacío | Error de validación (`zod`) |
| Generar ronda con < 2 parejas activas | *"No hay suficientes parejas activas para generar una ronda"* |
| Generar ronda con enfrentamientos pendientes | *"No puedes generar una nueva ronda: hay enfrentamientos pendientes en la ronda actual."* |
| Resultado de enfrentamiento inexistente | `not-found.tsx` |
| Ganador que no participa en el enfrentamiento | *"La pareja ganadora no participa en este enfrentamiento"* |
| Registrar resultado ya jugado | **Permitido** si es admin (es "corregir") |
| Deshacer un resultado no jugado | Error suave *"Este enfrentamiento no tiene resultado que deshacer"* |
| Contraseña de admin incorrecta | *"Contraseña incorrecta"* |
| Acción de escritura sin cookie de admin | *"Necesitas desbloquear el modo administrador"* |

### Infraestructura

- `zod` valida la entrada de **cada** Server Action antes de tocar lógica o BD.
- "Generar ronda" en **transacción**: si algo falla a mitad, rollback total; no
  quedan enfrentamientos a medias.
- Supabase free se **suspende por inactividad**: la primera petición tras un rato
  tarda ~1–2 s en despertar. `error.tsx` con mensaje amable + botón de reintentar
  cubre el caso de que la conexión falle.
- **Sin bloqueo optimista:** lo lleva una sola persona; además, recalcular el
  estado desde los enfrentamientos jugados hace que las escrituras converjan.

## Tests

### Unitarios — Vitest — `lib/torneo/` (núcleo, *test-first*)

- **`emparejar`:** nº par → todas emparejadas; nº impar → descansa la de menos
  `descansos` (desempate por nombre); no repite rival si hay alternativa; lo
  repite cuando es inevitable; < 2 activas → error; `rivales` se actualiza en
  ambas parejas sin duplicados.
- **`estado`:** `rondaActual` con y sin enfrentamientos; `puedeGenerarNuevaRonda`
  (pendientes bloquean; ronda 0 permite); `torneoTerminado` (ronda > 0 y
  activas ≤ 1); `getParejaGanadora`.
- **`reglas`:** el perdedor suma derrota; `eliminada` al llegar a 2 (sin importar
  la ronda); `recomputarEstadoParejas` tras deshacer devuelve el estado correcto;
  el descanso no genera perdedor.

### Integración — Server Actions contra Postgres efímero

Supabase CLI local o `pglite`. Flujo completo: registrar parejas → generar ronda
→ registrar resultados → deshacer un resultado → comprobar clasificación e
historial. Casos de error: nombre duplicado, generar ronda con pendientes, acción
sin cookie de admin.

### E2E — Playwright (opcional, 1 test)

Camino feliz desde el navegador: desbloquear admin, registrar 4 parejas, generar
ronda, meter resultados, ver clasificación.

### CI

GitHub Actions en cada push: `vitest` + `tsc --noEmit` + `eslint`. Vercel despliega
solo si CI pasa.

## Despliegue

1. Proyecto en Supabase (free). Copiar connection string (pooler, para
   serverless) y claves.
2. `drizzle-kit push` / migraciones para crear el esquema.
3. Repo conectado a Vercel. Variables de entorno en Vercel:
   - `DATABASE_URL` (connection string de Supabase)
   - `ADMIN_PASSWORD`
   - `AUTH_SECRET`
4. `git push` → Vercel construye y despliega.

## Estrategia de migración del repositorio

- El proyecto Next.js **reemplaza** al proyecto Spring Boot en el mismo repo.
- Se elimina: `src/` (Java), `pom.xml`, `Dockerfile`, `Procfile`,
  `database_setup.sql`, `target/`.
- Se conserva el `README.md` reescrito para el nuevo stack.
- El código Java actual queda en el historial de git como referencia para portar
  la lógica.
