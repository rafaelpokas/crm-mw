export type UserRole = 'manager' | 'seller' | 'technical' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  active: boolean;
}

export interface CompanySegmentProfile {
  mainSegment: string;
  additionalSegments: string[];
  crop: string[];
  supplyChainRole: string;
  region: string;
  confirmedMachines: string[];
  qualificationStatus: 'pending_segment' | 'partial' | 'confirmed';
  confidence: 'hypothesis' | 'confirmed';
  lastValidatedAt?: string;
  validationSource?: string;
}

export interface Company {
  id: string;
  name: string;
  segment: string;
  city: string;
  state: string;
  document: string | null;
  fictitious: boolean;
  segmentProfile?: CompanySegmentProfile;
}

export interface Touchpoint {
  id: string;
  contactId: string;
  companyId?: string;
  channel: 'instagram' | 'landing_page' | 'catalog' | 'site' | 'whatsapp' | 'email';
  campaign?: string;
  pageOrAd?: string;
  details: string;
  selectedProducts?: { sku: string; quantity: number }[];
  machineModel?: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  companyId: string;
  name: string;
  email: string;
  whatsappMockId: string;
  preferredChannel: 'whatsapp' | 'email';
  doNotContact: boolean;
  unsubscribedFromMarketing?: boolean;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export type LeadSource =
  | 'site'
  | 'whatsapp'
  | 'email'
  | 'referral'
  | 'event'
  | 'manual'
  | 'instagram'
  | 'landing_page'
  | 'catalog';

export interface Lead {
  id: string;
  contactId: string;
  source: LeadSource;
  campaign: string | null;
  interest: string;
  status: LeadStatus;
  ownerId: string | null;
  createdAt: string;
  convertedOpportunityId: string | null;
  catalogContext?: {
    machineModel?: string;
    selectedItems?: { sku: string; quantity: number }[];
  };
}

export type OpportunityStage = 'new' | 'qualification' | 'quoting' | 'quote_sent' | 'negotiation' | 'won' | 'lost';
export type TechnicalStatus = 'pending' | 'approved_demo' | 'rejected_demo';

export interface Opportunity {
  id: string;
  companyId: string;
  contactId: string;
  title: string;
  stage: OpportunityStage;
  ownerId: string | null;
  estimatedValueCents: number;
  technicalStatus: TechnicalStatus;
  createdAt: string;
  stageEnteredAt: string;
  closedAt: string | null;
  lostReason: string | null;
  version: number;
  erpSyncStatus?: 'not_sent' | 'waiting_dispatch' | 'processing' | 'confirmed' | 'failed' | 'needs_review';
  erpOrderId?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  unitPriceCents: number | null;
  availability: string;
  active: boolean;
  requiresTechnicalApproval: boolean;
  knowledgeId: string;
  application: string;
}

export interface QuoteLine {
  productId: string;
  skuSnapshot: string;
  nameSnapshot: string;
  quantity: number;
  unitPriceCents: number;
  discountBps: number;
  grossCents: number;
  discountCents: number;
  netCents: number;
  technicalNote?: string;
}

export type QuoteStatus = 'draft' | 'ready' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'superseded' | 'cancelled';
export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';

export interface QuoteVersion {
  id: string;
  quoteId: string;
  revision: number;
  status: QuoteStatus;
  approvalStatus: ApprovalStatus;
  lines: QuoteLine[];
  freightCents: number;
  freightPending: boolean;
  totalCents: number;
  validUntil: string;
  paymentTerms: string;
  deliveryTerms: string;
  technicalApproved: boolean;
  createdBy: string;
  sentAt: string | null;
  acceptedAt: string | null;
  version: number;
}

export interface Quote {
  id: string;
  number: string;
  opportunityId: string;
  currentVersionId: string;
  createdAt: string;
}

export interface Approval {
  id: string;
  quoteVersionId: string;
  requestedBy: string;
  decidedBy: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  requestedAt: string;
  decidedAt: string | null;
}

export type ConversationState = 'waiting_team' | 'waiting_client' | 'closed';
export type AiMode = 'off' | 'copilot' | 'auto_triage' | 'paused';

export interface Conversation {
  id: string;
  contactId: string;
  opportunityId: string | null;
  ownerId: string | null;
  state: ConversationState;
  aiMode: AiMode;
  lastInboundAt: string;
  unreadCount: number;
}

export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';

export interface Message {
  id: string;
  conversationId: string;
  channel: 'whatsapp' | 'email' | 'internal_note';
  direction: 'inbound' | 'outbound';
  authorId: string | null;
  body: string;
  deliveryStatus: DeliveryStatus;
  createdAt: string;
  quoteVersionId: string | null;
  clientRequestId: string | null;
  providerEventId: string | null;
}

export type TaskType = 'follow_up' | 'technical_review' | 'quote_draft' | 'manager_approval' | 'market_outreach' | 'qualification';
export type TaskStatus = 'open' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  opportunityId: string;
  ownerId: string;
  type: TaskType;
  title: string;
  dueAt: string;
  status: TaskStatus;
  automationKey: string | null;
}

