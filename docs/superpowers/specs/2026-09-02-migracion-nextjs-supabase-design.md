# Migración de TorneoMus a Next.js + Supabase

**Fecha:** 2026-09-02
**Estado:** Diseño aprobado · **Addendum 2026-09-03** (ver más abajo)
**Autor:** David Vigara (con Claude)

---

## Addendum 2026-09-03 — la lógica se porta desde `origin/main`, no desde el `main` local

Al ir a mergear se descubrió que el `main` local estaba **23 commits por detrás**
de `origin/main` (lo realmente desplegado). La lógica del torneo de `origin/main`
es bastante distinta de la versión sobre la que se portó primero. Se re-porta
desde `origin/main` (`8a259e5`). La infraestructura (scaffold, UI, auth, capa de
BD, tests, CI, despliegue) se conserva; cambia la lógica de `lib/torneo/`, parte
del repo, y se añade el flujo "primeras dos rondas".

### Comportamiento real a portar (de `TorneoService.java` en `origin/main`)

**Criterio de "activa": únicamente el flag `eliminada = false`.** Se abandona el
doble criterio anterior. Generación de ronda, recuento, ganadora y clasificación
usan todos `eliminada = false`.

**Eliminación:** `eliminada = (derrotas >= 2) && (rondaActual >= 2)`, donde
`rondaActual` = número de ronda máximo entre los enfrentamientos. Es decir: en
ronda 1 nadie se elimina aunque acumule 2 derrotas; desde que existe una ronda 2,
toda pareja con 2+ derrotas queda eliminada. Este valor se **recalcula** en cada
escritura (registrar/deshacer resultado y también al generar ronda, porque generar
la ronda 2 sube `rondaActual` a 2 y puede eliminar parejas con 2 derrotas de la
ronda 1). Sustituye al `verificarEliminacionParejas()` de Java, que era un parche
para mantener eso consistente.

**"Ya se han enfrentado" = existe una fila `enfrentamiento` entre las dos parejas**
(cualquier ronda, jugado o no). No se mira la lista `rivales`. La lista `rivales`
pasa a actualizarse **al registrar el resultado** (no al emparejar) y sirve solo
para mostrarla en clasificación.

**Emparejamiento de ronda (`generarSiguienteRonda` / `generarRondaEspecifica`):**
1. Parejas activas (`eliminada = false`); si < 2 → error
   *"No hay suficientes parejas activas para generar una ronda"*.
2. **Anti-duplicado:** si ya hay enfrentamientos para esa ronda, devolverlos (no-op).
3. **Barajado aleatorio** de las parejas (sin semilla reproducible: el orden y los
   emparejamientos son aleatorios en cada generación).
4. **Si el número es impar**, una descansa: se ordena por `(descansos, nombre)`, se
   toma el mínimo de `descansos`, y entre las parejas con ese mínimo se elige **una
   al azar**. `descansos++`. Descanso = enfrentamiento con `pareja2 = null`, jugado.
5. **Emparejado recursivo con backtracking** (`intentarEmparejarRecursivo`):
   - Se elige `p1` **al azar** de las disponibles.
   - Candidatos = disponibles que **no se han enfrentado** a `p1`.
   - Si no hay candidatos y no se permiten repeticiones → backtrack.
   - Los candidatos se ordenan por una heurística de "cuántas opciones sin repetir
     le quedarían a `p1`" (ascendente, el más restringido primero).
   - Se prueba cada candidato con backtracking (deshacer si la recursión falla).
   - **Dos pasadas:** primero sin permitir repeticiones; si falla del todo, se
     reintenta permitiéndolas solo cuando es inevitable.
6. Persistir los enfrentamientos generados.

**Flujo "primeras dos rondas" (`generarPrimerasDosRondas`):**
- Solo cuando `rondaActual == 0`. Si ya existen R1 o R2 → devolver las existentes.
- Genera la ronda 1 (camino normal) y luego la ronda 2 (el emparejador de la R2 ve
  los enfrentamientos de la R1 para "ya se han enfrentado").
- Tras generarlas, `rondaActual` (máx ronda) = 2, pero la UI muestra la ronda 1
  hasta que se complete: se introduce **`rondaAMostrar`**.

**`rondaAMostrar`:** = `rondaActual`, salvo que `rondaActual == 2` y la ronda 1
tenga enfrentamientos pendientes → entonces `rondaAMostrar = 1`. Los enfrentamientos
del dashboard, el conteo de pendientes y "puede generar nueva ronda" usan
`rondaAMostrar` / esa condición: con `rondaActual == 2` y R1 pendiente, **no** se
puede generar la ronda 3.

**`puedeGenerarPrimerasDosRondas`:** ≥ 2 activas (flag) y `rondaActual == 0`.

**`registrarResultado` (registrar y editar):**
- No encontrado → error; descanso → *"Este enfrentamiento es un descanso y no
  admite resultado"*; ganador que no participa → *"La pareja ganadora no participa
  en este enfrentamiento"*.
- Si el ganador es el mismo que ya había → no-op.
- Se puede **cambiar** el ganador de un enfrentamiento ya jugado. En vez de la
  lógica incremental de deshacer/rehacer de Java, se **recalcula** todo el estado
  de las parejas (`derrotas` = nº de derrotas reales sobre enfrentamientos jugados;
  `eliminada` según la fórmula de arriba). Mismo resultado observable, más robusto.
- Al registrar, ambas parejas se añaden mutuamente a `rivales`.

**Endpoints Java que NO se portan como tal:**
- `/torneo/verificar-eliminacion` — innecesario: el recálculo en cada escritura
  mantiene `eliminada` siempre consistente.
- La mezcla manual de orden — ya no existe en Java (es automática por ronda).

### Cambios en la interfaz respecto a lo ya construido

- **`PanelAdmin`:** botón **"Generar primeras 2 rondas"** (visible solo cuando
  `puedeGenerarPrimerasDosRondas`), junto al de "Generar ronda".
- **Inicio:** el título y la lista de enfrentamientos usan `rondaAMostrar`; si
  `rondaAMostrar != rondaActual` se indica *"(Ronda N disponible)"*.
- El resto de pantallas no cambian.

### Nota sobre aleatoriedad y tests

Como el emparejamiento es aleatorio, los tests de `emparejar` verifican
**invariantes** (todas emparejadas; el que descansa es válido y de mínimos
descansos; no se repite rival cuando hay alternativa; se repite solo si es
inevitable) sobre muchas ejecuciones o con un RNG inyectado, no una salida exacta.

---

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
