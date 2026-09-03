import { test, expect, type Page } from "@playwright/test";

// Requiere: BD de test migrada, ADMIN_PASSWORD=test1234 en .env.test.

async function entrarComoAdmin(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /administración/i }).click();
  await page.getByPlaceholder("Contraseña").fill("test1234");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Administración")).toBeVisible();
}

async function reiniciarTorneo(page: Page) {
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Nuevo torneo" }).click();
  await expect(page.getByText(/Torneo reiniciado/)).toBeVisible();
}

async function registrarParejas(page: Page, nombres: string[]) {
  for (const nombre of nombres) {
    await page.getByPlaceholder("Ej: Los Tigres").fill(nombre);
    await page.getByRole("button", { name: "Registrar pareja" }).click();
    await expect(page.getByText(`Pareja '${nombre}' registrada`)).toBeVisible();
  }
}

test.beforeEach(async ({ page }) => {
  await entrarComoAdmin(page);
  await reiniciarTorneo(page);
});

test("camino feliz: registrar, generar ronda, resultado, clasificación", async ({
  page,
}) => {
  await registrarParejas(page, ["Alfa", "Beta", "Gamma", "Delta"]);

  await page.getByRole("button", { name: "Generar ronda" }).click();
  await expect(page.getByText(/Nueva ronda generada con 2/)).toBeVisible();

  await page.getByRole("link", { name: "Registrar resultado" }).first().click();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Confirmar resultado" }).click();
  await expect(page.getByText("Resultado registrado correctamente")).toBeVisible();

  await page.goto("/clasificacion");
  await expect(page.getByText("Parejas activas")).toBeVisible();
});

test("flujo primeras 2 rondas: R1 y R2 disponibles a la vez, resultados en cualquier orden", async ({
  page,
}) => {
  await registrarParejas(page, ["Uno", "Dos", "Tres", "Cuatro", "Cinco", "Seis"]);

  await page.getByRole("button", { name: "Generar primeras 2 rondas" }).click();
  await expect(page.getByText(/Primeras dos rondas generadas/)).toBeVisible();

  // Se muestran las dos rondas y sus 6 enfrentamientos a la vez.
  await expect(page.getByText(/Enfrentamientos.*Rondas 1 y 2/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Registrar resultado" }),
  ).toHaveCount(6);

  // Meter el resultado de un enfrentamiento de la RONDA 2 primero (nth(3): los
  // 3 primeros enlaces son de la R1, los 3 siguientes de la R2). Sin tocar la R1.
  await page.getByRole("link", { name: "Registrar resultado" }).nth(3).click();
  await expect(
    page.getByRole("heading", { name: "Registrar resultado" }),
  ).toBeVisible();
  await expect(page.getByText(/Ronda 2/)).toBeVisible();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Confirmar resultado" }).click();
  await expect(page.getByText("Resultado registrado correctamente")).toBeVisible();
  await page.getByRole("link", { name: "Volver al inicio" }).click();

  // Quedan 5 por meter (2 de R2, 3 de R1); se pueden meter todos.
  await expect(
    page.getByRole("link", { name: "Registrar resultado" }),
  ).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    await page.getByRole("link", { name: "Registrar resultado" }).first().click();
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: "Confirmar resultado" }).click();
    await expect(
      page.getByText("Resultado registrado correctamente"),
    ).toBeVisible();
    await page.getByRole("link", { name: "Volver al inicio" }).click();
  }

  // Con R1 y R2 completas, ya se puede generar la ronda 3.
  await expect(
    page.getByRole("button", { name: "Generar ronda" }),
  ).toBeEnabled();
});
