import React, { useState, useMemo } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  Kanban as KanbanIcon,
  List,
  Filter,
  DollarSign,
  Clock,
  AlertTriangle,
  FileText,
  User,
  ArrowRight,
  MoreVertical,
  ChevronRight,
  CheckCircle,
  XCircle,
  Sparkles
} from 'lucide-react';
import { formatCurrency, formatDate, formatRelativeTime } from '../utils/formatters';
import { OpportunityStage, Opportunity } from '../data/types';

interface PipelineViewProps {
  navigateTo: (route: string) => void;
}

const STAGES: { id: OpportunityStage; label: string; bg: string; border: string }[] = [
  { id: 'new', label: 'Novo Lead', bg: 'bg-slate-50', border: 'border-slate-300' },
  { id: 'qualification', label: 'Em Qualificação', bg: 'bg-blue-50/50', border: 'border-blue-200' },
  { id: 'quoting', label: 'Em Cotação', bg: 'bg-amber-50/50', border: 'border-amber-200' },
  { id: 'quote_sent', label: 'Cotação Enviada', bg: 'bg-purple-50/50', border: 'border-purple-200' },
  { id: 'negotiation', label: 'Em Negociação', bg: 'bg-indigo-50/50', border: 'border-indigo-200' }
];

export const PipelineView: React.FC<PipelineViewProps> = ({ navigateTo }) => {
  const { db, currentUser, moveOpportunity } = useCrm();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [activeTab, setActiveTab] = useState<'active' | 'won' | 'lost'>('active');
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [movingOppId, setMovingOppId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Lost modal state
  const [lostModalOppId, setLostModalOppId] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState<string>('Preço');

  // Filter opportunities
  const filteredOpps = useMemo(() => {
    return db.opportunities.filter(o => {
      if (selectedSeller !== 'all' && o.ownerId !== selectedSeller) return false;
      if (activeTab === 'active') {
        return o.stage !== 'won' && o.stage !== 'lost';
      } else if (activeTab === 'won') {
        return o.stage === 'won';
      } else {
        return o.stage === 'lost';
      }
    });
  }, [db.opportunities, selectedSeller, activeTab]);

  const handleStageChange = async (oppId: string, targetStage: OpportunityStage) => {
    setMoveError(null);
    setMovingOppId(oppId);

    if (targetStage === 'lost') {
      setLostModalOppId(oppId);
      setMovingOppId(null);
      return;
    }

    const res = await moveOpportunity(oppId, targetStage);
    setMovingOppId(null);

    if (!res.ok && res.error) {
      setMoveError(res.error.message);
    }
  };

  const handleConfirmLost = async () => {
    if (!lostModalOppId) return;
    setMoveError(null);
    const res = await moveOpportunity(lostModalOppId, 'lost', lostReason);
    if (!res.ok && res.error) {
      setMoveError(res.error.message);
    } else {
      setLostModalOppId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 text-xs text-[#223237]">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#223237] flex items-center space-x-2">
            <span>Funil de Vendas B2B (T05)</span>
            <span className="text-xs font-normal bg-[#B1D448]/20 text-[#223237] px-2 py-0.5 rounded border border-[#B1D448]/40">
              {filteredOpps.length} negociações
            </span>
          </h1>
          <p className="text-xs text-[#53636A] mt-1">
            Acompanhe cada etapa de avanço, cotações enviadas, alçadas e validações técnicas.
          </p>
        </div>

        {/* View Switcher & Filters */}
        <div className="flex items-center space-x-3 flex-wrap">
          {/* Active / Won / Lost Tabs */}
          <div className="flex space-x-1 bg-[#F5F6F0] p-1 rounded-lg border border-[#dae0d7]">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                activeTab === 'active' ? 'bg-[#223237] text-white shadow-2xs' : 'text-[#53636A] hover:text-[#223237]'
              }`}
            >
              Em Andamento
            </button>
            <button
              onClick={() => setActiveTab('won')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                activeTab === 'won' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-[#53636A] hover:text-emerald-700'
              }`}
            >
              Ganhos ({db.opportunities.filter(o => o.stage === 'won').length})
            </button>
            <button
              onClick={() => setActiveTab('lost')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                activeTab === 'lost' ? 'bg-rose-700 text-white shadow-2xs' : 'text-[#53636A] hover:text-rose-700'
              }`}
            >
              Perdidos ({db.opportunities.filter(o => o.stage === 'lost').length})
            </button>
          </div>

          {/* Seller Filter */}
          <div className="flex items-center space-x-1 bg-[#F5F6F0] px-2.5 py-1.5 rounded-md border border-[#dae0d7]">
            <Filter size={13} className="text-[#53636A]" />
            <select
              value={selectedSeller}
              onChange={e => setSelectedSeller(e.target.value)}
              className="bg-transparent text-xs text-[#223237] focus:outline-hidden"
            >
              <option value="all">Todos os Vendedores</option>
              {db.users.filter(u => u.role === 'seller').map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Kanban / List Toggle */}
          <div className="flex items-center bg-[#F5F6F0] p-1 rounded-md border border-[#dae0d7]">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1 rounded ${viewMode === 'kanban' ? 'bg-white shadow-2xs text-[#223237]' : 'text-[#53636A]'}`}
              title="Visualização em Kanban"
            >
              <KanbanIcon size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-white shadow-2xs text-[#223237]' : 'text-[#53636A]'}`}
              title="Visualização em Lista"
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {moveError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center space-x-2">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{moveError}</span>
        </div>
      )}

      {/* Won / Lost Special Table View */}
      {activeTab !== 'active' ? (
        <div className="bg-white rounded-xl border border-[#dae0d7] shadow-xs overflow-hidden p-4">
          <div className="font-bold text-sm text-[#223237] mb-3">
            {activeTab === 'won' ? 'Negócios Fechados com Sucesso (Ganhos)' : 'Oportunidades Perdidas'}
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#dae0d7] text-[#53636A] font-semibold text-[11px] bg-[#F5F6F0]">
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Empresa / Título</th>
                <th className="py-2.5 px-3">Vendedor</th>
                <th className="py-2.5 px-3">Valor Fechado</th>
                <th className="py-2.5 px-3">Data Fechamento</th>
                <th className="py-2.5 px-3">{activeTab === 'lost' ? 'Motivo da Perda' : 'Status'}</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dae0d7]/70">
              {filteredOpps.map(opp => {
                const comp = db.companies.find(c => c.id === opp.companyId);
                const owner = db.users.find(u => u.id === opp.ownerId);

                return (
                  <tr key={opp.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-3 font-mono font-bold text-[#223237]">{opp.id}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#223237]">{opp.title}</div>
                      <div className="text-[11px] text-[#53636A]">{comp?.name}</div>
                    </td>
                    <td className="py-3 px-3">{owner?.name}</td>
                    <td className="py-3 px-3 font-mono font-bold text-[#223237]">
                      {formatCurrency(opp.estimatedValueCents)}
                    </td>
                    <td className="py-3 px-3 text-[#53636A]">{formatDate(opp.closedAt, false)}</td>
                    <td className="py-3 px-3">
                      {activeTab === 'lost' ? (
                        <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold text-[10px]">
                          {opp.lostReason || 'Não informado'}
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                          Venda Confirmada
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => navigateTo(`/oportunidades/${opp.id}`)}
                        className="text-[#223237] hover:text-[#B1D448] font-bold text-xs"
                      >
                        Abrir Registro
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Board */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start">
          {STAGES.map(col => {
            const oppsInStage = filteredOpps.filter(o => o.stage === col.id);
            const totalStageValue = oppsInStage.reduce((acc, o) => acc + (o.estimatedValueCents || 0), 0);

            return (
              <div
                key={col.id}
                className={`rounded-xl border ${col.border} ${col.bg} p-3 flex flex-col min-h-[500px] shadow-2xs`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#dae0d7]">
                  <div>
                    <h2 className="font-bold text-xs text-[#223237]">{col.label}</h2>
                    <div className="font-mono text-[10px] text-[#53636A] font-bold mt-0.5">
                      {formatCurrency(totalStageValue)}
                    </div>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-white border border-[#dae0d7] flex items-center justify-center font-bold text-[10px] text-[#223237]">
                    {oppsInStage.length}
                  </span>
                </div>

                {/* Cards in column */}
                <div className="flex-1 py-2 space-y-2.5 overflow-y-auto">
                  {oppsInStage.map(opp => {
                    const comp = db.companies.find(c => c.id === opp.companyId);
                    const contact = db.contacts.find(ct => ct.id === opp.contactId);
                    const owner = db.users.find(u => u.id === opp.ownerId);
                    const quote = db.quotes.find(q => q.opportunityId === opp.id);
                    const quoteVer = quote ? db.quoteVersions.find(v => v.id === quote.currentVersionId) : null;
                    const nextTask = db.tasks.find(t => t.opportunityId === opp.id && t.status === 'open');

                    const isExpiredQuote = quoteVer?.status === 'expired';
                    const isPendingTech = opp.technicalStatus === 'pending';

                    return (
                      <div
                        key={opp.id}
                        className="bg-white p-3 rounded-lg border border-[#dae0d7] shadow-xs hover:border-[#B1D448] transition space-y-2 group"
                      >
                        {/* Title & Code */}
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <span className="font-mono text-[10px] text-[#53636A] font-bold">{opp.id}</span>
                            <h3
                              onClick={() => navigateTo(`/oportunidades/${opp.id}`)}
                              className="font-bold text-xs text-[#223237] hover:text-[#B1D448] cursor-pointer line-clamp-2 leading-tight"
                            >
                              {comp?.name || opp.title}
                            </h3>
                            <div className="text-[10px] text-[#53636A] truncate">{contact?.name}</div>
                          </div>
                        </div>

                        {/* Value & Badges */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-[#dae0d7]/50">
                          <span className="font-mono font-bold text-[#223237]">
                            {opp.estimatedValueCents ? formatCurrency(opp.estimatedValueCents) : 'Sem valor definido'}
                          </span>
                          <span className="text-[10px] text-[#53636A]">
                            Resp: {owner?.name.split(' ')[0]}
                          </span>
                        </div>

                        {/* Warnings / Special Indicators */}
                        <div className="space-y-1">
                          {isExpiredQuote && (
                            <div className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center space-x-1">
                              <AlertTriangle size={11} />
                              <span>Cotação Vencida</span>
                            </div>
                          )}
                          {isPendingTech && (
                            <div className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center space-x-1">
                              <Clock size={11} />
                              <span>Validação Técnica Pendente</span>
                            </div>
                          )}
                          {quoteVer && (
                            <div className="text-[10px] text-gray-500 flex items-center justify-between">
                              <span>{quote?.number}</span>
                              <span className="font-semibold text-[#223237]">Rev {quoteVer.revision} • {quoteVer.status}</span>
                            </div>
                          )}
                        </div>

                        {/* Move To Dropdown / Keyboard Accessible */}
                        <div className="pt-1 flex items-center justify-between border-t border-[#dae0d7]/40 text-[10px]">
                          <span className="text-[#53636A]">Mover para:</span>
                          <select
                            value={opp.stage}
                            onChange={e => handleStageChange(opp.id, e.target.value as OpportunityStage)}
                            disabled={movingOppId === opp.id}
                            className="bg-[#F5F6F0] border border-[#dae0d7] rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#223237] focus:outline-hidden"
                          >
                            <option value="new">Novo Lead</option>
                            <option value="qualification">Em Qualificação</option>
                            <option value="quoting">Em Cotação</option>
                            <option value="quote_sent">Cotação Enviada</option>
                            <option value="negotiation">Em Negociação</option>
                            <option value="won">✓ Ganha</option>
                            <option value="lost">✕ Perdida</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Mode */
        <div className="bg-white rounded-xl border border-[#dae0d7] shadow-xs overflow-hidden p-4">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#dae0d7] text-[#53636A] font-semibold text-[11px] bg-[#F5F6F0]">
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Empresa / Título</th>
                <th className="py-2.5 px-3">Etapa Atual</th>
                <th className="py-2.5 px-3">Vendedor</th>
                <th className="py-2.5 px-3">Valor Estimado</th>
                <th className="py-2.5 px-3">Entrada na Etapa</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dae0d7]/70">
              {filteredOpps.map(opp => {
                const comp = db.companies.find(c => c.id === opp.companyId);
                const owner = db.users.find(u => u.id === opp.ownerId);

                return (
                  <tr key={opp.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-3 font-mono font-bold text-[#223237]">{opp.id}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#223237]">{opp.title}</div>
                      <div className="text-[11px] text-[#53636A]">{comp?.name}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                        {opp.stage}
                      </span>
                    </td>
                    <td className="py-3 px-3">{owner?.name}</td>
                    <td className="py-3 px-3 font-mono font-bold text-[#223237]">
                      {formatCurrency(opp.estimatedValueCents)}
                    </td>
                    <td className="py-3 px-3 text-[#53636A]">{formatDate(opp.stageEnteredAt, false)}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => navigateTo(`/oportunidades/${opp.id}`)}
                        className="text-[#223237] hover:text-[#B1D448] font-bold text-xs"
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Lost Reason Modal (C13) */}
      {lostModalOppId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#dae0d7] shadow-2xl p-5 max-w-md w-full space-y-4">
            <h3 className="font-bold text-sm text-[#223237]">
              Registrar Motivo da Perda (Obrigatório)
            </h3>
            <p className="text-xs text-[#53636A]">
              Para encerrar esta negociação como perdida, informe a justificativa comercial conforme a política da MegaWhip:
            </p>

            <select
              value={lostReason}
              onChange={e => setLostReason(e.target.value)}
              className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs bg-white"
            >
              <option value="Preço">Preço acima da concorrência</option>
              <option value="Prazo">Prazo de entrega não atendia</option>
              <option value="Incompatibilidade técnica">Incompatibilidade técnica confirmada</option>
              <option value="Cliente desistiu">Cliente desistiu / Projeto cancelado</option>
              <option value="Sem retorno do comprador">Sem retorno após múltiplos contatos</option>
            </select>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setLostModalOppId(null)}
                className="px-3 py-1.5 border border-[#dae0d7] rounded-lg text-xs hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmLost}
                className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold"
              >
                Confirmar Perda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
