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
  QuoteStatus
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
  simulatedErrors: { failWhatsApp: boolean; failEmail: boolean };
  setSimulatedError: (key: 'failWhatsApp' | 'failEmail', val: boolean) => void;
  // Commands
  createLead: (params: {
    name: string;
    email: string;
    whatsappMockId: string;
    companyName?: string;
    interest?: string;
    source?: LeadSource;
    eventId?: string;
  }) => Promise<CommandResult<{ lead: Lead; opportunity?: Opportunity }>>;
  assignOwner: (opportunityId: string, newOwnerId: string) => Promise<CommandResult>;
  moveOpportunity: (opportunityId: string, newStage: OpportunityStage, lostReason?: string) => Promise<CommandResult>;
  saveQuoteDraft: (quoteVersionId: string, updates: Partial<QuoteVersion>) => Promise<CommandResult<QuoteVersion>>;
  requestApproval: (quoteVersionId: string, reason: string) => Promise<CommandResult<Approval>>;
  decideApproval: (approvalId: string, approved: boolean, note?: string) => Promise<CommandResult>;
  createQuoteForOpportunity: (opportunityId: string) => Promise<CommandResult<{ quote: Quote; version: QuoteVersion }>>;
  reviseQuote: (quoteId: string) => Promise<CommandResult<QuoteVersion>>;
  sendQuote: (quoteVersionId: string, channels: ('whatsapp' | 'email')[], retryChannel?: 'whatsapp' | 'email') => Promise<CommandResult>;
  sendChatMessage: (conversationId: string, channel: 'whatsapp' | 'email' | 'internal_note', body: string, isTemplate?: boolean) => Promise<CommandResult<Message>>;
  receiveInboundMessage: (conversationId: string, channel: 'whatsapp' | 'email', body: string, providerEventId?: string) => Promise<CommandResult<Message>>;
  acceptQuote: (quoteVersionId: string) => Promise<CommandResult>;
  rejectQuote: (quoteVersionId: string, reason?: string) => Promise<CommandResult>;
  completeTask: (taskId: string) => Promise<CommandResult>;
  createTask: (params: { opportunityId: string; title: string; dueAt: string; type?: Task['type'] }) => Promise<CommandResult<Task>>;
  advanceClock: (days: number) => Promise<CommandResult>;
  resetDemo: () => void;
  executeScenario: (scenarioId: string) => Promise<CommandResult>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  // Metrics calculated from the same db
  metrics: {
    openOpportunities: number;
    openValueCents: number;
    wonOpportunities: number;
    wonValueCents: number;
    lostOpportunities: number;
    closedWinRate: number | null;
    overdueTasks: number;
    unassignedLeads: number;
  };
}

const STORAGE_KEY = 'megawhip_crm_db_v1';

const CrmContext = createContext<CrmContextType | undefined>(undefined);

