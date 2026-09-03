# Despliegue paso a paso (Supabase + Vercel, gratis)

Todo esto se hace **una sola vez**. Después, cada `git push` a `main` redespliega
solo. Tiempo total: ~15-20 min. No hace falta tarjeta de crédito.

Vas a necesitar, en este orden:

1. Una cuenta de **Supabase** (la base de datos).
2. Tres valores de configuración (los preparas por el camino).
3. Una cuenta de **Vercel** (donde vive la web).

---

## PARTE 1 — Base de datos en Supabase

### 1.1 Crear la cuenta y el proyecto

1. Entra en <https://supabase.com> y pulsa **"Start your project"**.
2. Regístrate con **GitHub** (lo más rápido; usa la misma cuenta `Davvigar`).
3. Ya dentro, pulsa **"New project"**.
4. Rellena:
   - **Organization**: la que te crea por defecto sirve.
   - **Name**: `torneomus` (o lo que quieras).
   - **Database Password**: pulsa **"Generate a password"** y **CÓPIALO Y GUÁRDALO**
     ahora mismo en un sitio seguro. Lo vas a necesitar en el paso 1.3 y **no se
     puede volver a ver** (solo resetear).
   - **Region**: la más cercana. Para España: **`West EU (Ireland)`** o
     **`Central EU (Frankfurt)`**.
   - **Plan**: **Free**.
5. Pulsa **"Create new project"**. Tarda 1-2 minutos en aprovisionar (verás una
   barra de progreso). Espera a que aparezca el panel del proyecto.

### 1.2 Crear las tablas (SQL Editor)

Esto crea las tablas `parejas` y `enfrentamientos`. Es la forma más a prueba de
fallos (sin tocar cadenas de conexión).

1. En el menú lateral izquierdo de Supabase, pulsa el icono **"SQL Editor"**
   (parece `</>`).
2. Pulsa **"New query"** (arriba).
3. Abre en tu ordenador el fichero del repo:
   **`drizzle/0000_quick_dracula.sql`**
   Copia **todo su contenido** (Ctrl+A, Ctrl+C).
4. Pégalo en el editor de Supabase.
5. Pulsa **"Run"** (abajo a la derecha, o `Ctrl+Enter`).
6. Debe salir **"Success. No rows returned"**. Si sale un error de "already
   exists" es que ya lo habías ejecutado: no pasa nada.
7. Comprueba: menú lateral → **"Table Editor"**. Deben aparecer las tablas
   **`parejas`** y **`enfrentamientos`** en la lista.

### 1.3 Copiar la cadena de conexión (para Vercel)

1. Menú lateral → icono de **engranaje** ("Project Settings") abajo del todo.
2. Dentro, pulsa **"Database"**.
3. Baja hasta la sección **"Connection string"**.
4. Verás varias pestañas/opciones. Elige la de **"Transaction pooler"**
   (a veces pone *"Transaction"* o *"Ideal for serverless / stateless"*). El
   puerto tiene que ser **`6543`**.
   - ⚠️ NO uses la de "Direct connection" (puerto 5432): no funciona bien con
     Vercel.
5. Copia la cadena. Tiene esta pinta:
   ```
   postgresql://postgres.abcdefghijklmno:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
   ```
6. **Sustituye `[YOUR-PASSWORD]`** por la contraseña que guardaste en el paso 1.1.
   Deja el resto igual. Guarda el resultado: esto es tu **`DATABASE_URL`**.

---

## PARTE 2 — Preparar los tres valores de configuración

Ten a mano estos tres textos; los vas a pegar en Vercel en la Parte 3.

| Nombre | Qué es | Cómo lo consigues |
|---|---|---|
| `DATABASE_URL` | La cadena de Supabase | La del paso 1.3, con la contraseña ya puesta |
| `ADMIN_PASSWORD` | La contraseña del **modo administrador** de la web (para registrar parejas, meter resultados, etc.) | Inventa una. Ej: `mus-villamantilla-2026`. Apúntala. |
| `AUTH_SECRET` | Una cadena aleatoria larga con la que se firma la cookie de admin | Ver abajo |

**Cómo generar `AUTH_SECRET`** (elige UNA opción):

- **Mac/Linux o Git Bash en Windows**: abre una terminal y ejecuta
  ```
  openssl rand -hex 32
  ```
  Copia la línea de 64 caracteres que sale.
- **Sin terminal**: entra en <https://generate-secret.vercel.app/32> y copia lo
  que muestra.
