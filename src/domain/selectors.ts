import type {
  CrmDatabase,
  Opportunity,
  User,
  QuoteVersion,
} from "../data/types";
export const terminal = (o: Opportunity) => ["won", "lost"].includes(o.stage);
export function canSee(
  o: { ownerId?: string | null; technicalOwnerId?: string | null },
  u: User,
) {
  return (
    u.active &&
    (["manager", "admin"].includes(u.role) ||
      (u.role === "seller"
        ? !o.ownerId || o.ownerId === u.id
        : o.technicalOwnerId === u.id))
  );
}
export function scopedDatabase(db: CrmDatabase, user: User): CrmDatabase {
  if (["manager", "admin"].includes(user.role))
    return {
      ...db,
      notifications: db.notifications.filter((n) => n.recipientId === user.id),
    };
  const opportunities = db.opportunities.filter((o) => canSee(o, user));
  const ids = new Set(opportunities.map((o) => o.id));
  const leads = db.leads.filter(
    (l) => user.role === "seller" && canSee(l, user),
  );
  const conversations = db.conversations.filter(
    (c) => canSee(c, user) || (!!c.opportunityId && ids.has(c.opportunityId)),
  );
  const contactIds = new Set([
    ...opportunities.map((o) => o.contactId),
    ...leads.map((l) => l.contactId),
    ...conversations.map((c) => c.contactId),
  ]);
  const contacts = db.contacts.filter(
    (c) => contactIds.has(c.id) || c.createdBy === user.id,
  );
  const quotes = db.quotes.filter((q) => ids.has(q.opportunityId));
  const versions = db.quoteVersions.filter((v) =>
    quotes.some((q) => q.id === v.quoteId),
  );
  const entities = new Set([
    ...ids,
    ...leads.map((l) => l.id),
    ...quotes.map((q) => q.id),
    ...conversations.map((c) => c.id),
  ]);
  return {
    ...db,
    opportunities,
    leads,
    contacts,
    companies: db.companies.filter(
      (c) =>
        contacts.some((x) => x.companyId === c.id) || c.createdBy === user.id,
    ),
    conversations,
    quotes,
    quoteVersions: versions,
    approvals: db.approvals.filter((a) =>
      versions.some((v) => v.id === a.quoteVersionId),
    ),
    messages: db.messages.filter((m) =>
      conversations.some((c) => c.id === m.conversationId),
    ),
    tasks: db.tasks.filter(
      (t) => t.ownerId === user.id || ids.has(t.opportunityId),
    ),
    activities: db.activities.filter((a) => entities.has(a.entityId)),
    notifications: db.notifications.filter((n) => n.recipientId === user.id),
    attachments: (db.attachments || []).filter((a) => ids.has(a.opportunityId)),
    receipts: {},
    automationRuns: [],
    touchpoints: db.touchpoints.filter(t=>contactIds.has(t.contactId)),
    campaigns: [], marketAlerts: [],
    erpOrderSyncs: db.erpOrderSyncs.filter(s=>ids.has(s.opportunityId)),
  };
}
export function published(
  db: CrmDatabase,
  quoteId: string,
): QuoteVersion | undefined {
  const q = db.quotes.find((q) => q.id === quoteId);
  return db.quoteVersions.find((v) => v.id === q?.publishedVersionId);
}
export function opportunityValue(db: CrmDatabase, o: Opportunity) {
  const versions = db.quotes
    .filter((q) => q.opportunityId === o.id)
    .map((q) => published(db, q.id))
    .filter(Boolean) as QuoteVersion[];
  const v = versions.sort(
    (a, b) => Date.parse(b.sentAt || "") - Date.parse(a.sentAt || ""),
  )[0];
  return v?.totalCents ?? o.estimatedValueCents;
}
export interface Filters {
  owner?: string;
  source?: string;
  period?: string;
}
function periodStart(db: CrmDatabase, f: Filters) {
  const now = Date.parse(db.meta.clock);
  const localDate = new Date(now - 3 * 3600000);
  const start =
    f.period === "today"
      ? Date.parse(localDate.toISOString().slice(0, 10) + "T00:00:00-03:00")
      : f.period === "week"
        ? now - 7 * 86400000
        : f.period === "month"
          ? Date.parse(
              localDate.toISOString().slice(0, 7) + "-01T00:00:00-03:00",
            )
          : -Infinity;
  return start;
}
export function selectOpportunities(db: CrmDatabase, f: Filters = {}) {
  const start = periodStart(db, f);
  return db.opportunities.filter(
    (o) =>
      (!f.owner || f.owner === "all" || o.ownerId === f.owner) &&
      (!f.source ||
        f.source === "all" ||
        db.leads.some(
          (l) => l.convertedOpportunityId === o.id && l.source === f.source,
        )) &&
      Date.parse((terminal(o) ? o.closedAt : o.createdAt) || o.createdAt) >=
        start,
  );
}
export function metricsFor(db: CrmDatabase, f: Filters = {}) {
  const opps = selectOpportunities(db, f),
    open = opps.filter((o) => !terminal(o)),
    won = opps.filter((o) => o.stage === "won"),
    lost = opps.filter((o) => o.stage === "lost");
  const ids = new Set(opps.map((o) => o.id));
  const leads = db.leads.filter(
    (l) =>
      (!f.owner || f.owner === "all" || l.ownerId === f.owner) &&
      (!f.source || f.source === "all" || l.source === f.source) &&
      Date.parse(l.createdAt) >= periodStart(db, f),
  );
  const leadIds = new Set(leads.map((l) => l.id)),
    contactIds = new Set(leads.map((l) => l.contactId));
  const includesConversation = (c: CrmDatabase["conversations"][number]) =>
    c.opportunityId ? ids.has(c.opportunityId) : contactIds.has(c.contactId);
  const firstReplies = db.conversations
    .filter(includesConversation)
    .flatMap((c) => {
      const ms = db.messages
        .filter(
          (m) => m.conversationId === c.id && m.channel !== "internal_note",
        )
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      const inbound = ms.find((m) => m.direction === "inbound");
      const reply =
        inbound &&
        ms.find(
          (m) =>
            m.direction === "outbound" &&
            ["sent", "delivered", "read"].includes(m.deliveryStatus) &&
            Date.parse(m.createdAt) >= Date.parse(inbound.createdAt),
        );
      return inbound && reply
        ? [
            (Date.parse(reply.createdAt) - Date.parse(inbound.createdAt)) /
              60000,
          ]
        : [];
    });
  return {
    openOpportunities: open.length,
    openValueCents: open.reduce(
      (s, o) => s + (opportunityValue(db, o) ?? 0),
      0,
    ),
    unknownValues: open.filter((o) => opportunityValue(db, o) == null).length,
    wonOpportunities: won.length,
    wonValueCents: won.reduce((s, o) => s + (opportunityValue(db, o) ?? 0), 0),
    lostOpportunities: lost.length,
    closedWinRate:
      won.length + lost.length ? won.length / (won.length + lost.length) : null,
    overdueTasks: db.tasks.filter(
      (t) =>
        (t.opportunityId
          ? ids.has(t.opportunityId)
          : leadIds.has(t.leadId || "")) &&
        t.status === "open" &&
        Date.parse(t.dueAt) < Date.parse(db.meta.clock),
    ).length,
    unassignedLeads: leads.filter((l) => !l.ownerId).length,
    pendingResponses: db.conversations.filter(
      (c) => c.state === "waiting_team" && includesConversation(c),
    ).length,
    firstResponseMinutes: firstReplies.length
      ? firstReplies.reduce((a, b) => a + b, 0) / firstReplies.length
      : null,
  };
}
export function whatsappOpen(db: CrmDatabase, conversationId: string) {
  const dates = db.messages
    .filter(
      (m) =>
        m.conversationId === conversationId &&
        m.channel === "whatsapp" &&
        m.direction === "inbound",
    )
    .map((m) => Date.parse(m.createdAt));
  return (
    dates.length > 0 &&
    Date.parse(db.meta.clock) - Math.max(...dates) < 86400000
  );
}
export function assistantInsight(db: CrmDatabase, conversationId: string) {
  const c = db.conversations.find((c) => c.id === conversationId);
  if (!c || ["off", "paused"].includes(c.aiMode)) return null;
  const docs = db.knowledgeDocuments.filter((d) => d.status === "approved");
  const body =
    db.messages
      .filter((m) => m.conversationId === c.id && m.direction === "inbound" && m.channel !== "internal_note")
      .at(-1)?.body || "";
  const contact=db.contacts.find(x=>x.id===c.contactId);
  const profile=db.companies.find(x=>x.id===contact?.companyId)?.segmentProfile;
  const pendingSegment=!profile?.mainSegment || profile.confidence !== "confirmed";
  const technical = /sem refer[eê]ncia|como identificamos|compat[ií]vel/i.test(
    body,
  );
  return {
    status: technical ? "need_human" : "ready",
    reason: body
      ? `Última solicitação: ${body}`
      : "Aguardando informações do comprador.",
    actionRequired: pendingSegment ? "Prioridade: confirmar o segmento do cliente e sua região de atuação." : technical
      ? "Confirmar aplicação com apoio técnico."
      : "Conferir referência, quantidade, prazo e destino antes de cotar.",
    citedDoc:
      docs.map((d) => `${d.id} · ${d.title} · v${d.version}`).join("; ") ||
      "Nenhuma fonte aprovada. Solicitar revisão humana.",
    suggestedDraft: !docs.length
      ? ""
      : technical
        ? "Pode enviar a referência ou uma foto da peça? Nossa equipe técnica precisa confirmar a aplicação."
        : pendingSegment ? "Para direcionar o atendimento, em qual segmento vocês atuam — cana, grãos ou outro? E em qual região?" : /desconto|8%/i.test(body)
          ? "Vou conferir as condições solicitadas e, se necessário, encaminhar para aprovação do gestor."
          : "Pode confirmar a referência, a quantidade e o destino de entrega para prepararmos sua cotação?",
  };
}
