import React, { useState, useMemo } from "react";
import { useCrm } from "../context/CrmContext";
import {
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  Sparkles,
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
} from "lucide-react";
import { formatCurrency, formatBps, formatDate } from "../utils/formatters";
import { generateQuotePdf } from "../utils/pdfGenerator";

interface CustomerSimulatorViewProps {
  tokenOrNumber: string;
  navigateTo: (route: string) => void;
}

export const CustomerSimulatorView: React.FC<CustomerSimulatorViewProps> = ({
  tokenOrNumber,
  navigateTo,
}) => {
  const { db, acceptQuote, rejectQuote, receiveInboundMessage } = useCrm();

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);

  // Find quote by number or token
  const quote = useMemo(() => {
    return db.quotes.find((q) =>
      db.quoteVersions.some(
        (v) => v.id === tokenOrNumber && v.quoteId === q.id,
      ),
    );
  }, [db.quotes, tokenOrNumber]);

  const currentVersion = useMemo(() => {
    if (!quote) return null;
    return db.quoteVersions.find((v) => v.id === tokenOrNumber);
  }, [db.quoteVersions, quote]);

  const opp = useMemo(() => {
    if (!quote) return null;
    return db.opportunities.find((o) => o.id === quote.opportunityId);
  }, [db.opportunities, quote]);

  const company = useMemo(() => {
    if (!opp) return null;
    return db.companies.find((c) => c.id === opp.companyId);
  }, [db.companies, opp]);

  const contact = useMemo(() => {
    if (!opp) return null;
    return db.contacts.find((c) => c.id === opp.contactId);
  }, [db.contacts, opp]);

  const conv = useMemo(() => {
    if (!opp) return null;
    return db.conversations.find((c) => c.opportunityId === opp.id);
  }, [db.conversations, opp]);

  const handleDownload = () => {
    if (quote && currentVersion) {
      generateQuotePdf(
        quote,
        currentVersion,
        company || undefined,
        contact || undefined,
      );
    }
  };

  const handleAccept = async () => {
    if (!currentVersion) return;
    setActionError(null);
    setActionSuccess(null);

    const res = await acceptQuote(currentVersion.id);
    if (!res.ok && res.error) {
      setActionError(res.error.message);
    } else {
      setActionSuccess(
        "Cotação aceita formalmente pelo comprador! O vendedor agora pode confirmar o fechamento comercial.",
      );
    }
  };

  const handleRequestDiscount8 = async () => {
    if (!conv) return;
    setActionError(null);
    setActionSuccess(null);

    const result = await receiveInboundMessage(
      conv.id,
      "whatsapp",
      "Recebi a cotação. É possível ajustar para 8% de desconto para fecharmos hoje?",
    );

    if (!result.ok) {
      setActionError(result.error?.message || "Falha");
      return;
    }
    setDiscountModalOpen(false);
    setActionSuccess("Pedido de desconto registrado para análise do vendedor.");
  };

  const handleReject = async () => {
    if (!currentVersion) return;
    setActionError(null);
    setActionSuccess(null);

    const result = await rejectQuote(
      currentVersion.id,
      "Recusada pelo comprador no simulador",
    );
    if (!result.ok) {
      setActionError(result.error?.message || "Falha");
      return;
    }
    setActionSuccess("Proposta marcada como recusada.");
  };

  if (!quote || !currentVersion) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-[#223237]">
          Proposta não encontrada
        </h2>
        <button
          onClick={() => navigateTo("/visao-geral")}
          className="px-4 py-2 bg-[#223237] text-white rounded text-xs"
        >
          Voltar ao CRM
        </button>
      </div>
    );
  }

  const isExpired =
    currentVersion.status === "expired" ||
    Date.parse(currentVersion.validUntil) <= Date.parse(db.meta.clock);
  const isSuperseded = currentVersion.status === "superseded";
  const isAccepted = currentVersion.status === "accepted";

  return (
    <div className="min-h-screen bg-[#F5F6F0] p-4 md:p-8 text-xs text-[#223237]">
      {/* Simulation Banner Header */}
      <div className="max-w-4xl mx-auto mb-6 bg-[#223237] text-white p-4 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#2d3f45]">
        <div className="flex items-center space-x-2.5">
          <img
            src="/logo-megawhip.png"
            alt="MegaWhip"
            className="w-24 bg-white rounded p-1"
          />
          <div>
            <div className="font-bold text-sm tracking-wide">
              SIMULADOR DO COMPRADOR
            </div>
            <div className="text-[11px] text-[#B1D448]">
              Visão externa fictícia recebida por link no WhatsApp/E-mail
            </div>
          </div>
        </div>

        <button
          onClick={() =>
            navigateTo(opp ? `/oportunidades/${opp.id}` : "/cotacoes")
          }
          className="bg-[#2d3f45] hover:bg-[#384c54] text-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 self-start sm:self-auto transition"
        >
          <ArrowLeft size={13} />
          <span>Retornar ao Painel do CRM</span>
        </button>
      </div>

      {actionError && (
        <div className="max-w-4xl mx-auto mb-4 p-4 bg-red-50 border border-red-300 text-red-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="max-w-4xl mx-auto mb-4 p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center space-x-2">
          <CheckCircle size={16} className="shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Quote Document Container */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-[#dae0d7] shadow-lg p-6 sm:p-10 space-y-6">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#dae0d7] gap-4">
          <div>
            <span className="font-extrabold text-xl tracking-wider text-[#223237]">
              MEGAWHIP
            </span>
            <div className="text-xs text-[#53636A] font-medium">
              Chicotes Elétricos & Sistemas Embarcados
            </div>
            <div className="text-[11px] text-[#53636A] mt-1">
              Destinatário: <strong>{company?.name}</strong> (A/C{" "}
              {contact?.name})
            </div>
          </div>

          <div className="sm:text-right space-y-1">
            <div className="font-mono font-black text-lg text-[#223237]">
              {quote.number}
            </div>
            <div className="text-xs text-[#53636A]">
              Revisão Vigente: Rev. {currentVersion.revision}
            </div>
            <div>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                  isAccepted
                    ? "bg-emerald-100 text-emerald-800"
                    : isExpired
                      ? "bg-rose-100 text-rose-800"
                      : isSuperseded
                        ? "bg-gray-100 text-gray-700"
                        : "bg-blue-100 text-blue-800"
                }`}
              >
                {isAccepted
                  ? "PROPOSTA ACEITA"
                  : isExpired
                    ? "VALIDADE EXPIRADA"
                    : isSuperseded
                      ? "SUBSTITUÍDA"
                      : "AGUARDANDO APROVAÇÃO DO CLIENTE"}
              </span>
            </div>
          </div>
        </div>

        {/* Warning if Expired or Superseded */}
        {isExpired && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-center space-x-2">
            <AlertTriangle size={16} className="shrink-0 text-rose-600" />
            <div>
              <strong>Atenção:</strong> Esta cotação venceu em{" "}
              {formatDate(currentVersion.validUntil, false)}. O aceite está
              bloqueado. Solicite ao vendedor uma nova revisão atualizada.
            </div>
          </div>
        )}

        {isSuperseded && (
          <div className="p-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-800 text-xs flex items-center space-x-2">
            <AlertTriangle size={16} className="shrink-0 text-gray-600" />
            <div>
              <strong>Revisão Substituída:</strong> Uma versão mais recente
              desta proposta já foi emitida. O aceite desta versão anterior foi
              bloqueado pelo sistema.
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="space-y-3">
          <h2 className="font-bold text-sm text-[#223237]">Itens da Cotação</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#dae0d7] text-[#53636A] font-semibold text-[11px] bg-[#F5F6F0]">
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Item / Descrição</th>
                  <th className="py-2.5 px-3 text-right">Qtd</th>
                  <th className="py-2.5 px-3 text-right">Unitário</th>
                  <th className="py-2.5 px-3 text-right">Desconto</th>
                  <th className="py-2.5 px-3 text-right">Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dae0d7]/70 text-xs">
                {currentVersion.lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono font-bold">
                      {line.skuSnapshot}
                    </td>
                    <td className="py-3 px-3">{line.nameSnapshot}</td>
                    <td className="py-3 px-3 text-right font-bold">
                      {line.quantity}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {formatCurrency(line.unitPriceCents)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#53636A]">
                      {formatBps(line.discountBps)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#223237]">
                      {formatCurrency(line.netCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Delivery Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="p-4 bg-[#F5F6F0] rounded-xl border border-[#dae0d7] space-y-2 text-xs">
            <div className="font-bold text-xs text-[#223237]">
              Condições Gerais:
            </div>
            <div>
              Validade garantida até:{" "}
              <strong>{formatDate(currentVersion.validUntil, false)}</strong>
            </div>
            <div>
              Condição de Pagamento:{" "}
              <strong>{currentVersion.paymentTerms}</strong>
            </div>
            <div>
              Prazo de Entrega: <strong>{currentVersion.deliveryTerms}</strong>
            </div>
          </div>

          <div className="p-4 bg-[#F5F6F0] rounded-xl border border-[#dae0d7] space-y-2 text-xs text-right">
            <div className="flex justify-between">
              <span className="text-[#53636A]">Subtotal Itens:</span>
              <span className="font-mono">
                {formatCurrency(
                  currentVersion.lines.reduce((a, b) => a + b.grossCents, 0),
                )}
              </span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Desconto:</span>
              <span className="font-mono">
                -
                {formatCurrency(
                  currentVersion.lines.reduce((a, b) => a + b.discountCents, 0),
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#53636A]">Frete:</span>
              <span className="font-mono">
                {currentVersion.freightPending
                  ? "A definir"
                  : formatCurrency(currentVersion.freightCents)}
              </span>
            </div>
            <div className="pt-2 border-t border-[#dae0d7] flex justify-between items-baseline font-bold">
              <span className="text-sm text-[#223237]">TOTAL PROPOSTA:</span>
              <span className="text-xl font-mono text-[#223237]">
                {formatCurrency(currentVersion.totalCents)}
              </span>
            </div>
          </div>
        </div>

        {/* Buyer Actions Buttons */}
        <div className="pt-6 border-t border-[#dae0d7] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto px-4 py-2.5 border border-[#dae0d7] hover:bg-gray-50 rounded-xl font-bold flex items-center justify-center space-x-2 text-[#223237] transition"
          >
            <Download size={15} />
            <span>Baixar Cópia em PDF</span>
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={() => setDiscountModalOpen(true)}
              disabled={isAccepted}
              className="flex-1 sm:flex-initial px-4 py-2.5 border border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl font-semibold transition disabled:opacity-50"
            >
              Pedir Ajuste (8% Desc)
            </button>

            <button
              onClick={handleReject}
              disabled={isAccepted || isExpired || isSuperseded}
              className="flex-1 sm:flex-initial px-4 py-2.5 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl font-semibold transition disabled:opacity-50"
            >
              Recusar
            </button>

            <button
              onClick={handleAccept}
              disabled={isAccepted || isExpired || isSuperseded}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50"
            >
              {isAccepted ? "✓ Proposta Já Aceita" : "Aceitar Cotação"}
            </button>
          </div>
        </div>
      </div>

      {/* Discount Request Modal */}
      {discountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#dae0d7] shadow-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-sm text-[#223237]">
              Solicitar Renegociação Comercial (C08)
            </h3>
            <p className="text-xs text-[#53636A]">
              Simular comprador solicitando 8% de desconto para fechamento. O
              vendedor receberá a mensagem no histórico do CRM e a oportunidade
              avançará para "Em Negociação".
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDiscountModalOpen(false)}
                className="px-3 py-1.5 border border-[#dae0d7] rounded-lg text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleRequestDiscount8}
                className="px-4 py-1.5 bg-[#223237] text-white rounded-lg text-xs font-bold"
              >
                Enviar Solicitação (8%)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
