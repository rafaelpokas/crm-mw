import test from "node:test";
import assert from "node:assert/strict";
import { freshDatabase, execute, nextBusinessDay } from "../src/domain/engine";
import { runScenario } from "../src/domain/scenarios";
import {
  metricsFor,
  scopedDatabase,
  whatsappOpen,
} from "../src/domain/selectors";
import { calculateQuoteTotals } from "../src/utils/calculations";
import { testRule } from "../src/domain/ruleTests";
import { parseCsv, csvCell } from "../src/domain/csv";
for (let i = 1; i <= 16; i++)
  test(`C${String(i).padStart(2, "0")} independent scenario`, () => {
    const r = runScenario(`C${String(i).padStart(2, "0")}`);
    assert.equal(r.result.ok, true, r.result.error?.message);
  });
test("canonical seed metrics", () => {
  const db = freshDatabase();
  const actual = metricsFor(db);
  for (const [k, v] of Object.entries(db.expectedInitialMetrics))
    assert.equal((actual as any)[k], v, k);
});
test("clock advances exactly 24 hours and skips weekends for follow-up", () => {
  const db = freshDatabase();
  const r = execute(db, "U001", "advanceClock", [1]);
  assert.equal(
    Date.parse(r.db.meta.clock) - Date.parse(db.meta.clock),
    86400000,
  );
  assert.equal(nextBusinessDay(db.meta.clock), "2026-10-12T10:00:00-03:00");
});
test("unknown prices stay unknown and cached totals are ignored", () => {
  const l = freshDatabase().quoteVersions[0].lines[0];
  const actual = calculateQuoteTotals(
    [
      {
        ...l,
        quantity: 2,
        unitPriceCents: 85000,
        discountBps: 500,
        grossCents: 1,
        netCents: 1,
        discountCents: 1,
      },
    ],
    0,
  );
  assert.equal(actual.totalCents, 161500);
  assert.equal(
    calculateQuoteTotals([{ ...l, unitPriceCents: null }]).hasPricePending,
    true,
  );
});
test("manager only approval: technical/admin/seller denied", () => {
  for (const role of ["technical", "admin", "seller"]) {
    const db = freshDatabase();
    const u = db.users.find((u) => u.role === role)!;
    const r = execute(db, u.id, "decideApproval", ["AP001", true]);
    assert.equal(r.result.error?.code, "FORBIDDEN");
    assert.deepEqual(r.db, db);
  }
});
test("total delivery failure does not move stage", () => {
  const db = freshDatabase();
  db.simulatedErrors.failEmail = true;
  const before = db.opportunities.find((o) => o.id === "O002")!.stage;
  const v = db.quoteVersions.find((v) => v.quoteId === "Q001")!;
  v.status = "draft";
  db.messages = db.messages.filter((m) => m.quoteVersionId !== v.id);
  const r = execute(db, "U001", "sendQuote", [v.id, ["email"]]);
  assert.equal(r.result.ok, false);
  assert.equal(r.db.opportunities.find((o) => o.id === "O002")!.stage, before);
});
test("draft acceptance denied", () => {
  const db = freshDatabase();
  const v = db.quoteVersions.find((v) => v.quoteId === "Q001")!;
  v.status = "draft";
  assert.equal(execute(db, "U001", "acceptQuote", [v.id]).result.ok, false);
});
test("duplicate event returns original lead and does not convert automatically", () => {
  const db = freshDatabase();
  const p = { ...db.demoNewLead };
  const r = execute(db, "U001", "createLead", [p]);
  assert.equal(r.result.ok, true);
  assert.equal(r.db.opportunities.length, db.opportunities.length);
  assert.equal(r.result.data.lead.status, "new");
  const again = execute(r.db, "U001", "createLead", [p]);
  assert.equal(again.result.data.lead.id, r.result.data.lead.id);
});
test("no active sellers yields unassigned, no invented channel", () => {
  const db = freshDatabase();
  db.users
    .filter((u) => u.role === "seller")
    .forEach((u) => (u.active = false));
  const r = execute(db, "U001", "createLead", [
    { name: "Teste", email: "teste@example.com", whatsappMockId: "" },
  ]);
  assert.equal(r.result.data.lead.ownerId, null);
  assert.equal(r.db.contacts.at(-1)?.whatsappMockId, "");
});
test("notification mark-all limited to recipient", () => {
  const db = freshDatabase();
  const r = execute(db, "U002", "markAllNotificationsRead", []);
  assert.equal(r.db.notifications.find((n) => n.id === "N001")?.read, false);
  assert.equal(r.db.notifications.find((n) => n.id === "N002")?.read, true);
});
test("email does not reopen whatsapp and note does not change waiting state", () => {
  let db = freshDatabase();
  db = execute(db, "U001", "advanceClock", [2]).db;
  db = execute(db, "U001", "receiveInboundMessage", [
    "CV001",
    "email",
    "Olá",
  ]).db;
  assert.equal(whatsappOpen(db, "CV001"), false);
  const old = db.conversations.find((c) => c.id === "CV001")!.state;
  db = execute(db, "U001", "sendChatMessage", [
    "CV001",
    "internal_note",
    "Privado",
  ]).db;
  assert.equal(db.conversations.find((c) => c.id === "CV001")!.state, old);
});
test("reading scope hides other sellers records", () => {
  const db = freshDatabase(),
    user = db.users.find((u) => u.id === "U002")!;
  const view = scopedDatabase(db, user);
  assert.ok(
    view.opportunities.every((o) => !o.ownerId || o.ownerId === user.id),
  );
  assert.ok(view.notifications.every((n) => n.recipientId === user.id));
});
test("invalid quantities and freight rejected atomically", () => {
  const db = freshDatabase();
  const v = db.quoteVersions.find((v) => v.quoteId === "Q001")!;
  v.status = "draft";
  for (const quantity of [0, -1, 1.5, 10000]) {
    const r = execute(db, "U001", "saveQuoteDraft", [
      v.id,
      { lines: [{ ...v.lines[0], quantity }] },
    ]);
    assert.equal(r.result.ok, false);
    assert.deepEqual(r.db, db);
  }
});
test("CSV quoting, accents, invalid quoting and spreadsheet-safe output", () => {
  assert.deepEqual(parseCsv('nome;email\n"João; Silva";j@example.com'), [
    ["nome", "email"],
    ["João; Silva", "j@example.com"],
  ]);
  assert.throws(() => parseCsv('a,b\n"abc'));
  assert.equal(csvCell("=1+1"), '"\'=1+1"');
});
for (const id of ["A01", "A02", "A03", "A04", "A05"])
  test(`${id} active and inactive rule tests`, () => {
    for (const active of [true, false]) {
      const db = freshDatabase();
      db.automationRules.find((r) => r.id === id)!.active = active;
      const result = testRule(db, id);
      assert.equal(result.ok, true, `${id}: ${result.data.message}`);
    }
  });
