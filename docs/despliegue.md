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
