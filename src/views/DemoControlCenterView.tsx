import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  Sparkles,
  RotateCcw,
  Clock,
  UserCheck,
  Play,
  CheckCircle,
  AlertTriangle,
  Zap,
  ShieldAlert,
  Send,
  MessageSquare,
  FileText
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

interface DemoControlCenterViewProps {
  navigateTo: (route: string) => void;
}

const SCENARIO_DESCRIPTIONS = [
  { id: 'C01', title: 'C01 - Criar lead do site', desc: 'Gera novo lead via formulário, cria contato único, atribui vendedor por round-robin (A01) e agenda tarefa de primeiro contato.', route: '/leads' },
  { id: 'C02', title: 'C02 - Repetir evento de origem', desc: 'Simula reenvio idempotente com o mesmo eventId. O sistema reconhece a chave e não duplica o registro.', route: '/leads' },
  { id: 'C03', title: 'C03 - Cálculo Canônico da Cotação', desc: 'Monta cotação de 2 chicotes (DEMO-MW-001 @ R$ 850) + 4 conectores (DEMO-MW-002 @ R$ 120) com 5% desc e R$ 80 frete = R$ 2.151,00 exato.', route: '/cotacoes/Q001' },
  { id: 'C04', title: 'C04 - Gestor aprova desconto de 8%', desc: 'Gestor (U001) aprova a solicitação AP001 de 8% de desconto, liberando o envio da revisão de R$ 2.085,60.', route: '/cotacoes' },
  { id: 'C05', title: 'C05 - Vendedor tenta autoaprovar Q002', desc: 'Vendedor (U002) tenta aprovar o próprio desconto de 8%. Ação é bloqueada com erro de permissão sem alterar os dados.', route: '/cotacoes' },
  { id: 'C06', title: 'C06 - Alterar quantidade após aprovação', desc: 'Modifica quantidade em cotação já aprovada. A aprovação é imediatamente invalidada e volta para status pendente.', route: '/cotacoes/Q002/editar' },
  { id: 'C07', title: 'C07 - Envio multicanal com falha WhatsApp', desc: 'Simula envio por WhatsApp e E-mail com falha no WhatsApp. E-mail é entregue; retry afeta exclusivamente o WhatsApp.', route: '/cotacoes/Q001' },
  { id: 'C08', title: 'C08 - Receber pedido de desconto (8%)', desc: 'Injeta resposta do comprador solicitando 8% de desconto. Oportunidade avança para Negociação e follow-up automático é suspenso.', route: '/atendimento' },
  { id: 'C09', title: 'C09 - Pergunta técnica sem referência', desc: 'Comprador pergunta sobre equipamento sem código. O assistente recusa inventar dados e transfere para o Técnico Demo (U004).', route: '/atendimento' },
  { id: 'C10', title: 'C10 - Tentar aceitar cotação vencida', desc: 'Simula tentativa de aceite na cotação Q004 com validade vencida. O sistema bloqueia o aceite e sugere nova revisão.', route: '/simulador/cliente/MW-DEMO-2026-004' },
  { id: 'C11', title: 'C11 - Tentar aceitar revisão substituída', desc: 'Comprador tenta aceitar uma versão antiga já substituída por uma revisão mais nova. Aceite é bloqueado.', route: '/simulador/cliente/MW-DEMO-2026-003' },
  { id: 'C12', title: 'C12 - Confirmar Ganho após aceite', desc: 'Oportunidade com cotação formalmente aceita é confirmada como GANHA. Tarefas pendentes são concluídas e métricas atualizadas.', route: '/oportunidades/O007' },
  { id: 'C13', title: 'C13 - Marcar perda sem motivo', desc: 'Tentativa de marcar perda sem preencher a justificativa obrigatória é barrada pela validação comercial.', route: '/oportunidades/O001' },
  { id: 'C14', title: 'C14 - Mensagem ambígua de cliente com 2 negociações', desc: 'Contato com duas oportunidades ativas envia mensagem genérica. O sistema solicita associação correta ao vendedor.', route: '/atendimento' },
  { id: 'C15', title: 'C15 - WhatsApp fora da janela de 24h', desc: 'Tentativa de enviar texto livre após 24h sem resposta do cliente é bloqueada, exigindo envio de modelo aprovado.', route: '/atendimento' },
  { id: 'C16', title: 'C16 - Reset Completo da Demonstração', desc: 'Restaura a base exata do seed JSON inicial, relógio para 09/10/2026 às 15:00 e zera todas as mutações.', route: '/visao-geral' },
  { id: 'C17', title: 'C17 - Lead Instagram sem segmento', desc: 'Gera lead de mídia social sem segmento comercial definido, criando pendência na fila de qualificação.', route: '/leads' },
  { id: 'C18', title: 'C18 - Lead LP de Grãos com campanha', desc: 'Gera lead com campanha associada (lp-graos-plantio-2026) e sugere catálogo pertinente de grãos.', route: '/leads' },
  { id: 'C19', title: 'C19 - Alerta de mercado regional cana', desc: 'Aprova alerta de inteligência com janela regional e cria rascunho de campanha para clientes elegíveis.', route: '/relatorios' },
  { id: 'C20', title: 'C20 - Retorno de cliente pelo catálogo', desc: 'Cliente existente envia nova seleção pelo catálogo web; sistema anexa ao histórico sem duplicar cadastro.', route: '/atendimento' },
  { id: 'C21', title: 'C21 - Cliente multissegmento atualizado', desc: 'Atualiza perfil da empresa E001 para registrar múltiplos segmentos agrícolas (Cana + Grãos + Citros).', route: '/clientes/E001' },
  { id: 'C22', title: 'C22 - Bloqueio de ação sazonal vencida', desc: 'Tenta acionar inteligência sazonal com calendário técnico vencido (CAL-003); sistema barra até atualização.', route: '/relatorios' },
  { id: 'C23', title: 'C23 - Descadastro de marketing (Opt-out)', desc: 'Registra opt-out de marketing para contato C001, suspendendo disparos de automação de campanhas.', route: '/clientes/E001' },
  { id: 'C24', title: 'C24 - Despacho de pedido ao ERP COBOL', desc: 'Despacha pedido da cotação ganha Q005 ao ERP legado com protocolo de sincronização e conciliação.', route: '/oportunidades/O007' }
];