- **A lo bruto**: teclea 50+ letras y números al azar. Sirve igual.

---

## PARTE 3 — La web en Vercel

### 3.1 Importar el repositorio

1. Entra en <https://vercel.com> y pulsa **"Sign Up"** (o "Log In").
2. Regístrate con **GitHub** (cuenta `Davvigar`).
3. En el panel, pulsa **"Add New..."** (arriba a la derecha) → **"Project"**.
4. En **"Import Git Repository"** busca **`TorneoMus`** y pulsa **"Import"**.
   - Si no aparece: pulsa **"Adjust GitHub App Permissions"** (o "Configure
     GitHub App"), dale acceso al repo `Davvigar/TorneoMus`, guarda y vuelve.

### 3.2 Configurar antes de desplegar

En la pantalla de configuración del proyecto:

1. **Framework Preset**: debe decir **"Next.js"** (lo detecta solo). No lo toques.
2. **Root Directory**: `./` (por defecto). No lo toques.
3. **Build and Output Settings**: no toques nada.
4. Despliega el desplegable **"Environment Variables"** y añade las **tres**
   variables de la Parte 2, una a una:
   - En **"Key"** escribe `DATABASE_URL`, en **"Value"** pega la cadena de
     Supabase. Pulsa **"Add"**.
   - Repite con `ADMIN_PASSWORD` y su valor.
   - Repite con `AUTH_SECRET` y su valor.
   - Deja marcados los tres entornos (Production / Preview / Development) si te lo
     pregunta.
   - ⚠️ Es importante añadirlas **ahora**, antes del primer deploy. Si no, el
     build falla con `DATABASE_URL no está definida`.
5. Pulsa el botón grande **"Deploy"**.

### 3.3 Esperar y comprobar

1. Verás los logs del build en directo. Tarda 2-4 minutos.
2. Al acabar sale **"Congratulations!"** con una captura de la web.
3. Pulsa **"Continue to Dashboard"** y luego **"Visit"** (o abre la URL
   `torneomus-xxxx.vercel.app`).
4. Debe cargar la página del torneo (cabecera con banderines, "Todavía no hay
   enfrentamientos").
5. Prueba el modo admin: pulsa **"Admin"** arriba a la derecha, mete tu
   `ADMIN_PASSWORD`, y comprueba que aparece el panel "Administración" para
   registrar parejas.

Listo. Pásale la URL a tu amigo.

---

## Después del despliegue

- **Cambios en el código**: haz `git push` a `main` y Vercel redespliega solo
  (1-2 min). Lo ves en el panel de Vercel → pestaña "Deployments".
- **CI**: al hacer push, GitHub Actions (`.github/workflows/ci.yml`) corre
  typecheck + lint + tests + build + e2e. La primera vez tarda porque instala
  Playwright. Si algo falla lo verás en la pestaña "Actions" del repo en GitHub.
- **La base de datos se "duerme"**: en el plan Free, Supabase pausa la BD tras
  ~1 semana sin uso. La primera visita después tarda unos segundos o muestra la
  pantalla de "Algo ha fallado" con botón *Reintentar*: recarga y ya.
- **Dominio propio** (opcional): Vercel → tu proyecto → **Settings → Domains**.
- **Cambiar la contraseña de admin**: Vercel → tu proyecto → **Settings →
  Environment Variables** → edita `ADMIN_PASSWORD` → luego **Deployments → ⋯ del
  último deploy → Redeploy** para que coja el nuevo valor.

## Si el build de Vercel falla por `--turbopack`

El script de build es `next build --turbopack`. Es estable en Next 15.5 y Vercel
lo soporta, pero si diera problemas: Vercel → **Settings → Build & Development
Settings** → **Build Command** → sobrescribe con `next build` (sin `--turbopack`)
→ Redeploy.

## Migraciones de esquema posteriores

Solo si en el futuro cambias `lib/db/schema.ts`:

1. `npm run db:generate` — crea un nuevo `.sql` en `drizzle/`.
2. Abre ese `.sql`, copia su contenido y ejecútalo en el **SQL Editor** de
   Supabase (igual que en el paso 1.2).
3. `git add drizzle && git commit -m "db: <qué cambió>" && git push`.

---

## Desarrollo en local (recordatorio)

Ver [`docs/desarrollo.md`](desarrollo.md). Resumen: PostgreSQL local con las BDs
`torneomus` y `torneomus_test`, `.env.local` a partir de `.env.example`,
`npx dotenv-cli -e .env.local -- npm run db:migrate`, `npm run dev`.
