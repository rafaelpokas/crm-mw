import {
  AttachmentPanel,
  OpportunityEditor,
} from "../components/common/Editors";
import React, { useState, useMemo } from "react";
import { useCrm } from "../context/CrmContext";
import {
  Briefcase,
  User,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  MessageSquare,
  Paperclip,
  History,
  AlertTriangle,
  ChevronRight,
  Plus,
  ArrowLeft,
  Check,
  Send,
  Upload,
} from "lucide-react";
import { formatCurrency, formatDate } from "../utils/formatters";
import { OpportunityStage, Task } from "../data/types";

interface OpportunityDetailViewProps {
  opportunityId: string;
  navigateTo: (route: string) => void;
}

export const OpportunityDetailView: React.FC<OpportunityDetailViewProps> = ({
  opportunityId,
  navigateTo,
}) => {
  const { dispatchOrderToErp,
    db,
    currentUser,
    moveOpportunity,
    assignOwner,
    createQuoteForOpportunity,
    completeTask,
    createTask,
  } = useCrm();

  const [activeTab, setActiveTab] = useState<
    "summary" | "conversations" | "quotes" | "tasks" | "files" | "timeline"
  >("summary");
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [lostReason, setLostReason] = useState("Preço");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New task form
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("2026-10-15T10:00");

  const opp = useMemo(() => {
    return db.opportunities.find((o) => o.id === opportunityId);
  }, [db.opportunities, opportunityId]);

  const company = useMemo(() => {
    if (!opp) return null;
    return db.companies.find((c) => c.id === opp.companyId);
  }, [db.companies, opp]);

  const contact = useMemo(() => {
    if (!opp) return null;
    return db.contacts.find((c) => c.id === opp.contactId);
  }, [db.contacts, opp]);

  const owner = useMemo(() => {
    if (!opp) return null;
    return db.users.find((u) => u.id === opp.ownerId);
  }, [db.users, opp]);

  const oppQuotes = useMemo(() => {
    if (!opp) return [];
    return db.quotes.filter((q) => q.opportunityId === opp.id);
  }, [db.quotes, opp]);

  const oppTasks = useMemo(() => {
    if (!opp) return [];
    return db.tasks.filter((t) => t.opportunityId === opp.id);
  }, [db.tasks, opp]);

  const oppActivities = useMemo(() => {
    if (!opp) return [];
    return db.activities
      .filter((a) => a.entityType === "opportunity" && a.entityId === opp.id)
      .reverse();
  }, [db.activities, opp]);

  const conversation = useMemo(() => {
    if (!opp) return null;
    return db.conversations.find((c) => c.opportunityId === opp.id);
  }, [db.conversations, opp]);

  if (!opp) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <h2 className="text-lg font-bold text-[#223237]">
          Registro não encontrado
        </h2>
        <p className="text-xs text-[#53636A]">
          A oportunidade informada não existe ou foi excluída.
        </p>
        <button
          onClick={() => navigateTo("/funil")}
          className="px-4 py-2 bg-[#223237] text-white rounded-lg text-xs font-semibold"
        >
          Voltar ao Funil
        </button>
      </div>
    );
  }

  const handleMarkWon = async () => {
    setActionError(null);
    setActionSuccess(null);
    if (!confirm("Confirmar fechamento comercial após o aceite?")) return;
    const res = await moveOpportunity(opp.id, "won");
    if (!res.ok && res.error) {
      setActionError(res.error.message);
    } else {
      setActionSuccess(
        "Negociação marcada como GANHA com sucesso! Indicadores atualizados.",
      );
    }
  };

  const handleMarkLost = async () => {
    setActionError(null);
    setActionSuccess(null);
    const res = await moveOpportunity(opp.id, "lost", lostReason);
    if (!res.ok && res.error) {
      setActionError(res.error.message);
    } else {
      setLostModalOpen(false);
      setActionSuccess("Oportunidade encerrada como PERDIDA.");
    }
  };

  const handleReopen = async () => {
    setActionError(null);
    setActionSuccess(null);
    if (currentUser.role !== "manager") {
      setActionError("Apenas Gestores podem reabrir negociações finalizadas.");
      return;
    }
    const reason = prompt("Justifique a reabertura");
    if (!reason) return;
    const res = await moveOpportunity(opp.id, "negotiation", reason);
    if (!res.ok && res.error) {
      setActionError(res.error.message);
    } else {
      setActionSuccess("Negociação reaberta em etapa de Negociação.");
    }
  };

  const handleCreateNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await createTask({
      opportunityId: opp.id,
      title: newTaskTitle,
      dueAt: newTaskDue + ":00-03:00",
    });
    setNewTaskTitle("");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs text-[#223237]">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
        <div className="space-y-1">
          <button
            onClick={() => navigateTo("/funil")}
            className="text-[#53636A] hover:text-[#223237] font-semibold flex items-center space-x-1"
          >
            <ArrowLeft size={13} />
            <span>Voltar ao Funil</span>
          </button>
          <div className="flex items-center space-x-3 pt-1">
            <span className="font-mono text-xs font-bold bg-[#F5F6F0] px-2 py-0.5 rounded border border-[#dae0d7]">
              {opp.id}
            </span>
            <h1 className="text-lg font-bold text-[#223237]">{opp.title}</h1>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                opp.stage === "won"
                  ? "bg-emerald-100 text-emerald-800"
                  : opp.stage === "lost"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-blue-100 text-blue-800"
              }`}
            >
              Etapa: {opp.stage.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 flex-wrap">
          {opp.stage !== "won" && opp.stage !== "lost" ? (
            <>
              <button
                onClick={handleMarkWon}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg font-bold flex items-center space-x-1 shadow-xs transition"
              >
                <CheckCircle size={14} />
                <span>Confirmar Ganho (Venda)</span>
              </button>

              <button
                onClick={() => setLostModalOpen(true)}
                className="bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1 transition"
              >
                <XCircle size={14} />
                <span>Marcar Perda</span>
              </button>
            </>
          ) : opp.stage === 'won' ? (
            <div className="flex items-center space-x-2">
              {opp.erpSyncStatus === 'confirmed' ? (
                <span className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1 border border-emerald-300">
                  <CheckCircle size={14} />
                  <span>Pedido ERP: {opp.erpOrderId}</span>
                </span>
              ) : (
                <button
                  onClick={async () => {
                    const quote = oppQuotes[0];
                    if (quote) {
                      setActionError(null);
                      const res = await dispatchOrderToErp(quote.id);
                      if (res.ok && res.data?.status === "confirmed") {
                        setActionSuccess(`Pedido ${res.data?.erpOrderId} confirmado na simulação do ERP.`);
                      } else {
                        setActionError(res.error?.message || 'Falha ao despachar para o ERP.');
                      }
                    }
                  }}
                  className="bg-blue-700 hover:bg-blue-800 text-white px-3.5 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 shadow-xs transition"
                >
                  <Send size={14} />
                  <span>Simular envio ao ERP</span>
                </button>
              )}
              <button
                onClick={handleReopen}
                className="bg-[#223237] text-white px-3 py-1.5 rounded-lg font-semibold"
              >
                Reabrir (Gestor)
              </button>
            </div>
          ) : (
            <button
              onClick={handleReopen}
              className="bg-[#223237] text-white px-3.5 py-1.5 rounded-lg font-semibold"
            >
              Reabrir Negociação (Gestor)
            </button>
          )}

          {oppQuotes.length === 0 ? (
            <button
              onClick={async () => {
                const r = await createQuoteForOpportunity(opp.id);
                if (r.ok) navigateTo(`/cotacoes/${r.data.quote.id}/editar`);
                else setActionError(r.error?.message || "Falha");
              }}
              className="bg-[#223237] text-white hover:bg-[#2d3f45] px-3.5 py-1.5 rounded-lg font-semibold flex items-center space-x-1"
            >
              <Plus size={14} className="text-[#B1D448]" />
              <span>Gerar Cotação</span>
            </button>
          ) : (
            <button
              onClick={() => navigateTo(`/cotacoes/${oppQuotes[0].id}`)}
              className="bg-[#B1D448] text-[#223237] hover:bg-[#c2e652] px-3.5 py-1.5 rounded-lg font-bold flex items-center space-x-1"
            >
              <FileText size={14} />
              <span>Ver Cotação {oppQuotes[0].number}</span>
            </button>
          )}
        </div>
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

      {/* Meta Highlights Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#dae0d7] shadow-xs">
          <div className="text-[#53636A] text-[11px] font-semibold">
            CLIENTE & EMPRESA
          </div>
          <div className="font-bold text-[#223237] mt-1 truncate">
            {company?.name}
          </div>
          <div className="text-[11px] text-[#53636A] truncate">
            {contact?.name} ({contact?.preferredChannel})
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#dae0d7] shadow-xs">
          <div className="text-[#53636A] text-[11px] font-semibold">
            VALOR TOTAL DA PROPOSTA
          </div>
          <div className="font-mono text-base font-black text-[#223237] mt-1">
            {formatCurrency(opp.estimatedValueCents)}
          </div>
          <div className="text-[10px] text-[#53636A]">
            Cálculo determinístico
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#dae0d7] shadow-xs">
          <div className="text-[#53636A] text-[11px] font-semibold">
            RESPONSÁVEL COMERCIAL
          </div>
          <div className="font-bold text-[#223237] mt-1">
            {owner?.name || "Não atribuído"}
          </div>
          <div className="text-[10px] text-[#53636A]">Alçada: 5% máx</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#dae0d7] shadow-xs">
          <div className="text-[#53636A] text-[11px] font-semibold">
            PARECER TÉCNICO
          </div>
          <div className="font-bold mt-1 text-[#223237] flex items-center space-x-1">
            <span
              className={`w-2 h-2 rounded-full ${opp.technicalStatus === "approved_demo" ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            <span className="capitalize">
              {opp.technicalStatus === "approved_demo"
                ? "Aprovado (Demo)"
                : "Pendente Engenharia"}
            </span>
          </div>
          <div className="text-[10px] text-[#53636A]">
            Validação de compatibilidade
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-[#dae0d7] flex space-x-4 text-xs font-semibold">
        {[
          { id: "summary", label: "Resumo & Requisitos Técnicos" },
          { id: "quotes", label: `Cotações (${oppQuotes.length})` },
          { id: "conversations", label: "Atendimento & Mensagens" },
          {
            id: "tasks",
            label: `Tarefas (${oppTasks.filter((t) => t.status === "open").length})`,
          },
          { id: "files", label: "Arquivos & Diagramas (Demo)" },
          { id: "timeline", label: "Histórico & Auditoria" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2.5 px-1 border-b-2 transition ${
              activeTab === tab.id
                ? "border-[#223237] text-[#223237] font-bold"
                : "border-transparent text-[#53636A] hover:text-[#223237]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === "summary" && <OpportunityEditor id={opp.id} />}
      {activeTab === "summary" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Panel: Technical Specifications */}
          <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-[#223237] border-b border-[#dae0d7] pb-2">
              Painel de Requisitos Técnicos & Aplicação
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#53636A] block text-[11px]">
                  Segmento de Mercado:
                </span>
                <strong className="text-[#223237]">{company?.segment}</strong>
              </div>

              <div>
                <span className="text-[#53636A] block text-[11px]">
                  Aplicação Descrita pelo Comprador:
                </span>
                <p className="p-2.5 bg-[#F5F6F0] rounded border border-[#dae0d7] text-[#223237] leading-relaxed">
                  Chicotes e conectores elétricos demonstrativos para reposição
                  e manutenção de implementos agrícolas. Não declarar
                  compatibilidade com máquinas reais fora do cenário.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[#53636A] block text-[11px]">
                    Código de Referência Informado:
                  </span>
                  <strong className="text-[#223237] font-mono">
                    DEMO-MW-001 / DEMO-MW-002
                  </strong>
                </div>
                <div>
                  <span className="text-[#53636A] block text-[11px]">
                    Prazo Solicitado:
                  </span>
                  <strong className="text-[#223237]">
                    Padrão demonstrativo (5 a 10 dias)
                  </strong>
                </div>
              </div>

              <div>
                <span className="text-[#53636A] block text-[11px]">
                  Status da Homologação Técnica:
                </span>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-emerald-100 text-emerald-800">
                    Aprovado para Cotação Demonstrativa
                  </span>
                  <span className="text-[10px] text-[#53636A]">
                    Parecer por Técnico Demo
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel: Commercial Context */}
          <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-[#223237] border-b border-[#dae0d7] pb-2">
              Contexto Comercial & Condições
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#53636A] block text-[11px]">
                  Condições de Pagamento:
                </span>
                <p className="text-[#223237]">
                  Faturamento a prazo demonstrativo sujeito à aprovação
                  cadastral.
                </p>
              </div>

              <div>
                <span className="text-[#53636A] block text-[11px]">
                  Frete e Logística:
                </span>
                <p className="text-[#223237]">
                  Frete calculado conforme tabela demonstrativa (R$ 80,00
                  padrão).
                </p>
              </div>

              <div>
                <span className="text-[#53636A] block text-[11px]">
                  Aviso Legal Demonstrativo:
                </span>
                <p className="text-[11px] text-[#53636A] bg-amber-50 p-2.5 rounded border border-amber-200">
                  Os valores calculados são estritamente demonstrativos para
                  validação do protótipo comercial da MegaWhip, sem apuração
                  tributária de ICMS/ST/IPI nesta versão.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "quotes" && (
        <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-[#223237]">
              Cotações da Oportunidade
            </h2>
            <button
              onClick={async () => {
                const r = await createQuoteForOpportunity(opp.id);
                if (r.ok) navigateTo(`/cotacoes/${r.data.quote.id}/editar`);
                else setActionError(r.error?.message || "Falha");
              }}
              className="bg-[#223237] hover:bg-[#2d3f45] text-white px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1"
            >
              <Plus size={14} className="text-[#B1D448]" />
              <span>Nova Cotação</span>
            </button>
          </div>

          {oppQuotes.length === 0 ? (
            <div className="py-8 text-center text-[#53636A]">
              Nenhuma cotação gerada ainda para esta oportunidade.
            </div>
          ) : (
            <div className="space-y-3">
              {oppQuotes.map((q) => {
                const ver = db.quoteVersions.find(
                  (v) => v.id === q.currentVersionId,
                );
                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border border-[#dae0d7] bg-[#F5F6F0]/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-[#223237]">
                          {q.number}
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold text-[10px]">
                          Rev. {ver?.revision} • {ver?.status.toUpperCase()}
                        </span>
                        {ver?.approvalStatus === "pending" && (
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px]">
                            Aguardando Aprovação de Alçada
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#53636A]">
                        {ver?.lines.length} itens cotados • Validade:{" "}
                        {formatDate(ver?.validUntil, false)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-mono text-base font-black text-[#223237]">
                          {formatCurrency(ver?.totalCents)}
                        </div>
                        <div className="text-[10px] text-[#53636A]">
                          Frete: {formatCurrency(ver?.freightCents)}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigateTo(`/cotacoes/${q.id}/editar`)}
                          className="px-3 py-1.5 bg-white border border-[#dae0d7] hover:bg-gray-50 rounded-lg font-semibold text-[#223237]"
                        >
                          Editar Rascunho
                        </button>
                        <button
                          onClick={() => navigateTo(`/cotacoes/${q.id}`)}
                          className="px-3.5 py-1.5 bg-[#223237] hover:bg-[#2d3f45] text-white rounded-lg font-semibold flex items-center space-x-1"
                        >
                          <span>Ver Proposta & PDF</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "conversations" && (
        <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-[#223237]">
              Mensagens & Atendimento Integrado
            </h2>
            <button
              onClick={() =>
                navigateTo(
                  `/atendimento?conversation=${conversation?.id || ""}`,
                )
              }
              className="bg-[#223237] text-white px-3 py-1.5 rounded-lg font-semibold"
            >
              Abrir na Caixa de Atendimento
            </button>
          </div>

          {conversation ? (
            <div className="space-y-2">
              <div className="text-xs text-[#53636A]">
                Canal preferencial: <strong>{contact?.preferredChannel}</strong>{" "}
                • Modo IA: <strong>{conversation.aiMode}</strong>
              </div>
              <div className="p-4 bg-[#F5F6F0] rounded-lg border border-[#dae0d7] space-y-2 max-h-72 overflow-y-auto">
                {db.messages
                  .filter((m) => m.conversationId === conversation.id)
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className="p-2 rounded bg-white border border-[#dae0d7] text-xs space-y-1"
                    >
                      <div className="flex justify-between text-[10px] text-[#53636A]">
                        <span className="font-bold">
                          {msg.direction === "inbound"
                            ? contact?.name
                            : "Equipe MegaWhip"}{" "}
                          ({msg.channel})
                        </span>
                        <span>{formatDate(msg.createdAt, true)}</span>
                      </div>
                      <p className="text-[#223237]">{msg.body}</p>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-[#53636A]">
              Nenhum histórico de conversa registrado para esta negociação.
            </div>
          )}
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-[#223237]">
              Tarefas & Acompanhamento
            </h2>
          </div>

          <form
            onSubmit={handleCreateNewTask}
            className="flex gap-2 items-center bg-[#F5F6F0] p-3 rounded-lg border border-[#dae0d7]"
          >
            <input
              type="text"
              placeholder="Criar nova tarefa ou follow-up comercial..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 p-2 border border-[#dae0d7] rounded-md text-xs bg-white focus:outline-hidden"
            />
            <input
              type="datetime-local"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              className="p-2 border border-[#dae0d7] rounded-md text-xs bg-white focus:outline-hidden"
            />
            <button
              type="submit"
              className="bg-[#223237] text-white px-3 py-2 rounded-md font-semibold text-xs shrink-0"
            >
              + Adicionar
            </button>
          </form>

          <div className="divide-y divide-[#dae0d7]">
            {oppTasks.map((t) => (
              <div
                key={t.id}
                className="py-2.5 flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-[#223237] flex items-center space-x-2">
                    <span
                      className={
                        t.status === "completed"
                          ? "line-through text-gray-400"
                          : ""
                      }
                    >
                      {t.title}
                    </span>
                    {t.automationKey && (
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                        Automação {t.automationKey.split("-")[0]}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#53636A]">
                    Vencimento: {formatDate(t.dueAt, true)} • Status: {t.status}
                  </div>
                </div>

                {t.status === "open" && (
                  <button
                    onClick={() => completeTask(t.id)}
                    className="p-1.5 bg-[#F5F6F0] hover:bg-emerald-100 hover:text-emerald-700 rounded text-xs transition"
                    title="Concluir tarefa"
                  >
                    <Check size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "files" && <AttachmentPanel opportunityId={opp.id} />}

      {activeTab === "timeline" && (
        <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-4">
          <h2 className="font-bold text-sm text-[#223237]">
            Linha do Tempo de Atividades Imutáveis
          </h2>
          <div className="relative pl-6 space-y-4 border-l-2 border-[#dae0d7]/80">
            {oppActivities.map((act) => {
              const actor = db.users.find((u) => u.id === act.actorId);
              return (
                <div key={act.id} className="relative">
                  <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-[#B1D448] border-2 border-white" />
                  <div className="text-xs font-semibold text-[#223237]">
                    Ação: {act.action} • Realizada por:{" "}
                    {actor?.name || "Sistema"}
                  </div>
                  <div className="text-[11px] text-[#53636A] mt-0.5">
                    {formatDate(act.createdAt, true)} • Evento: {act.id}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lost Reason Modal (C13) */}
      {lostModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#dae0d7] shadow-2xl p-5 max-w-md w-full space-y-4">
            <h3 className="font-bold text-sm text-[#223237]">
              Encerrar Negociação como Perdida (C13)
            </h3>
            <p className="text-xs text-[#53636A]">
              Informe o motivo da perda. A validação comercial exige
              justificativa para cancelamento das automações:
            </p>

            <select
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs bg-white"
            >
              <option value="Preço">Preço acima da concorrência</option>
              <option value="Prazo">Prazo de entrega longo</option>
              <option value="Incompatibilidade técnica">
                Incompatibilidade técnica
              </option>
              <option value="Cliente desistiu">
                Cliente cancelou o projeto
              </option>
            </select>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setLostModalOpen(false)}
                className="px-3 py-1.5 border border-[#dae0d7] rounded-lg text-xs hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleMarkLost}
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
