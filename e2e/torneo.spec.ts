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
