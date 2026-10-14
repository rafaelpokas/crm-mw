import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  Sparkles,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  Package,
  Send,
  ShieldCheck,
  ChevronRight,
  Database,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

interface MarketIntelligenceViewProps {
  navigateTo: (route: string) => void;
}

export const MarketIntelligenceView: React.FC<MarketIntelligenceViewProps> = ({ navigateTo }) => {
  const { db, approveMarketAlert, dismissMarketAlert, executeScenario } = useCrm();

  const [selectedAlertId, setSelectedAlertId] = useState<string>('ALT-001');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const activeAlert = db.marketAlerts.find(a => a.id === selectedAlertId) || db.marketAlerts[0];

  const handleApproveAlert = async (alertId: string) => {
    const res = await approveMarketAlert(alertId);
    if (res.ok) {
      setFeedbackMsg(`Alerta ${alertId} aprovado com sucesso! Campanha gerada em rascunho na Central de Campanhas.`);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    await dismissMarketAlert(alertId);
    setFeedbackMsg(`Alerta ${alertId} dispensado.`);
  };

  const handleTestExpiredCalendar = async () => {
    const res = await executeScenario('C22');
    if (!res.ok) {
      alert(res.error?.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs text-[#223237]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#B1D448] text-[#223237] rounded-lg">
              <Sparkles size={18} />
            </span>
            <h1 className="text-xl font-bold text-[#223237]">
              Central de Inteligência de Mercado & Calendários Sazonais
            </h1>
          </div>
          <p className="text-xs text-[#53636A] mt-1">
            Combinação de perfis confirmados por segmento, calendários regionais validados e disponibilidade no ERP para gerar oportunidades acionáveis.
          </p>
        </div>

        <button
          onClick={() => navigateTo('/campanhas')}
          className="bg-[#223237] hover:bg-[#2d3f45] text-white px-3.5 py-2 rounded-lg font-bold flex items-center space-x-1.5 transition self-start md:self-auto"
        >
          <span>Ver Campanhas Ativas</span>
          <ArrowRight size={14} className="text-[#B1D448]" />
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg font-semibold flex items-center space-x-2">
          <CheckCircle size={15} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Grid: Alerts on Left, Alert Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Alerts List */}
        <div className="bg-white rounded-xl border border-[#dae0d7] shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#dae0d7] pb-2">
            <h2 className="font-bold text-sm text-[#223237] flex items-center space-x-1.5">
              <Clock size={16} className="text-[#B1D448]" />
              <span>Alertas de Oportunidade</span>
            </h2>
            <span className="bg-[#B1D448]/20 text-[#223237] font-bold px-2 py-0.5 rounded text-[10px]">
              {db.marketAlerts.filter(a => a.status === 'new').length} novos
            </span>
          </div>

          <div className="space-y-2">
            {db.marketAlerts.map(alert => {
              const isSelected = alert.id === activeAlert?.id;
              return (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlertId(alert.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition space-y-1.5 ${
                    isSelected
                      ? 'border-[#B1D448] bg-[#F5F6F0] ring-1 ring-[#B1D448]'
                      : 'border-[#dae0d7] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#223237] line-clamp-1">
                      {alert.title}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      alert.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      alert.status === 'dismissed' ? 'bg-gray-100 text-gray-500' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {alert.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#53636A] flex items-center space-x-2">
                    <span>Segmento: <strong>{alert.eligibleSegment}</strong></span>
                    <span>•</span>
                    <span>{alert.eligibleRegion}</span>
                  </div>

                  <div className="text-[10px] text-gray-400">
                    Público elegível: {alert.targetAudienceCount} conta(s)
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Active Alert Dossier */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#dae0d7] shadow-xs p-6 space-y-5">
          {activeAlert ? (
            <>
              <div className="flex items-start justify-between border-b border-[#dae0d7] pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold bg-[#F5F6F0] px-2 py-0.5 rounded border border-[#dae0d7]">
                      {activeAlert.id}
                    </span>
                    <h2 className="text-base font-bold text-[#223237]">{activeAlert.title}</h2>
                  </div>
                  <div className="text-xs text-[#53636A] mt-1">
                    Detectado pelo Assistente de Inteligência em {formatDate(activeAlert.createdAt, false)}
                  </div>
                </div>

                <div className="flex space-x-2">
                  {activeAlert.status === 'new' && (
                    <>
                      <button
                        onClick={() => handleDismissAlert(activeAlert.id)}
                        className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg font-semibold text-xs"
                      >
                        Dispensar
                      </button>
                      <button
                        onClick={() => handleApproveAlert(activeAlert.id)}
                        className="px-4 py-1.5 bg-[#223237] hover:bg-[#2d3f45] text-white rounded-lg font-bold text-xs flex items-center space-x-1"
                      >
                        <ShieldCheck size={14} className="text-[#B1D448]" />
                        <span>Aprovar & Gerar Campanha</span>
                      </button>
                    </>
                  )}
                  {activeAlert.status === 'approved' && (
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg">
                      ✓ Aprovado e Enviado para Campanhas
                    </span>
                  )}
                </div>
              </div>

              {/* Justification & Criteria */}
              <div className="space-y-3">
                <div className="p-3 bg-[#F5F6F0] rounded-lg border border-[#dae0d7] space-y-1">
                  <span className="text-[10px] font-bold text-[#53636A] uppercase tracking-wider">
                    Fundamentação Técnica e Comercial:
                  </span>
                  <p className="text-xs text-[#223237] leading-relaxed">
                    {activeAlert.reason}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 border border-[#dae0d7] rounded-lg">
                    <span className="text-[10px] text-[#53636A] block">Segmento Elegível:</span>
                    <strong className="text-[#223237] text-xs">{activeAlert.eligibleSegment}</strong>
                  </div>
                  <div className="p-3 border border-[#dae0d7] rounded-lg">
                    <span className="text-[10px] text-[#53636A] block">Região Confirmada:</span>
                    <strong className="text-[#223237] text-xs">{activeAlert.eligibleRegion}</strong>
                  </div>
                  <div className="p-3 border border-[#dae0d7] rounded-lg">
                    <span className="text-[10px] text-[#53636A] block">Estoque no ERP:</span>
                    <div className="flex items-center space-x-1 text-emerald-700 font-bold text-xs mt-0.5">
                      <Database size={13} />
                      <span>Confirmado no ERP COBOL</span>
                    </div>
                  </div>
                </div>

                {/* Draft Message Proposal */}
                <div className="space-y-2 pt-2">
                  <h3 className="font-bold text-xs text-[#223237]">Minuta Sugerida pelo Agente para o Relacionamento:</h3>
                  <div className="p-3 bg-gray-50 border border-[#dae0d7] rounded-lg space-y-2">
                    <div className="text-[11px] font-semibold text-[#223237]">
                      Assunto: {activeAlert.draftSubject}
                    </div>
                    <p className="text-xs text-[#53636A] leading-relaxed italic">
                      "{activeAlert.draftMessage}"
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-[11px]">
                  <strong>Regra de Integridade:</strong> Nenhuma mensagem é enviada automaticamente aos clientes sem aprovação expressa do colaborador na Central de Campanhas.
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-[#53636A]">Selecione um alerta para inspecionar.</div>
          )}
        </div>
      </div>

      {/* Regional Technical Calendars Table */}
      <div className="bg-white rounded-xl border border-[#dae0d7] shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#dae0d7] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#223237] flex items-center space-x-2">
              <Calendar size={16} className="text-[#B1D448]" />
              <span>Calendários Sazonais Homologados pela Engenharia Técnica</span>
            </h2>
            <p className="text-xs text-[#53636A]">
              Fontes validadas com período de referência e validade. Calendários vencidos bloqueiam sugestões sazonais automáticas.
            </p>
          </div>

          <button
            onClick={handleTestExpiredCalendar}
            className="border border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg text-xs font-semibold"
            title="Testa bloqueio de afirmação sazonal para calendário vencido (C22)"
          >
            Testar Bloqueio de Calendário Vencido (C22)
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F5F6F0] border-b border-[#dae0d7] text-[#53636A] font-semibold text-[11px]">
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Segmento / Cultura</th>
                <th className="py-2.5 px-3">Região</th>
                <th className="py-2.5 px-3">Ciclo / Janela</th>
                <th className="py-2.5 px-3">Período de Referência</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Validade</th>
                <th className="py-2.5 px-3">Revisor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dae0d7]/70 text-xs">
              {db.marketCalendar.map(cal => (
                <tr key={cal.id} className="hover:bg-gray-50">
                  <td className="py-3 px-3 font-mono font-bold">{cal.id}</td>
                  <td className="py-3 px-3 font-semibold text-[#223237]">{cal.segment}</td>
                  <td className="py-3 px-3">{cal.region}</td>
                  <td className="py-3 px-3">{cal.cropOrCycle}</td>
                  <td className="py-3 px-3">{cal.periodReference}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      cal.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {cal.status === 'active' ? 'Válido' : 'Vencido (Bloqueado)'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#53636A]">{formatDate(cal.validUntil, false)}</td>
                  <td className="py-3 px-3 text-[#53636A]">{cal.reviewedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
