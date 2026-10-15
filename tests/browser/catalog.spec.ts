import { test, expect } from "@playwright/test";
test("one entry, standalone catalog, selected item becomes persisted lead", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Da conexão certa ao próximo negócio." }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Catálogo por máquina/ }).click();
  await page.locator("#all-parts").click();
  await page.locator(".part").first().click();
  await page.locator("#add-part").click();
  await page.locator("#detail-dialog .close").click();
  await page.locator("#selection-open").click();
  await page.locator("#request-crm").click();
  await page.getByLabel("Nome", { exact: true }).fill("Comprador Integração");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("integracao@example.com");
  await page.getByLabel("Empresa", { exact: true }).fill("Usina Teste");
  await page
    .getByLabel("Segmento", { exact: true })
    .selectOption("Cana de açúcar");
  await page.getByLabel("Região de atuação").fill("Ribeirão Preto / SP");
  await page.getByRole("button", { name: "Simular entrada no CRM →" }).click();
  await expect(
    page.getByRole("heading", { name: "Interesse recebido." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ver o lead no CRM →" }).click();
  await expect(page.getByText("Comprador Integração").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("Comprador Integração").first()).toBeVisible();
  await page.goto("/#/campanhas");
  await expect(
    page.getByRole("heading", { name: "Campanhas e captação" }),
  ).toBeVisible();
  await page.goto("/#/inteligencia");
  await expect(
    page.getByRole("heading", { name: "Inteligência de mercado" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("presentation works on mobile without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Catálogo 3D/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("3D catalog renders and transfers selected parts to request", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.screenshot({
    path: "test-results/apresentacao-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: /Catálogo 3D/ }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator(".product").first()).toBeVisible();
  await page.locator("#xray").click();
  await expect(page.locator("#xray")).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: "test-results/catalogo-3d-integrado.png",
    fullPage: true,
  });
  await page.locator(".product").first().click();
  await page.locator("#add-product").click();
  await page.locator("#detail .close").click();
  await page.locator("#quote").click();
  await page.locator("#request-crm").click();
  await expect(
    page.getByRole("heading", { name: "Vamos conectar seu interesse." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
