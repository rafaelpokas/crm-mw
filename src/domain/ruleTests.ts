import { execute, freshDatabase, uid } from "./engine";
import type { CrmDatabase } from "../data/types";
export function testRule(db: CrmDatabase, id: string) {
  let test = freshDatabase();
  test.automationRules = structuredClone(db.automationRules);
  test.rules = structuredClone(db.rules);
  const run = (c: string, ...args: any[]) => {
    const out = execute(test, "U001", c, args);
    test = out.db;
    return out.result;
  };
  if (id === "A01") run("createLead", { ...test.demoNewLead });
  if (id === "A02") {
    run("updateConversation", "CV001", { aiMode: "auto_triage" });
    run("receiveInboundMessage", "CV001", "whatsapp", "Peça sem referência");
  }
  if (id === "A03") {
    const v = test.quoteVersions.find((v) => v.quoteId === "Q001")!;
    v.status = "draft";
    test.messages = test.messages.filter((m) => m.quoteVersionId !== v.id);
    run("sendQuote", v.id, ["email"]);
  }
  if (id === "A04") run("advanceClock", 30);
  if (id === "A05") {
    const v = test.quoteVersions.find((v) => v.quoteId === "Q002")!;
    test.approvals = [];
    run("requestApproval", v.id, "Teste de aprovação");
  }
  const records = test.automationRuns.filter((r) => r.ruleId === id);
  const active = db.automationRules.find((r) => r.id === id)?.active;
  const ok =
    records.length > 0 &&
    records.every((r) => r.status === (active ? "success" : "ignored"));
  return {
    ok,
    data: {
      message: ok
        ? active
          ? "Regra executada e resultado conferido em uma cópia isolada."
          : "Regra desativada: execução corretamente ignorada."
        : "A regra não produziu o resultado esperado.",
    },
    error: ok
      ? undefined
      : {
          code: "RULE_TEST",
          message: "A regra não produziu o resultado esperado.",
        },
  };
}
