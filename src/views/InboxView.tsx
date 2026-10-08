import React, { useState, useMemo } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  Search,
  Filter,
  MessageSquare,
  Mail,
  Lock,
  Send,
  User,
  Building2,
  FileText,
  AlertTriangle,
  Bot,
  ExternalLink,
  Clock,
  Sparkles,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  Plus
} from 'lucide-react';
import { formatCurrency, formatDate, formatRelativeTime } from '../utils/formatters';

interface InboxViewProps {
  navigateTo: (route: string) => void;
}

export const InboxView: React.FC<InboxViewProps> = ({ navigateTo }) => {
  const {
    db,
    currentUser,
    sendChatMessage,
    receiveInboundMessage,
    assignOwner,
    createQuoteForOpportunity
  } = useCrm();

  const [selectedConvId, setSelectedConvId] = useState<string>('CV001');
  const [filterTab, setFilterTab] = useState<'all' | 'mine' | 'unassigned' | 'unread' | 'waiting_team' | 'ai_paused'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'email'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editor states
  const [activeChannelTab, setActiveChannelTab] = useState<'whatsapp' | 'email' | 'internal_note'>('whatsapp');
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtered conversations
  const filteredConversations = useMemo(() => {
    return db.conversations.filter(c => {
      if (filterTab === 'mine' && c.ownerId !== currentUser.id) return false;
      if (filterTab === 'unassigned' && c.ownerId !== null) return false;
      if (filterTab === 'unread' && c.unreadCount === 0) return false;
      if (filterTab === 'waiting_team' && c.state !== 'waiting_team') return false;
      if (filterTab === 'ai_paused' && c.aiMode !== 'paused') return false;

      // Contact or company search
      const contact = db.contacts.find(ct => ct.id === c.contactId);
      const company = contact ? db.companies.find(comp => comp.id === contact.companyId) : null;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const contactMatch = contact?.name.toLowerCase().includes(q);
        const compMatch = company?.name.toLowerCase().includes(q);
        if (!contactMatch && !compMatch) return false;
      }

      return true;
    });
  }, [db.conversations, db.contacts, db.companies, filterTab, searchQuery, currentUser.id]);

  const activeConv = useMemo(() => {
    return db.conversations.find(c => c.id === selectedConvId) || db.conversations[0];
  }, [db.conversations, selectedConvId]);

  const activeContact = useMemo(() => {
    return db.contacts.find(c => c.id === activeConv?.contactId);
  }, [db.contacts, activeConv]);

  const activeCompany = useMemo(() => {
    return db.companies.find(c => c.id === activeContact?.companyId);
  }, [db.companies, activeContact]);

  const activeOpportunity = useMemo(() => {
    return db.opportunities.find(o => o.id === activeConv?.opportunityId);
  }, [db.opportunities, activeConv]);

  const activeQuote = useMemo(() => {
    if (!activeOpportunity) return null;
    return db.quotes.find(q => q.opportunityId === activeOpportunity.id);
  }, [db.quotes, activeOpportunity]);

  const activeQuoteVersion = useMemo(() => {
    if (!activeQuote) return null;
    return db.quoteVersions.find(v => v.id === activeQuote.currentVersionId);
  }, [db.quoteVersions, activeQuote]);

  // Messages in this conversation
  const conversationMessages = useMemo(() => {
    if (!activeConv) return [];
    return db.messages
      .filter(m => m.conversationId === activeConv.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [db.messages, activeConv]);

  // Check 24-hour WhatsApp window
  const isWhatsAppWindowExpired = useMemo(() => {
    if (!activeConv) return false;
    const lastInboundTime = new Date(activeConv.lastInboundAt).getTime();
    const clockTime = new Date(db.meta.clock).getTime();
    const diffHours = (clockTime - lastInboundTime) / (1000 * 60 * 60);
    return diffHours > 24;
  }, [activeConv, db.meta.clock]);

  // Handle send
  const handleSendMessage = async (isTemplate = false, templateText?: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const textToSend = templateText || messageBody;

    if (!textToSend.trim()) {
      setErrorMessage('Digite uma mensagem antes de enviar.');
      return;
    }

    setSending(true);
    const res = await sendChatMessage(activeConv.id, activeChannelTab, textToSend, isTemplate);
    setSending(false);

    if (!res.ok && res.error) {
      setErrorMessage(res.error.message);
    } else {
      setMessageBody('');
      setSuccessMessage('Mensagem enviada com sucesso no ambiente simulado!');
      setTimeout(() => setSuccessMessage(null), 3500);
    }
  };

  // Copilot deterministic analysis for the active conversation
  const copilotInsight = useMemo(() => {
    if (!activeConv) return null;

    // Check last inbound message
    const lastInbound = [...conversationMessages]
      .reverse()
      .find(m => m.direction === 'inbound');

    const bodyLower = lastInbound?.body.toLowerCase() || '';

    if (bodyLower.includes('sem referência') || bodyLower.includes('como identificamos')) {
      return {
        status: 'need_human' as const,
        reason: 'Solicitação de chicote para equipamento sem referência técnica conhecida.',
        actionRequired: 'Encaminhar ao Apoio Técnico para confirmação de chicote sob medida.',
        citedDoc: 'K002 - Triagem comercial demonstrativa (Aprovado)',
        suggestedDraft: 'Vou encaminhar sua solicitação para nossa equipe técnica confirmar a aplicação antes de preparar a cotação.'
      };
    }

    if (bodyLower.includes('8%') || bodyLower.includes('desconto')) {
      return {
        status: 'ready' as const,
        reason: 'Cliente solicita renegociação com desconto de 8%.',
        actionRequired: 'Criar nova revisão da cotação e submeter para aprovação do gestor (alçada comercial > 5%).',
        citedDoc: 'K001 - Catálogo demonstrativo & Regras de Alçada',
        suggestedDraft: 'Recebemos seu pedido de 8% de desconto. Estou submetendo a proposta para aprovação interna do nosso gestor.'
      };
    }

    return {
      status: 'ready' as const,
      reason: 'Solicitação de itens padrão identificada.',
      actionRequired: 'Confirmar itens: 2x Chicote Padrão (DEMO-MW-001) e 4x Conector (DEMO-MW-002).',
      citedDoc: 'K001 - Catálogo demonstrativo',
      suggestedDraft: 'Olá! Preparamos sua cotação formal com os itens solicitados do catálogo demonstrativo. Segue o documento para sua conferência.'
    };
  }, [activeConv, conversationMessages]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-[#F5F6F0] overflow-hidden text-xs text-[#223237]">
      {/* COLUMN 1: Conversation List */}
      <div className="w-full md:w-80 border-r border-[#dae0d7] bg-white flex flex-col shrink-0">
        {/* Search & Filters */}
        <div className="p-3 border-b border-[#dae0d7] space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#53636A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar compradores..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#F5F6F0] border border-[#dae0d7] rounded-md text-xs placeholder-[#53636A] focus:outline-hidden"
            />
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex space-x-1 overflow-x-auto pb-1 text-[11px]">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'mine', label: 'Minhas' },
              { id: 'unread', label: 'Não lidas' },
              { id: 'waiting_team', label: 'Pendente' },
              { id: 'ai_paused', label: 'IA Pausada' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition ${
                  filterTab === tab.id
                    ? 'bg-[#223237] text-white font-semibold'
                    : 'bg-[#F5F6F0] text-[#53636A] hover:bg-[#eaece5]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#dae0d7]/70">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-[#53636A]">
              Nenhuma conversa encontrada com os filtros selecionados.
            </div>
          ) : (
            filteredConversations.map(c => {
              const contact = db.contacts.find(ct => ct.id === c.contactId);
              const company = contact ? db.companies.find(comp => comp.id === contact.companyId) : null;
              const owner = db.users.find(u => u.id === c.ownerId);
              const lastMsg = db.messages
                .filter(m => m.conversationId === c.id)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

              const isSelected = c.id === activeConv?.id;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedConvId(c.id)}
                  className={`p-3 cursor-pointer transition flex flex-col space-y-1 ${
                    isSelected ? 'bg-[#F5F6F0] border-l-4 border-l-[#B1D448]' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#223237] truncate">{contact?.name || 'Comprador'}</span>
                    <span className="text-[10px] text-[#53636A] whitespace-nowrap">
                      {formatRelativeTime(c.lastInboundAt, db.meta.clock)}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#53636A] truncate">
                    {company?.name || 'Empresa'}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#53636A] pt-1">
                    <span className="truncate max-w-[170px] text-[#223237]">
                      {lastMsg ? lastMsg.body : 'Sem mensagens'}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="bg-[#B1D448] text-[#223237] font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 pt-1 text-[10px]">
                    <span className="bg-[#eaece5] px-1.5 py-0.5 rounded text-[#53636A]">
                      Resp: {owner ? owner.name.split(' ')[0] : 'Sem resp.'}
                    </span>
                    {c.aiMode === 'paused' && (
                      <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                        IA Pausada
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* COLUMN 2: Message History & Editor */}
      <div className="flex-1 flex flex-col bg-white border-r border-[#dae0d7] overflow-hidden">
        {/* Conversation Header */}
        <div className="h-14 border-b border-[#dae0d7] px-4 flex items-center justify-between bg-[#FAFAFA] shrink-0">
          <div className="flex items-center space-x-3">
            <div>
              <div className="font-bold text-sm text-[#223237] flex items-center space-x-2">
                <span>{activeContact?.name}</span>
                <span className="text-[11px] font-normal text-[#53636A]">({activeCompany?.name})</span>
              </div>
              <div className="text-[11px] text-[#53636A] flex items-center space-x-2">
                <span>Canal preferencial: {activeContact?.preferredChannel}</span>
                <span>•</span>
                <span>ID: {activeContact?.whatsappMockId}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {activeConv?.ownerId !== currentUser.id && (
              <button
                onClick={() => assignOwner(activeOpportunity?.id || '', currentUser.id)}
                className="bg-[#223237] text-white px-2.5 py-1 rounded text-xs font-semibold hover:bg-[#2d3f45] transition"
              >
                Assumir Conversa
              </button>
            )}

            {activeOpportunity && (
              <button
                onClick={() => navigateTo(`/oportunidades/${activeOpportunity.id}`)}
                className="border border-[#dae0d7] text-[#223237] hover:bg-[#F5F6F0] px-2.5 py-1 rounded text-xs font-medium flex items-center space-x-1 transition"
              >
                <span>Ver Negociação</span>
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Message Thread History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F5F6F0]/60">
          {conversationMessages.map(msg => {
            const isOutbound = msg.direction === 'outbound';
            const isNote = msg.channel === 'internal_note';
            const isQuoteAttached = msg.quoteVersionId !== null;

            if (isNote) {
              return (
                <div key={msg.id} className="mx-auto max-w-lg bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 uppercase tracking-wide">
                    <span className="flex items-center space-x-1">
                      <Lock size={11} />
                      <span>Nota Interna (Visível apenas para a equipe)</span>
                    </span>
                    <span>{formatDate(msg.createdAt, true)}</span>
                  </div>
                  <div className="mt-1 text-xs leading-relaxed">{msg.body}</div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-md rounded-xl p-3 shadow-2xs ${
                    isOutbound
                      ? 'bg-[#223237] text-white rounded-br-none'
                      : 'bg-white text-[#223237] border border-[#dae0d7] rounded-bl-none'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] mb-1 gap-4 opacity-80">
                    <span className="font-semibold flex items-center space-x-1">
                      {msg.channel === 'whatsapp' ? <MessageSquare size={11} className="text-[#B1D448]" /> : <Mail size={11} />}
                      <span className="capitalize">{msg.channel}</span>
                      <span>• {isOutbound ? 'Equipe' : activeContact?.name}</span>
                    </span>
                    <span>{formatDate(msg.createdAt, true)}</span>
                  </div>

                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.body}</p>

                  {/* Quote attachment preview */}
                  {isQuoteAttached && (
                    <div className="mt-2.5 pt-2 border-t border-white/20 bg-black/10 p-2 rounded flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText size={16} className="text-[#B1D448]" />
                        <div>
                          <div className="font-bold text-[11px]">Cotação Vinculada</div>
                          <div className="text-[10px] opacity-80">Revisão formal gerada</div>
                        </div>
                      </div>
                      <button
                        onClick={() => navigateTo(`/cotacoes/${activeQuote?.id}`)}
                        className="text-[10px] bg-[#B1D448] text-[#223237] px-2 py-0.5 rounded font-bold hover:bg-[#c4e655]"
                      >
                        Visualizar
                      </button>
                    </div>
                  )}

                  {/* Delivery status indicator */}
                  {isOutbound && (
                    <div className="mt-1 text-[9px] text-right opacity-70">
                      Status simulado: {msg.deliveryStatus === 'failed' ? '❌ Falha no envio' : '✓ Enviado'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Message Editor Bar */}
        <div className="border-t border-[#dae0d7] p-3 bg-white space-y-2">
          {/* Channel selector tabs */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveChannelTab('whatsapp')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activeChannelTab === 'whatsapp'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#F5F6F0] text-[#53636A] hover:bg-[#eaece5]'
                }`}
              >
                <MessageSquare size={13} />
                <span>WhatsApp ({activeContact?.whatsappMockId})</span>
              </button>

              <button
                onClick={() => setActiveChannelTab('email')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activeChannelTab === 'email'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#F5F6F0] text-[#53636A] hover:bg-[#eaece5]'
                }`}
              >
                <Mail size={13} />
                <span>E-mail ({activeContact?.email})</span>
              </button>

              <button
                onClick={() => setActiveChannelTab('internal_note')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activeChannelTab === 'internal_note'
                    ? 'bg-amber-600 text-white'
                    : 'bg-[#F5F6F0] text-[#53636A] hover:bg-[#eaece5]'
                }`}
              >
                <Lock size={13} />
                <span>Nota Interna</span>
              </button>
            </div>

            <span className="text-[10px] text-[#53636A]">
              Destino ativo: <strong className="text-[#223237]">{activeChannelTab}</strong>
            </span>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs">
              {successMessage}
            </div>
          )}

          {/* WhatsApp 24h Window Warning & Template Selector (C15) */}
          {activeChannelTab === 'whatsapp' && isWhatsAppWindowExpired && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                <span className="text-[11px]">
                  <strong>Janela de 24h do WhatsApp expirada.</strong> A política do provedor exige envio de modelo aprovado.
                </span>
              </div>
              <button
                onClick={() => handleSendMessage(true, 'Olá! Retomando nosso contato sobre sua cotação na MegaWhip. Você ainda precisa desses componentes?')}
                className="bg-amber-700 hover:bg-amber-800 text-white px-2.5 py-1 rounded text-xs font-semibold shrink-0"
              >
                Enviar Modelo Padrão
              </button>
            </div>
          )}

          {/* Text Area */}
          <div className="flex items-end space-x-2">
            <textarea
              rows={2}
              value={messageBody}
              onChange={e => setMessageBody(e.target.value)}
              placeholder={
                activeChannelTab === 'internal_note'
                  ? 'Escreva uma anotação privada visível apenas para a equipe MegaWhip...'
                  : activeChannelTab === 'whatsapp' && isWhatsAppWindowExpired
                  ? 'Texto livre bloqueado fora da janela de 24h. Use o botão acima para enviar modelo...'
                  : `Responder para ${activeContact?.name} via ${activeChannelTab}...`
              }
              disabled={activeChannelTab === 'whatsapp' && isWhatsAppWindowExpired}
              className="flex-1 p-2.5 border border-[#dae0d7] rounded-lg text-xs focus:outline-hidden focus:border-[#B1D448] resize-none disabled:bg-gray-100"
            />

            <button
              onClick={() => handleSendMessage(false)}
              disabled={sending || (activeChannelTab === 'whatsapp' && isWhatsAppWindowExpired)}
              className="h-10 px-4 bg-[#223237] hover:bg-[#2d3f45] text-white rounded-lg font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              <Send size={14} className="text-[#B1D448]" />
              <span>Simular Envio</span>
            </button>
          </div>
        </div>
      </div>

      {/* COLUMN 3: Customer Details & AI Copilot */}
      <div className="w-full md:w-80 p-4 space-y-4 overflow-y-auto bg-[#F5F6F0] shrink-0 border-t md:border-t-0">
        {/* AI Copilot Panel */}
        <div className="bg-white p-4 rounded-xl border border-[#dae0d7] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 font-bold text-xs text-[#223237]">
              <Sparkles size={15} className="text-[#B1D448]" />
              <span>Copiloto de Atendimento</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              copilotInsight?.status === 'need_human' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {copilotInsight?.status === 'need_human' ? 'Apoio Humano' : 'Sugestão Pronta'}
            </span>
          </div>

          <p className="text-[11px] text-[#53636A] leading-relaxed">
            {copilotInsight?.reason}
          </p>

          <div className="p-2.5 bg-[#F5F6F0] rounded-lg border border-[#dae0d7] space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#53636A]">
              Ação Sugerida
            </div>
            <div className="text-xs font-medium text-[#223237]">
              {copilotInsight?.actionRequired}
            </div>
            <div className="text-[10px] text-[#53636A] flex items-center space-x-1 pt-1">
              <span>Fonte:</span>
              <strong className="text-[#223237]">{copilotInsight?.citedDoc}</strong>
            </div>
          </div>

          {/* Draft text insertion button */}
          {copilotInsight?.suggestedDraft && (
            <button
              onClick={() => setMessageBody(copilotInsight.suggestedDraft)}
              className="w-full py-1.5 bg-[#B1D448] hover:bg-[#c2e652] text-[#223237] font-semibold text-xs rounded-md shadow-xs transition"
            >
              Inserir Rascunho Sugerido
            </button>
          )}

          {copilotInsight?.status === 'need_human' && (
            <button
              onClick={() => {
                assignOwner(activeOpportunity?.id || '', 'U004'); // Assign to Technical
                setSuccessMessage('Solicitação transferida para o Técnico Demo (U004).');
              }}
              className="w-full py-1.5 bg-[#223237] hover:bg-[#2d3f45] text-white font-semibold text-xs rounded-md transition"
            >
              Encaminhar ao Apoio Técnico
            </button>
          )}
        </div>

        {/* Opportunity & Quote Card */}
        <div className="bg-white p-4 rounded-xl border border-[#dae0d7] shadow-xs space-y-3">
          <div className="font-bold text-xs text-[#223237] flex items-center justify-between">
            <span>Oportunidade Vinculada</span>
            {activeOpportunity && (
              <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                {activeOpportunity.id}
              </span>
            )}
          </div>

          {activeOpportunity ? (
            <div className="space-y-2 text-xs">
              <div>
                <div className="text-[11px] text-[#53636A]">Título:</div>
                <div className="font-medium text-[#223237]">{activeOpportunity.title}</div>
              </div>

              <div className="flex justify-between">
                <div>
                  <div className="text-[11px] text-[#53636A]">Etapa:</div>
                  <div className="font-semibold capitalize text-[#223237]">{activeOpportunity.stage}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-[#53636A]">Valor:</div>
                  <div className="font-mono font-bold text-emerald-700">
                    {formatCurrency(activeOpportunity.estimatedValueCents)}
                  </div>
                </div>
              </div>

              {activeQuote && activeQuoteVersion ? (
                <div className="p-2.5 bg-gray-50 rounded-lg border border-[#dae0d7] space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-[#223237]">{activeQuote.number}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                      Rev. {activeQuoteVersion.revision} • {activeQuoteVersion.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#53636A]">
                    Total: {formatCurrency(activeQuoteVersion.totalCents)}
                  </div>
                  <button
                    onClick={() => navigateTo(`/cotacoes/${activeQuote.id}`)}
                    className="w-full mt-1 py-1 bg-white border border-[#dae0d7] hover:bg-gray-100 rounded text-[11px] font-medium"
                  >
                    Abrir Cotação Completa
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => createQuoteForOpportunity(activeOpportunity.id)}
                  className="w-full py-2 bg-[#223237] text-white rounded font-semibold text-xs hover:bg-[#2d3f45]"
                >
                  + Criar Nova Cotação
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-[#53636A]">
              Nenhuma oportunidade vinculada a este contato.
            </div>
          )}
        </div>

        {/* Customer Information Card */}
        <div className="bg-white p-4 rounded-xl border border-[#dae0d7] shadow-xs space-y-2 text-xs">
          <div className="font-bold text-xs text-[#223237]">Ficha do Cliente</div>
          <div className="space-y-1.5 text-[#53636A]">
            <div>Empresa: <strong className="text-[#223237]">{activeCompany?.name}</strong></div>
            <div>Segmento: <span className="text-[#223237]">{activeCompany?.segment}</span></div>
            <div>Cidade: <span className="text-[#223237]">{activeCompany?.city}/{activeCompany?.state}</span></div>
            <div>WhatsApp: <span className="text-[#223237] font-mono">{activeContact?.whatsappMockId}</span></div>
            <div>E-mail: <span className="text-[#223237]">{activeContact?.email}</span></div>
          </div>
          <button
            onClick={() => activeCompany && navigateTo(`/clientes/${activeCompany.id}`)}
            className="w-full mt-2 py-1.5 border border-[#dae0d7] hover:bg-[#F5F6F0] rounded text-[11px] font-medium text-[#223237]"
          >
            Ver Histórico da Empresa
          </button>
        </div>
      </div>
    </div>
  );
};
