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
