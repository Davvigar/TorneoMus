import { config } from "dotenv";

// Carga .env.test si existe; si no, .env.local
config({ path: ".env.test" });
config({ path: ".env.local" });

// Valores por defecto para los tests unitarios que no tocan BD
process.env.AUTH_SECRET ??= "test-secret-1234567890";
process.env.ADMIN_PASSWORD ??= "test1234";
