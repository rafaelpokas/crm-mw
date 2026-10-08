import React, { useState, useMemo } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  BarChart3,
  Download,
  Filter,
  TrendingUp,
  XCircle,
  CheckCircle,
  FileSpreadsheet,
  Users
} from 'lucide-react';
import { formatCurrency, formatBps, formatDate } from '../utils/formatters';

interface ReportsViewProps {
  navigateTo: (route: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ navigateTo }) => {
  const { db, currentUser } = useCrm();

  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');

  // Filtered dataset
  const filteredOpps = useMemo(() => {
    return db.opportunities.filter(o => {
      if (selectedSeller !== 'all' && o.ownerId !== selectedSeller) return false;
      if (selectedSource !== 'all') {
        const lead = db.leads.find(l => l.convertedOpportunityId === o.id);
        if (lead && lead.source !== selectedSource) return false;
      }
      return true;
    });
  }, [db.opportunities, db.leads, selectedSeller, selectedSource]);

  const metricsDerived = useMemo(() => {
    const totalOpps = filteredOpps.length;
    const wonOpps = filteredOpps.filter(o => o.stage === 'won');
    const lostOpps = filteredOpps.filter(o => o.stage === 'lost');
    const openOpps = filteredOpps.filter(o => o.stage !== 'won' && o.stage !== 'lost');

    const wonValueCents = wonOpps.reduce((acc, o) => acc + (o.estimatedValueCents || 0), 0);
    const openValueCents = openOpps.reduce((acc, o) => acc + (o.estimatedValueCents || 0), 0);

    const closedCount = wonOpps.length + lostOpps.length;
    const winRate = closedCount > 0 ? (wonOpps.length / closedCount) * 100 : 0;

    // Loss reasons breakdown
    const lostReasonsMap: Record<string, number> = {};
    lostOpps.forEach(o => {
      const reason = o.lostReason || 'Sem motivo informado';
      lostReasonsMap[reason] = (lostReasonsMap[reason] || 0) + 1;
    });

    // Sources breakdown
    const sourcesMap: Record<string, number> = {};
    db.leads.forEach(l => {
      sourcesMap[l.source] = (sourcesMap[l.source] || 0) + 1;
    });

    return {
      totalOpps,
      wonCount: wonOpps.length,
      lostCount: lostOpps.length,
      openCount: openOpps.length,
      wonValueCents,
      openValueCents,
      winRate,
      lostReasonsMap,
      sourcesMap
    };
  }, [filteredOpps, db.leads]);

  // Real CSV export
  const handleExportCsv = () => {
    if (currentUser.role === 'seller') {
      alert('Apenas Gestores ou Administradores possuem permissão para exportar relatórios completos em CSV.');
      return;
    }

    const headers = ['ID', 'Titulo', 'Empresa', 'Etapa', 'ValorCentavos', 'ValorFormatado', 'Responsavel', 'CriadoEm', 'FechadoEm', 'MotivoPerda'];
    const rows = filteredOpps.map(o => {
      const comp = db.companies.find(c => c.id === o.companyId);
      const owner = db.users.find(u => u.id === o.ownerId);

      return [
        o.id,
        `"${o.title.replace(/"/g, '""')}"`,
        `"${comp?.name || ''}"`,
        o.stage,
        o.estimatedValueCents || 0,
        `"${formatCurrency(o.estimatedValueCents)}"`,
        `"${owner?.name || ''}"`,
        o.createdAt,
        o.closedAt || '',
        `"${o.lostReason || ''}"`
      ];
    });

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_megawhip_crm_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs text-[#223237]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#223237] flex items-center space-x-2">
            <span>Relatórios & Indicadores Comerciais (T13)</span>
          </h1>
          <p className="text-xs text-[#53636A] mt-1">
            Consistência matemática com o banco de dados único • Sem extrapolações sintéticas não ancoradas.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="bg-[#223237] hover:bg-[#2d3f45] text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2 shadow-xs transition"
        >
          <Download size={14} className="text-[#B1D448]" />
          <span>Exportar Registros em CSV</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center space-x-3 flex-wrap bg-white p-3 rounded-xl border border-[#dae0d7]">
        <div className="flex items-center space-x-1">
          <span className="text-[#53636A] font-semibold">Vendedor:</span>
          <select
            value={selectedSeller}
            onChange={e => setSelectedSeller(e.target.value)}
            className="border border-[#dae0d7] rounded-md px-2 py-1 text-xs bg-[#F5F6F0]"
          >
            <option value="all">Todos os Vendedores</option>
            {db.users.filter(u => u.role === 'seller').map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-1">
          <span className="text-[#53636A] font-semibold">Origem:</span>
          <select
            value={selectedSource}
            onChange={e => setSelectedSource(e.target.value)}
            className="border border-[#dae0d7] rounded-md px-2 py-1 text-xs bg-[#F5F6F0]"
          >
            <option value="all">Todas as Origens</option>
            <option value="site">Site</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">E-mail</option>
            <option value="referral">Indicação</option>
          </select>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#dae0d7] shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-[#53636A] uppercase">Total de Negócios Filtrados</div>
          <div className="text-2xl font-black text-[#223237]">{metricsDerived.totalOpps}</div>
          <div className="text-[11px] text-[#53636A]">{metricsDerived.openCount} em aberto</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#dae0d7] shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-[#53636A] uppercase">Valor Total em Aberto</div>
          <div className="text-2xl font-black text-[#223237]">{formatCurrency(metricsDerived.openValueCents)}</div>
          <div className="text-[11px] text-[#53636A]">Em negociação ou cotação</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#dae0d7] shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-[#53636A] uppercase">Valor Ganho no Período</div>
          <div className="text-2xl font-black text-emerald-700">{formatCurrency(metricsDerived.wonValueCents)}</div>
          <div className="text-[11px] text-emerald-800">{metricsDerived.wonCount} negócio(s) fechado(s)</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#dae0d7] shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-[#53636A] uppercase">Taxa de Conversão Fechada</div>
          <div className="text-2xl font-black text-[#223237]">{metricsDerived.winRate.toFixed(1)}%</div>
          <div className="text-[11px] text-[#53636A]">Ganhas / (Ganhas + Perdidas)</div>
        </div>
      </div>

      {/* Two Column Visual Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loss Reasons */}
        <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-3">
          <h2 className="font-bold text-sm text-[#223237] flex items-center space-x-2">
            <XCircle size={16} className="text-rose-600" />
            <span>Motivos de Perda Informados</span>
          </h2>

          <div className="space-y-2 pt-2">
            {Object.keys(metricsDerived.lostReasonsMap).length === 0 ? (
              <div className="text-[#53636A] py-4">Nenhuma oportunidade perdida nos filtros atuais.</div>
            ) : (
              Object.entries(metricsDerived.lostReasonsMap).map(([reason, count]) => (
                <div key={reason} className="p-2.5 bg-[#F5F6F0] rounded-lg flex items-center justify-between">
                  <span className="font-semibold text-[#223237]">{reason}</span>
                  <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-[#dae0d7]">
                    {count} {count === 1 ? 'negócio' : 'negócios'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lead Origins Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-3">
          <h2 className="font-bold text-sm text-[#223237] flex items-center space-x-2">
            <Users size={16} className="text-[#B1D448]" />
            <span>Origem de Aquisição dos Leads</span>
          </h2>

          <div className="space-y-2 pt-2">
            {Object.entries(metricsDerived.sourcesMap).map(([src, count]) => (
              <div key={src} className="p-2.5 bg-[#F5F6F0] rounded-lg flex items-center justify-between capitalize">
                <span className="font-semibold text-[#223237]">Canal {src}</span>
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-[#dae0d7]">
                  {count} leads
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
