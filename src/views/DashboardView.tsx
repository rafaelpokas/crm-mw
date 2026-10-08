import React, { useState, useMemo } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  TrendingUp,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Users,
  ArrowRight,
  Filter,
  Check,
  ChevronRight,
  Sparkles,
  Kanban
} from 'lucide-react';
import { formatCurrency, formatBps, formatDate } from '../utils/formatters';

interface DashboardViewProps {
  navigateTo: (route: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ navigateTo }) => {
  const { db, metrics, currentUser, completeTask } = useCrm();

  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [period, setPeriod] = useState<string>('month');

  // Filtered opportunities based on seller & source
  const filteredOpps = useMemo(() => {
    return db.opportunities.filter(opp => {
      if (selectedSeller !== 'all' && opp.ownerId !== selectedSeller) return false;
      if (selectedSource !== 'all') {
        const lead = db.leads.find(l => l.convertedOpportunityId === opp.id);
        if (lead && lead.source !== selectedSource) return false;
      }
      return true;
    });
  }, [db.opportunities, db.leads, selectedSeller, selectedSource]);

  // Stage distribution
  const stageCounts = useMemo(() => {
    const counts: Record<string, { count: number; valueCents: number }> = {
      new: { count: 0, valueCents: 0 },
      qualification: { count: 0, valueCents: 0 },
      quoting: { count: 0, valueCents: 0 },
      quote_sent: { count: 0, valueCents: 0 },
      negotiation: { count: 0, valueCents: 0 },
      won: { count: 0, valueCents: 0 },
      lost: { count: 0, valueCents: 0 }
    };

    filteredOpps.forEach(opp => {
      if (counts[opp.stage]) {
        counts[opp.stage].count += 1;
        counts[opp.stage].valueCents += opp.estimatedValueCents || 0;
      }
    });

    return counts;
  }, [filteredOpps]);

  const urgentTasks = useMemo(() => {
    const clockTime = new Date(db.meta.clock).getTime();
    return db.tasks
      .filter(t => t.status === 'open')
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
      .slice(0, 5);
  }, [db.tasks, db.meta.clock]);

  const recentActivities = useMemo(() => {
    return [...db.activities].reverse().slice(0, 6);
  }, [db.activities]);

  const unassignedOpps = useMemo(() => {
    return db.opportunities.filter(o => !o.ownerId || o.stage === 'new');
  }, [db.opportunities]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Welcome & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#223237] flex items-center space-x-2">
            <span>Painel de Controle Comercial</span>
            <span className="text-xs font-normal bg-[#B1D448]/20 text-[#223237] px-2 py-0.5 rounded border border-[#B1D448]/40">
              Operação em Tempo Real
            </span>
          </h1>
          <p className="text-xs text-[#53636A] mt-1">
            Métricas derivadas da base sintética única • Fuso: America/Sao_Paulo • Relógio: {formatDate(db.meta.clock, true)}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 flex-wrap">
          <div className="flex items-center space-x-1 bg-[#F5F6F0] px-2 py-1 rounded-md border border-[#dae0d7] text-xs">
            <Filter size={13} className="text-[#53636A]" />
            <select
              value={selectedSeller}
              onChange={e => setSelectedSeller(e.target.value)}
              className="bg-transparent text-xs text-[#223237] focus:outline-hidden"
            >
              <option value="all">Todos os vendedores</option>
              {db.users.filter(u => u.role === 'seller').map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1 bg-[#F5F6F0] px-2 py-1 rounded-md border border-[#dae0d7] text-xs">
            <select
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value)}
              className="bg-transparent text-xs text-[#223237] focus:outline-hidden"
            >
              <option value="all">Todas as origens</option>
              <option value="site">Formulário Site</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">E-mail</option>
              <option value="referral">Indicação</option>
            </select>
          </div>

          <div className="flex items-center space-x-1 bg-[#F5F6F0] px-2 py-1 rounded-md border border-[#dae0d7] text-xs">
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="bg-transparent text-xs text-[#223237] focus:outline-hidden"
            >
              <option value="month">Outubro 2026</option>
              <option value="all">Todo o histórico</option>
            </select>
          </div>
        </div>
      </div>

      {/* Primary Derived Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Open Opportunities */}
        <div
          onClick={() => navigateTo('/funil')}
          className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs hover:border-[#B1D448] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#53636A]">
            <span className="font-semibold uppercase tracking-wider">Negócios em Aberto</span>
            <Kanban size={16} className="text-[#223237] group-hover:text-[#B1D448] transition" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-[#223237]">{metrics.openOpportunities}</div>
            <div className="text-xs font-mono font-bold text-[#53636A]">
              {formatCurrency(metrics.openValueCents)}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[#53636A] flex items-center justify-between">
            <span>Etapas ativas no funil</span>
            <span className="text-[#223237] font-medium group-hover:underline flex items-center">
              Ver funil <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 2: Won Value */}
        <div
          onClick={() => navigateTo('/funil')}
          className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs hover:border-[#B1D448] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#53636A]">
            <span className="font-semibold uppercase tracking-wider">Valor de Negócios Ganhos</span>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-emerald-700">
              {formatCurrency(metrics.wonValueCents)}
            </div>
            <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
              {metrics.wonOpportunities} {metrics.wonOpportunities === 1 ? 'venda' : 'vendas'}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[#53636A] flex items-center justify-between">
            <span>Taxa fechamento: {metrics.closedWinRate !== null ? `${(metrics.closedWinRate * 100).toFixed(0)}%` : '—'}</span>
            <span className="text-emerald-700 font-medium group-hover:underline flex items-center">
              Histórico <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 3: Overdue Tasks */}
        <div
          onClick={() => navigateTo('/tarefas')}
          className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs hover:border-red-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#53636A]">
            <span className="font-semibold uppercase tracking-wider">Tarefas Atrasadas</span>
            <Clock size={16} className="text-red-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className={`text-2xl font-black ${metrics.overdueTasks > 0 ? 'text-red-600' : 'text-[#223237]'}`}>
              {metrics.overdueTasks}
            </div>
            <div className="text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded font-medium">
              Vencimento anterior ao relógio
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[#53636A] flex items-center justify-between">
            <span>Ação prioritária de follow-up</span>
            <span className="text-red-600 font-medium group-hover:underline flex items-center">
              Ver agenda <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 4: Unassigned / New Leads Queue */}
        <div
          onClick={() => navigateTo('/leads')}
          className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs hover:border-amber-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#53636A]">
            <span className="font-semibold uppercase tracking-wider">Fila Sem Responsável</span>
            <Users size={16} className="text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-amber-600">{metrics.unassignedLeads}</div>
            <div className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">
              Aguardando triagem
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[#53636A] flex items-center justify-between">
            <span>Distribuição round-robin</span>
            <span className="text-amber-700 font-medium group-hover:underline flex items-center">
              Distribuir <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </div>

      {/* Funnel Pipeline Visual Breakdown */}
      <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#223237] flex items-center space-x-2">
            <span>Distribuição das Oportunidades no Funil</span>
          </h2>
          <button
            onClick={() => navigateTo('/funil')}
            className="text-xs text-[#223237] hover:text-[#B1D448] font-semibold flex items-center space-x-1"
          >
            <span>Abrir Kanban</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
          {[
            { id: 'new', label: 'Novo Lead', bg: 'bg-slate-100', text: 'text-slate-800' },
            { id: 'qualification', label: 'Em Qualificação', bg: 'bg-blue-50', text: 'text-blue-800' },
            { id: 'quoting', label: 'Em Cotação', bg: 'bg-amber-50', text: 'text-amber-800' },
            { id: 'quote_sent', label: 'Cotação Enviada', bg: 'bg-purple-50', text: 'text-purple-800' },
            { id: 'negotiation', label: 'Em Negociação', bg: 'bg-indigo-50', text: 'text-indigo-800' },
            { id: 'won', label: 'Ganha', bg: 'bg-emerald-50', text: 'text-emerald-800' },
            { id: 'lost', label: 'Perdida', bg: 'bg-rose-50', text: 'text-rose-800' }
          ].map(st => {
            const data = stageCounts[st.id] || { count: 0, valueCents: 0 };
            return (
              <div
                key={st.id}
                onClick={() => navigateTo('/funil')}
                className={`p-3 rounded-lg border border-[#dae0d7] ${st.bg} cursor-pointer hover:shadow-xs transition`}
              >
                <div className={`text-[11px] font-bold ${st.text}`}>{st.label}</div>
                <div className="mt-2 text-xl font-black text-[#223237]">{data.count}</div>
                <div className="text-[10px] text-[#53636A] font-mono mt-0.5 truncate">
                  {formatCurrency(data.valueCents)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Urgent Tasks & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Tasks */}
        <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#223237] flex items-center space-x-1.5">
              <Clock size={16} className="text-red-500" />
              <span>Próximas Ações & Follow-ups</span>
            </h2>
            <button
              onClick={() => navigateTo('/tarefas')}
              className="text-xs text-[#53636A] hover:text-[#223237] font-medium"
            >
              Ver todas ({db.tasks.filter(t => t.status === 'open').length})
            </button>
          </div>

          <div className="divide-y divide-[#dae0d7]/60 text-xs">
            {urgentTasks.length === 0 ? (
              <div className="py-6 text-center text-[#53636A]">Nenhuma tarefa pendente no momento.</div>
            ) : (
              urgentTasks.map(task => {
                const isOverdue = new Date(task.dueAt).getTime() < new Date(db.meta.clock).getTime();
                const opp = db.opportunities.find(o => o.id === task.opportunityId);
                const owner = db.users.find(u => u.id === task.ownerId);

                return (
                  <div key={task.id} className="py-2.5 flex items-start justify-between gap-3 group">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                          {isOverdue ? 'Atrasada' : 'No prazo'}
                        </span>
                        <span className="font-semibold text-[#223237]">{task.title}</span>
                      </div>
                      <div className="text-[11px] text-[#53636A]">
                        {opp ? `${opp.title} (${opp.id})` : 'Negociação'} • Resp: {owner?.name} • Vencimento: {formatDate(task.dueAt, true)}
                      </div>
                    </div>

                    <button
                      onClick={() => completeTask(task.id)}
                      className="shrink-0 p-1.5 bg-[#F5F6F0] hover:bg-emerald-100 hover:text-emerald-700 text-[#53636A] rounded-md transition"
                      title="Concluir tarefa"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Activities Feed */}
        <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#223237] flex items-center space-x-1.5">
              <TrendingUp size={16} className="text-[#B1D448]" />
              <span>Últimas Atividades Registradas</span>
            </h2>
            <button
              onClick={() => navigateTo('/configuracoes/auditoria')}
              className="text-xs text-[#53636A] hover:text-[#223237] font-medium"
            >
              Auditoria completa
            </button>
          </div>

          <div className="divide-y divide-[#dae0d7]/60 text-xs">
            {recentActivities.map(act => {
              const actor = db.users.find(u => u.id === act.actorId);
              return (
                <div key={act.id} className="py-2.5 flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-[#B1D448] mt-1.5 shrink-0" />
                  <div className="flex-1 space-y-0.5">
                    <div className="text-[#223237] font-medium">
                      <span className="font-bold">{actor?.name || 'Sistema'}:</span> ação de {act.action} em {act.entityType} ({act.entityId})
                    </div>
                    <div className="text-[11px] text-[#53636A]">
                      {formatDate(act.createdAt, true)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
