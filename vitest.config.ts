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
    // (TRUNCATE en beforeEach). Sin esto, los ficheros corren en paralelo y
    // se pisan entre sí. Con fileParallelism:false van en serie.
    fileParallelism: false,
  },
});
