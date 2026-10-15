import type { Campaign, CrmDatabase, User } from "../data/types";
const id = () => crypto.randomUUID();
const requireThat = (condition: unknown, message: string) => {
  if (!condition) throw Error(message);
};
export const campaignSnapshot = (c: Campaign) =>
  JSON.stringify([
    c.subject,
    c.messageBody,
    c.channel,
    c.targetSegment,
    c.targetRegion,
    c.attachedCatalogSkuList,
    c.approvedContactIds,
    c.sourceCalendarId,
  ]);
export function audience(db: CrmDatabase, c: Campaign) {
  return db.contacts.filter((contact) => {
    const p = db.companies.find(
      (x) => x.id === contact.companyId,
    )?.segmentProfile;
    return (
      p?.confidence === "confirmed" &&
      p.qualificationStatus === "confirmed" &&
      [p.mainSegment, ...p.additionalSegments].includes(c.targetSegment) &&
      p.region === c.targetRegion &&
      !contact.doNotContact &&
      !contact.unsubscribedFromMarketing &&
      (c.channel === "email"
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)
        : !!contact.whatsappMockId)
    );
  });
}
export function ecosystemCommand(
  db: CrmDatabase,
  user: User,
  command: string,
  args: any[],
) {
  const [a] = args;
  const log = (entityId: string, action: string, after: any) =>
    db.activities.push({
      id: id(),
      entityType: "settings",
      entityId,
      actorId: user.id,
      action,
      before: null,
      after: structuredClone(after),
      createdAt: db.meta.clock,
    });
  if (command === "dispatchOrderToErp") {
    requireThat(
      ["manager", "seller", "admin"].includes(user.role),
      "Perfil sem permissão comercial.",
    );
    const q = db.quotes.find((x) => x.id === a),
      v = db.quoteVersions.find((x) => x.id === q?.publishedVersionId),
      o = db.opportunities.find((x) => x.id === q?.opportunityId);
    requireThat(
      o && (user.role !== "seller" || o.ownerId === user.id),
      "Sem acesso à oportunidade.",
    );
    requireThat(
      o?.stage === "won" && v?.status === "accepted",
      "Confirme o ganho e o aceite antes do pedido.",
    );
    const previous = db.erpOrderSyncs.find((x) => x.quoteId === a);
    if (previous) {
      requireThat(
        previous.status === "confirmed",
        "Pedido pendente de conferência; não será reenviado automaticamente.",
      );
      return previous;
    }
    requireThat(
      db.integrations.find((x) => x.channel === "erp")?.state === "connected",
      "ERP desconectado.",
    );
    const timeout = db.simulatedErrors.erpTimeout;
    const sync = {
      id: id(),
      quoteId: a,
      opportunityId: o!.id,
      correlationId: id(),
      status: timeout ? ("needs_review" as const) : ("confirmed" as const),
      erpOrderId: timeout ? undefined : "DEMO-" + id().slice(0, 8),
      dispatchedAt: db.meta.clock,
      confirmedAt: timeout ? undefined : db.meta.clock,
      errorMessage: timeout
        ? "Timeout simulado. Conferir antes de repetir."
        : undefined,
    };
    db.erpOrderSyncs.push(sync);
    o!.erpSyncStatus = sync.status;
    o!.erpOrderId = sync.erpOrderId;
    log(sync.id, "erp_simulated", sync);
    return sync;
  }
  requireThat(
    ["manager", "admin"].includes(user.role),
    "Campanhas e inteligência são restritas à gestão.",
  );
  const create = (input: Partial<Campaign>) => {
    requireThat(
      input.title?.trim() &&
        input.messageBody?.trim() &&
        input.targetSegment?.trim() &&
        input.targetRegion?.trim(),
      "Informe título, mensagem, segmento e região.",
    );
    requireThat(
      ["email", "whatsapp"].includes(input.channel || ""),
      "Canal inválido.",
    );
    const c: Campaign = {
      id: id(),
      title: input.title!,
      objective: input.objective || "",
      targetSegment: input.targetSegment!,
      targetRegion: input.targetRegion!,
      channel: input.channel!,
      subject: input.subject || "",
      messageBody: input.messageBody!,
      attachedCatalogSkuList: input.attachedCatalogSkuList,
      status: "draft",
      audienceCount: 0,
      excludedUnsubscribedCount: 0,
      approvedBy: null,
      approvedAt: null,
      sentCount: 0,
      responseCount: 0,
      createdOpportunitiesCount: 0,
      createdAt: db.meta.clock,
    };
    c.audienceCount = audience(db, c).length;
    db.campaigns.push(c);
    log(c.id, "campaign_created", c);
    return c;
  };
  if (command === "createCampaign") return create(a);
  if (command === "approveMarketAlert" || command === "dismissMarketAlert") {
    const alert = db.marketAlerts.find((x) => x.id === a);
    requireThat(alert, "Alerta não encontrado.");
    requireThat(alert!.status === "new", "Este alerta já foi tratado.");
    if (command === "dismissMarketAlert") {
      alert!.status = "dismissed";
      log(a, "alert_dismissed", alert);
      return alert;
    }
    const cal = db.marketCalendar.find((x) => x.id === alert!.sourceCalendarId);
    requireThat(
      cal?.status === "active" &&
        Date.parse(cal.validUntil) >= Date.parse(db.meta.clock),
      "Calendário vencido ou não aprovado.",
    );
    const campaign = create({
      title: alert!.title,
      objective: alert!.reason,
      targetSegment: alert!.eligibleSegment,
      targetRegion: alert!.eligibleRegion,
      channel: "email",
      subject: alert!.draftSubject,
      messageBody: alert!.draftMessage,
      attachedCatalogSkuList: alert!.targetProducts,
    });
    campaign.sourceCalendarId = cal!.id;
    alert!.status = "approved";
    log(a, "alert_to_draft", campaign);
    return campaign;
  }
  const c = db.campaigns.find((x) => x.id === a);
  requireThat(c, "Campanha não encontrada.");
  if (command === "approveCampaign") {
    requireThat(
      c!.status === "draft",
      "Somente rascunhos podem ser aprovados.",
    );
    const contacts = audience(db, c!);
    requireThat(
      contacts.length,
      "Nenhum contato elegível neste segmento/região.",
    );
    c!.approvedContactIds = contacts.map((x) => x.id);
    c!.audienceCount = contacts.length;
    c!.approvedBy = user.id;
    c!.approvedAt = db.meta.clock;
    c!.approvalSnapshot = campaignSnapshot(c!);
    c!.status = "scheduled";
    log(a, "campaign_approved", c);
    return c;
  }
  if (command === "executeCampaign") {
    if (c!.status === "completed") return { sent: c!.sentCount };
    requireThat(
      c!.status === "scheduled" &&
        c!.approvedBy &&
        c!.approvalSnapshot === campaignSnapshot(c!),
      "Aprovação válida é necessária.",
    );
    if (c!.sourceCalendarId) {
      const cal = db.marketCalendar.find((x) => x.id === c!.sourceCalendarId);
      requireThat(
        cal?.status === "active" &&
          Date.parse(cal.validUntil) >= Date.parse(db.meta.clock),
        "Calendário precisa de revisão antes do envio.",
      );
    }
    if (c!.attachedCatalogSkuList?.length) {
      requireThat(
        db.integrations.find((x) => x.channel === "erp")?.state ===
          "connected" && !db.simulatedErrors.erpTimeout,
        "Confirme a consulta ao estoque antes do envio.",
      );
      for (const sku of c!.attachedCatalogSkuList) {
        const stock = db.erpStock.find((x) => x.sku === sku);
        const age =
          Date.parse(db.meta.clock) - Date.parse(stock?.lastSyncAt || "");
        requireThat(
          stock?.erpStatus === "synced" &&
            stock.availableStock > 0 &&
            age >= 0 &&
            age <= 86400000,
          "Estoque pendente ou desatualizado para " + sku,
        );
      }
    }
    requireThat(
      db.integrations.find((x) => x.channel === c!.channel)?.state ===
        "connected",
      "Canal desconectado.",
    );
    requireThat(
      !(c!.channel === "email"
        ? db.simulatedErrors.failEmail
        : db.simulatedErrors.failWhatsApp),
      "Falha simulada: nenhum envio realizado.",
    );
    requireThat(
      c!.channel === "email",
      "Campanhas WhatsApp dependem de modelo aprovado; use e-mail nesta demonstração.",
    );
    const eligible = new Set(audience(db, c!).map((x) => x.id));
    c!.deliveries = c!.approvedContactIds!.map((contactId) => ({
      contactId,
      status: eligible.has(contactId) ? "sent" : "excluded",
    }));
    c!.sentCount = c!.deliveries.filter((x) => x.status === "sent").length;
    c!.status = "completed";
    log(a, "campaign_simulated", c!.deliveries);
    return { sent: c!.sentCount };
  }
  throw Error("Comando não reconhecido.");
}
