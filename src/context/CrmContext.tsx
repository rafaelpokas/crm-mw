import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  CrmDatabase,
  User,
  Company,
  Contact,
  Lead,
  Opportunity,
  Product,
  Quote,
  QuoteVersion,
  Approval,
  Conversation,
  Message,
  Task,
  Activity,
  KnowledgeDocument,
  NotificationItem,
  LeadSource,
  OpportunityStage,
  DeliveryStatus,
  QuoteStatus,
  CompanySegmentProfile,
  Touchpoint,
  ErpStockItem,
  ErpOrderSync,
  MarketCalendarItem,
  MarketIntelligenceAlert,
  Campaign
} from '../data/types';
import { INITIAL_CRM_DATA } from '../data/seedData';
import { calculateLineNet, calculateQuoteTotals } from '../utils/calculations';

interface CommandResult<T = any> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
  };
}

interface CrmContextType {
  db: CrmDatabase;
  currentUser: User;
  setCurrentUserId: (id: string) => void;
  latencyEnabled: boolean;
  setLatencyEnabled: (enabled: boolean) => void;
  simulatedErrors: { failWhatsApp: boolean; failEmail: boolean; erpTimeout: boolean };
  setSimulatedError: (key: 'failWhatsApp' | 'failEmail' | 'erpTimeout', val: boolean) => void;

  // Lead & Multi-channel capture
  createLead: (params: {
    name: string;
    email: string;
    whatsappMockId: string;
    companyName?: string;
    interest?: string;
    source?: LeadSource;
    eventId?: string;
    campaign?: string;
    segment?: string;
    region?: string;
    catalogContext?: {
      machineModel?: string;
      selectedItems?: { sku: string; quantity: number }[];
    };
  }) => Promise<CommandResult<{ lead: Lead; opportunity?: Opportunity; touchpoint?: Touchpoint }>>;

  simulateCatalogSubmission: (params: {
    contactEmail: string;
    contactName: string;
    contactWa: string;
    machineModel: string;
    selectedItems: { sku: string; quantity: number }[];
  }) => Promise<CommandResult<{ lead: Lead; opportunity: Opportunity }>>;

  // Segment qualification
  updateCompanySegmentProfile: (companyId: string, profile: Partial<CompanySegmentProfile>) => Promise<CommandResult<CompanySegmentProfile>>;

  // Opportunities & Funnel
  assignOwner: (opportunityId: string, newOwnerId: string) => Promise<CommandResult>;
  moveOpportunity: (opportunityId: string, newStage: OpportunityStage, lostReason?: string) => Promise<CommandResult>;

  // Quotes
  saveQuoteDraft: (quoteVersionId: string, updates: Partial<QuoteVersion>) => Promise<CommandResult<QuoteVersion>>;
  requestApproval: (quoteVersionId: string, reason: string) => Promise<CommandResult<Approval>>;
  decideApproval: (approvalId: string, approved: boolean, note?: string) => Promise<CommandResult>;
  createQuoteForOpportunity: (opportunityId: string) => Promise<CommandResult<{ quote: Quote; version: QuoteVersion }>>;
  reviseQuote: (quoteId: string) => Promise<CommandResult<QuoteVersion>>;
  sendQuote: (quoteVersionId: string, channels: ('whatsapp' | 'email')[], retryChannel?: 'whatsapp' | 'email') => Promise<CommandResult>;
  acceptQuote: (quoteVersionId: string) => Promise<CommandResult>;
  rejectQuote: (quoteVersionId: string, reason?: string) => Promise<CommandResult>;

  // ERP Bidirectional Sync
  queryErpStock: (sku: string) => Promise<CommandResult<ErpStockItem>>;
  dispatchOrderToErp: (quoteId: string) => Promise<CommandResult<ErpOrderSync>>;

  // Communication & Chat
  sendChatMessage: (conversationId: string, channel: 'whatsapp' | 'email' | 'internal_note', body: string, isTemplate?: boolean) => Promise<CommandResult<Message>>;
  receiveInboundMessage: (conversationId: string, channel: 'whatsapp' | 'email', body: string, providerEventId?: string) => Promise<CommandResult<Message>>;

  // Market Intelligence & Campaigns (RD Station Replacement)
  approveMarketAlert: (alertId: string) => Promise<CommandResult<Campaign>>;
  dismissMarketAlert: (alertId: string) => Promise<CommandResult>;
  createCampaign: (campaign: Omit<Campaign, 'id' | 'createdAt' | 'sentCount' | 'responseCount' | 'createdOpportunitiesCount' | 'status'>) => Promise<CommandResult<Campaign>>;
  approveCampaign: (campaignId: string) => Promise<CommandResult<Campaign>>;
  executeCampaign: (campaignId: string) => Promise<CommandResult<{ sent: number }>>;
  unsubscribeContact: (contactId: string) => Promise<CommandResult>;

  // Tasks
  completeTask: (taskId: string) => Promise<CommandResult>;
  createTask: (params: { opportunityId: string; title: string; dueAt: string; type?: Task['type'] }) => Promise<CommandResult<Task>>;

  // System & Scenarios
  advanceClock: (days: number) => Promise<CommandResult>;
  resetDemo: () => void;
  executeScenario: (scenarioId: string) => Promise<CommandResult>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Derived metrics
  metrics: {
    openOpportunities: number;
    openValueCents: number;
    wonOpportunities: number;
    wonValueCents: number;
    lostOpportunities: number;
    closedWinRate: number | null;
    overdueTasks: number;
    unassignedLeads: number;
    segmentCoverageRate: number;
    activeCampaignsCount: number;
    erpSyncPendingCount: number;
  };
}

const STORAGE_KEY = 'megawhip_crm_db_v2';

const CrmContext = createContext<CrmContextType | undefined>(undefined);