export const CrmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<CrmDatabase>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.meta?.schemaVersion === 1) {
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

  const setSimulatedError = (key: 'failWhatsApp' | 'failEmail', val: boolean) => {
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
  ) => {
    const act: Activity = {
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
    return act;
  };

  // Rule A01: Round-robin assign active seller
  const getNextActiveSellerId = (state: CrmDatabase): string => {
    const sellers = state.users.filter(u => u.active && u.role === 'seller');
    if (sellers.length === 0) return 'U001';
    // Count how many leads each currently has
    const counts = sellers.map(s => ({
      seller: s,
      count: state.leads.filter(l => l.ownerId === s.id).length
    }));
    counts.sort((a, b) => a.count - b.count);
    return counts[0].seller.id;
  };

  // --- COMMAND: Create Lead (C01, C02) ---
  const createLead = async (params: {
    name: string;
    email: string;
    whatsappMockId: string;
    companyName?: string;
    interest?: string;
    source?: LeadSource;
    eventId?: string;
  }): Promise<CommandResult<{ lead: Lead; opportunity?: Opportunity }>> => {
    await delay();

    if (!params.name.trim()) {
      return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Nome do comprador é obrigatório.' } };
    }
    if (!params.email.trim() && !params.whatsappMockId.trim()) {
      return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Informe pelo menos um meio de contato (E-mail ou WhatsApp).' } };
    }

    const normEmail = params.email.trim().toLowerCase();
    const normWa = params.whatsappMockId.trim();

    // Idempotency: check if eventId already processed in automationRuns or activities
    if (params.eventId) {
      const alreadyRun = db.automationRuns.some(r => r.eventKey === params.eventId);
      if (alreadyRun) {
        return {
          ok: true,
          error: undefined,
          data: {
            lead: db.leads[0],
            opportunity: db.opportunities[0]
          }
        };
      }
    }

    // Check existing contact by email or whatsapp
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
        name: params.companyName?.trim() || `${params.name} Soluções Demo`,
        segment: 'Reposição agrícola',
        city: 'Cidade Demo',
        state: 'SP',
        document: null,
        fictitious: true
      };

      contactId = `C${String(db.contacts.length + 1).padStart(3, '0')}`;
      newContact = {
        id: contactId,
        companyId,
        name: params.name.trim(),
        email: normEmail || `${params.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        whatsappMockId: normWa || `WA-DEMO-${String(db.contacts.length + 1).padStart(3, '0')}`,
        preferredChannel: normWa ? 'whatsapp' : 'email',
        doNotContact: false
      };
    }

    // Rule A01: Round robin seller
    const assignedSellerId = getNextActiveSellerId(db);

    const newLeadId = `L${String(db.leads.length + 1).padStart(3, '0')}`;
    const newLead: Lead = {
      id: newLeadId,
      contactId: contactId!,
      source: params.source || 'site',
      campaign: 'demo-entrada',
      interest: params.interest || 'Solicitação via formulário do site',
      status: 'converted',
      ownerId: assignedSellerId,
      createdAt: db.meta.clock,
      convertedOpportunityId: `O${String(db.opportunities.length + 1).padStart(3, '0')}`
    };

    const newOppId = newLead.convertedOpportunityId!;
    const newOpportunity: Opportunity = {
      id: newOppId,
      companyId: companyId!,
      contactId: contactId!,
      title: `Solicitação - ${newCompany ? newCompany.name : (existingContact?.name || params.name)}`,
      stage: 'qualification',
      ownerId: assignedSellerId,
      estimatedValueCents: 215100,
      technicalStatus: 'approved_demo',
      createdAt: db.meta.clock,
      stageEnteredAt: db.meta.clock,
      closedAt: null,
      lostReason: null,
      version: 1
    };

    // Follow up task
    const newTask: Task = {
      id: `T${String(db.tasks.length + 1).padStart(3, '0')}`,
      opportunityId: newOppId,
      ownerId: assignedSellerId,
      type: 'follow_up',
      title: 'Realizar primeiro contato e qualificar interesse',
      dueAt: '2026-10-10T10:00:00-03:00',
      status: 'open',
      automationKey: `A01-${newLeadId}`
    };

    // Conversation
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

    const newMsg: Message = {
      id: `M${String(db.messages.length + 1).padStart(3, '0')}`,
      conversationId: newConv.id,
      channel: 'whatsapp',
      direction: 'inbound',
      authorId: null,
      body: params.interest || 'Olá, gostaria de uma cotação para 2 chicotes e 4 conectores.',
      deliveryStatus: 'received',
      createdAt: db.meta.clock,
      quoteVersionId: null,
      clientRequestId: null,
      providerEventId: params.eventId || `evt-${Date.now()}`
    };

    const newNotification: NotificationItem = {
      id: `N${Date.now()}`,
      recipientId: assignedSellerId,
      title: 'Novo Lead Atribuído (A01)',
      message: `${params.name} entrou pelo formulário do site e foi atribuído a você.`,
      linkRoute: `/oportunidades/${newOppId}`,
      read: false,
      createdAt: db.meta.clock
    };

    setDb(prev => ({
      ...prev,
      companies: newCompany ? [...prev.companies, newCompany] : prev.companies,
      contacts: newContact ? [...prev.contacts, newContact] : prev.contacts,
      leads: [...prev.leads, newLead],
      opportunities: [...prev.opportunities, newOpportunity],
      tasks: [...prev.tasks, newTask],
      conversations: [...prev.conversations, newConv],
      messages: [...prev.messages, newMsg],
      notifications: [...prev.notifications, newNotification],
      activities: [
        ...prev.activities,
        logActivity('lead', newLead.id, 'created', null, { stage: 'qualification', source: newLead.source })
      ],
      automationRuns: params.eventId ? [
        ...prev.automationRuns,
        {
          id: `RUN-${Date.now()}`,
          ruleId: 'A01',
          entityId: newLead.id,
          eventKey: params.eventId,
          status: 'success',
          reason: 'Lead distribuído com sucesso por round-robin',
          createdAt: prev.meta.clock
        }
      ] : prev.automationRuns
    }));

    return {
      ok: true,
      data: {
        lead: newLead,
        opportunity: newOpportunity
      }
    };
  };

  // --- COMMAND: Assign Owner ---
  const assignOwner = async (opportunityId: string, newOwnerId: string): Promise<CommandResult> => {
    await delay();
    const opp = db.opportunities.find(o => o.id === opportunityId);
    if (!opp) return { ok: false, error: { code: 'NOT_FOUND', message: 'Oportunidade não encontrada.' } };

    // Permissions check
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

  // --- COMMAND: Move Opportunity (C12, C13) ---
  const moveOpportunity = async (opportunityId: string, newStage: OpportunityStage, lostReason?: string): Promise<CommandResult> => {
    await delay();
    const opp = db.opportunities.find(o => o.id === opportunityId);
    if (!opp) return { ok: false, error: { code: 'NOT_FOUND', message: 'Oportunidade não encontrada.' } };

    if (opp.stage === newStage) return { ok: true };

    // Validation for WON (C12)
    if (newStage === 'won') {
      // Find quote for this opportunity
      const quote = db.quotes.find(q => q.opportunityId === opportunityId);
      if (!quote) {
        return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Para marcar como Ganho, é obrigatório existir uma cotação aceita.' } };
      }
      const currentVer = db.quoteVersions.find(v => v.id === quote.currentVersionId);
      if (!currentVer || currentVer.status !== 'accepted') {
        return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'A cotação vigente desta oportunidade ainda não foi formalmente aceita pelo cliente.' } };
      }
    }

    // Validation for LOST (C13)
    if (newStage === 'lost') {
      if (!lostReason || !lostReason.trim()) {
        return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'O motivo da perda é obrigatório (ex: Preço, Prazo, Concorrente, Projeto cancelado).' } };
      }
    }

    setDb(prev => {
      // If WON: mark auto follow-up tasks for this opp as completed
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
              version: o.version + 1
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
      validUntil: '2026-10-16T23:59:59-03:00',
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

  // --- COMMAND: Save Quote Draft (C03, C06) ---
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

    // Rule C06: If changes in quantity or discount occur on an already-approved quote,
    // the previous approval must be invalidated immediately!
    let nextApprovalStatus = ver.approvalStatus;
    if (totals.requiresApprovalByDiscount) {
      if (ver.approvalStatus === 'approved') {
        // Quantities or discounts modified -> invalidates approval
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
      // Also update estimatedValue on opportunity if applicable
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

  // --- COMMAND: Request Approval (C04, C05) ---
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

    const notif: NotificationItem = {
      id: `N${Date.now()}`,
      recipientId: 'U001', // Gestor
      title: 'Aprovação de Alçada Solicitada',
      message: `${currentUser.name} solicitou aprovação de desconto: "${reason}".`,
      linkRoute: '/cotacoes',
      read: false,
      createdAt: db.meta.clock
    };

    setDb(prev => ({
      ...prev,
      approvals: [...prev.approvals, newApproval],
      quoteVersions: prev.quoteVersions.map(v => v.id === quoteVersionId ? { ...v, approvalStatus: 'pending' } : v),
      notifications: [...prev.notifications, notif],
      activities: [
        ...prev.activities,
        logActivity('approval', newApproval.id, 'requested', null, { reason, quoteVersionId })
      ]
    }));

    return { ok: true, data: newApproval };
  };

  // --- COMMAND: Decide Approval (C04, C05) ---
  const decideApproval = async (approvalId: string, approved: boolean, note?: string): Promise<CommandResult> => {
    await delay();
    const ap = db.approvals.find(a => a.id === approvalId);
    if (!ap) return { ok: false, error: { code: 'NOT_FOUND', message: 'Solicitação de aprovação não encontrada.' } };

    // Role check: Seller CANNOT approve (C05)
    if (currentUser.role === 'seller') {
      return {
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Vendedor não possui alçada para aprovar solicitações de desconto. Apenas Gestores podem decidir.'
        }
      };
    }

    const ver = db.quoteVersions.find(v => v.id === ap.quoteVersionId);
    if (!ver) return { ok: false, error: { code: 'NOT_FOUND', message: 'Versão vinculada não encontrada.' } };

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
          message: approved ? `A cotação foi aprovada por ${currentUser.name}. O envio está liberado!` : `A solicitação foi recusada. Nota: ${note || 'Sem observações'}.`,
          linkRoute: `/cotacoes`,
          read: false,
          createdAt: prev.meta.clock
        }
      ],
      activities: [
        ...prev.activities,
        logActivity('approval', approvalId, status, { previousStatus: ap.status }, { decidedBy: currentUser.id, note })
      ]
    }));

    return { ok: true };
  };

  // --- COMMAND: Revise Quote (New Revision) ---
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
      quoteVersions: [...prev.quoteVersions, newVersion],
      activities: [
        ...prev.activities,
        logActivity('quote', quoteId, 'revised', { oldVersion: currentVer.id }, { newVersionId, revision: newRevisionNumber })
      ]
    }));

    return { ok: true, data: newVersion };
  };

  // --- COMMAND: Send Quote (C07) ---
  const sendQuote = async (
    quoteVersionId: string,
    channels: ('whatsapp' | 'email')[],
    retryChannel?: 'whatsapp' | 'email'
  ): Promise<CommandResult> => {
    await delay();
    const ver = db.quoteVersions.find(v => v.id === quoteVersionId);
    if (!ver) return { ok: false, error: { code: 'NOT_FOUND', message: 'Cotação não encontrada.' } };

    // Block if approval is still pending
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

    // Channels to attempt
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

    // Follow-up task Rule A03: 1 business day later
    const newFollowUpTask: Task = {
      id: `T${String(db.tasks.length + 1).padStart(3, '0')}`,
      opportunityId: opp ? opp.id : '',
      ownerId: currentUser.id,
      type: 'follow_up',
      title: `Retornar sobre proposta ${quote.number}`,
      dueAt: '2026-10-12T10:00:00-03:00',
      status: 'open',
      automationKey: `A03-${ver.id}`
    };

    setDb(prev => {
      // Mark previous versions of the same quote as 'superseded' (C11)
      const updatedVersions = prev.quoteVersions.map(v => {
        if (v.quoteId === ver.quoteId) {
          if (v.id === ver.id) {
            return {
              ...v,
              status: hasSuccess ? 'sent' : v.status,
              sentAt: hasSuccess ? prev.meta.clock : v.sentAt
            };
          } else if (v.status === 'sent') {
            // Previous version becomes superseded
            return {
              ...v,
              status: 'superseded' as const
            };
          }
        }
        return v;
      });

      // Update opportunity stage to quote_sent
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
        tasks: hasSuccess ? [...prev.tasks, newFollowUpTask] : prev.tasks,
        activities: [
          ...prev.activities,
          logActivity('quote', quote.id, 'sent', null, { channels: targetChannels, hasSuccess })
        ]
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

  // --- COMMAND: Send Chat Message (C15 24h WhatsApp rule) ---
  const sendChatMessage = async (
    conversationId: string,
    channel: 'whatsapp' | 'email' | 'internal_note',
    body: string,
    isTemplate?: boolean
  ): Promise<CommandResult<Message>> => {
    await delay();
    const conv = db.conversations.find(c => c.id === conversationId);
    if (!conv) return { ok: false, error: { code: 'NOT_FOUND', message: 'Conversa não encontrada.' } };

    // Scenario C15: WhatsApp 24h Window Check
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
      } : c),
      activities: [
        ...prev.activities,
        logActivity('conversation', conversationId, 'message_sent', null, { channel, bodyPreview: body.slice(0, 40) })
      ]
    }));

    return { ok: true, data: newMsg };
  };

  // --- COMMAND: Receive Inbound Message (C08, C09, C14) ---
  const receiveInboundMessage = async (
    conversationId: string,
    channel: 'whatsapp' | 'email',
    body: string,
    providerEventId?: string
  ): Promise<CommandResult<Message>> => {
    await delay();
    const conv = db.conversations.find(c => c.id === conversationId);
    if (!conv) return { ok: false, error: { code: 'NOT_FOUND', message: 'Conversa não encontrada.' } };

    // Idempotency: verify providerEventId
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

    // Scenario C08 check: Buyer asks for discount (e.g. 8%)
    const isDiscountRequest = body.toLowerCase().includes('8%') || body.toLowerCase().includes('desconto');

    // Scenario C09 check: Technical question without reference
    const isTechnicalDoubt = body.toLowerCase().includes('sem referência') || body.toLowerCase().includes('como identificamos');

    setDb(prev => {
      // If C08: update opportunity stage to 'negotiation', cancel auto follow up tasks
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

          // Suspend automated follow-up tasks
          updatedTasks = prev.tasks.map(t => t.opportunityId === conv.opportunityId && t.type === 'follow_up' && t.status === 'open' ? {
            ...t,
            status: 'cancelled' as const
          } : t);
        } else if (isTechnicalDoubt) {
          // C09: Pause Copilot, transfer to technical support U004
          updatedConvs = prev.conversations.map(c => c.id === conversationId ? {
            ...c,
            aiMode: 'paused' as const,
            unreadCount: c.unreadCount + 1,
            lastInboundAt: prev.meta.clock
          } : c);

          // Create technical review task
          const techTask: Task = {
            id: `T${Date.now()}`,
            opportunityId: conv.opportunityId,
            ownerId: 'U004', // Técnico Demo
            type: 'technical_review',
            title: 'Confirmar viabilidade de chicote sem referência',
            dueAt: '2026-10-12T10:00:00-03:00',
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
        tasks: updatedTasks,
        activities: [
          ...prev.activities,
          logActivity('conversation', conversationId, 'message_received', null, { channel, bodyPreview: body.slice(0, 40) })
        ]
      };
    });

    return { ok: true, data: newMsg };
  };

  // --- COMMAND: Accept Quote (C10, C11) ---
  const acceptQuote = async (quoteVersionId: string): Promise<CommandResult> => {
    await delay();
    const ver = db.quoteVersions.find(v => v.id === quoteVersionId);
    if (!ver) return { ok: false, error: { code: 'NOT_FOUND', message: 'Revisão da cotação não encontrada.' } };

    // Scenario C10: Check if expired
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

    // Scenario C11: Check if superseded
    if (ver.status === 'superseded') {
      return {
        ok: false,
        error: {
          code: 'VERSION_SUPERSEDED',
          message: 'Esta versão da cotação foi substituída por uma revisão mais recente. Por favor, visualize e aceite a versão atualizada.'
        }
      };
    }

    // Check if freight is pending
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
          message: `O comprador aceitou a cotação ${quote?.number} (Rev. ${ver.revision}). Acesse a oportunidade para confirmar o fechamento.`,
          linkRoute: quote ? `/oportunidades/${quote.opportunityId}` : '/cotacoes',
          read: false,
          createdAt: prev.meta.clock
        }
      ],
      activities: [
        ...prev.activities,
        logActivity('quote', ver.quoteId, 'accepted', { previousStatus: ver.status }, { acceptedAt: prev.meta.clock })
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
      } : v),
      activities: [
        ...prev.activities,
        logActivity('quote', ver.quoteId, 'rejected', null, { reason })
      ]
    }));

    return { ok: true };
  };

  // --- COMMAND: Tasks ---
  const completeTask = async (taskId: string): Promise<CommandResult> => {
    await delay();
    setDb(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status: 'completed' } : t),
      activities: [
        ...prev.activities,
        logActivity('task', taskId, 'completed', { status: 'open' }, { status: 'completed' })
      ]
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
      tasks: [...prev.tasks, newTask],
      activities: [
        ...prev.activities,
        logActivity('task', newTask.id, 'created', null, { title: params.title })
      ]
    }));

    return { ok: true, data: newTask };
  };

  // --- COMMAND: Advance Clock (Rule A04) ---
  const advanceClock = async (days: number): Promise<CommandResult> => {
    await delay();
    const currentDate = new Date(db.meta.clock);
    currentDate.setDate(currentDate.getDate() + days);
    const newClockIso = currentDate.toISOString().replace('.000Z', '-03:00');

    setDb(prev => {
      // Check quotes that expired (A04)
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
        quoteVersions: updatedVersions,
        automationRuns: [
          ...prev.automationRuns,
          {
            id: `RUN-${Date.now()}`,
            ruleId: 'A04',
            entityId: 'SYSTEM',
            eventKey: `clock-adv-${days}`,
            status: 'success',
            reason: `Relógio avançado em ${days} dia(s). Cotações expiradas atualizadas.`,
            createdAt: newClockIso
          }
        ]
      };
    });

    return { ok: true };
  };

  // --- RESET DEMO (C16) ---
  const resetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setDb(INITIAL_CRM_DATA);
    setCurrentUserId('U002');
  };

  // --- AUTOMATED SCENARIOS C01 - C16 EXECUTION ---
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
          eventId: db.demoNewLead.eventId // duplicate
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

      case 'C05': // Seller tries to self-approve Q002 (should be forbidden!)
        {
          const prevUser = currentUserId;
          setCurrentUserId('U002'); // Seller
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
              quantity: 3, // Changed from 2 to 3
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

      case 'C09': // AI / Copilot receives unknown application query without reference
        return await receiveInboundMessage('CV004', 'whatsapp', 'Preciso de um chicote para um equipamento sem referência. Como identificamos?');

      case 'C10': // Attempt to accept expired quote Q004
        return await acceptQuote('Q004-V1');

      case 'C11': // Attempt to accept superseded version
        {
          // Mark Q003 as superseded then try to accept
          setDb(prev => ({
            ...prev,
            quoteVersions: prev.quoteVersions.map(v => v.id === 'Q003-V1' ? { ...v, status: 'superseded' } : v)
          }));
          return await acceptQuote('Q003-V1');
        }

      case 'C12': // Mark opportunity won with accepted quote Q005
        return await moveOpportunity('O007', 'won');

      case 'C13': // Mark opportunity lost without reason (should fail)
        return await moveOpportunity('O001', 'lost', '');

      case 'C14': // Contact with two active negotiations sends message
        return await receiveInboundMessage('CV001', 'whatsapp', 'Olá, gostaria de confirmar o andamento da minha solicitação.');

      case 'C15': // WhatsApp outside 24h window sends free text
        return await sendChatMessage('CV006', 'whatsapp', 'Mensagem de contato fora da janela de 24h');

      case 'C16': // Reset demo
        resetDemo();
        return { ok: true };

      default:
        return { ok: false, error: { code: 'NOT_FOUND', message: 'Cenário não reconhecido.' } };
    }
  };

  // --- METRICS CALCULATION (Exact derivation from database) ---
  const metrics = useMemo(() => {
    // 1. Open opportunities (stages other than won or lost)
    const openOpps = db.opportunities.filter(o => o.stage !== 'won' && o.stage !== 'lost');

    // 2. Open value: sum of latest sent version total, or estimatedValue
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

    // 3. Won opportunities
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

    // 4. Lost opportunities
    const lostOpps = db.opportunities.filter(o => o.stage === 'lost');

    // 5. Win rate among closed (won / (won + lost))
    const totalClosed = wonOpps.length + lostOpps.length;
    const closedWinRate = totalClosed > 0 ? (wonOpps.length / totalClosed) : null;

    // 6. Overdue tasks: status open and dueAt < clock
    const clockTime = new Date(db.meta.clock).getTime();
    const overdueTasks = db.tasks.filter(t => t.status === 'open' && new Date(t.dueAt).getTime() < clockTime).length;

    // 7. Unassigned leads
    const unassignedLeads = db.leads.filter(l => !l.ownerId).length;

    return {
      openOpportunities: openOpps.length,
      openValueCents,
      wonOpportunities: wonOpps.length,
      wonValueCents,
      lostOpportunities: lostOpps.length,
      closedWinRate,
      overdueTasks,
      unassignedLeads
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
        assignOwner,
        moveOpportunity,
        saveQuoteDraft,
        requestApproval,
        decideApproval,
        createQuoteForOpportunity,
        reviseQuote,
        sendQuote,
        sendChatMessage,
        receiveInboundMessage,
        acceptQuote,
        rejectQuote,
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
