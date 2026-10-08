import React, { useState, useMemo } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Download
} from 'lucide-react';
import { formatCurrency, formatBps, formatDate } from '../utils/formatters';
import { generateQuotePdf } from '../utils/pdfGenerator';

interface QuotesListViewProps {
  navigateTo: (route: string) => void;
}

export const QuotesListView: React.FC<QuotesListViewProps> = ({ navigateTo }) => {
  const { db, currentUser, decideApproval } = useCrm();

  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'pending_approval' | 'sent' | 'expired' | 'accepted'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Pending approvals
  const pendingApprovals = useMemo(() => {
    return db.approvals.filter(a => a.status === 'pending');
  }, [db.approvals]);

  // Quotes and their current versions
  const quoteRows = useMemo(() => {
    return db.quotes.map(q => {
      const ver = db.quoteVersions.find(v => v.id === q.currentVersionId);
      const opp = db.opportunities.find(o => o.id === q.opportunityId);
      const comp = opp ? db.companies.find(c => c.id === opp.companyId) : null;
      const contact = opp ? db.contacts.find(c => c.id === opp.contactId) : null;
      const approval = db.approvals.find(a => a.quoteVersionId === ver?.id);

      return {
        quote: q,
        version: ver,
        opportunity: opp,
        company: comp,
        contact,
        approval
      };
    });
  }, [db.quotes, db.quoteVersions, db.opportunities, db.companies, db.contacts, db.approvals]);

  const filteredQuotes = useMemo(() => {
    return quoteRows.filter(row => {
      if (!row.version) return false;

      if (activeTab === 'draft' && row.version.status !== 'draft') return false;
      if (activeTab === 'pending_approval' && row.version.approvalStatus !== 'pending') return false;
      if (activeTab === 'sent' && row.version.status !== 'sent') return false;
      if (activeTab === 'expired' && row.version.status !== 'expired') return false;
      if (activeTab === 'accepted' && row.version.status !== 'accepted') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const numMatch = row.quote.number.toLowerCase().includes(q);
        const compMatch = row.company?.name.toLowerCase().includes(q);
        if (!numMatch && !compMatch) return false;
      }

      return true;
    });
  }, [quoteRows, activeTab, searchQuery]);

  const handleApprove = async (approvalId: string) => {
    setActionError(null);
    setActionSuccess(null);
    const res = await decideApproval(approvalId, true, approvalNote || 'Aprovado pelo gestor');
    if (!res.ok && res.error) {
      setActionError(res.error.message);
    } else {
      setActionSuccess('Desconto aprovado com sucesso! Cotação liberada para envio.');
      setApprovalNote('');
    }
  };

  const handleReject = async (approvalId: string) => {
    setActionError(null);
    setActionSuccess(null);
    const res = await decideApproval(approvalId, false, approvalNote || 'Desconto recusado pelo gestor');
    if (!res.ok && res.error) {
      setActionError(res.error.message);
    } else {
      setActionSuccess('Solicitação de desconto rejeitada.');
      setApprovalNote('');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs text-[#223237]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#223237] flex items-center space-x-2">
            <span>Gestão de Cotações & Propostas (T07)</span>
            <span className="text-xs font-normal bg-[#B1D448]/20 text-[#223237] px-2 py-0.5 rounded border border-[#B1D448]/40">
              {quoteRows.length} propostas
            </span>
          </h1>
          <p className="text-xs text-[#53636A] mt-1">
            Controle de alçadas comerciais (limite de 5%), aprovações, revisões imutáveis e envios multicanal.
          </p>
        </div>

        <button
          onClick={() => navigateTo('/funil')}
          className="bg-[#223237] hover:bg-[#2d3f45] text-white px-3.5 py-2 rounded-lg font-semibold flex items-center space-x-1.5 transition"
        >
          <Plus size={15} className="text-[#B1D448]" />
          <span>Nova Cotação via Oportunidade</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center space-x-2">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
          {actionSuccess}
        </div>
      )}

      {/* Pending Approvals Section for Manager (C04, C05) */}
      {pendingApprovals.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-amber-950 flex items-center space-x-2">
              <ShieldCheck size={16} className="text-amber-700" />
              <span>Solicitações de Desconto Pendentes de Aprovação (Alçada Gestor)</span>
            </h2>
            <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold text-[10px]">
              {pendingApprovals.length} pendente(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingApprovals.map(ap => {
              const ver = db.quoteVersions.find(v => v.id === ap.quoteVersionId);
              const quote = db.quotes.find(q => q.id === ver?.quoteId);
              const requester = db.users.find(u => u.id === ap.requestedBy);

              return (
                <div key={ap.id} className="bg-white p-3.5 rounded-lg border border-amber-200 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#223237]">{quote?.number}</span>
                      <span className="text-[10px] text-[#53636A] ml-2">Rev. {ver?.revision}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">
                      {formatCurrency(ver?.totalCents)}
                    </span>
                  </div>

                  <div className="text-xs text-[#53636A]">
                    Solicitante: <strong>{requester?.name}</strong> • Motivo: "{ap.reason}"
                  </div>

                  <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-100">
                    O vendedor concedeu desconto de 8% (superior à alçada de 500 bps). Sua autorização como Gestor liberará o envio.
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => quote && navigateTo(`/cotacoes/${quote.id}`)}
                      className="text-[#223237] hover:underline font-semibold text-[11px]"
                    >
                      Ver Itens e Detalhes
                    </button>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleReject(ap.id)}
                        className="px-2.5 py-1 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded text-xs font-semibold"
                      >
                        Recusar
                      </button>
                      <button
                        onClick={() => handleApprove(ap.id)}
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold shadow-2xs"
                      >
                        Aprovar Desconto
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex space-x-1 bg-white p-1 rounded-lg border border-[#dae0d7] overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'draft', label: 'Rascunhos' },
            { id: 'pending_approval', label: 'Aguardando Aprovação' },
            { id: 'sent', label: 'Enviadas' },
            { id: 'accepted', label: 'Aceitas' },
            { id: 'expired', label: 'Vencidas' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-md font-semibold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-[#223237] text-white shadow-2xs'
                  : 'text-[#53636A] hover:bg-[#F5F6F0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <Search size={14} className="absolute left-3 top-2.5 text-[#53636A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por número ou empresa..."
            className="w-full pl-9 pr-3 py-1.5 border border-[#dae0d7] rounded-md text-xs placeholder-[#53636A] bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-xl border border-[#dae0d7] shadow-xs overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#dae0d7] text-[#53636A] font-semibold text-[11px] bg-[#F5F6F0]">
              <th className="py-2.5 px-3">Número / Revisão</th>
              <th className="py-2.5 px-3">Empresa / Contato</th>
              <th className="py-2.5 px-3">Valor Total</th>
              <th className="py-2.5 px-3">Validade</th>
              <th className="py-2.5 px-3">Situação Comercial</th>
              <th className="py-2.5 px-3">Aprovação Alçada</th>
              <th className="py-2.5 px-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dae0d7]/70">
            {filteredQuotes.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#53636A]">
                  Nenhuma cotação encontrada nesta categoria.
                </td>
              </tr>
            ) : (
              filteredQuotes.map(({ quote, version, company, contact }) => {
                if (!version) return null;

                return (
                  <tr key={quote.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#223237] font-mono">{quote.number}</div>
                      <div className="text-[10px] text-[#53636A]">Revisão {version.revision}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-[#223237]">{company?.name || '—'}</div>
                      <div className="text-[11px] text-[#53636A]">{contact?.name}</div>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-[#223237]">
                      {formatCurrency(version.totalCents)}
                    </td>

                    <td className="py-3 px-3 text-[#53636A]">
                      {formatDate(version.validUntil, false)}
                    </td>

                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        version.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                        version.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        version.status === 'expired' ? 'bg-rose-100 text-rose-800' :
                        version.status === 'superseded' ? 'bg-gray-100 text-gray-700' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {version.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        version.approvalStatus === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        version.approvalStatus === 'pending' ? 'bg-amber-100 text-amber-800' :
                        version.approvalStatus === 'rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {version.approvalStatus === 'approved' ? 'Aprovado Gestor' :
                         version.approvalStatus === 'pending' ? 'Pendente Gestor' :
                         version.approvalStatus === 'rejected' ? 'Rejeitado' : 'Dentro da Alçada'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => generateQuotePdf(quote, version, company || undefined, contact || undefined)}
                        className="p-1 hover:bg-gray-100 text-[#53636A] rounded"
                        title="Baixar PDF Demonstrativo"
                      >
                        <Download size={14} />
                      </button>

                      <button
                        onClick={() => navigateTo(`/cotacoes/${quote.id}`)}
                        className="text-[#223237] hover:text-[#B1D448] font-bold text-xs"
                      >
                        Ver Proposta
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