export const CrmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<CrmDatabase>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.meta?.schemaVersion === 1 && parsed?.erpStock) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse CRM state from localStorage', e);
    }
    return INITIAL_CRM_DATA;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => db.meta.defaultUserId || 'U002');
  const [latencyEnabled, setLatencyEnabled] = useState<boolean>(true);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Failed to persist to localStorage', e);
    }
  }, [db]);

  const currentUser = useMemo(() => {
    return db.users.find(u => u.id === currentUserId) || db.users[1];
  }, [db.users, currentUserId]);

  const delay = async (ms?: number) => {
    if (!latencyEnabled) return;
    const time = ms ?? db.rules.defaultLatencyMs ?? 400;
    return new Promise(resolve => setTimeout(resolve, time));
  };

  const setSimulatedError = (key: 'failWhatsApp' | 'failEmail' | 'erpTimeout', val: boolean) => {
    setDb(prev => ({
      ...prev,
      simulatedErrors: {
        ...prev.simulatedErrors,
        [key]: val
      }
    }));
  };

  const markNotificationRead = (id: string) => {
    setDb(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    }));
  };

  const markAllNotificationsRead = () => {
    setDb(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true }))
    }));
  };

  const logActivity = (
    entityType: Activity['entityType'],
    entityId: string,
    action: string,
    before: any,
    after: any
  ): Activity => {
    return {
      id: `EV${String(Date.now()).slice(-6)}`,
      entityType,
      entityId,
      actorId: currentUser.id,
      action,
      before,
      after,
      createdAt: db.meta.clock,
      correlationId: `act-${Date.now()}`
    };
  };

  const getNextActiveSellerId = (state: CrmDatabase): string => {
    const sellers = state.users.filter(u => u.active && u.role === 'seller');
    if (sellers.length === 0) return 'U001';
    const counts = sellers.map(s => ({
      seller: s,
      count: state.leads.filter(l => l.ownerId === s.id).length
    }));
    counts.sort((a, b) => a.count - b.count);
    return counts[0].seller.id;
  };

  // --- COMMAND: Create Lead (Multi-source & Returning Customer Recognition) ---
  const createLead = async (params: {
    name: string;
    email: string;
    whatsappMockId: string;
    companyName?: string;
    interest?: string;
    source?: LeadSource;
    eventId?: string;
    campaign?: string;
    segment?: string;
    region?: string;
    catalogContext?: {
      machineModel?: string;
      selectedItems?: { sku: string; quantity: number }[];
    };
  }): Promise<CommandResult<{ lead: Lead; opportunity?: Opportunity; touchpoint?: Touchpoint }>> => {
    await delay();

    if (!params.name.trim()) {
      return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Nome do comprador é obrigatório.' } };
    }
    if (!params.email.trim() && !params.whatsappMockId.trim()) {
      return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Informe pelo menos um meio de contato (E-mail ou WhatsApp).' } };
    }

    const normEmail = params.email.trim().toLowerCase();
    const normWa = params.whatsappMockId.trim();

    // Idempotency check: verify eventId in automationRuns or touchpoints
    if (params.eventId) {
      const alreadyRun = db.automationRuns.some(r => r.eventKey === params.eventId);
      if (alreadyRun) {
        return {
          ok: true,
          data: {
            lead: db.leads[0],
            opportunity: db.opportunities[0]
          }
        };
      }
    }

    // Check returning customer by email or whatsapp
    let existingContact = db.contacts.find(c =>
      (normEmail && c.email.toLowerCase() === normEmail) ||
      (normWa && c.whatsappMockId === normWa)
    );

    let contactId = existingContact?.id;
    let companyId = existingContact?.companyId;
    let newCompany: Company | undefined;
    let newContact: Contact | undefined;

    if (!existingContact) {
      companyId = `E${String(db.companies.length + 1).padStart(3, '0')}`;
      newCompany = {
        id: companyId,
        name: params.companyName?.trim() || `${params.name} Implementos`,
        segment: params.segment || 'Pendente de Qualificação',
        city: params.region?.split('/')[0]?.trim() || 'Cidade Demo',
        state: params.region?.split('/')[1]?.trim() || 'SP',
        document: null,
        fictitious: true,
        segmentProfile: {
          mainSegment: params.segment || 'Pendente de Qualificação',
          additionalSegments: [],
          crop: [],
          supplyChainRole: 'A confirmar',
          region: params.region || 'Região não informada',
          confirmedMachines: params.catalogContext?.machineModel ? [params.catalogContext.machineModel] : [],
          qualificationStatus: params.segment ? 'confirmed' : 'pending_segment',
          confidence: params.segment ? 'confirmed' : 'hypothesis',
          lastValidatedAt: db.meta.clock,
          validationSource: `Origem: ${params.source || 'site'}`
        }
      };

      contactId = `C${String(db.contacts.length + 1).padStart(3, '0')}`;
      newContact = {
        id: contactId,
        companyId,
        name: params.name.trim(),
        email: normEmail || `${params.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        whatsappMockId: normWa || `WA-DEMO-${String(db.contacts.length + 1).padStart(3, '0')}`,
        preferredChannel: normWa ? 'whatsapp' : 'email',
        doNotContact: false,
        unsubscribedFromMarketing: false
      };
    }

    // Register Touchpoint (Multi-touchpoint attribution)
    const newTouchpoint: Touchpoint = {
      id: `TP${String(db.touchpoints.length + 1).padStart(3, '0')}`,
      contactId: contactId!,
      companyId,
      channel: (params.source as any) || 'site',
      campaign: params.campaign || undefined,
      pageOrAd: params.source === 'catalog' ? 'Catálogo Interativo' : params.source === 'instagram' ? 'Anúncio Instagram' : params.source === 'landing_page' ? 'Landing Page Especializada' : 'Site MegaWhip',
      details: params.interest || 'Nova interação de captação',
      selectedProducts: params.catalogContext?.selectedItems,
      machineModel: params.catalogContext?.machineModel,
      createdAt: db.meta.clock
    };

    // Assign seller round-robin
    const assignedSellerId = getNextActiveSellerId(db);

    const newLeadId = `L${String(db.leads.length + 1).padStart(3, '0')}`;
    const newLead: Lead = {
      id: newLeadId,
      contactId: contactId!,
      source: params.source || 'site',
      campaign: params.campaign || null,
      interest: params.interest || 'Interesse registrado via ecossistema',
      status: 'converted',
      ownerId: assignedSellerId,
      createdAt: db.meta.clock,
      convertedOpportunityId: `O${String(db.opportunities.length + 1).padStart(3, '0')}`,
      catalogContext: params.catalogContext
    };

    const newOppId = newLead.convertedOpportunityId!;
    const newOpportunity: Opportunity = {
      id: newOppId,
      companyId: companyId!,
      contactId: contactId!,
      title: `Oportunidade - ${newCompany ? newCompany.name : (existingContact?.name || params.name)}`,
      stage: 'qualification',
      ownerId: assignedSellerId,
      estimatedValueCents: params.catalogContext?.selectedItems?.length ? 215100 : 150000,
      technicalStatus: params.catalogContext?.machineModel ? 'approved_demo' : 'pending',
      createdAt: db.meta.clock,
      stageEnteredAt: db.meta.clock,
      closedAt: null,
      lostReason: null,
      version: 1,
      erpSyncStatus: 'not_sent'
    };

    // Follow-up task (Rule A01)
    const newTask: Task = {
      id: `T${String(db.tasks.length + 1).padStart(3, '0')}`,
      opportunityId: newOppId,
      ownerId: assignedSellerId,
      type: 'qualification',
      title: !params.segment
        ? 'Realizar contato e qualificar Segmento do cliente (Pendente)'
        : `Primeiro contato sobre interesse em ${params.segment}`,
      dueAt: '2026-10-14T10:00:00-03:00',
      status: 'open',
      automationKey: `A01-${newLeadId}`
    };

    // Conversation thread
    const newConv: Conversation = {
      id: `CV${String(db.conversations.length + 1).padStart(3, '0')}`,
      contactId: contactId!,
      opportunityId: newOppId,
      ownerId: assignedSellerId,
      state: 'waiting_team',
      aiMode: 'copilot',
      lastInboundAt: db.meta.clock,
      unreadCount: 1
    };

    let inboundBody = params.interest || 'Olá! Gostaria de mais informações sobre chicotes elétricos.';
    if (params.catalogContext?.machineModel) {
      inboundBody = `[Entrada pelo Catálogo] Máquina: ${params.catalogContext.machineModel}. Itens selecionados: ${params.catalogContext.selectedItems?.map(i => `${i.quantity}x ${i.sku}`).join(', ')}`;
    }

    const newMsg: Message = {
      id: `M${String(db.messages.length + 1).padStart(3, '0')}`,
      conversationId: newConv.id,
      channel: params.source === 'whatsapp' ? 'whatsapp' : 'email',
      direction: 'inbound',
      authorId: null,
      body: inboundBody,
      deliveryStatus: 'received',
      createdAt: db.meta.clock,
      quoteVersionId: null,
      clientRequestId: null,
      providerEventId: params.eventId || `evt-${Date.now()}`
    };

    const newNotification: NotificationItem = {
      id: `N${Date.now()}`,
      recipientId: assignedSellerId,
      title: `Novo Lead (${params.source || 'captação'})`,
      message: `${params.name} foi atribuído a você. ${!params.segment ? '⚠️ Segmento pendente de qualificação.' : `Segmento: ${params.segment}.`}`,
      linkRoute: `/oportunidades/${newOppId}`,
      read: false,
      createdAt: db.meta.clock
    };

    setDb(prev => ({
      ...prev,
      companies: newCompany ? [...prev.companies, newCompany] : prev.companies,
      contacts: newContact ? [...prev.contacts, newContact] : prev.contacts,
      touchpoints: [...prev.touchpoints, newTouchpoint],
      leads: [...prev.leads, newLead],
      opportunities: [...prev.opportunities, newOpportunity],
      tasks: [...prev.tasks, newTask],
      conversations: [...prev.conversations, newConv],
      messages: [...prev.messages, newMsg],
      notifications: [...prev.notifications, newNotification],
      activities: [
        ...prev.activities,
        logActivity('lead', newLead.id, 'created', null, {
          source: newLead.source,
          campaign: params.campaign,
          hasSegment: !!params.segment
        })
      ],
      automationRuns: params.eventId ? [
        ...prev.automationRuns,
        {
          id: `RUN-${Date.now()}`,
          ruleId: 'A01',
          entityId: newLead.id,
          eventKey: params.eventId,
          status: 'success',
          reason: 'Lead distribuído com sucesso por round-robin e touchpoint gravado',
          createdAt: prev.meta.clock
        }
      ] : prev.automationRuns
    }));

    return {
      ok: true,
      data: {
        lead: newLead,
        opportunity: newOpportunity,
        touchpoint: newTouchpoint
      }
    };
  };

  // --- COMMAND: Simulate Catalog Submission (Sections 3 & 13) ---
  const simulateCatalogSubmission = async (params: {
    contactEmail: string;
    contactName: string;
    contactWa: string;
    machineModel: string;
    selectedItems: { sku: string; quantity: number }[];
  }): Promise<CommandResult<{ lead: Lead; opportunity: Opportunity }>> => {
    return await createLead({
      name: params.contactName,
      email: params.contactEmail,
      whatsappMockId: params.contactWa,
      source: 'catalog',
      interest: `Solicitação via catálogo para ${params.machineModel}`,
      catalogContext: {
        machineModel: params.machineModel,
        selectedItems: params.selectedItems
      }
    }) as any;
  };

  // --- COMMAND: Update Company Segment Profile (Section 13) ---
  const updateCompanySegmentProfile = async (
    companyId: string,
    profileUpdates: Partial<CompanySegmentProfile>
  ): Promise<CommandResult<CompanySegmentProfile>> => {
    await delay();
    const comp = db.companies.find(c => c.id === companyId);
    if (!comp) return { ok: false, error: { code: 'NOT_FOUND', message: 'Empresa não encontrada.' } };

    const currentProfile: CompanySegmentProfile = comp.segmentProfile || {
      mainSegment: comp.segment || 'Pendente',
      additionalSegments: [],
      crop: [],
      supplyChainRole: 'A confirmar',
      region: `${comp.city} / ${comp.state}`,
      confirmedMachines: [],
      qualificationStatus: 'pending_segment',
      confidence: 'hypothesis'
    };

    const updatedProfile: CompanySegmentProfile = {
      ...currentProfile,
      ...profileUpdates,
      lastValidatedAt: db.meta.clock,
      validationSource: `Atualizado por ${currentUser.name}`
    };

    setDb(prev => ({
      ...prev,
      companies: prev.companies.map(c => c.id === companyId ? {
        ...c,
        segment: updatedProfile.mainSegment,
        segmentProfile: updatedProfile
      } : c),
      activities: [
        ...prev.activities,
        logActivity('lead', companyId, 'segment_profile_updated', currentProfile, updatedProfile)
      ]
    }));

    return { ok: true, data: updatedProfile };
  };

  // --- COMMAND: ERP Live Stock Query (Section 8) ---
  const queryErpStock = async (sku: string): Promise<CommandResult<ErpStockItem>> => {
    await delay(300);

    if (db.simulatedErrors.erpTimeout) {
      return {
        ok: false,
        error: {
          code: 'ERP_TIMEOUT',
          message: 'Timeout ao consultar API do ERP COBOL/Delphi. Verifique conexão com o serviço legado.'
        }
      };
    }

    const item = db.erpStock.find(s => s.sku === sku);
    if (!item) {
      return { ok: false, error: { code: 'NOT_FOUND', message: `SKU ${sku} não cadastrado na base oficial do ERP.` } };
    }

    return { ok: true, data: item };
  };

  // --- COMMAND: Dispatch Order to ERP (Section 8 - Post Won) ---
  const dispatchOrderToErp = async (quoteId: string): Promise<CommandResult<ErpOrderSync>> => {
    await delay(600);

    const quote = db.quotes.find(q => q.id === quoteId);
    if (!quote) return { ok: false, error: { code: 'NOT_FOUND', message: 'Cotação não encontrada.' } };

    const opp = db.opportunities.find(o => o.id === quote.opportunityId);
    if (!opp || opp.stage !== 'won') {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Apenas negociações formalmente GANHAS podem ter pedidos despachados para o ERP.'
        }
      };
    }

    if (db.simulatedErrors.erpTimeout) {
      const failedSync: ErpOrderSync = {
        id: `SYNC-${Date.now()}`,
        quoteId,
        opportunityId: opp.id,
        status: 'failed',
        errorMessage: 'Timeout de conexão com o ERP COBOL. Pedido retido para conferência e reenvio.',
        dispatchedAt: db.meta.clock,
        correlationId: `corr-${Date.now()}`
      };

      setDb(prev => ({
        ...prev,
        erpOrderSyncs: [...prev.erpOrderSyncs, failedSync],
        opportunities: prev.opportunities.map(o => o.id === opp.id ? { ...o, erpSyncStatus: 'failed' } : o)
      }));

      return { ok: false, error: { code: 'ERP_TIMEOUT', message: failedSync.errorMessage || '' } };
    }

    const newErpOrderId = `ERP-PED-2026-${String(Math.floor(100 + Math.random() * 900))}`;
    const confirmedSync: ErpOrderSync = {
      id: `SYNC-${Date.now()}`,
      quoteId,
      opportunityId: opp.id,
      erpOrderId: newErpOrderId,
      status: 'confirmed',
      dispatchedAt: db.meta.clock,
      confirmedAt: db.meta.clock,
      correlationId: `corr-${Date.now()}`
    };

    setDb(prev => ({
      ...prev,
      erpOrderSyncs: [...prev.erpOrderSyncs, confirmedSync],
      opportunities: prev.opportunities.map(o => o.id === opp.id ? {
        ...o,
        erpSyncStatus: 'confirmed',
        erpOrderId: newErpOrderId
      } : o),
      activities: [
        ...prev.activities,
        logActivity('erp', newErpOrderId, 'order_confirmed', null, { quoteId, oppId: opp.id })
      ]
    }));

    return { ok: true, data: confirmedSync };
  };

  // --- COMMAND: Market Intelligence Alerts & Approval (Section 13) ---
  const approveMarketAlert = async (alertId: string): Promise<CommandResult<Campaign>> => {
    await delay();
    const alert = db.marketAlerts.find(a => a.id === alertId);
    if (!alert) return { ok: false, error: { code: 'NOT_FOUND', message: 'Alerta não encontrado.' } };

    // Turn alert into an approved Campaign
    const newCampaign: Campaign = {
      id: `CMP-${String(db.campaigns.length + 1).padStart(3, '0')}`,
      title: alert.title,
      objective: alert.reason,
      targetSegment: alert.eligibleSegment,
      targetRegion: alert.eligibleRegion,
      channel: 'email',
      status: 'scheduled',
      audienceCount: alert.targetAudienceCount,
      excludedUnsubscribedCount: 0,
      subject: alert.draftSubject,
      messageBody: alert.draftMessage,
      attachedCatalogSkuList: alert.targetProducts,
      approvedBy: currentUser.id,
      approvedAt: db.meta.clock,
      scheduledFor: '2026-10-15T09:00:00-03:00',
      sentCount: 0,
      responseCount: 0,
      createdOpportunitiesCount: 0,
      createdAt: db.meta.clock
    };

    setDb(prev => ({
      ...prev,
      marketAlerts: prev.marketAlerts.map(a => a.id === alertId ? { ...a, status: 'approved' } : a),
      campaigns: [...prev.campaigns, newCampaign],
      activities: [
        ...prev.activities,
        logActivity('market_alert', alertId, 'alert_approved_as_campaign', null, { campaignId: newCampaign.id })
      ]
    }));

    return { ok: true, data: newCampaign };
  };

  const dismissMarketAlert = async (alertId: string): Promise<CommandResult> => {
    await delay();
    setDb(prev => ({
      ...prev,
      marketAlerts: prev.marketAlerts.map(a => a.id === alertId ? { ...a, status: 'dismissed' } : a)
    }));
    return { ok: true };
  };

  // --- COMMAND: Campaigns (RD Station Replacement) ---
  const createCampaign = async (
    campaignData: Omit<Campaign, 'id' | 'createdAt' | 'sentCount' | 'responseCount' | 'createdOpportunitiesCount' | 'status'>
  ): Promise<CommandResult<Campaign>> => {
    await delay();
    const newCamp: Campaign = {
      ...campaignData,
      id: `CMP-${String(db.campaigns.length + 1).padStart(3, '0')}`,
      status: 'draft',
      sentCount: 0,
      responseCount: 0,
      createdOpportunitiesCount: 0,
      createdAt: db.meta.clock
    };

    setDb(prev => ({
      ...prev,
      campaigns: [...prev.campaigns, newCamp]
    }));

    return { ok: true, data: newCamp };
  };

  const approveCampaign = async (campaignId: string): Promise<CommandResult<Campaign>> => {
    await delay();
    const camp = db.campaigns.find(c => c.id === campaignId);
    if (!camp) return { ok: false, error: { code: 'NOT_FOUND', message: 'Campanha não encontrada.' } };

    const updated: Campaign = {
      ...camp,
      status: 'scheduled',
      approvedBy: currentUser.id,
      approvedAt: db.meta.clock
    };

    setDb(prev => ({
      ...prev,
      campaigns: prev.campaigns.map(c => c.id === campaignId ? updated : c),
      activities: [
        ...prev.activities,
        logActivity('campaign', campaignId, 'approved', null, { approvedBy: currentUser.id })
      ]
    }));

    return { ok: true, data: updated };
  };

  const executeCampaign = async (campaignId: string): Promise<CommandResult<{ sent: number }>> => {
    await delay();
    const camp = db.campaigns.find(c => c.id === campaignId);
    if (!camp) return { ok: false, error: { code: 'NOT_FOUND', message: 'Campanha não encontrada.' } };

    // Check eligible contacts in segment, excluding unsubscribed/doNotContact
    const eligibleCompanies = db.companies.filter(c =>
      c.segmentProfile?.mainSegment === camp.targetSegment ||
      c.segmentProfile?.additionalSegments.includes(camp.targetSegment)
    );
    const eligibleCompanyIds = eligibleCompanies.map(c => c.id);

    const targetContacts = db.contacts.filter(ct =>
      eligibleCompanyIds.includes(ct.companyId) &&
      !ct.doNotContact &&
      !ct.unsubscribedFromMarketing
    );

    const sentCount = targetContacts.length || 1;

    setDb(prev => ({
      ...prev,
      campaigns: prev.campaigns.map(c => c.id === campaignId ? {
        ...c,
        status: 'completed',
        sentCount
      } : c),
      activities: [
        ...prev.activities,
        logActivity('campaign', campaignId, 'executed', null, { sentCount })
      ]
    }));

    return { ok: true, data: { sent: sentCount } };
  };

  const unsubscribeContact = async (contactId: string): Promise<CommandResult> => {
    await delay();
    setDb(prev => ({
      ...prev,
      contacts: prev.contacts.map(c => c.id === contactId ? {
        ...c,
        unsubscribedFromMarketing: true
      } : c),
      activities: [
        ...prev.activities,
        logActivity('lead', contactId, 'unsubscribed_from_marketing', null, { contactId })
      ]
    }));
    return { ok: true };
  };

  // --- COMMAND: Assign Owner ---
  const assignOwner = async (opportunityId: string, newOwnerId: string): Promise<CommandResult> => {
    await delay();
    const opp = db.opportunities.find(o => o.id === opportunityId);
    if (!opp) return { ok: false, error: { code: 'NOT_FOUND', message: 'Oportunidade não encontrada.' } };

    if (currentUser.role === 'seller' && opp.ownerId !== null && opp.ownerId !== currentUser.id) {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Apenas gestores podem transferir negociações de outros vendedores.' } };
    }

    setDb(prev => ({
      ...prev,
      opportunities: prev.opportunities.map(o => o.id === opportunityId ? { ...o, ownerId: newOwnerId } : o),
      activities: [
        ...prev.activities,
        logActivity('opportunity', opportunityId, 'reassigned', { ownerId: opp.ownerId }, { ownerId: newOwnerId })
      ]
    }));

    return { ok: true };
  };

  // --- COMMAND: Move Opportunity ---
  const moveOpportunity = async (opportunityId: string, newStage: OpportunityStage, lostReason?: string): Promise<CommandResult> => {
    await delay();
    const opp = db.opportunities.find(o => o.id === opportunityId);
    if (!opp) return { ok: false, error: { code: 'NOT_FOUND', message: 'Oportunidade não encontrada.' } };

    if (opp.stage === newStage) return { ok: true };

    if (newStage === 'won') {
      const quote = db.quotes.find(q => q.opportunityId === opportunityId);
      if (!quote) {
        return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Para marcar como Ganho, é obrigatório existir uma cotação aceita.' } };
      }
      const currentVer = db.quoteVersions.find(v => v.id === quote.currentVersionId);
      if (!currentVer || currentVer.status !== 'accepted') {
        return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'A cotação vigente desta oportunidade ainda não foi formalmente aceita pelo cliente.' } };
      }
    }

    if (newStage === 'lost') {
      if (!lostReason || !lostReason.trim()) {
        return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'O motivo da perda é obrigatório (ex: Preço, Prazo, Concorrente, Projeto cancelado).' } };
      }
    }

    setDb(prev => {
      const updatedTasks = newStage === 'won' || newStage === 'lost'
        ? prev.tasks.map(t => t.opportunityId === opportunityId && t.status === 'open' ? { ...t, status: 'completed' as const } : t)
        : prev.tasks;

      return {
        ...prev,
        opportunities: prev.opportunities.map(o => {
          if (o.id === opportunityId) {
            return {
              ...o,
              stage: newStage,
              stageEnteredAt: prev.meta.clock,
              closedAt: (newStage === 'won' || newStage === 'lost') ? prev.meta.clock : null,
              lostReason: newStage === 'lost' ? (lostReason || null) : null,
              version: o.version + 1,
              erpSyncStatus: newStage === 'won' ? 'waiting_dispatch' : o.erpSyncStatus
            };
          }
          return o;
        }),
        tasks: updatedTasks,
        activities: [
          ...prev.activities,
          logActivity('opportunity', opportunityId, 'stage_changed', { stage: opp.stage }, { stage: newStage, lostReason })
        ]
      };
    });

    return { ok: true };
  };

  // --- COMMAND: Create Quote for Opportunity ---
  const createQuoteForOpportunity = async (opportunityId: string): Promise<CommandResult<{ quote: Quote; version: QuoteVersion }>> => {
    await delay();
    const opp = db.opportunities.find(o => o.id === opportunityId);
    if (!opp) return { ok: false, error: { code: 'NOT_FOUND', message: 'Oportunidade não encontrada.' } };

    const quoteId = `Q${String(db.quotes.length + 1).padStart(3, '0')}`;
    const quoteNumber = `MW-DEMO-2026-${String(db.quotes.length + 1).padStart(3, '0')}`;
    const versionId = `${quoteId}-V1`;

    const newVersion: QuoteVersion = {
      id: versionId,
      quoteId,
      revision: 1,
      status: 'draft',
      approvalStatus: 'not_required',
      lines: [
        {
          productId: 'P001',
          skuSnapshot: 'DEMO-MW-001',
          nameSnapshot: 'Chicote padrão demonstrativo',
          quantity: 2,
          unitPriceCents: 85000,
          discountBps: 500,
          grossCents: 170000,
          discountCents: 8500,
          netCents: 161500
        },
        {
          productId: 'P002',
          skuSnapshot: 'DEMO-MW-002',
          nameSnapshot: 'Conector demonstrativo',
          quantity: 4,
          unitPriceCents: 12000,
          discountBps: 500,
          grossCents: 48000,
          discountCents: 2400,
          netCents: 45600
        }
      ],
      freightCents: 8000,
      freightPending: false,
      totalCents: 215100,
      validUntil: '2026-10-20T23:59:59-03:00',
      paymentTerms: 'Condição demonstrativa a confirmar',
      deliveryTerms: 'Prazo demonstrativo sujeito à validação',
      technicalApproved: true,
      createdBy: currentUser.id,
      sentAt: null,
      acceptedAt: null,
      version: 1
    };

    const newQuote: Quote = {
      id: quoteId,
      number: quoteNumber,
      opportunityId,
      currentVersionId: versionId,
      createdAt: db.meta.clock
    };

    setDb(prev => ({
      ...prev,
      quotes: [...prev.quotes, newQuote],
      quoteVersions: [...prev.quoteVersions, newVersion],
      activities: [
        ...prev.activities,
        logActivity('quote', quoteId, 'created', null, { versionId, totalCents: newVersion.totalCents })
      ]
    }));

    return { ok: true, data: { quote: newQuote, version: newVersion } };
  };

  // --- COMMAND: Save Quote Draft ---
  const saveQuoteDraft = async (quoteVersionId: string, updates: Partial<QuoteVersion>): Promise<CommandResult<QuoteVersion>> => {
    await delay();
    const ver = db.quoteVersions.find(v => v.id === quoteVersionId);
    if (!ver) return { ok: false, error: { code: 'NOT_FOUND', message: 'Versão de cotação não encontrada.' } };

    if (ver.status === 'sent' || ver.status === 'accepted') {
      return { ok: false, error: { code: 'CONFLICT', message: 'Cotação enviada ou aceita é imutável. Crie uma nova revisão para alterá-la.' } };
    }

    const newLines = updates.lines ?? ver.lines;
    const freightCents = updates.freightCents !== undefined ? updates.freightCents : ver.freightCents;
    const totals = calculateQuoteTotals(newLines, freightCents);

    let nextApprovalStatus = ver.approvalStatus;
    if (totals.requiresApprovalByDiscount) {
      if (ver.approvalStatus === 'approved') {
        nextApprovalStatus = 'pending';
      } else if (ver.approvalStatus === 'not_required') {
        nextApprovalStatus = 'pending';
      }
    } else {
      nextApprovalStatus = 'not_required';
    }

    const updatedVer: QuoteVersion = {
      ...ver,
      ...updates,
      lines: newLines,
      freightCents,
      totalCents: totals.totalCents,
      approvalStatus: nextApprovalStatus,
      version: ver.version + 1
    };

    setDb(prev => {
      const quote = prev.quotes.find(q => q.id === ver.quoteId);
      const updatedOpps = quote ? prev.opportunities.map(o => {
        if (o.id === quote.opportunityId && o.stage !== 'won' && o.stage !== 'lost') {
          return { ...o, estimatedValueCents: totals.totalCents };
        }
        return o;
      }) : prev.opportunities;

      return {
        ...prev,
        opportunities: updatedOpps,
        quoteVersions: prev.quoteVersions.map(v => v.id === quoteVersionId ? updatedVer : v),
        activities: [
          ...prev.activities,
          logActivity('quote', ver.quoteId, 'draft_saved', { revision: ver.revision }, { totalCents: totals.totalCents, approvalStatus: nextApprovalStatus })
        ]
      };
    });

    return { ok: true, data: updatedVer };
  };

  // --- COMMAND: Request Approval ---
  const requestApproval = async (quoteVersionId: string, reason: string): Promise<CommandResult<Approval>> => {
    await delay();
    const ver = db.quoteVersions.find(v => v.id === quoteVersionId);
    if (!ver) return { ok: false, error: { code: 'NOT_FOUND', message: 'Versão de cotação não encontrada.' } };

    const newApproval: Approval = {
      id: `AP${String(db.approvals.length + 1).padStart(3, '0')}`,
      quoteVersionId,
      requestedBy: currentUser.id,
      decidedBy: null,
      status: 'pending',
      reason,
      requestedAt: db.meta.clock,
      decidedAt: null
    };

    setDb(prev => ({
      ...prev,
      approvals: [...prev.approvals, newApproval],
      quoteVersions: prev.quoteVersions.map(v => v.id === quoteVersionId ? { ...v, approvalStatus: 'pending' } : v),
      notifications: [
        ...prev.notifications,
        {
          id: `N${Date.now()}`,
          recipientId: 'U001',
          title: 'Aprovação de Alçada Solicitada',
          message: `${currentUser.name} solicitou desconto: "${reason}".`,
          linkRoute: '/cotacoes',
          read: false,
          createdAt: db.meta.clock
        }
      ]
    }));

    return { ok: true, data: newApproval };
  };

  // --- COMMAND: Decide Approval ---
  const decideApproval = async (approvalId: string, approved: boolean, note?: string): Promise<CommandResult> => {
    await delay();
    const ap = db.approvals.find(a => a.id === approvalId);
    if (!ap) return { ok: false, error: { code: 'NOT_FOUND', message: 'Solicitação não encontrada.' } };

    if (currentUser.role === 'seller') {
      return {
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Vendedor não possui alçada para aprovar solicitações de desconto. Apenas Gestores podem decidir.'
        }
      };
    }

    const status = approved ? 'approved' : 'rejected';

    setDb(prev => ({
      ...prev,
      approvals: prev.approvals.map(a => a.id === approvalId ? {
        ...a,
        status,
        decidedBy: currentUser.id,
        decidedAt: prev.meta.clock
      } : a),
      quoteVersions: prev.quoteVersions.map(v => v.id === ap.quoteVersionId ? {
        ...v,
        approvalStatus: status
      } : v),
      notifications: [
        ...prev.notifications,
        {
          id: `N${Date.now()}`,
          recipientId: ap.requestedBy,
          title: approved ? 'Desconto Aprovado pelo Gestor' : 'Desconto Rejeitado pelo Gestor',
          message: approved ? `A cotação foi liberada por ${currentUser.name}.` : `Solicitação recusada. Nota: ${note || ''}.`,
          linkRoute: `/cotacoes`,
          read: false,
          createdAt: prev.meta.clock
        }
      ]
    }));

    return { ok: true };
  };

  // --- COMMAND: Revise Quote ---
  const reviseQuote = async (quoteId: string): Promise<CommandResult<QuoteVersion>> => {
    await delay();
    const quote = db.quotes.find(q => q.id === quoteId);
    if (!quote) return { ok: false, error: { code: 'NOT_FOUND', message: 'Cotação não encontrada.' } };

    const currentVer = db.quoteVersions.find(v => v.id === quote.currentVersionId);
    if (!currentVer) return { ok: false, error: { code: 'NOT_FOUND', message: 'Versão atual não encontrada.' } };

    const newRevisionNumber = currentVer.revision + 1;
    const newVersionId = `${quoteId}-V${newRevisionNumber}`;

    const newVersion: QuoteVersion = {
      ...currentVer,
      id: newVersionId,
      revision: newRevisionNumber,
      status: 'draft',
      approvalStatus: currentVer.lines.some(l => l.discountBps > 500) ? 'pending' : 'not_required',
      sentAt: null,
      acceptedAt: null,
      version: 1
    };

    setDb(prev => ({
      ...prev,
      quotes: prev.quotes.map(q => q.id === quoteId ? { ...q, currentVersionId: newVersionId } : q),
      quoteVersions: [...prev.quoteVersions, newVersion]
    }));

    return { ok: true, data: newVersion };
  };

  // --- COMMAND: Send Quote ---
  const sendQuote = async (
    quoteVersionId: string,
    channels: ('whatsapp' | 'email')[],
    retryChannel?: 'whatsapp' | 'email'
  ): Promise<CommandResult> => {
    await delay();
    const ver = db.quoteVersions.find(v => v.id === quoteVersionId);
    if (!ver) return { ok: false, error: { code: 'NOT_FOUND', message: 'Cotação não encontrada.' } };

    if (ver.approvalStatus === 'pending') {
      return {
        ok: false,
        error: {
          code: 'APPROVAL_REQUIRED',
          message: 'Esta cotação possui desconto acima de 5% e aguarda aprovação do gestor para poder ser enviada.'
        }
      };
    }

    const quote = db.quotes.find(q => q.id === ver.quoteId);
    if (!quote) return { ok: false, error: { code: 'NOT_FOUND', message: 'Cotação não encontrada.' } };

    const opp = db.opportunities.find(o => o.id === quote.opportunityId);
    const conv = db.conversations.find(c => c.opportunityId === quote.opportunityId);

    const targetChannels = retryChannel ? [retryChannel] : channels;
    let hasSuccess = false;
    const createdMessages: Message[] = [];

    for (const ch of targetChannels) {
      const willFail = (ch === 'whatsapp' && db.simulatedErrors.failWhatsApp) ||
                       (ch === 'email' && db.simulatedErrors.failEmail);

      const status: DeliveryStatus = willFail ? 'failed' : 'sent';
      if (!willFail) hasSuccess = true;

      if (conv) {
        createdMessages.push({
          id: `MS${Date.now()}-${ch}`,
          conversationId: conv.id,
          channel: ch,
          direction: 'outbound',
          authorId: currentUser.id,
          body: `Segue a cotação ${quote.number} (Rev. ${ver.revision}) no valor de R$ ${(ver.totalCents / 100).toFixed(2).replace('.', ',')} para sua avaliação.`,
          deliveryStatus: status,
          createdAt: db.meta.clock,
          quoteVersionId: ver.id,
          clientRequestId: `req-send-${ver.id}-${ch}`,
          providerEventId: willFail ? null : `evt-send-${Date.now()}`
        });
      }
    }

    const newFollowUpTask: Task = {
      id: `T${String(db.tasks.length + 1).padStart(3, '0')}`,
      opportunityId: opp ? opp.id : '',
      ownerId: currentUser.id,
      type: 'follow_up',
      title: `Retornar sobre proposta ${quote.number}`,
      dueAt: '2026-10-15T10:00:00-03:00',
      status: 'open',
      automationKey: `A03-${ver.id}`
    };

    setDb(prev => {
      const updatedVersions = prev.quoteVersions.map(v => {
        if (v.quoteId === ver.quoteId) {
          if (v.id === ver.id) {
            return {
              ...v,
              status: hasSuccess ? 'sent' : v.status,
              sentAt: hasSuccess ? prev.meta.clock : v.sentAt
            };
          } else if (v.status === 'sent') {
            return {
              ...v,
              status: 'superseded' as const
            };
          }
        }
        return v;
      });

      const updatedOpps = prev.opportunities.map(o => {
        if (o.id === quote.opportunityId && o.stage !== 'won' && o.stage !== 'lost') {
          return {
            ...o,
            stage: 'quote_sent' as const,
            stageEnteredAt: prev.meta.clock
          };
        }
        return o;
      });

      return {
        ...prev,
        quoteVersions: updatedVersions,
        opportunities: updatedOpps,
        messages: [...prev.messages, ...createdMessages],
        tasks: hasSuccess ? [...prev.tasks, newFollowUpTask] : prev.tasks
      };
    });

    if (!hasSuccess && targetChannels.includes('whatsapp') && db.simulatedErrors.failWhatsApp) {
      return {
        ok: false,
        error: {
          code: 'CHANNEL_UNAVAILABLE',
          message: 'Falha simulada no canal WhatsApp. O envio por este canal falhou. Você pode tentar novamente apenas no WhatsApp.'
        }
      };
    }

    return { ok: true };
  };

  // --- COMMAND: Send Chat Message ---
  const sendChatMessage = async (
    conversationId: string,
    channel: 'whatsapp' | 'email' | 'internal_note',
    body: string,
    isTemplate?: boolean
  ): Promise<CommandResult<Message>> => {
    await delay();
    const conv = db.conversations.find(c => c.id === conversationId);
    if (!conv) return { ok: false, error: { code: 'NOT_FOUND', message: 'Conversa não encontrada.' } };

    if (channel === 'whatsapp' && !isTemplate) {
      const lastInboundTime = new Date(conv.lastInboundAt).getTime();
      const clockTime = new Date(db.meta.clock).getTime();
      const diffHours = (clockTime - lastInboundTime) / (1000 * 60 * 60);

      if (diffHours > 24) {
        return {
          ok: false,
          error: {
            code: 'CHANNEL_UNAVAILABLE',
            message: 'Janela de atendimento do WhatsApp expirou (>24h). Envio de texto livre bloqueado pela política do provedor. Utilize um modelo aprovado.'
          }
        };
      }
    }

    const newMsg: Message = {
      id: `M${Date.now()}`,
      conversationId,
      channel,
      direction: 'outbound',
      authorId: currentUser.id,
      body,
      deliveryStatus: 'sent',
      createdAt: db.meta.clock,
      quoteVersionId: null,
      clientRequestId: `req-${Date.now()}`,
      providerEventId: `evt-${Date.now()}`
    };

    setDb(prev => ({
      ...prev,
      messages: [...prev.messages, newMsg],
      conversations: prev.conversations.map(c => c.id === conversationId ? {
        ...c,
        state: 'waiting_client'
      } : c)
    }));

    return { ok: true, data: newMsg };
  };

  // --- COMMAND: Receive Inbound Message ---
  const receiveInboundMessage = async (
    conversationId: string,
    channel: 'whatsapp' | 'email',
    body: string,
    providerEventId?: string
  ): Promise<CommandResult<Message>> => {
    await delay();
    const conv = db.conversations.find(c => c.id === conversationId);
    if (!conv) return { ok: false, error: { code: 'NOT_FOUND', message: 'Conversa não encontrada.' } };

    if (providerEventId && db.messages.some(m => m.providerEventId === providerEventId)) {
      return { ok: true };
    }

    const newMsg: Message = {
      id: `M${Date.now()}`,
      conversationId,
      channel,
      direction: 'inbound',
      authorId: null,
      body,
      deliveryStatus: 'received',
      createdAt: db.meta.clock,
      quoteVersionId: null,
      clientRequestId: null,
      providerEventId: providerEventId || `evt-in-${Date.now()}`
    };

    const isDiscountRequest = body.toLowerCase().includes('8%') || body.toLowerCase().includes('desconto');
    const isTechnicalDoubt = body.toLowerCase().includes('sem referência') || body.toLowerCase().includes('como identificamos');

    setDb(prev => {
      let updatedOpps = prev.opportunities;
      let updatedTasks = prev.tasks;
      let updatedConvs = prev.conversations;

      if (conv.opportunityId) {
        if (isDiscountRequest) {
          updatedOpps = prev.opportunities.map(o => o.id === conv.opportunityId ? {
            ...o,
            stage: 'negotiation' as const,
            stageEnteredAt: prev.meta.clock
          } : o);

          updatedTasks = prev.tasks.map(t => t.opportunityId === conv.opportunityId && t.type === 'follow_up' && t.status === 'open' ? {
            ...t,
            status: 'cancelled' as const
          } : t);
        } else if (isTechnicalDoubt) {
          updatedConvs = prev.conversations.map(c => c.id === conversationId ? {
            ...c,
            aiMode: 'paused' as const,
            unreadCount: c.unreadCount + 1,
            lastInboundAt: prev.meta.clock
          } : c);

          const techTask: Task = {
            id: `T${Date.now()}`,
            opportunityId: conv.opportunityId,
            ownerId: 'U004',
            type: 'technical_review',
            title: 'Confirmar viabilidade de chicote sem referência',
            dueAt: '2026-10-15T10:00:00-03:00',
            status: 'open',
            automationKey: `C09-${Date.now()}`
          };
          updatedTasks = [...updatedTasks, techTask];
        }
      }

      updatedConvs = updatedConvs.map(c => c.id === conversationId ? {
        ...c,
        unreadCount: c.unreadCount + 1,
        lastInboundAt: prev.meta.clock,
        state: 'waiting_team'
      } : c);

      return {
        ...prev,
        messages: [...prev.messages, newMsg],
        conversations: updatedConvs,
        opportunities: updatedOpps,
        tasks: updatedTasks
      };
    });

    return { ok: true, data: newMsg };
  };

  // --- COMMAND: Accept Quote ---
  const acceptQuote = async (quoteVersionId: string): Promise<CommandResult> => {
    await delay();
    const ver = db.quoteVersions.find(v => v.id === quoteVersionId);
    if (!ver) return { ok: false, error: { code: 'NOT_FOUND', message: 'Revisão da cotação não encontrada.' } };

    const clockTime = new Date(db.meta.clock).getTime();
    const validUntilTime = new Date(ver.validUntil).getTime();
    if (clockTime > validUntilTime || ver.status === 'expired') {
      return {
        ok: false,
        error: {
          code: 'QUOTE_EXPIRED',
          message: 'Esta cotação está expirada (prazo de validade vencido). Não é possível aceitá-la; por favor, solicite uma nova revisão comercial.'
        }
      };
    }

    if (ver.status === 'superseded') {
      return {
        ok: false,
        error: {
          code: 'VERSION_SUPERSEDED',
          message: 'Esta versão da cotação foi substituída por uma revisão mais recente. Por favor, visualize e aceite a versão atualizada.'
        }
      };
    }

    if (ver.freightPending) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'O frete desta cotação ainda está pendente de definição pela equipe técnica. O aceite requer frete definido.'
        }
      };
    }

    const quote = db.quotes.find(q => q.id === ver.quoteId);

    setDb(prev => ({
      ...prev,
      quoteVersions: prev.quoteVersions.map(v => v.id === quoteVersionId ? {
        ...v,
        status: 'accepted',
        acceptedAt: prev.meta.clock
      } : v),
      notifications: [
        ...prev.notifications,
        {
          id: `N${Date.now()}`,
          recipientId: ver.createdBy,
          title: 'Cotação Aceita pelo Cliente!',
          message: `O comprador aceitou a cotação ${quote?.number} (Rev. ${ver.revision}). Acesse a oportunidade para confirmar o fechamento e enviar pedido ao ERP.`,
          linkRoute: quote ? `/oportunidades/${quote.opportunityId}` : '/cotacoes',
          read: false,
          createdAt: prev.meta.clock
        }
      ]
    }));

    return { ok: true };
  };

  // --- COMMAND: Reject Quote ---
  const rejectQuote = async (quoteVersionId: string, reason?: string): Promise<CommandResult> => {
    await delay();
    const ver = db.quoteVersions.find(v => v.id === quoteVersionId);
    if (!ver) return { ok: false, error: { code: 'NOT_FOUND', message: 'Revisão não encontrada.' } };

    setDb(prev => ({
      ...prev,
      quoteVersions: prev.quoteVersions.map(v => v.id === quoteVersionId ? {
        ...v,
        status: 'rejected'
      } : v)
    }));

    return { ok: true };
  };

  // --- COMMAND: Tasks ---
  const completeTask = async (taskId: string): Promise<CommandResult> => {
    await delay();
    setDb(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status: 'completed' } : t)
    }));
    return { ok: true };
  };

  const createTask = async (params: { opportunityId: string; title: string; dueAt: string; type?: Task['type'] }): Promise<CommandResult<Task>> => {
    await delay();
    const newTask: Task = {
      id: `T${Date.now()}`,
      opportunityId: params.opportunityId,
      ownerId: currentUser.id,
      type: params.type || 'follow_up',
      title: params.title,
      dueAt: params.dueAt,
      status: 'open',
      automationKey: null
    };

    setDb(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask]
    }));

    return { ok: true, data: newTask };
  };

  // --- COMMAND: Advance Clock ---
  const advanceClock = async (days: number): Promise<CommandResult> => {
    await delay();
    const currentDate = new Date(db.meta.clock);
    currentDate.setDate(currentDate.getDate() + days);
    const newClockIso = currentDate.toISOString().replace('.000Z', '-03:00');

    setDb(prev => {
      const clockTime = new Date(newClockIso).getTime();
      const updatedVersions = prev.quoteVersions.map(v => {
        if (v.status === 'sent') {
          const expTime = new Date(v.validUntil).getTime();
          if (clockTime > expTime) {
            return {
              ...v,
              status: 'expired' as QuoteStatus
            };
          }
        }
        return v;
      });

      return {
        ...prev,
        meta: {
          ...prev.meta,
          clock: newClockIso
        },
        quoteVersions: updatedVersions
      };
    });

    return { ok: true };
  };

  // --- RESET DEMO ---
  const resetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setDb(INITIAL_CRM_DATA);
    setCurrentUserId('U002');
  };

  // --- AUTOMATED SCENARIOS C01 - C24 EXECUTION ---
  const executeScenario = async (scenarioId: string): Promise<CommandResult> => {
    switch (scenarioId) {
      case 'C01': // Create lead from site
        return await createLead({
          name: db.demoNewLead.name,
          email: db.demoNewLead.email,
          whatsappMockId: db.demoNewLead.whatsappMockId,
          companyName: db.demoNewLead.company,
          interest: db.demoNewLead.interest,
          source: 'site',
          eventId: db.demoNewLead.eventId
        });

      case 'C02': // Duplicate lead event test
        return await createLead({
          name: db.demoNewLead.name,
          email: db.demoNewLead.email,
          whatsappMockId: db.demoNewLead.whatsappMockId,
          companyName: db.demoNewLead.company,
          interest: db.demoNewLead.interest,
          source: 'site',
          eventId: db.demoNewLead.eventId
        });

      case 'C03': // Calculate quote 2 chicotes + 4 conectores @ 5% desc + frete R$ 80 = R$ 2.151,00
        return await saveQuoteDraft('Q001-V1', {
          lines: [
            {
              productId: 'P001',
              skuSnapshot: 'DEMO-MW-001',
              nameSnapshot: 'Chicote padrão demonstrativo',
              quantity: 2,
              unitPriceCents: 85000,
              discountBps: 500,
              grossCents: 170000,
              discountCents: 8500,
              netCents: 161500
            },
            {
              productId: 'P002',
              skuSnapshot: 'DEMO-MW-002',
              nameSnapshot: 'Conector demonstrativo',
              quantity: 4,
              unitPriceCents: 12000,
              discountBps: 500,
              grossCents: 48000,
              discountCents: 2400,
              netCents: 45600
            }
          ],
          freightCents: 8000
        });

      case 'C04': // Approve Q002 as manager (U001)
        {
          const prevUser = currentUserId;
          setCurrentUserId('U001');
          const res = await decideApproval('AP001', true, 'Aprovado pelo gestor para cenário de demonstração');
          setCurrentUserId(prevUser);
          return res;
        }

      case 'C05': // Seller tries to self-approve Q002
        {
          const prevUser = currentUserId;
          setCurrentUserId('U002');
          const res = await decideApproval('AP001', true);
          setCurrentUserId(prevUser);
          return res;
        }

      case 'C06': // Modify approved quote (invalidates approval)
        return await saveQuoteDraft('Q002-V1', {
          lines: [
            {
              productId: 'P001',
              skuSnapshot: 'DEMO-MW-001',
              nameSnapshot: 'Chicote padrão demonstrativo',
              quantity: 3,
              unitPriceCents: 85000,
              discountBps: 800,
              grossCents: 255000,
              discountCents: 20400,
              netCents: 234600
            }
          ]
        });

      case 'C07': // Send quote, simulate WhatsApp error
        setSimulatedError('failWhatsApp', true);
        return await sendQuote('Q001-V1', ['whatsapp', 'email']);

      case 'C08': // Receive discount request (8%) on sent quote
        return await receiveInboundMessage('CV005', 'whatsapp', db.demoResponses.discountRequest);

      case 'C09': // AI receives unknown application query without reference
        return await receiveInboundMessage('CV004', 'whatsapp', 'Preciso de um chicote para um equipamento sem referência. Como identificamos?');

      case 'C10': // Attempt to accept expired quote Q004
        return await acceptQuote('Q004-V1');

      case 'C11': // Attempt to accept superseded version
        {
          setDb(prev => ({
            ...prev,
            quoteVersions: prev.quoteVersions.map(v => v.id === 'Q003-V1' ? { ...v, status: 'superseded' } : v)
          }));
          return await acceptQuote('Q003-V1');
        }

      case 'C12': // Mark opportunity won with accepted quote Q005
        return await moveOpportunity('O007', 'won');

      case 'C13': // Mark opportunity lost without reason
        return await moveOpportunity('O001', 'lost', '');

      case 'C14': // Contact with two active negotiations sends message
        return await receiveInboundMessage('CV001', 'whatsapp', 'Olá, gostaria de confirmar o andamento da minha solicitação.');

      case 'C15': // WhatsApp outside 24h window sends free text
        return await sendChatMessage('CV006', 'whatsapp', 'Mensagem de contato fora da janela de 24h');

      case 'C16': // Reset demo
        resetDemo();
        return { ok: true };

      // --- NEW 13/10/2026 VALIDATION SCENARIOS ---
      case 'C17': // Lead Instagram sem segmento: pendência de qualificação
        return await createLead({
          name: 'Comprador Instagram Agro',
          email: 'insta.agro@example.com',
          whatsappMockId: 'WA-DEMO-INSTA',
          source: 'instagram',
          campaign: 'reels-chicotes-safra',
          interest: 'Vi o post sobre chicotes reforçados e gostaria de saber valores'
        });

      case 'C18': // Lead LP de Grãos: preserva campanha e sugere catálogo pertinente
        return await createLead({
          name: 'Produtor Grãos Sorriso',
          email: 'graos.sorriso@example.com',
          whatsappMockId: 'WA-DEMO-GRAOS',
          source: 'landing_page',
          campaign: 'lp-graos-plantio-2026',
          companyName: 'Fazenda Boa Esperança Grãos',
          segment: 'Grãos (Soja/Milho)',
          region: 'Sorriso / MT',
          interest: 'Chicotes de cabine e kit de reparo para plantadeira de milho'
        });

      case 'C19': // Cliente de cana com janela regional validada gera alerta e rascunho de campanha
        return await approveMarketAlert('ALT-001');

      case 'C20': // Mesmo cliente retorna pelo catálogo: seleção é anexada ao histórico sem duplicação
        return await simulateCatalogSubmission({
          contactName: 'Comprador Demo 01 (Usina)',
          contactEmail: 'comprador01@example.com',
          contactWa: 'WA-DEMO-001',
          machineModel: 'Colheitadeira John Deere CH570',
          selectedItems: [{ sku: 'DEMO-MW-001', quantity: 2 }, { sku: 'DEMO-MW-002', quantity: 4 }]
        });

      case 'C21': // Cliente com múltiplos segmentos: cana + grãos atualizados
        return await updateCompanySegmentProfile('E001', {
          additionalSegments: ['Grãos (Soja/Milho)', 'Citros'],
          crop: ['Cana-de-açúcar', 'Soja', 'Laranja']
        });

      case 'C22': // Calendário vencido (CAL-003): bloqueia ação sazonal e solicita atualização técnica
        {
          const expiredCal = db.marketCalendar.find(c => c.id === 'CAL-003');
          if (expiredCal?.status === 'expired') {
            return {
              ok: false,
              error: {
                code: 'CALENDAR_EXPIRED',
                message: 'O calendário técnico sazonal para o ciclo de café está vencido (validade até 30/09). A inteligência de mercado bloqueou afirmações sazonais até nova revisão técnica.'
              }
            };
          }
          return { ok: true };
        }

      case 'C23': // Descadastro de marketing interrompe campanhas
        return await unsubscribeContact('C001');

      case 'C24': // Envio de pedido da cotação ganha para o ERP COBOL com confirmação verificável
        return await dispatchOrderToErp('Q005');

      default:
        return { ok: false, error: { code: 'NOT_FOUND', message: 'Cenário não reconhecido.' } };
    }
  };

  // --- DERIVED METRICS ---
  const metrics = useMemo(() => {
    const openOpps = db.opportunities.filter(o => o.stage !== 'won' && o.stage !== 'lost');

    let openValueCents = 0;
    openOpps.forEach(opp => {
      const quote = db.quotes.find(q => q.opportunityId === opp.id);
      if (quote) {
        const ver = db.quoteVersions.find(v => v.id === quote.currentVersionId);
        if (ver && (ver.status === 'sent' || ver.status === 'ready' || ver.status === 'draft')) {
          openValueCents += ver.totalCents;
          return;
        }
      }
      openValueCents += (opp.estimatedValueCents || 0);
    });

    const wonOpps = db.opportunities.filter(o => o.stage === 'won');
    let wonValueCents = 0;
    wonOpps.forEach(opp => {
      const quote = db.quotes.find(q => q.opportunityId === opp.id);
      if (quote) {
        const ver = db.quoteVersions.find(v => v.id === quote.currentVersionId);
        if (ver && ver.status === 'accepted') {
          wonValueCents += ver.totalCents;
          return;
        }
      }
      wonValueCents += (opp.estimatedValueCents || 0);
    });

    const lostOpps = db.opportunities.filter(o => o.stage === 'lost');
    const totalClosed = wonOpps.length + lostOpps.length;
    const closedWinRate = totalClosed > 0 ? (wonOpps.length / totalClosed) : null;

    const clockTime = new Date(db.meta.clock).getTime();
    const overdueTasks = db.tasks.filter(t => t.status === 'open' && new Date(t.dueAt).getTime() < clockTime).length;
    const unassignedLeads = db.leads.filter(l => !l.ownerId).length;

    // Segment coverage rate
    const companiesWithConfirmedSegment = db.companies.filter(c =>
      c.segmentProfile && c.segmentProfile.qualificationStatus === 'confirmed'
    ).length;
    const segmentCoverageRate = db.companies.length > 0 ? Math.round((companiesWithConfirmedSegment / db.companies.length) * 100) : 0;

    const activeCampaignsCount = db.campaigns.filter(c => c.status === 'scheduled' || c.status === 'running').length;
    const erpSyncPendingCount = db.opportunities.filter(o => o.stage === 'won' && o.erpSyncStatus === 'waiting_dispatch').length;

    return {
      openOpportunities: openOpps.length,
      openValueCents,
      wonOpportunities: wonOpps.length,
      wonValueCents,
      lostOpportunities: lostOpps.length,
      closedWinRate,
      overdueTasks,
      unassignedLeads,
      segmentCoverageRate,
      activeCampaignsCount,
      erpSyncPendingCount
    };
  }, [db]);

  return (
    <CrmContext.Provider
      value={{
        db,
        currentUser,
        setCurrentUserId,
        latencyEnabled,
        setLatencyEnabled,
        simulatedErrors: db.simulatedErrors,
        setSimulatedError,
        createLead,
        simulateCatalogSubmission,
        updateCompanySegmentProfile,
        assignOwner,
        moveOpportunity,
        saveQuoteDraft,
        requestApproval,
        decideApproval,
        createQuoteForOpportunity,
        reviseQuote,
        sendQuote,
        acceptQuote,
        rejectQuote,
        queryErpStock,
        dispatchOrderToErp,
        sendChatMessage,
        receiveInboundMessage,
        approveMarketAlert,
        dismissMarketAlert,
        createCampaign,
        approveCampaign,
        executeCampaign,
        unsubscribeContact,
        completeTask,
        createTask,
        advanceClock,
        resetDemo,
        executeScenario,
        markNotificationRead,
        markAllNotificationsRead,
        metrics
      }}
    >
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = (): CrmContextType => {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error('useCrm must be used within a CrmProvider');
  }
  return context;
};
