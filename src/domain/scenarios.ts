import { execute, freshDatabase, CommandResult } from "./engine";
import { calculateLineNet } from "../utils/calculations";
import type { CrmDatabase } from "../data/types";
export function runScenario(id: string): {
  db: CrmDatabase;
  result: CommandResult;
  actor: string;
} {
  let db = freshDatabase(),
    actor = "U001";
  const run = (name: string, ...args: any[]) => {
    const r = execute(db, actor, name, args);
    db = r.db;
    return r.result;
  };
  const assert = (condition: any, message: string) => {
    if (!condition) throw Error(message);
  };
  const draft = () => {
    const q = db.quotes.find((q) => q.id === "Q001")!;
    const v = db.quoteVersions.find((v) => v.id === q.currentVersionId)!;
    v.status = "draft";
    q.draftVersionId = v.id;
    q.publishedVersionId = null;
    db.messages = db.messages.filter((m) => m.quoteVersionId !== v.id);
    return v;
  };
  const send = () => {
    const v = draft();
    run(
      "receiveInboundMessage",
      "CV002",
      "whatsapp",
      "Pode enviar a proposta.",
    );
    assert(run("sendQuote", v.id, ["email"]).ok, "Envio de preparação falhou.");
    return v.id;
  };
  try {
    switch (id) {
      case "C01": {
        const r = run("createLead", {
          ...db.demoNewLead,
          companyName: db.demoNewLead.company,
        });
        assert(
          r.ok && db.leads.length === freshDatabase().leads.length + 1,
          "Lead não criado.",
        );
        break;
      }
      case "C02": {
        const p = { ...db.demoNewLead, companyName: db.demoNewLead.company };
        const first = run("createLead", p);
        const n = db.leads.length;
        const again = run("createLead", p);
        assert(
          first.ok &&
            again.data.lead.id === first.data.lead.id &&
            db.leads.length === n,
          "Idempotência falhou.",
        );
        break;
      }
      case "C03": {
        const v = draft();
        const r = run("saveQuoteDraft", v.id, {
          lines: db.products.slice(0, 2).map((p, i) => ({
            productId: p.id,
            skuSnapshot: p.sku,
            nameSnapshot: p.name,
            quantity: i ? 4 : 2,
            unitPriceCents: i ? 12000 : 85000,
            discountBps: 500,
            ...calculateLineNet(i ? 4 : 2, i ? 12000 : 85000, 500),
          })),
          freightCents: 8000,
          freightPending: false,
        });
        assert(
          r.ok && r.data.totalCents === 215100,
          "Cálculo canônico divergente.",
        );
        break;
      }
      case "C04": {
        assert(run("decideApproval", "AP001", true).ok, "Gestor não aprovou.");
        break;
      }
      case "C05": {
        actor = "U002";
        const before = JSON.stringify(db);
        const r = run("decideApproval", "AP001", true);
        assert(
          !r.ok &&
            r.error?.code === "FORBIDDEN" &&
            JSON.stringify(db) === before,
          "Permissão não bloqueou a ação.",
        );
        break;
      }
      case "C06": {
        assert(run("decideApproval", "AP001", true).ok, "Preparação falhou.");
        const ap = db.approvals.find((a) => a.id === "AP001")!;
        const v = db.quoteVersions.find((v) => v.id === ap.quoteVersionId)!;
        const lines = structuredClone(v.lines);
        lines[0].quantity++;
        assert(run("saveQuoteDraft", v.id, { lines }).ok, "Edição falhou.");
        assert(
          db.quoteVersions.find((x) => x.id === v.id)?.approvalStatus ===
            "pending",
          "Aprovação não invalidada.",
        );
        break;
      }
      case "C07": {
        const v = draft();
        run("receiveInboundMessage", "CV002", "whatsapp", "Pode enviar.");
        run("setSimulatedError", "failWhatsApp", true);
        const r = run("sendQuote", v.id, ["email", "whatsapp"]);
        assert(r.ok && r.data.partial, "Falha parcial não detectada.");
        run("setSimulatedError", "failWhatsApp", false);
        assert(
          run("sendQuote", v.id, ["whatsapp"], "whatsapp").ok,
          "Reenvio falhou.",
        );
        assert(
          db.messages.filter(
            (m) =>
              m.quoteVersionId === v.id &&
              m.channel === "email" &&
              m.deliveryStatus === "delivered",
          ).length === 1,
          "E-mail duplicado.",
        );
        break;
      }
      case "C08": {
        send();
        const r = run(
          "receiveInboundMessage",
          "CV002",
          "whatsapp",
          "É possível 8% de desconto?",
        );
        assert(
          r.ok &&
            db.opportunities.find((o) => o.id === "O002")?.stage ===
              "negotiation",
          "Renegociação não registrada.",
        );
        assert(
          !db.tasks.some(
            (t) =>
              t.opportunityId === "O002" &&
              t.type === "follow_up" &&
              t.automationKey &&
              t.status === "open",
          ),
          "Follow-up não suspenso.",
        );
        break;
      }
      case "C09": {
        run("updateRule", "A02", { active: true });
        run("updateConversation", "CV001", { aiMode: "auto_triage" });
        run(
          "receiveInboundMessage",
          "CV001",
          "whatsapp",
          "Como identificamos a peça sem referência?",
        );
        assert(
          db.opportunities.find((o) => o.id === "O001")?.technicalOwnerId ===
            "U004",
          "Triagem não encaminhada.",
        );
        break;
      }
      case "C10": {
        const v = db.quoteVersions.find((v) => v.quoteId === "Q004")!;
        assert(!run("acceptQuote", v.id).ok, "Cotação vencida aceita.");
        break;
      }
      case "C11": {
        const old = send();
        const r = run("reviseQuote", "Q001");
        assert(r.ok, "Revisão não criada.");
        assert(
          run("sendQuote", r.data.id, ["email"]).ok,
          "Nova revisão não publicada.",
        );
        assert(!run("acceptQuote", old).ok, "Revisão substituída aceita.");
        break;
      }
      case "C12": {
        const v = send();
        assert(run("acceptQuote", v).ok, "Aceite falhou.");
        assert(
          run("moveOpportunity", "O002", "won").ok &&
            db.opportunities.find((o) => o.id === "O002")?.stage === "won",
          "Ganho não confirmado.",
        );
        break;
      }
      case "C13": {
        assert(
          !run("moveOpportunity", "O001", "lost", "").ok,
          "Perda sem motivo aceita.",
        );
        break;
      }
      case "C14": {
        const o = structuredClone(
          db.opportunities.find((o) => o.id === "O001")!,
        );
        o.id = "O-AMBIGUOUS";
        db.opportunities.push(o);
        run(
          "receiveInboundMessage",
          "CV001",
          "whatsapp",
          "Quero alterar o pedido.",
        );
        assert(
          db.conversations.find((c) => c.id === "CV001")
            ?.candidateOpportunityIds?.length === 2,
          "Ambiguidade não detectada.",
        );
        break;
      }
      case "C15": {
        run("advanceClock", 2);
        assert(
          !run("sendChatMessage", "CV001", "whatsapp", "Olá").ok,
          "Janela não bloqueou.",
        );
        assert(
          run(
            "sendChatMessage",
            "CV001",
            "whatsapp",
            "Modelo de retomada",
            true,
          ).ok,
          "Modelo não permitido.",
        );
        assert(
          !run("sendChatMessage", "CV001", "whatsapp", "Texto livre").ok,
          "Modelo reabriu janela.",
        );
        break;
      }
      case "C22": {
        const alert=db.marketAlerts[0];
        db.marketCalendar.find(c=>c.id===alert.sourceCalendarId)!.status="expired";
        assert(!run("approveMarketAlert",alert.id).ok,"Calendário vencido permitiu campanha.");
        break;
      }
      case "C16":
        db = freshDatabase();
        actor = db.meta.defaultUserId;
        break;
      default:
        throw Error("Cenário desconhecido.");
    }
    return {
      db,
      actor,
      result: {
        ok: true,
        data: { message: `${id}: resultado conferido com sucesso.` },
      },
    };
  } catch (e: any) {
    return {
      db,
      actor,
      result: {
        ok: false,
        error: { code: "SCENARIO_FAILED", message: e.message },
      },
    };
  }
}
