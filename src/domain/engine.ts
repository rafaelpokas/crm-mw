import { ecosystemCommand } from "./ecosystem";
import type {
  CrmDatabase,
  User,
  Opportunity,
  QuoteVersion,
  Activity,
  Message,
  LeadSource,
} from "../data/types";
import { INITIAL_CRM_DATA } from "../data/seedData";
import { calculateLineNet, calculateQuoteTotals } from "../utils/calculations";
import { canSee, terminal, whatsappOpen } from "./selectors";
export interface CommandResult<T = any> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
  };
}
export const uid = (prefix = "ID") => `${prefix}-${crypto.randomUUID()}`;
const fail = (message: string, code = "VALIDATION"): never => {
  throw Object.assign(new Error(message), { code });
};
const need = <T>(value: T | undefined | null, label = "Registro"): T =>
  value ?? fail(`${label} não encontrado.`, "NOT_FOUND");
export function snapshot(v: QuoteVersion) {
  return JSON.stringify([
    v.lines.map((l) => [
      l.productId,
      l.quantity,
      l.unitPriceCents,
      l.discountBps,
      l.technicalNote,
    ]),
    v.freightCents,
    v.freightPending,
    v.validUntil,
    v.paymentTerms,
    v.deliveryTerms,
    v.technicalApproved,
  ]);
}
export function freshDatabase(): CrmDatabase {
  const db = structuredClone(INITIAL_CRM_DATA);
  db.meta.schemaVersion = 2;
  db.attachments = [];
  db.receipts = {};
  for (const q of db.quotes) {
    const vs = db.quoteVersions.filter((v) => v.quoteId === q.id);
    q.publishedVersionId =
      vs.find((v) =>
        ["sent", "accepted", "expired", "rejected"].includes(v.status),
      )?.id || null;
    q.draftVersionId =
      vs.find((v) => ["draft", "ready"].includes(v.status))?.id || null;
  }
  for (const a of db.approvals) {
    const v = db.quoteVersions.find((v) => v.id === a.quoteVersionId);
    if (v) a.snapshot = snapshot(v);
  }
  return db;
}
export function nextBusinessDay(clock: string, days = 1) {
  const d = new Date(Date.parse(clock) - 3 * 3600000);
  for (let n = 0; n < days;) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (![0, 6].includes(d.getUTCDay())) n++;
  }
  return d.toISOString().slice(0, 10) + "T10:00:00-03:00";
}
function nextSeller(db: CrmDatabase) {
  const sellers = db.users
    .filter((u) => u.active && u.role === "seller")
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!sellers.length) return null;
  const next =
    sellers[
      (sellers.findIndex((u) => u.id === db.lastAssignedSellerId) + 1) %
        sellers.length
    ];
  db.lastAssignedSellerId = next.id;
  return next.id;
}
export function execute(
  dbInput: CrmDatabase,
  actorId: string,
  command: string,
  args: any[] = [],
): { db: CrmDatabase; result: CommandResult } {
  const db = structuredClone(dbInput);
  try {
    const user = need(
      db.users.find((u) => u.id === actorId && u.active),
      "Usuário ativo",
    );
    const [a, b, c, d] = args;
    const admin = () => {
      if (!["manager", "admin"].includes(user.role))
        fail("Ação restrita à gestão e administração.", "FORBIDDEN");
    };
    const manage = () => {
      if (user.role !== "manager")
        fail("Somente o gestor pode realizar esta ação.", "FORBIDDEN");
    };
    const sales = () => {
      if (!["seller", "manager", "admin"].includes(user.role))
        fail("Ação comercial não permitida para este perfil.", "FORBIDDEN");
    };
    const opp = (id: string, writing = true) => {
      const o = need(
        db.opportunities.find((o) => o.id === id),
        "Oportunidade",
      );
      if (!canSee(o, user))
        fail("Sem acesso a esta oportunidade.", "FORBIDDEN");
      if (writing) sales();
      return o;
    };
    const version = (id: string, writing = true) => {
      const v = need(
        db.quoteVersions.find((v) => v.id === id),
        "Revisão",
      );
      const q = need(db.quotes.find((q) => q.id === v.quoteId));
      const o = opp(q.opportunityId, writing);
      return { v, q, o };
    };
    const conv = (id: string) => {
      const x = need(
        db.conversations.find((x) => x.id === id),
        "Conversa",
      );
      if (
        !canSee(x, user) &&
        !(
          x.opportunityId &&
          canSee(
            need(db.opportunities.find((o) => o.id === x.opportunityId)),
            user,
          )
        )
      )
        fail("Sem acesso à conversa.", "FORBIDDEN");
      return x;
    };
    const log = (
      type: Activity["entityType"],
      id: string,
      action: string,
      before: any,
      after: any,
      actor = user.id,
    ) =>
      db.activities.push({
        id: uid("EV"),
        entityType: type,
        entityId: id,
        actorId: actor,
        action,
        before: structuredClone(before),
        after: structuredClone(after),
        createdAt: db.meta.clock,
      });
    const notify = (
      recipientId: string | null,
      title: string,
      message: string,
      linkRoute = "/atendimento",
    ) => {
      if (recipientId)
        db.notifications.push({
          id: uid("N"),
          recipientId,
          title,
          message,
          linkRoute,
          read: false,
          createdAt: db.meta.clock,
        });
    };
    const rule = (
      id: string,
      entityId: string,
      eventKey: string,
      action: () => void,
    ) => {
      if (
        db.automationRuns.some(
          (r) => r.ruleId === id && r.eventKey === eventKey,
        )
      )
        return;
      const active = db.automationRules.find((r) => r.id === id)?.active;
      if (active) action();
      db.automationRuns.push({
        id: uid("RUN"),
        ruleId: id,
        entityId,
        eventKey,
        status: active ? "success" : "ignored",
        reason: active ? "Ação aplicada." : "Regra desativada.",
        createdAt: db.meta.clock,
      });
    };
    const checkDraft = (v: QuoteVersion) => {
      if (!["draft", "ready"].includes(v.status))
        fail(
          "Revisão publicada ou encerrada é imutável. Crie uma nova revisão.",
        );
    };
    const validate = (v: QuoteVersion, sending = false) => {
      if (
        !Number.isSafeInteger(v.freightCents) ||
        v.freightCents < 0 ||
        !Number.isFinite(Date.parse(v.validUntil))
      )
        fail("Frete ou validade inválidos.");
      for (const l of v.lines) {
        if (
          !Number.isInteger(l.quantity) ||
          l.quantity < 1 ||
          l.quantity > db.rules.quantityMax
        )
          fail("Quantidade deve ser inteira entre 1 e 9.999.");
        if (
          l.unitPriceCents !== null &&
          (!Number.isSafeInteger(l.unitPriceCents) || l.unitPriceCents < 0)
        )
          fail("Preço inválido.");
        if (
          !Number.isInteger(l.discountBps) ||
          l.discountBps < 0 ||
          l.discountBps > 10000
        )
          fail("Desconto inválido.");
        Object.assign(
          l,
          calculateLineNet(l.quantity, l.unitPriceCents, l.discountBps),
        );
        if (!Number.isSafeInteger(l.netCents))
          fail("Valor fora do limite permitido.");
      }
      const totals = calculateQuoteTotals(
        v.lines,
        v.freightCents,
        db.rules.sellerDiscountLimitBps,
      );
      v.totalCents = totals.totalCents;
      if (sending) {
        if (!v.lines.length || totals.hasPricePending || v.freightPending)
          fail("Complete itens, preços e frete antes de enviar.");
        if (
          !v.technicalApproved &&
          v.lines.some(
            (l) =>
              db.products.find((p) => p.id === l.productId)
                ?.requiresTechnicalApproval,
          )
        )
          fail("Validação técnica pendente.");
        if (Date.parse(v.validUntil) <= Date.parse(db.meta.clock))
          fail("Cotação vencida. Crie uma nova revisão.");
        if (
          v.approvalStatus === "rejected" ||
          (totals.requiresApprovalByDiscount &&
            (v.approvalStatus !== "approved" ||
              !db.approvals.some(
                (ap) =>
                  ap.quoteVersionId === v.id &&
                  ap.status === "approved" &&
                  ap.snapshot === snapshot(v),
              )))
        )
          fail("Aprovação válida do gestor é necessária.");
        if (v.approvalStatus === "pending")
          fail("Aguarde a aprovação do gestor.");
      }
      return totals;
    };
    const task = (
      o: Opportunity,
      type: any,
      title: string,
      key: string | null,
      owner = o.ownerId,
    ) => {
      if (!owner || (key && db.tasks.some((t) => t.automationKey === key)))
        return;
      db.tasks.push({
        id: uid("T"),
        opportunityId: o.id,
        ownerId: owner,
        type,
        title,
        dueAt: nextBusinessDay(db.meta.clock, db.rules.followUpBusinessDays),
        status: "open",
        automationKey: key,
      });
    };
    const transfer = (o: Opportunity, target: string | null) => {
      const old = o.ownerId;
      o.ownerId = target;
      o.version++;
      db.leads
        .filter((l) => l.convertedOpportunityId === o.id)
        .forEach((l) => (l.ownerId = target));
      db.conversations
        .filter((c) => c.opportunityId === o.id)
        .forEach((c) => (c.ownerId = target));
      db.tasks
        .filter(
          (t) =>
            t.opportunityId === o.id &&
            t.status === "open" &&
            t.ownerId === old,
        )
        .forEach((t) => (t.ownerId = target || ""));
      log("opportunity", o.id, "owner_changed", old, target);
    };
    const deliveryError = (
      channel: string,
      contact: any,
      conversationId: string,
      template = false,
    ) => {
      if (contact.doNotContact) return "Contato bloqueou comunicações.";
      if (
        channel === "email" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)
      )
        return "E-mail válido não informado.";
      if (channel === "whatsapp" && !contact.whatsappMockId)
        return "WhatsApp não informado.";
      if (
        db.integrations.find((i) => i.channel === channel)?.state !==
        "connected"
      )
        return "Conexão indisponível.";
      if (
        channel === "whatsapp" &&
        !template &&
        !whatsappOpen(db, conversationId)
      )
        return "Janela de 24h encerrada. Envie um modelo aprovado e aguarde resposta.";
      if (
        channel === "whatsapp"
          ? db.simulatedErrors.failWhatsApp
          : db.simulatedErrors.failEmail
      )
        return "Falha simulada de entrega.";
      return null;
    };
    let data: any;
    switch (command) {
      case "simulateCatalogSubmission":
      case "createLead": {
        sales();
        const p = command === "simulateCatalogSubmission" ? {...a, name:a.contactName, email:a.contactEmail, whatsappMockId:a.contactWa, source:"catalog", catalogContext:{machineModel:a.machineModel,selectedItems:a.selectedItems}} : a;
        if (
          p.source &&
          ![
            "site",
            "whatsapp",
            "email",
            "referral",
            "event",
            "manual", "catalog", "instagram", "landing_page",
          ].includes(p.source)
        )
          fail("Origem inválida.");
        const key = p.eventId ? `lead:${p.eventId}` : null;
        if (key && db.receipts?.[key]) {
          data = db.receipts[key];
          break;
        }
        const name = p.name?.trim(),
          email = p.email?.trim().toLowerCase() || "",
          wa = p.whatsappMockId?.trim() || "";
        if (!name || (!email && !wa))
          fail("Informe nome e um canal de contato.");
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          fail("E-mail inválido.");
        let contact = db.contacts.find(
          (c) =>
            (email && c.email.toLowerCase() === email) ||
            (wa && c.whatsappMockId === wa),
        );
        if (contact && p.duplicateChoice !== "link")
          fail(
            "Contato já cadastrado. Confirme o vínculo com o contato existente.",
            "DUPLICATE",
          );
        if (!contact) {
          const company = p.companyName?.trim()
            ? {
                id: uid("E"),
                name: p.companyName.trim(),
                segment: "",
                city: "",
                state: "",
                document: null,
                fictitious: true,
              }
            : null;
          if (company) db.companies.push(company);
          contact = {
            id: uid("C"),
            companyId: company?.id || "",
            name,
            email,
            whatsappMockId: wa,
            preferredChannel: wa ? "whatsapp" : "email",
            doNotContact: false,
          };
          db.contacts.push(contact);
        }
        const lead = {
          id: uid("L"),
          contactId: contact.id,
          source: (p.source || "manual") as LeadSource,
          campaign: p.campaign || null,
          catalogContext: p.catalogContext,
          interest: p.interest?.trim() || "",
          status: "new" as const,
          ownerId: null as string | null,
          createdAt: db.meta.clock,
          convertedOpportunityId: null,
        };
        if (p.catalogContext) {
          const items = p.catalogContext.selectedItems;
          if (!Array.isArray(items) || !items.length || items.length > 100 || items.some((x:any)=>!x.sku || !Number.isInteger(x.quantity) || x.quantity<1 || x.quantity>9999)) fail("Seleção de peças inválida.");
        }
        db.leads.push(lead);
        const company = db.companies.find(x=>x.id===contact.companyId);
        if(company && p.segment && !company.segmentProfile?.mainSegment){company.segment=p.segment; company.segmentProfile={mainSegment:p.segment,additionalSegments:[],crop:[],supplyChainRole:"",region:p.region||"",confirmedMachines:[],qualificationStatus:p.region?"confirmed":"partial",confidence:"confirmed",validationSource:"Informado no formulário",lastValidatedAt:db.meta.clock};}
        if(["catalog","instagram","landing_page"].includes(lead.source)) db.touchpoints.push({id:uid("TP"),contactId:contact.id,companyId:contact.companyId,channel:lead.source as any,campaign:lead.campaign||undefined,details:lead.interest,machineModel:p.catalogContext?.machineModel,selectedProducts:p.catalogContext?.selectedItems,createdAt:db.meta.clock});
        rule("A01", lead.id, key || lead.id, () => {
          lead.ownerId = nextSeller(db);
          if (lead.ownerId)
            db.tasks.push({
              id: uid("T"),
              leadId: lead.id,
              opportunityId: "",
              ownerId: lead.ownerId,
              type: "follow_up",
              title: "Primeiro contato: " + name,
              dueAt: nextBusinessDay(db.meta.clock),
              status: "open",
              automationKey: `first-lead:${lead.id}`,
            });
        });
        const conversation = {
          id: uid("CV"),
          contactId: contact.id,
          opportunityId: null,
          ownerId: lead.ownerId,
          state: "waiting_team" as const,
          aiMode: "copilot" as const,
          lastInboundAt: db.meta.clock,
          unreadCount: 0,
        };
        db.conversations.push(conversation);
        if(p.catalogContext){db.messages.push({id:uid("M"),conversationId:conversation.id,channel:"internal_note",direction:"inbound",authorId:user.id,quoteVersionId:null,clientRequestId:null,providerEventId:null,body:"Interesse recebido pelo catálogo: "+JSON.stringify(p.catalogContext),deliveryStatus:"sent",createdAt:db.meta.clock});}
        notify(lead.ownerId, "Novo lead", `${name} · ${lead.source}`, "/leads");
        log("lead", lead.id, "created", null, lead);
        data = { lead };
        if (key) db.receipts![key] = data;
        break;
      }
      case "updateLead": {
        sales();
        const l = need(db.leads.find((l) => l.id === a));
        if (!canSee(l, user)) fail("Sem acesso ao lead.", "FORBIDDEN");
        if (l.status === "converted") fail("Edite a oportunidade vinculada.");
        if (b.interest !== undefined) l.interest = String(b.interest).trim();
        if (b.status) {
          if (!["new", "contacted", "qualified", "lost"].includes(b.status))
            fail("Estado inválido.");
          l.status = b.status;
        }
        log("lead", l.id, "updated", null, l);
        data = l;
        break;
      }
      case "qualifyLead":
      case "convertLead": {
        sales();
        const l = need(
          db.leads.find((l) => l.id === a),
          "Lead",
        );
        if (!canSee(l, user)) fail("Sem acesso ao lead.", "FORBIDDEN");
        if (command === "qualifyLead") {
          if (!["new", "contacted", "qualified"].includes(l.status))
            fail("Lead já encerrado.");
          if (!l.interest.trim())
            fail("Registre o interesse antes de qualificar.");
          l.status = "qualified";
          data = l;
        } else {
          if (l.convertedOpportunityId) {
            data = db.opportunities.find(
              (o) => o.id === l.convertedOpportunityId,
            );
            break;
          }
          if (l.status !== "qualified")
            fail("Qualifique o lead antes de converter.");
          const ct = need(db.contacts.find((c) => c.id === l.contactId));
          const o: Opportunity = {
            id: uid("O"),
            companyId: ct.companyId,
            contactId: ct.id,
            title: l.interest,
            stage: "qualification",
            ownerId: l.ownerId,
            estimatedValueCents: null,
            technicalStatus: "pending",
            createdAt: db.meta.clock,
            stageEnteredAt: db.meta.clock,
            closedAt: null,
            lostReason: null,
            version: 1,
          };
          db.opportunities.push(o);
          l.status = "converted";
          l.convertedOpportunityId = o.id;
          db.conversations
            .filter((c) => c.contactId === ct.id && !c.opportunityId)
            .forEach((c) => (c.opportunityId = o.id));
          const existingTasks = db.tasks.filter((t) => t.leadId === l.id);
          existingTasks.forEach((t) => (t.opportunityId = o.id));
          if (!existingTasks.length)
            rule("A01", o.id, `first:${o.id}`, () =>
              task(o, "follow_up", "Primeiro contato", `first:${o.id}`),
            );
          data = o;
        }
        log("lead", l.id, command, null, data);
        break;
      }
      case "assignOwner": {
        const o = opp(a);
        if (user.role === "seller" && (o.ownerId || b !== user.id))
          fail("Solicite a transferência ao gestor.", "FORBIDDEN");
        const target = need(
          db.users.find((u) => u.id === b && u.active && u.role === "seller"),
          "Vendedor ativo",
        );
        transfer(o, target.id);
        data = o;
        break;
      }
      case "assignLead": {
        admin();
        const l = need(db.leads.find((l) => l.id === a));
        need(
          db.users.find((u) => u.id === b && u.active && u.role === "seller"),
          "Vendedor",
        );
        l.ownerId = b;
        if (l.convertedOpportunityId)
          transfer(opp(l.convertedOpportunityId), b);
        else {
          db.conversations
            .filter((x) => x.contactId === l.contactId && !x.opportunityId)
            .forEach((x) => (x.ownerId = b));
          db.tasks
            .filter((t) => t.leadId === l.id && t.status === "open")
            .forEach((t) => (t.ownerId = b));
        }
        data = l;
        break;
      }
      case "updateOpportunity": {
        const o = opp(a, false);
        const before = structuredClone(o);
        if (user.role === "technical") {
          if (o.technicalOwnerId !== user.id)
            fail("Sem atribuição técnica.", "FORBIDDEN");
        } else sales();
        if (terminal(o)) fail("Reabra a oportunidade para editar.");
        if (
          b.technicalStatus &&
          !["pending", "approved_demo", "rejected_demo"].includes(
            b.technicalStatus,
          )
        )
          fail("Estado técnico inválido.");
        if (b.technicalStatus) {
          if (!["manager", "technical"].includes(user.role))
            fail("Validação exclusiva do gestor ou técnico.", "FORBIDDEN");
          o.technicalStatus = b.technicalStatus;
        }
        if (user.role !== "technical") {
          if (b.title !== undefined) {
            if (!b.title.trim()) fail("Título obrigatório.");
            o.title = b.title.trim();
          }
          if (b.estimatedValueCents !== undefined) {
            if (
              b.estimatedValueCents !== null &&
              (!Number.isSafeInteger(b.estimatedValueCents) ||
                b.estimatedValueCents < 0)
            )
              fail("Estimativa inválida.");
            o.estimatedValueCents = b.estimatedValueCents;
          }
        }
        o.version++;
        log("opportunity", o.id, "updated", before, o);
        data = o;
        break;
      }
      case "moveOpportunity": {
        if (
          ![
            "new",
            "qualification",
            "quoting",
            "quote_sent",
            "negotiation",
            "won",
            "lost",
          ].includes(b)
        )
          fail("Etapa inválida.");
        const o = opp(a);
        const before = structuredClone(o);
        if (o.stage === b) {
          data = o;
          break;
        }
        if (terminal(o)) {
          manage();
          if (!c?.trim()) fail("Justifique a reabertura.");
          if (b !== "negotiation") fail("Reabra em negociação.");
        }
        const order = [
          "new",
          "qualification",
          "quoting",
          "quote_sent",
          "negotiation",
        ];
        if (
          !terminal(o) &&
          order.indexOf(b) < order.indexOf(o.stage) &&
          order.includes(b) &&
          !c?.trim()
        )
          fail("Confirme o retrocesso com uma justificativa.");
        const qs = db.quotes.filter((q) => q.opportunityId === o.id);
        const vs = qs.map((q) =>
          db.quoteVersions.find((v) => v.id === q.publishedVersionId),
        );
        if (b === "quoting" && !qs.length)
          fail("Crie uma cotação antes de avançar.");
        if (
          ["quote_sent", "negotiation"].includes(b) &&
          !terminal(o) &&
          !vs.some((v) => v && ["sent", "accepted"].includes(v.status))
        )
          fail("Envie uma cotação antes de avançar.");
        if (b === "won" && !vs.some((v) => v?.status === "accepted"))
          fail("É necessário aceite da revisão vigente.");
        if (b === "lost" && !c?.trim()) fail("Informe o motivo da perda.");
        o.stage = b;
        o.stageEnteredAt = db.meta.clock;
        o.closedAt = terminal(o) ? db.meta.clock : null;
        o.lostReason = b === "lost" ? c : o.lostReason;
        o.version++;
        if (terminal(o))
          db.tasks
            .filter(
              (t) =>
                t.opportunityId === o.id &&
                t.status === "open" &&
                t.automationKey,
            )
            .forEach(
              (t) => (t.status = b === "won" ? "completed" : "cancelled"),
            );
        log("opportunity", o.id, "stage_changed", before, { ...o, reason: c });
        data = o;
        break;
      }
      case "createQuoteForOpportunity": {
        const o = opp(a);
        if (terminal(o)) fail("Negociação encerrada.");
        const existing = db.quotes.find(
          (q) => q.opportunityId === o.id && q.draftVersionId,
        );
        if (existing) {
          data = {
            quote: existing,
            version: db.quoteVersions.find(
              (v) => v.id === existing.draftVersionId,
            ),
          };
          break;
        }
        if (db.quotes.some((q) => q.opportunityId === o.id))
          fail("Use nova revisão na cotação existente.");
        const q = {
          id: uid("Q"),
          number: `MW-DEMO-${db.meta.clock.slice(0, 4)}-${String(db.quotes.length + 1).padStart(3, "0")}`,
          opportunityId: o.id,
          currentVersionId: uid("QV"),
          createdAt: db.meta.clock,
          publishedVersionId: null,
          draftVersionId: null as string | null,
        };
        q.draftVersionId = q.currentVersionId;
        const v: QuoteVersion = {
          id: q.currentVersionId,
          quoteId: q.id,
          revision: 1,
          status: "draft",
          approvalStatus: "not_required",
          lines: [],
          freightCents: 0,
          freightPending: true,
          totalCents: 0,
          validUntil: new Date(
            Date.parse(db.meta.clock) + 7 * 86400000,
          ).toISOString(),
          paymentTerms: "",
          deliveryTerms: "",
          technicalApproved: false,
          createdBy: user.id,
          sentAt: null,
          acceptedAt: null,
          version: 1,
        };
        db.quotes.push(q);
        db.quoteVersions.push(v);
        o.stage = "quoting";
        o.stageEnteredAt = db.meta.clock;
        log("quote", q.id, "created", null, v);
        data = { quote: q, version: v };
        break;
      }
      case "saveQuoteDraft": {
        const { v, o, q } = version(a);
        checkDraft(v);
        if (
          db.quoteVersions.find((x) => x.id === q.publishedVersionId)
            ?.status === "accepted"
        )
          fail("Cotação aceita. Inicie uma nova negociação.");
        if (b.version !== undefined && b.version !== v.version)
          fail("Esta revisão mudou. Recarregue antes de salvar.", "CONFLICT");
        const before = structuredClone(v),
          old = snapshot(v);
        for (const k of [
          "lines",
          "freightCents",
          "freightPending",
          "validUntil",
          "paymentTerms",
          "deliveryTerms",
        ] as const)
          if (b[k] !== undefined) (v as any)[k] = structuredClone(b[k]);
        v.technicalApproved = o.technicalStatus === "approved_demo";
        const totals = validate(v);
        if (old !== snapshot(v)) {
          db.approvals
            .filter(
              (ap) => ap.quoteVersionId === v.id && ap.status === "pending",
            )
            .forEach((ap) => {
              ap.status = "rejected";
              ap.decidedAt = db.meta.clock;
            });
          v.approvalStatus = totals.requiresApprovalByDiscount
            ? "pending"
            : "not_required";
        }
        v.version++;
        log("quote", v.quoteId, "draft_saved", before, v);
        data = v;
        break;
      }
      case "requestApproval": {
        const { v, o } = version(a);
        checkDraft(v);
        validate(v);
        if (!b?.trim()) fail("Justifique o desconto.");
        if (
          !v.lines.some((l) => l.discountBps > db.rules.sellerDiscountLimitBps)
        )
          fail("Cotação dentro da alçada.");
        const old = db.approvals.find(
          (ap) =>
            ap.quoteVersionId === v.id &&
            ap.status === "pending" &&
            ap.snapshot === snapshot(v),
        );
        if (old) {
          data = old;
          break;
        }
        const ap = {
          id: uid("AP"),
          quoteVersionId: v.id,
          requestedBy: user.id,
          decidedBy: null,
          status: "pending" as const,
          reason: b.trim(),
          requestedAt: db.meta.clock,
          decidedAt: null,
          snapshot: snapshot(v),
        };
        db.approvals.push(ap);
        v.approvalStatus = "pending";
        const manager = db.users.find((u) => u.active && u.role === "manager");
        if (manager)
          task(
            o,
            "manager_approval",
            "Aprovar desconto",
            `approval:${ap.id}`,
            manager.id,
          );
        rule("A05", v.id, `approval:${ap.id}`, () =>
          db.users
            .filter((u) => u.active && u.role === "manager")
            .forEach((u) => notify(u.id, "Aprovação pendente", b, "/cotacoes")),
        );
        log("approval", ap.id, "requested", null, ap);
        data = ap;
        break;
      }
      case "decideApproval": {
        manage();
        const ap = need(
          db.approvals.find((ap) => ap.id === a),
          "Aprovação",
        );
        const { v } = version(ap.quoteVersionId);
        checkDraft(v);
        if (ap.status !== "pending" || ap.snapshot !== snapshot(v))
          fail("Solicitação encerrada ou conteúdo alterado.");
        db.tasks
          .filter(
            (t) =>
              t.automationKey === `approval:${ap.id}` && t.status === "open",
          )
          .forEach((t) => {
            t.status = "completed";
            t.outcome = b ? "Aprovado" : "Rejeitado";
          });
        ap.status = b ? "approved" : "rejected";
        ap.decidedBy = user.id;
        ap.decidedAt = db.meta.clock;
        v.approvalStatus = ap.status;
        log("approval", ap.id, "decided", null, { ...ap, note: c });
        notify(
          ap.requestedBy,
          "Aprovação respondida",
          b ? "Desconto aprovado." : "Desconto rejeitado.",
          "/cotacoes",
        );
        data = ap;
        break;
      }
      case "reviseQuote": {
        const q = need(db.quotes.find((q) => q.id === a));
        const o = opp(q.opportunityId);
        const old = need(
          db.quoteVersions.find((v) => v.id === q.currentVersionId),
        );
        if (terminal(o) || old.status === "accepted")
          fail("Cotação aceita/negociação encerrada. Inicie nova negociação.");
        if (q.draftVersionId) {
          data = db.quoteVersions.find((v) => v.id === q.draftVersionId);
          break;
        }
        const v: QuoteVersion = {
          ...structuredClone(old),
          id: uid("QV"),
          revision:
            Math.max(
              ...db.quoteVersions
                .filter((v) => v.quoteId === q.id)
                .map((v) => v.revision),
            ) + 1,
          status: "draft",
          approvalStatus: old.lines.some(
            (l) => l.discountBps > db.rules.sellerDiscountLimitBps,
          )
            ? "pending"
            : "not_required",
          createdBy: user.id,
          sentAt: null,
          acceptedAt: null,
          validUntil: new Date(
            Date.parse(db.meta.clock) + 7 * 86400000,
          ).toISOString(),
          version: 1,
        };
        db.quoteVersions.push(v);
        q.draftVersionId = v.id;
        q.currentVersionId = v.id;
        log("quote", q.id, "revision_created", old.id, v.id);
        data = v;
        break;
      }
      case "sendQuote": {
        const receipt = d ? `send:${d}` : null;
        if (receipt && db.receipts?.[receipt])
          return { db: dbInput, result: db.receipts[receipt] };
        const { v, q, o } = version(a);
        if (
          db.quoteVersions.find((x) => x.id === q.publishedVersionId)
            ?.status === "accepted"
        )
          fail("Cotação aceita. Inicie nova negociação.");
        if (!["draft", "ready", "sent"].includes(v.status) || terminal(o))
          fail("Revisão não pode ser enviada.");
        validate(v, true);
        const channels: string[] = c ? [c] : [...new Set(b)];
        if (
          !channels.length ||
          channels.some((x) => !["whatsapp", "email"].includes(x))
        )
          fail("Selecione canais válidos.");
        const contact = need(db.contacts.find((ct) => ct.id === o.contactId));
        const cv = need(
          db.conversations.find((cv) => cv.opportunityId === o.id),
          "Conversa vinculada",
        );
        const results: Record<string, { status: string; message?: string }> =
          {};
        for (const ch of channels) {
          const previous = db.messages.find(
            (m) =>
              m.quoteVersionId === v.id &&
              m.channel === ch &&
              ["sent", "delivered", "read"].includes(m.deliveryStatus),
          );
          if (previous) {
            results[ch] = {
              status: "delivered",
              message: "Já entregue; envio não repetido.",
            };
            continue;
          }
          const error = deliveryError(ch, contact, cv.id);
          const requestKey = d ? `${d}:${ch}` : uid("SEND");
          const msg: Message = {
            id: uid("M"),
            conversationId: cv.id,
            channel: ch as any,
            direction: "outbound",
            authorId: user.id,
            body: `Cotação ${q.number}, revisão ${v.revision}. Link demonstrativo: #/simulador/cliente/${v.id}`,
            deliveryStatus: error ? "failed" : "delivered",
            createdAt: db.meta.clock,
            quoteVersionId: v.id,
            clientRequestId: requestKey,
            providerEventId: null,
          };
          db.messages.push(msg);
          results[ch] = {
            status: error ? "failed" : "delivered",
            message: error || undefined,
          };
        }
        const successful = Object.values(results).some(
          (r) => r.status === "delivered",
        );
        if (successful) {
          if (q.publishedVersionId && q.publishedVersionId !== v.id)
            need(
              db.quoteVersions.find((x) => x.id === q.publishedVersionId),
            ).status = "superseded";
          q.publishedVersionId = v.id;
          q.draftVersionId = null;
          v.status = "sent";
          v.sentAt ||= db.meta.clock;
          if (!["negotiation", "won", "lost"].includes(o.stage)) {
            o.stage = "quote_sent";
            o.stageEnteredAt = db.meta.clock;
          }
          cv.state = "waiting_client";
          rule("A03", o.id, `follow:${v.id}`, () =>
            task(o, "follow_up", "Retornar cotação", `follow:${v.id}`),
          );
        }
        log("quote", q.id, "delivery", null, results);
        data = {
          channels: results,
          partial:
            successful &&
            Object.values(results).some((r) => r.status === "failed"),
        };
        const response: CommandResult = successful
          ? { ok: true, data }
          : {
              ok: false,
              data,
              error: {
                code: "DELIVERY_FAILED",
                message:
                  "Nenhum canal entregou a cotação. Confira as falhas e tente novamente.",
              },
            };
        if (receipt) db.receipts![receipt] = response;
        if (!successful) return { db, result: response };
        break;
      }
      case "sendChatMessage": {
        const cv = conv(a);
        const ct = need(db.contacts.find((ct) => ct.id === cv.contactId));
        if (!c?.trim()) fail("Digite uma mensagem.");
        if (b !== "internal_note") {
          sales();
          const error = deliveryError(b, ct, cv.id, d);
          if (error) fail(error, "DELIVERY_FAILED");
          cv.state = "waiting_client";
        }
        const msg: Message = {
          id: uid("M"),
          conversationId: cv.id,
          channel: b,
          direction: "outbound",
          authorId: user.id,
          body: c.trim(),
          deliveryStatus: "sent",
          createdAt: db.meta.clock,
          quoteVersionId: null,
          clientRequestId: uid("REQ"),
          providerEventId: null,
        };
        db.messages.push(msg);
        log(
          "conversation",
          cv.id,
          b === "internal_note" ? "note_added" : "message_sent",
          null,
          msg,
        );
        data = msg;
        break;
      }
      case "receiveInboundMessage": {
        const cv = need(db.conversations.find((x) => x.id === a));
        if (d) {
          const old = db.messages.find((m) => m.providerEventId === d);
          if (old) {
            data = old;
            break;
          }
        }
        if (!c?.trim() || !["whatsapp", "email"].includes(b))
          fail("Mensagem inválida.");
        const msg: Message = {
          id: uid("M"),
          conversationId: cv.id,
          channel: b,
          direction: "inbound",
          authorId: null,
          body: c,
          deliveryStatus: "received",
          createdAt: db.meta.clock,
          quoteVersionId: null,
          clientRequestId: null,
          providerEventId: d || uid("PROVIDER"),
        };
        db.messages.push(msg);
        cv.unreadCount++;
        cv.lastInboundAt = db.meta.clock;
        cv.state = "waiting_team";
        const candidates = db.opportunities.filter(
          (o) => o.contactId === cv.contactId && !terminal(o),
        );
        if (candidates.length > 1) {
          cv.candidateOpportunityIds = candidates.map((o) => o.id);
          cv.opportunityId = null;
        }
        const o = db.opportunities.find((o) => o.id === cv.opportunityId);
        if (o && !terminal(o)) {
          db.tasks
            .filter(
              (t) =>
                t.opportunityId === o.id &&
                t.type === "follow_up" &&
                t.automationKey &&
                t.status === "open",
            )
            .forEach((t) => (t.status = "cancelled"));
          if (
            /desconto|8%/i.test(c) &&
            db.quotes.some(
              (q) => q.opportunityId === o.id && q.publishedVersionId,
            )
          ) {
            o.stage = "negotiation";
            o.stageEnteredAt = db.meta.clock;
          }
          rule("A02", cv.id, `triage:${msg.id}`, () => {
            if (
              /sem refer[eê]ncia|como identificamos/i.test(c) &&
              cv.aiMode === "auto_triage"
            ) {
              const tech = db.users.find(
                (u) => u.active && u.role === "technical",
              );
              o.technicalStatus = "pending";
              o.technicalOwnerId = tech?.id || null;
              cv.technicalOwnerId = tech?.id || null;
              cv.aiMode = "paused";
              task(
                o,
                "technical_review",
                "Confirmar aplicação",
                `tech:${msg.id}`,
                tech?.id,
              );
            }
          });
        }
        notify(
          cv.ownerId,
          "Mensagem recebida",
          c,
          `/atendimento?conversation=${cv.id}`,
        );
        log("conversation", cv.id, "inbound", null, msg, "customer");
        data = msg;
        break;
      }
      case "updateConversation": {
        const cv = conv(a);
        const before = structuredClone(cv);
        if (b.read) cv.unreadCount = 0;
        if (b.aiMode) {
          if (!["off", "copilot", "auto_triage", "paused"].includes(b.aiMode))
            fail("Modo inválido.");
          cv.aiMode = b.aiMode;
        }
        if (b.opportunityId) {
          const o = opp(b.opportunityId, false);
          if (o.contactId !== cv.contactId) fail("Contato incompatível.");
          cv.opportunityId = o.id;
          cv.candidateOpportunityIds = [];
          db.tasks
            .filter(
              (t) =>
                t.opportunityId === o.id &&
                t.type === "follow_up" &&
                t.automationKey &&
                t.status === "open",
            )
            .forEach((t) => (t.status = "cancelled"));
        }
        if (b.technicalOwnerId) {
          const u = need(
            db.users.find(
              (u) =>
                u.id === b.technicalOwnerId &&
                u.active &&
                u.role === "technical",
            ),
          );
          cv.technicalOwnerId = u.id;
          cv.aiMode = "paused";
          if (cv.opportunityId) {
            const o = opp(cv.opportunityId, false);
            o.technicalOwnerId = u.id;
            o.technicalStatus = "pending";
            task(
              o,
              "technical_review",
              "Confirmar aplicação",
              `tech:${o.id}`,
              u.id,
            );
          }
        }
        if (JSON.stringify(before) !== JSON.stringify(cv))
          log("conversation", cv.id, "updated", before, cv);
        data = cv;
        break;
      }
      case "acceptQuote":
      case "rejectQuote": {
        const v = need(db.quoteVersions.find((v) => v.id === a));
        const q = need(db.quotes.find((q) => q.id === v.quoteId));
        if (command === "acceptQuote" && v.status === "accepted") {
          data = v;
          break;
        }
        if (command === "rejectQuote" && v.status === "rejected") {
          data = v;
          break;
        }
        if (v.status !== "sent" || q.publishedVersionId !== v.id || !v.sentAt)
          fail("Somente a revisão enviada e vigente pode receber resposta.");
        validate(v, true);
        if (
          command === "acceptQuote" &&
          q.draftVersionId &&
          q.draftVersionId !== v.id
        ) {
          need(db.quoteVersions.find((x) => x.id === q.draftVersionId)).status =
            "cancelled";
          q.draftVersionId = null;
          q.currentVersionId = v.id;
        }
        v.status = command === "acceptQuote" ? "accepted" : "rejected";
        v.acceptedAt = command === "acceptQuote" ? db.meta.clock : null;
        log(
          "quote",
          q.id,
          command,
          null,
          { revision: v.id, reason: b },
          "customer",
        );
        const o = need(db.opportunities.find((o) => o.id === q.opportunityId));
        notify(o.ownerId, "Resposta à cotação", v.status, `/cotacoes/${q.id}`);
        data = v;
        break;
      }
      case "createTask": {
        if (
          a.type &&
          ![
            "follow_up",
            "technical_review",
            "quote_draft",
            "manager_approval",
          ].includes(a.type)
        )
          fail("Tipo de tarefa inválido.");
        const o = opp(a.opportunityId, false);
        if (!a.title?.trim() || !Number.isFinite(Date.parse(a.dueAt)))
          fail("Título e data válidos são obrigatórios.");
        data = {
          id: uid("T"),
          opportunityId: o.id,
          ownerId: user.id,
          type: a.type || "follow_up",
          title: a.title.trim(),
          dueAt: a.dueAt,
          status: "open",
          automationKey: null,
        };
        db.tasks.push(data);
        log("task", data.id, "created", null, data);
        break;
      }
      case "completeTask":
      case "updateTask": {
        const t = need(db.tasks.find((t) => t.id === a));
        if (t.opportunityId) opp(t.opportunityId, false);
        else {
          const l = need(db.leads.find((l) => l.id === t.leadId));
          if (!canSee(l, user)) fail("Sem acesso à tarefa.", "FORBIDDEN");
        }
        if (t.ownerId !== user.id && !["manager", "admin"].includes(user.role))
          fail("Tarefa de outro responsável.", "FORBIDDEN");
        const before = structuredClone(t);
        if (command === "completeTask") {
          t.status = "completed";
          t.outcome = b?.trim() || "Concluída pelo responsável.";
        } else {
          if (b.title !== undefined) {
            if (!b.title.trim()) fail("Título obrigatório.");
            t.title = b.title.trim();
          }
          if (b.dueAt) {
            if (!Number.isFinite(Date.parse(b.dueAt))) fail("Data inválida.");
            t.dueAt = b.dueAt;
          }
          if (b.ownerId) {
            admin();
            need(db.users.find((u) => u.id === b.ownerId && u.active));
            t.ownerId = b.ownerId;
          }
        }
        log("task", t.id, command, before, t);
        data = t;
        break;
      }
      case "advanceClock": {
        if (!Number.isInteger(a) || a < 1 || a > 365) fail("Avanço inválido.");
        db.meta.clock = new Date(
          Date.parse(db.meta.clock) + a * 86400000,
        ).toISOString();
        for (const v of db.quoteVersions.filter(
          (v) =>
            v.status === "sent" &&
            Date.parse(v.validUntil) <= Date.parse(db.meta.clock),
        )) {
          rule("A04", v.id, `expire:${v.id}`, () => {
            v.status = "expired";
            const q = need(db.quotes.find((q) => q.id === v.quoteId));
            const o = need(
              db.opportunities.find((o) => o.id === q.opportunityId),
            );
            notify(o.ownerId, "Cotação vencida", q.number, `/cotacoes/${q.id}`);
          });
        }
        data = db.meta.clock;
        break;
      }
      case "markNotificationRead":
      case "markAllNotificationsRead": {
        db.notifications
          .filter(
            (n) =>
              n.recipientId === user.id &&
              (command === "markAllNotificationsRead" || n.id === a),
          )
          .forEach((n) => (n.read = true));
        break;
      }
      case "setSimulatedError": {
        if (!["failWhatsApp", "failEmail"].includes(a)) fail("Falha inválida.");
        db.simulatedErrors[a as "failWhatsApp" | "failEmail"] = !!b;
        break;
      }
      case "updateKnowledge": {
        if (!["manager", "admin", "technical"].includes(user.role))
          fail("Sem permissão para documentos.", "FORBIDDEN");
        const x = a
          ? need(db.knowledgeDocuments.find((x) => x.id === a))
          : {
              id: uid("K"),
              title: "",
              content: "",
              version: 0,
              status: "draft" as const,
              approvedBy: null,
            };
        const before = structuredClone(x);
        if (b.status === "approved" && user.role !== "manager")
          fail("Somente gestor aprova fontes.", "FORBIDDEN");
        if (b.title !== undefined) x.title = b.title.trim();
        if (b.content !== undefined) x.content = b.content.trim();
        if (!x.title || !x.content) fail("Título e conteúdo obrigatórios.");
        x.status = b.status || "draft";
        x.approvedBy = x.status === "approved" ? user.id : null;
        x.version++;
        if (!a) db.knowledgeDocuments.push(x);
        log("knowledge", x.id, "updated", before, x);
        data = x;
        break;
      }
      case "updateRule": {
        admin();
        const r = need(db.automationRules.find((r) => r.id === a));
        const before = structuredClone(r);
        if (b.active !== undefined) r.active = !!b.active;
        for (const k of [
          "sellerDiscountLimitBps",
          "followUpBusinessDays",
        ] as const)
          if (b[k] !== undefined) {
            if (
              !Number.isInteger(b[k]) ||
              b[k] < (k === "followUpBusinessDays" ? 1 : 0) ||
              b[k] > (k === "sellerDiscountLimitBps" ? 10000 : 30)
            )
              fail("Configuração inválida.");
            db.rules[k] = b[k];
          }
        log("settings", r.id, "rule_updated", before, {
          rule: r,
          settings: db.rules,
        });
        data = r;
        break;
      }
      case "updateIntegration": {
        admin();
        const x = need(db.integrations.find((x) => x.id === a));
        if (x.channel === "erp") fail("ERP fora do escopo.");
        if (!["connected", "disconnected", "error"].includes(b))
          fail("Estado inválido.");
        x.state = b;
        x.lastSyncAt = db.meta.clock;
        x.lastError = b === "error" ? "Falha simulada." : null;
        log("settings", x.id, "connection_changed", null, x);
        data = x;
        break;
      }
      case "updateUser": {
        admin();
        const u = need(db.users.find((u) => u.id === a));
        if (u.id === user.id && b.active === false)
          fail("Não desative o perfil em uso.");
        const before = structuredClone(u);
        if (b.name !== undefined) {
          if (!b.name.trim()) fail("Nome obrigatório.");
          u.name = b.name.trim();
        }
        if (b.active !== undefined) u.active = !!b.active;
        if (!u.active) {
          db.opportunities
            .filter((o) => o.ownerId === u.id && !terminal(o))
            .forEach((o) => transfer(o, nextSeller(db)));
          db.leads
            .filter((l) => l.ownerId === u.id && !l.convertedOpportunityId)
            .forEach((l) => {
              l.ownerId = nextSeller(db);
              db.conversations
                .filter((c) => c.contactId === l.contactId && !c.opportunityId)
                .forEach((c) => (c.ownerId = l.ownerId));
              db.tasks
                .filter((t) => t.leadId === l.id && t.status === "open")
                .forEach((t) => (t.ownerId = l.ownerId || ""));
            });
        }
        log("settings", u.id, "user_updated", before, u);
        data = u;
        break;
      }
      case "saveCompany":
      case "saveContact":
      case "saveProduct": {
        if (command === "saveProduct") admin();
        else sales();
        const collection =
          command === "saveCompany"
            ? db.companies
            : command === "saveContact"
              ? db.contacts
              : db.products;
        const existing = a
          ? need((collection as any[]).find((x) => x.id === a))
          : null;
        if (
          existing &&
          existing.createdBy !== user.id &&
          user.role === "seller" &&
          !db.leads.some(
            (l) =>
              canSee(l, user) &&
              (command === "saveContact"
                ? l.contactId === a
                : db.contacts.some(
                    (c) => c.id === l.contactId && c.companyId === a,
                  )),
          ) &&
          !db.opportunities.some(
            (o) =>
              canSee(o, user) &&
              (command === "saveContact"
                ? o.contactId === a
                : o.companyId === a),
          )
        )
          fail("Sem acesso ao cadastro.", "FORBIDDEN");
        const x = {
          ...(existing || {}),
          ...b,
          createdBy: existing?.createdBy || user.id,
          id:
            existing?.id ||
            uid(
              command === "saveCompany"
                ? "E"
                : command === "saveContact"
                  ? "C"
                  : "P",
            ),
        };
        if (!x.name?.trim()) fail("Nome obrigatório.");
        x.name = x.name.trim();
        if (command === "saveContact") {
          if (!x.email && !x.whatsappMockId)
            fail("Informe um canal de contato.");
          if (x.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email))
            fail("E-mail inválido.");
          if (
            db.contacts.some(
              (c) =>
                c.id !== x.id &&
                ((x.email && c.email.toLowerCase() === x.email.toLowerCase()) ||
                  (x.whatsappMockId && c.whatsappMockId === x.whatsappMockId)),
            )
          )
            fail("Contato duplicado.");
          if (x.companyId)
            need(
              db.companies.find((c) => c.id === x.companyId),
              "Empresa",
            );
        }
        if (command === "saveProduct") {
          if (
            !x.sku?.trim() ||
            db.products.some((p) => p.id !== x.id && p.sku === x.sku)
          )
            fail("SKU obrigatório e único.");
          if (
            x.unitPriceCents !== null &&
            (!Number.isSafeInteger(x.unitPriceCents) || x.unitPriceCents < 0)
          )
            fail("Preço inválido.");
        }
        const previous = structuredClone(existing);
        if (existing) Object.assign(existing, x);
        else (collection as any[]).push(x);
        log(
          command === "saveCompany"
            ? "company"
            : command === "saveContact"
              ? "contact"
              : "product",
          x.id,
          "saved",
          previous,
          x,
        );
        data = x;
        break;
      }
      case "addAttachment": {
        opp(a.opportunityId, false);
        if (
          a.size > 5 * 1024 * 1024 ||
          !["application/pdf", "image/png", "image/jpeg"].includes(a.type)
        )
          fail("Use PDF, PNG ou JPEG de até 5 MB.");
        data = { ...a, createdAt: db.meta.clock };
        db.attachments!.push(data);
        log("attachment", a.id, "added", null, data);
        break;
      }
      case "removeAttachment": {
        const x = need(db.attachments?.find((x) => x.id === a));
        opp(x.opportunityId, false);
        db.attachments = db.attachments!.filter((x) => x.id !== a);
        log("attachment", a, "removed", x, null);
        break;
      }
      default:
        data = ecosystemCommand(db,user,command,args);
    }
    return { db, result: { ok: true, data } };
  } catch (error: any) {
    return {
      db: dbInput,
      result: {
        ok: false,
        error: {
          code: error.code || "VALIDATION",
          message: error.message || "Não foi possível concluir a operação.",
        },
      },
    };
  }
}
