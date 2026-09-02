# Desarrollo local

## Requisitos
- Node 22
- PostgreSQL 16+ en local (nativo o Docker)

## Puesta en marcha
1. `npm install`
2. Base de datos. Si ya tienes un PostgreSQL local escuchando en 5432, crea las dos BDs:
   ```
   psql "postgresql://postgres:postgres@localhost:5432/postgres" -c "CREATE DATABASE torneomus;" -c "CREATE DATABASE torneomus_test;"
   ```
   Alternativa con Docker (si no tienes Postgres local):
   ```
   docker run -d --name torneomus-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=torneomus -p 5432:5432 postgres:16
   docker exec torneomus-pg psql -U postgres -c "CREATE DATABASE torneomus_test;"
   ```
3. Copia `.env.example` a `.env.local` y ajusta las credenciales si tu Postgres usa otras.
4. Migra: `npx dotenv-cli -e .env.local -- npm run db:migrate`
5. `npm run dev`

## Tests
- `npm test` (necesita `.env.test` y la BD `torneomus_test` migrada)
- Tras cambiar el esquema, vuelve a migrar la BD de test: `npx dotenv-cli -e .env.test -- npm run db:migrate`
