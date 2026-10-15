import { test, expect } from "@playwright/test";
import { freshDatabase } from "../../src/domain/engine";
async function seed(page: any) {
  const db = freshDatabase();
  db.meta.defaultUserId = "U001";
  db.rules.defaultLatencyMs = 0;
  await page.addInitScript((data: any) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("megawhip_crm_db_v2", JSON.stringify(data));
      sessionStorage.setItem("seeded", "yes");
    }
  }, db);
}
test("all 21 routes render without errors; missing records stay missing", async ({
  page,
}) => {
  await seed(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of [
    "/visao-geral",
    "/atendimento",
    "/leads",
    "/leads/novo",
    "/funil",
    "/oportunidades/O001",
    "/cotacoes",
    "/cotacoes/Q001/editar",
    "/cotacoes/Q001",
    "/clientes",
    "/catalogo",
    "/tarefas",
    "/relatorios",
    "/automacoes",
    "/conhecimento",
    "/configuracoes/equipe",
    "/configuracoes/integracoes",
    "/configuracoes/importacao",
    "/configuracoes/auditoria",
    "/demonstracao",
    "/simulador/cliente/Q003-V1",
  ]) {
    await page.goto("/#" + path);
    await expect(page.locator("h1,h2").first()).toBeVisible();
  }
  await page.goto("/#/simulador/cliente/invalid");
  await expect(page.getByText("Proposta não encontrada")).toBeVisible();
  expect(errors).toEqual([]);
});
test("CSV import applies records and persists reload", async ({ page }) => {
  await seed(page);
  await page.goto("/#/configuracoes/importacao");
  await page
    .getByLabel("Conteúdo CSV")
    .fill(
      "nome;email;whatsapp;empresa;interesse\nCliente Teste;teste@example.com;;Empresa Teste;Conector\nInválido;bad;;;Outro",
    );
  await page.getByRole("button", { name: "Validar e visualizar" }).click();
  await expect(
    page.getByRole("cell", { name: "E-mail inválido" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirmar importação" }).click();
  await expect(page.getByRole("status")).toContainText("1 importados");
  await page.reload();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("megawhip_crm_db_v2")!),
  );
  expect(saved.leads.length).toBe(freshDatabase().leads.length + 1);
  expect(saved.contacts.some((c: any) => c.email === "teste@example.com")).toBe(
    true,
  );
});
test("upload is real, survives reload and downloads", async ({ page }) => {
  await seed(page);
  await page.goto("/#/oportunidades/O001");
  await page.getByRole("button", { name: /Arquivos/ }).click();
  await page.getByLabel("Anexar PDF, PNG ou JPEG").setInputFiles({
    name: "diagrama.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nDemo"),
  });
  await expect(page.getByText("Arquivo armazenado.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Arquivos/ }).click();
  await expect(page.getByText(/diagrama.pdf/)).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("diagrama.pdf");
});
test("mobile navigation and inbox panels fit viewport", async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/visao-geral");
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await page
    .getByRole("button", { name: "Atendimento", exact: false })
    .first()
    .click();
  await expect(page.locator(".inbox-list")).toBeVisible();
  await page.locator(".conversation-card").first().click();
  await expect(page.locator(".conversation-detail")).toBeVisible();
  await expect(page.locator(".inbox-list")).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-inbox.png",
    fullPage: true,
  });
});
test("canonical quote sends, downloads PDF, accepts and wins", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/#/cotacoes/Q001");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Baixar PDF/ }).click();
  expect((await download).suggestedFilename()).toBe(
    "MW-DEMO-2026-001-r1-DEMO.pdf",
  );
  await page
    .getByRole("button", { name: "Simular Envio ao Comprador" })
    .click();
  await page
    .getByLabel(/WhatsApp/)
    .first()
    .uncheck();
  await page
    .getByRole("button", { name: "Confirmar Envio", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("email: entregue");
  await page.goto("/#/simulador/cliente/Q001-V1");
  await page
    .getByRole("button", { name: "Aceitar Cotação", exact: true })
    .click();
  await expect(page.getByText(/Cotação aceita formalmente/)).toBeVisible();
  await page.goto("/#/oportunidades/O002");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Confirmar Ganho (Venda)", exact: true })
    .click();
  await expect(page.getByText(/Negociação marcada como GANHA/)).toBeVisible();
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("megawhip_crm_db_v2")!),
  );
  expect(data.opportunities.find((o: any) => o.id === "O002").stage).toBe(
    "won",
  );
});
test("malformed storage is preserved until explicit recovery", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("megawhip_crm_db_v2", "broken-json");
      sessionStorage.setItem("seeded", "yes");
    }
  });
  await page.goto("/#/visao-geral");
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível recuperar",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("megawhip_crm_db_v2")),
  ).toBe("broken-json");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Restaurar demonstração", exact: true })
    .click();
  await expect(page.getByRole("alert")).not.toBeVisible();
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("megawhip_crm_db_v2")!),
  );
  expect(data.meta.schemaVersion).toBe(2);
  expect(data.opportunities.length).toBe(8);
});
test("storage failure reports error and does not claim successful mutation", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/#/configuracoes/integracoes");
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Quota", "QuotaExceededError");
    };
  });
  await page
    .getByRole("button", { name: "Desconectar", exact: true })
    .first()
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível salvar",
  );
  await expect(page.getByRole("status")).toContainText("Falha");
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("megawhip_crm_db_v2")!),
  );
  expect(data.integrations[0].state).toBe("connected");
});
test("knowledge edits persist and paused assistant hides suggestions", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/#/conhecimento");
  await page.getByRole("button", { name: "Desativar fonte" }).click();
  await expect(page.getByRole("status")).toHaveText("Status atualizado.");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Aprovar fonte" }),
  ).toBeVisible();
  await page.goto("/#/atendimento");
  await page
    .getByRole("button", { name: "Assumir atendimento humano" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Assistente comercial" }),
  ).not.toBeVisible();
});
import { readFile } from "node:fs/promises";
test("long quote PDF wraps descriptions and creates multiple pages", async ({
  page,
}) => {
  const db = freshDatabase();
  db.meta.defaultUserId = "U001";
  const v = db.quoteVersions.find((v) => v.id === "Q001-V1")!;
  const line = v.lines[0];
  v.lines = Array.from({ length: 35 }, (_, i) => ({
    ...line,
    nameSnapshot: `Item ${i + 1}: descrição demonstrativa extensa para validar a quebra de linhas e a continuidade da proposta comercial em múltiplas páginas.`,
  }));
  await page.addInitScript(
    (data) => localStorage.setItem("megawhip_crm_db_v2", JSON.stringify(data)),
    db,
  );
  await page.goto("/#/cotacoes/Q001");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: /Baixar PDF/ }).click();
  const download = await event;
  await download.saveAs("test-results/long-quote.pdf");
  const bytes = await readFile("test-results/long-quote.pdf");
  expect(
    bytes.toString("latin1").match(/\/Type \/Page\b/g)!.length,
  ).toBeGreaterThan(1);
});