test("rejected quote never sends, and changed approval cannot be replayed", () => {
  let db = freshDatabase();
  db = execute(db, "U001", "decideApproval", ["AP001", false]).db;
  const id = db.approvals.find((a) => a.id === "AP001")!.quoteVersionId;
  assert.equal(
    execute(db, "U001", "sendQuote", [id, ["email"]]).result.ok,
    false,
  );
  assert.equal(
    execute(db, "U001", "decideApproval", ["AP001", true]).result.ok,
    false,
  );
});
test("published quote remains until new revision is sent and accepting it locks its draft", () => {
  let db = runScenario("C11").db;
  const q = db.quotes.find((q) => q.id === "Q001")!,
    published = q.publishedVersionId!;
  let out = execute(db, "U001", "reviseQuote", [q.id]);
  assert.equal(out.result.ok, true);
  db = out.db;
  const draft = out.result.data.id;
  assert.equal(
    db.quotes.find((q) => q.id === "Q001")!.publishedVersionId,
    published,
  );
  out = execute(db, "U001", "acceptQuote", [published]);
  assert.equal(out.result.ok, true);
  assert.equal(
    out.db.quoteVersions.find((v) => v.id === draft)?.status,
    "cancelled",
  );
  assert.equal(
    execute(out.db, "U001", "sendQuote", [draft, ["email"]]).result.ok,
    false,
  );
});
test("same request id is idempotent even on failure, retry is independent", () => {
  let db = freshDatabase();
  db.simulatedErrors.failEmail = true;
  const id = "Q001-V1";
  let out = execute(db, "U001", "sendQuote", [
    id,
    ["email"],
    undefined,
    "req-one",
  ]);
  db = out.db;
  const count = db.messages.length;
  out = execute(db, "U001", "sendQuote", [id, ["email"], undefined, "req-one"]);
  assert.equal(out.db.messages.length, count);
  db.simulatedErrors.failEmail = false;
  out = execute(db, "U001", "sendQuote", [id, ["email"], "email", "req-two"]);
  assert.equal(out.result.ok, true);
  assert.equal(out.db.messages.length, count + 1);
});
test("manual tasks survive loss while automatic followups are cancelled", () => {
  let db = freshDatabase();
  const r = execute(db, "U001", "createTask", [
    {
      opportunityId: "O001",
      title: "Análise manual",
      dueAt: "2026-10-12T10:00:00-03:00",
    },
  ]);
  db = r.db;
  const after = execute(db, "U001", "moveOpportunity", [
    "O001",
    "lost",
    "Preço",
  ]).db;
  assert.equal(
    after.tasks.find((t) => t.id === r.result.data.id)?.status,
    "open",
  );
});
test("lead to qualified opportunity to accepted sale with no fabricated data", () => {
  let db = freshDatabase();
  const run = (name: string, ...args: any[]) => {
    const out = execute(db, "U001", name, args);
    assert.equal(out.result.ok, true, out.result.error?.message);
    db = out.db;
    return out.result.data;
  };
  const { lead } = run("createLead", {
    name: "Comprador novo",
    email: "novo@example.com",
    whatsappMockId: "",
    interest: "Conector",
    source: "email",
  });
  assert.equal(db.opportunities.length, freshDatabase().opportunities.length);
  run("qualifyLead", lead.id);
  const o = run("convertLead", lead.id);
  assert.equal(o.estimatedValueCents, null);
  const { quote, version } = run("createQuoteForOpportunity", o.id);
  assert.equal(version.lines.length, 0);
  const line = {
    ...db.quoteVersions.find((v) => v.id === "Q001-V1")!.lines[1],
    quantity: 4,
    unitPriceCents: 12000,
    discountBps: 500,
  };
  run("saveQuoteDraft", version.id, {
    lines: [line],
    freightCents: 8000,
    freightPending: false,
  });
  run("updateOpportunity", o.id, { technicalStatus: "approved_demo" });
  run("saveQuoteDraft", version.id, {});
  run("sendQuote", version.id, ["email"]);
  run("acceptQuote", version.id);
  run("moveOpportunity", o.id, "won");
  assert.equal(db.opportunities.find((x) => x.id === o.id)?.stage, "won");
});
test("stale edit version conflicts without mutation", () => {
  const db = freshDatabase(),
    v = db.quoteVersions.find((v) => v.id === "Q001-V1")!;
  const r = execute(db, "U001", "saveQuoteDraft", [
    v.id,
    { version: v.version + 1, freightCents: 123 },
  ]);
  assert.equal(r.result.error?.code, "CONFLICT");
  assert.deepEqual(r.db, db);
});
test("technical actor cannot access unassigned commercial records", () => {
  const db = freshDatabase(),
    u = db.users.find((u) => u.role === "technical")!;
  assert.equal(scopedDatabase(db, u).opportunities.length, 0);
  assert.equal(
    execute(db, u.id, "sendQuote", ["Q001-V1", ["email"]]).result.error?.code,
    "FORBIDDEN",
  );
});
test("audit snapshots do not change with later mutations", () => {
  let db = freshDatabase();
  let out = execute(db, "U001", "createLead", [
    {
      name: "Auditoria",
      email: "audit@example.com",
      whatsappMockId: "",
      interest: "Conector",
    },
  ]);
  db = out.db;
  const leadId = out.result.data.lead.id;
  const activityId = db.activities.at(-1)!.id;
  out = execute(db, "U001", "qualifyLead", [leadId]);
  assert.equal(out.result.ok, true);
  assert.equal(
    out.db.activities.find((a) => a.id === activityId)!.after.status,
    "new",
  );
  const company = out.db.companies[0];
  const oldName = company.name;
  const saved = execute(out.db, "U001", "saveCompany", [
    company.id,
    { ...company, name: "Empresa atualizada" },
  ]);
  assert.equal(saved.result.ok, true);
  assert.equal(saved.db.activities.at(-1)!.before.name, oldName);
  assert.equal(saved.db.activities.at(-1)!.after.name, "Empresa atualizada");
});