export const DemoControlCenterView: React.FC<DemoControlCenterViewProps> = ({ navigateTo }) => {
  const {
    db,
    currentUser,
    setCurrentUserId,
    latencyEnabled,
    setLatencyEnabled,
    simulatedErrors,
    setSimulatedError,
    advanceClock,
    resetDemo,
    executeScenario
  } = useCrm();

  const [executingScenarioId, setExecutingScenarioId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  const handleRun = async (scenarioId: string, targetRoute?: string) => {
    setExecutingScenarioId(scenarioId);
    setFeedback(null);

    const res = await executeScenario(scenarioId);
    setExecutingScenarioId(null);

    if (res.ok) {
      setFeedback({
        id: scenarioId,
        ok: true,
        msg: `Cenário ${scenarioId} executado com sucesso!`
      });
      if (targetRoute) {
        setTimeout(() => {
          navigateTo(targetRoute);
        }, 800);
      }
    } else {
      setFeedback({
        id: scenarioId,
        ok: false,
        msg: res.error?.message || 'Falha ao executar cenário.'
      });
    }
  };

  const handleFullReset = () => {
    if (confirm('Deseja realmente restaurar a base inicial da demonstração? Todos os dados sintéticos voltarão ao estado original do seed.')) {
      resetDemo();
      setFeedback({
        id: 'C16',
        ok: true,
        msg: 'Base de dados restaurada com sucesso para o estado inicial!'
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs text-[#223237]">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#223237] to-[#1c292d] text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#2d3f45]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#B1D448] text-[#223237] rounded-lg">
              <Sparkles size={18} />
            </span>
            <h1 className="text-xl font-black tracking-wide">
              Central de Demonstração & Cenários C01 a C16 (T20)
            </h1>
          </div>
          <p className="text-xs text-gray-300 mt-1 max-w-2xl leading-relaxed">
            Painel exclusivo do apresentador para validação rápida do fluxo de ponta a ponta na reunião com a MegaWhip. Execute os 16 cenários com 1 clique e inspecione as telas resultantes.
          </p>
        </div>

        <button
          onClick={handleFullReset}
          className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2.5 rounded-xl font-bold flex items-center space-x-2 shadow-sm transition shrink-0"
        >
          <RotateCcw size={15} />
          <span>Reset Completo da Demo (C16)</span>
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          feedback.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-red-50 text-red-700 border border-red-300'
        }`}>
          {feedback.ok ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Interactive Testing Controls Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Impersonator */}
        <div className="bg-white p-4 rounded-xl border border-[#dae0d7] shadow-xs space-y-2">
          <div className="font-bold text-xs flex items-center space-x-1.5 text-[#223237]">
            <UserCheck size={15} className="text-[#B1D448]" />
            <span>Perfil Ativo no Sistema</span>
          </div>
          <select
            value={currentUser.id}
            onChange={e => setCurrentUserId(e.target.value)}
            className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs bg-[#F5F6F0]"
          >
            {db.users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role === 'seller' ? 'Vendedor' : u.role === 'manager' ? 'Gestor' : u.role === 'technical' ? 'Técnico' : 'Admin'})
              </option>
            ))}
          </select>
          <div className="text-[10px] text-[#53636A]">
            Permite testar restrições de alçada comercial e aprovação.
          </div>
        </div>

        {/* Clock Manipulation */}
        <div className="bg-white p-4 rounded-xl border border-[#dae0d7] shadow-xs space-y-2">
          <div className="font-bold text-xs flex items-center space-x-1.5 text-[#223237]">
            <Clock size={15} className="text-[#B1D448]" />
            <span>Relógio Simulado</span>
          </div>
          <div className="font-mono text-xs font-bold text-[#223237]">
            {formatDate(db.meta.clock, true)}
          </div>
          <div className="flex space-x-2 pt-1">
            <button
              onClick={() => advanceClock(1)}
              className="flex-1 py-1 bg-[#F5F6F0] hover:bg-[#eaece5] border border-[#dae0d7] rounded font-semibold text-xs"
            >
              +1 dia
            </button>
            <button
              onClick={() => advanceClock(3)}
              className="flex-1 py-1 bg-[#F5F6F0] hover:bg-[#eaece5] border border-[#dae0d7] rounded font-semibold text-xs"
            >
              +3 dias
            </button>
          </div>
        </div>

        {/* Latency & Error Toggles */}
        <div className="bg-white p-4 rounded-xl border border-[#dae0d7] shadow-xs space-y-2">
          <div className="font-bold text-xs flex items-center space-x-1.5 text-[#223237]">
            <Zap size={15} className="text-[#B1D448]" />
            <span>Modo de Execução</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <span>Latência (400ms):</span>
            <button
              onClick={() => setLatencyEnabled(!latencyEnabled)}
              className={`px-2.5 py-0.5 rounded font-bold text-[11px] ${
                latencyEnabled ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {latencyEnabled ? 'Ativada' : 'Instantâneo'}
            </button>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>Simular Erro WhatsApp:</span>
            <button
              onClick={() => setSimulatedError('failWhatsApp', !simulatedErrors.failWhatsApp)}
              className={`px-2.5 py-0.5 rounded font-bold text-[11px] ${
                simulatedErrors.failWhatsApp ? 'bg-rose-700 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {simulatedErrors.failWhatsApp ? 'Ativo (C07)' : 'Desativado'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid of the 16 Scenarios */}
      <div className="bg-white p-6 rounded-xl border border-[#dae0d7] shadow-xs space-y-4">
        <div className="border-b border-[#dae0d7] pb-3 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-[#223237]">
              Catálogo de Cenários Obrigatórios (C01 a C16)
            </h2>
            <p className="text-[#53636A] text-xs">
              Clique em "Executar Cenário" para injetar o evento correspondente na base de dados e validar o comportamento.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SCENARIO_DESCRIPTIONS.map(sc => {
            const isExecuting = executingScenarioId === sc.id;

            return (
              <div
                key={sc.id}
                className="p-4 rounded-xl border border-[#dae0d7] bg-[#F5F6F0]/50 hover:bg-[#F5F6F0] transition space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#223237]">{sc.title}</span>
                    <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-[#dae0d7]">
                      {sc.id}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#53636A] mt-1 leading-relaxed">
                    {sc.desc}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[#dae0d7]/50">
                  <span className="text-[10px] text-gray-400">Rota vinculada: {sc.route}</span>

                  <button
                    onClick={() => handleRun(sc.id, sc.route)}
                    disabled={isExecuting}
                    className="px-3 py-1.5 bg-[#223237] hover:bg-[#2d3f45] text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 transition disabled:opacity-50"
                  >
                    <Play size={11} className="text-[#B1D448]" />
                    <span>{isExecuting ? 'Executando...' : 'Executar'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