export interface Activity {
  id: string;
  entityType: 'lead' | 'opportunity' | 'quote' | 'approval' | 'conversation' | 'task' | 'erp' | 'campaign' | 'market_alert';
  entityId: string;
  actorId: string;
  action: string;
  before: any;
  after: any;
  createdAt: string;
  correlationId?: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  layer: 'approved_knowledge' | 'live_data' | 'relationship_memory' | 'operational_rules' | 'execution_memory';
  version: number;
  status: 'draft' | 'approved' | 'inactive';
  approvedBy: string | null;
  content: string;
}

export interface AutomationRule {
  id: string;
  trigger: string;
  conditions: string;
  action: string;
  active: boolean;
}

export interface AutomationRun {
  id: string;
  ruleId: string;
  entityId: string;
  eventKey: string;
  status: 'success' | 'ignored' | 'failed';
  reason: string;
  createdAt: string;
}

export interface Integration {
  id: string;
  channel: 'site' | 'whatsapp' | 'email' | 'erp' | 'instagram' | 'landing_page';
  mode: 'mock';
  state: 'connected' | 'disconnected' | 'error' | 'undefined';
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  linkRoute?: string;
  read: boolean;
  createdAt: string;
}

// --- NEW ECOSYSTEM ENTITIES (13/10/2026 UPDATE) ---

export interface ErpStockItem {
  sku: string;
  name: string;
  physicalStock: number;
  availableStock: number;
  reservedStock: number;
  warehouse: string;
  unit: string;
  lastSyncAt: string;
  erpStatus: 'synced' | 'pending' | 'timeout' | 'error';
}

export interface ErpOrderSync {
  id: string;
  quoteId: string;
  opportunityId: string;
  erpOrderId?: string;
  status: 'waiting_dispatch' | 'processing' | 'confirmed' | 'failed' | 'needs_review';
  errorMessage?: string;
  dispatchedAt?: string;
  confirmedAt?: string;
  correlationId: string;
}

export interface MarketCalendarItem {
  id: string;
  segment: string;
  region: string;
  cropOrCycle: string;
  periodReference: string;
  status: 'active' | 'expired' | 'under_review';
  sourceDocument: string;
  reviewedBy: string;
  validUntil: string;
  opportunitySummary: string;
}

export interface MarketIntelligenceAlert {
  id: string;
  title: string;
  reason: string;
  eligibleSegment: string;
  eligibleRegion: string;
  targetAudienceCount: number;
  sourceCalendarId: string;
  suggestedAction: 'individual_message' | 'targeted_catalog' | 'campaign' | 'commercial_contact';
  targetProducts: string[];
  draftSubject: string;
  draftMessage: string;
  stockStatus: 'available_confirmed' | 'stock_low' | 'pending_erp';
  status: 'new' | 'approved' | 'dismissed' | 'executed';
  createdAt: string;
}

export interface Campaign {
  id: string;
  title: string;
  objective: string;
  targetSegment: string;
  targetRegion: string;
  channel: 'whatsapp' | 'email';
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  audienceCount: number;
  excludedUnsubscribedCount: number;
  subject: string;
  messageBody: string;
  attachedCatalogSkuList?: string[];
  approvedBy: string | null;
  approvedAt: string | null;
  scheduledFor?: string;
  sentCount: number;
  responseCount: number;
  createdOpportunitiesCount: number;
  createdAt: string;
}

export interface CrmRules {
  sellerDiscountLimitBps: number;
  quantityMax: number;
  defaultLatencyMs: number;
  followUpBusinessDays: number;
  excludeWeekends: boolean;
  holidayCalendar: null;
  realIntegrationsEnabled: boolean;
  erpApiTimeoutMs?: number;
}

export interface CrmDatabase {
  meta: {
    schemaVersion: number;
    name: string;
    synthetic: boolean;
    clock: string;
    timezone: string;
    currency: string;
    locale: string;
    defaultUserId: string;
    notice: string;
  };
  rules: CrmRules;
  users: User[];
  companies: Company[];
  contacts: Contact[];
  touchpoints: Touchpoint[];
  leads: Lead[];
  opportunities: Opportunity[];
  products: Product[];
  quotes: Quote[];
  quoteVersions: QuoteVersion[];
  approvals: Approval[];
  conversations: Conversation[];
  messages: Message[];
  tasks: Task[];
  activities: Activity[];
  knowledgeDocuments: KnowledgeDocument[];
  automationRules: AutomationRule[];
  automationRuns: AutomationRun[];
  integrations: Integration[];
  notifications: NotificationItem[];
  erpStock: ErpStockItem[];
  erpOrderSyncs: ErpOrderSync[];
  marketCalendar: MarketCalendarItem[];
  marketAlerts: MarketIntelligenceAlert[];
  campaigns: Campaign[];
  scenarios: { id: string; enabled: boolean }[];
  expectedInitialMetrics: {
    openOpportunities: number;
    openValueCents: number;
    wonOpportunities: number;
    wonValueCents: number;
    lostOpportunities: number;
    closedWinRate: number;
    overdueTasks: number;
  };
  demoNewLead: {
    eventId: string;
    name: string;
    company: string;
    email: string;
    whatsappMockId: string;
    source: LeadSource;
    interest: string;
    technicalStatus: TechnicalStatus;
  };
  demoResponses: {
    summary: string;
    clarification: string;
    handoff: string;
    discountRequest: string;
    acceptance: string;
  };
  simulatedErrors: {
    failWhatsApp: boolean;
    failEmail: boolean;
    erpTimeout: boolean;
  };
}
