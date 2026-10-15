import React, { useState, useMemo, useEffect } from "react";
import { useCrm } from "../context/CrmContext";
import {
  FileSpreadsheet,
  ArrowLeft,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Save,
  Send,
  Eye,
  ShieldAlert,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatCurrency, formatBps, formatDate } from "../utils/formatters";
import { calculateLineNet, calculateQuoteTotals } from "../utils/calculations";
import { QuoteLine } from "../data/types";

interface QuoteEditorViewProps {
  quoteId: string;
  navigateTo: (route: string) => void;
}

export const QuoteEditorView: React.FC<QuoteEditorViewProps> = ({
  quoteId,
  navigateTo,
}) => {
  const { db, currentUser, saveQuoteDraft, requestApproval } = useCrm();

  const quote = useMemo(() => {
    return db.quotes.find((q) => q.id === quoteId);
  }, [db.quotes, quoteId]);

  const currentVersion = useMemo(() => {
    if (!quote) return null;
    return db.quoteVersions.find(
      (v) => v.id === (quote.draftVersionId || quote.currentVersionId),
    );
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

  // Form lines state
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [freightCents, setFreightCents] = useState<number>(8000);
  const [freightPending, setFreightPending] = useState<boolean>(false);
  const [paymentTerms, setPaymentTerms] = useState<string>("");
  const [deliveryTerms, setDeliveryTerms] = useState<string>("");
  const [validUntilDate, setValidUntilDate] = useState<string>("");

  const [approvalReason, setApprovalReason] = useState<string>(
    "Desconto excepcional comercial",
  );
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize from current version
  useEffect(() => {
    if (currentVersion) {
      setLines(JSON.parse(JSON.stringify(currentVersion.lines)));
      setFreightCents(currentVersion.freightCents || 0);
      setFreightPending(currentVersion.freightPending || false);
      setPaymentTerms(
        currentVersion.paymentTerms || "Condição demonstrativa a confirmar",
      );
      setDeliveryTerms(
        currentVersion.deliveryTerms ||
          "Prazo demonstrativo sujeito à validação",
      );
      setValidUntilDate(
        currentVersion.validUntil
          ? currentVersion.validUntil.split("T")[0]
          : "2026-10-16",
      );
    }
  }, [currentVersion]);

  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if ((window as any).__crmDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => {
      window.removeEventListener("beforeunload", before);
      (window as any).__crmDirty = false;
    };
  }, []);
  // Dynamic calculations
  const totals = useMemo(() => {
    return calculateQuoteTotals(
      lines,
      freightPending ? 0 : freightCents,
      db.rules.sellerDiscountLimitBps,
    );
  }, [lines, freightCents, freightPending]);

  if (!quote || !currentVersion) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-[#223237]">
          Cotação não encontrada
        </h2>
        <button
          onClick={() => navigateTo("/cotacoes")}
          className="px-4 py-2 bg-[#223237] text-white rounded text-xs"
        >
          Voltar às Cotações
        </button>
      </div>
    );
  }

  // Update line field
  const handleUpdateLine = (
    index: number,
    field: keyof QuoteLine,
    value: any,
  ) => {
    (window as any).__crmDirty = true;
    setLines((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (
        field === "quantity" ||
        field === "unitPriceCents" ||
        field === "discountBps"
      ) {
        const netCalc = calculateLineNet(
          Number(item.quantity),
          item.unitPriceCents !== null ? Number(item.unitPriceCents) : 0,
          Number(item.discountBps) || 0,
        );
        item.grossCents = netCalc.grossCents;
        item.discountCents = netCalc.discountCents;
        item.netCents = netCalc.netCents;
      }

      updated[index] = item;
      return updated;
    });
  };

  // Add line from catalog
  const handleAddProduct = (productId: string) => {
    const prod = db.products.find((p) => p.id === productId);
    if (!prod) return;

    const unitPrice = prod.unitPriceCents;
    const netCalc = calculateLineNet(1, unitPrice, 0);

    const newLine: QuoteLine = {
      productId: prod.id,
      skuSnapshot: prod.sku,
      nameSnapshot: prod.name,
      quantity: 1,
      unitPriceCents: unitPrice,
      discountBps: 0,
      grossCents: netCalc.grossCents,
      discountCents: netCalc.discountCents,
      netCents: netCalc.netCents,
    };

    (window as any).__crmDirty = true;
    setLines((prev) => [...prev, newLine]);
  };

  const handleRemoveLine = (index: number) => {
    (window as any).__crmDirty = true;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const res = await saveQuoteDraft(currentVersion.id, {
      version: currentVersion.version,
      lines,
      freightCents,
      freightPending,
      paymentTerms,
      deliveryTerms,
      validUntil: `${validUntilDate}T23:59:59-03:00`,
    });

    setSaving(false);
    if (!res.ok && res.error) {
      setSaveError(res.error.message);
    } else {
      (window as any).__crmDirty = false;
      setSaveSuccess(
        "Rascunho da cotação salvo e totais recalculados com sucesso!",
      );
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  const handleRequestApproval = async () => {
    setSaving(true);
    const saved = await saveQuoteDraft(currentVersion.id, {
      version: currentVersion.version,
      lines,
      freightCents,
      freightPending,
      paymentTerms,
      deliveryTerms,
      validUntil: `${validUntilDate}T23:59:59-03:00`,
    });
    const res = saved.ok
      ? await requestApproval(currentVersion.id, approvalReason)
      : saved;
    setSaving(false);
    setShowApprovalModal(false);
    if (!res.ok && res.error) {
      setSaveError(res.error.message);
    } else {
      (window as any).__crmDirty = false;
      setSaveSuccess(
        "Solicitação de aprovação enviada com sucesso para o Gestor!",
      );
    }
  };

  return (
    <div
      onChange={() => {
        (window as any).__crmDirty = true;
      }}
      className="p-6 max-w-7xl mx-auto space-y-6 text-xs text-[#223237]"
    >
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
        <div>
          <button
            onClick={() => navigateTo(`/cotacoes/${quote.id}`)}
            className="text-[#53636A] hover:text-[#223237] font-semibold flex items-center space-x-1"
          >
            <ArrowLeft size={13} />
            <span>Voltar à visualização da cotação</span>
          </button>
          <div className="flex items-center space-x-2 pt-1">
            <h1 className="text-xl font-bold text-[#223237]">
              Editor de Cotação: {quote.number}
            </h1>
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold text-[11px]">
              Revisão {currentVersion.revision} •{" "}
              {currentVersion.status.toUpperCase()}
            </span>
          </div>
          <p className="text-[11px] text-[#53636A]">
            Cliente: <strong>{company?.name}</strong> • Contato: {contact?.name}{" "}
            • Oportunidade: {opp?.id}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="bg-[#223237] hover:bg-[#2d3f45] text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-1.5 transition"
          >
            <Save size={14} className="text-[#B1D448]" />
            <span>{saving ? "Salvando..." : "Salvar Rascunho"}</span>
          </button>

          <button
            onClick={() => navigateTo(`/cotacoes/${quote.id}`)}
            className="bg-[#B1D448] hover:bg-[#c2e652] text-[#223237] px-4 py-2 rounded-lg font-bold flex items-center space-x-1.5 transition"
          >
            <Eye size={14} />
            <span>Visualizar Documento</span>
          </button>
        </div>
      </div>

      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center space-x-2">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{saveError}</span>
        </div>
      )}
      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
          {saveSuccess}
        </div>
      )}

      {/* Main Layout: Items & Sidebar Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Item Lines */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#dae0d7] pb-3">
              <h2 className="font-bold text-sm text-[#223237]">
                Itens da Proposta Comercial
              </h2>

              {/* Add item dropdown */}
              <div className="flex items-center space-x-2">
                <span className="text-[#53636A] text-[11px]">
                  Adicionar produto:
                </span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddProduct(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="bg-[#F5F6F0] border border-[#dae0d7] rounded-md px-2 py-1 text-xs"
                >
                  <option value="">Selecione do Catálogo...</option>
                  {db.products
                    .filter((p) => p.active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} - {p.name} (
                        {p.unitPriceCents
                          ? formatCurrency(p.unitPriceCents)
                          : "Sob Consulta"}
                        )
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Table of items */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#dae0d7] text-[#53636A] font-semibold text-[11px] bg-[#F5F6F0]">
                    <th className="py-2 px-2">SKU / Produto</th>
                    <th className="py-2 px-2 w-20">Qtd (un)</th>
                    <th className="py-2 px-2 w-24">Unitário</th>
                    <th className="py-2 px-2 w-24">Desconto (%)</th>
                    <th className="py-2 px-2 text-right">Subtotal Líq.</th>
                    <th className="py-2 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dae0d7]/70 text-xs">
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div className="font-mono font-bold text-[#223237]">
                          {line.skuSnapshot}
                        </div>
                        <div className="text-[11px] text-[#53636A]">
                          {line.nameSnapshot}
                        </div>
                      </td>

                      <td className="py-3 px-2">
                        <input
                          type="number"
                          min="1"
                          max="9999"
                          value={line.quantity}
                          onChange={(e) =>
                            handleUpdateLine(
                              idx,
                              "quantity",
                              Number(e.target.value),
                            )
                          }
                          className="w-16 p-1 border border-[#dae0d7] rounded text-center font-bold"
                        />
                      </td>

                      <td className="py-3 px-2 font-mono">
                        <input
                          aria-label={`Preço em centavos ${line.skuSnapshot}`}
                          type="number"
                          min="0"
                          step="1"
                          value={line.unitPriceCents ?? ""}
                          placeholder="Sob consulta"
                          onChange={(e) =>
                            handleUpdateLine(
                              idx,
                              "unitPriceCents",
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                            )
                          }
                          className="w-24 p-1 border rounded"
                        />
                      </td>

                      <td className="py-3 px-2">
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={line.discountBps / 100}
                            onChange={(e) =>
                              handleUpdateLine(
                                idx,
                                "discountBps",
                                Math.round(
                                  (parseFloat(e.target.value) || 0) * 100,
                                ),
                              )
                            }
                            className="w-16 p-1 border border-[#dae0d7] rounded text-center"
                          />
                          <span className="text-[#53636A]">%</span>
                        </div>
                        {line.discountBps > db.rules.sellerDiscountLimitBps && (
                          <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                            Acima da alçada
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-2 font-mono font-bold text-right text-[#223237]">
                        {formatCurrency(line.netCents)}
                      </td>

                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => handleRemoveLine(idx)}
                          className="text-gray-400 hover:text-red-600 transition"
                          title="Remover item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Commercial Terms & Conditions */}
          <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-[#223237] border-b border-[#dae0d7] pb-2">
              Condições Comerciais e Logísticas
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#53636A] font-semibold mb-1">
                  Validade da Cotação (America/Sao_Paulo)
                </label>
                <input
                  type="date"
                  value={validUntilDate}
                  onChange={(e) => setValidUntilDate(e.target.value)}
                  className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-[#53636A] font-semibold mb-1">
                  Valor do Frete (Centavos)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    disabled={freightPending}
                    value={freightCents / 100}
                    onChange={(e) =>
                      setFreightCents(
                        Math.round((parseFloat(e.target.value) || 0) * 100),
                      )
                    }
                    className="flex-1 p-2 border border-[#dae0d7] rounded-lg text-xs disabled:bg-gray-100"
                  />
                  <label className="flex items-center space-x-1 text-[11px] text-[#53636A] shrink-0">
                    <input
                      type="checkbox"
                      checked={freightPending}
                      onChange={(e) => setFreightPending(e.target.checked)}
                    />
                    <span>Frete a definir</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#53636A] font-semibold mb-1">
                  Condições de Pagamento
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[#53636A] font-semibold mb-1">
                  Prazo de Entrega
                </label>
                <input
                  type="text"
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Summary Card & Approval Status */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-[#223237] border-b border-[#dae0d7] pb-2">
              Resumo Financeiro da Proposta
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#53636A]">Subtotal Bruto:</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(totals.totalGrossCents)}
                </span>
              </div>

              <div className="flex justify-between text-emerald-700">
                <span>Desconto Total:</span>
                <span className="font-mono font-semibold">
                  -{formatCurrency(totals.totalDiscountCents)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#53636A]">Frete Calculado:</span>
                <span className="font-mono font-semibold">
                  {freightPending ? "A definir" : formatCurrency(freightCents)}
                </span>
              </div>

              <div className="pt-3 border-t border-[#dae0d7] flex justify-between items-baseline">
                <span className="font-bold text-sm text-[#223237]">
                  TOTAL LÍQUIDO:
                </span>
                <span className="font-mono text-xl font-black text-[#223237]">
                  {formatCurrency(totals.totalCents)}
                </span>
              </div>
            </div>

            {/* Approval Requirement Alert */}
            {totals.requiresApprovalByDiscount && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-2 text-amber-950">
                <div className="flex items-center space-x-1.5 font-bold">
                  <ShieldAlert size={16} className="text-amber-700" />
                  <span>Alçada Comercial Ultrapassada</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  O desconto aplicado excede o limite de 500 bps (5,0%). É
                  necessária autorização formal do Gestor antes do envio.
                </p>

                <div className="text-[11px]">
                  Status da alçada:{" "}
                  <strong>{currentVersion.approvalStatus.toUpperCase()}</strong>
                </div>

                {currentVersion.approvalStatus === "pending" ? (
                  <div className="text-[11px] bg-amber-100/60 p-2 rounded text-amber-900 font-medium">
                    Aguardando decisão do Gestor Demo (U001).
                  </div>
                ) : currentVersion.approvalStatus === "approved" ? (
                  <div className="text-[11px] bg-emerald-100 p-2 rounded text-emerald-800 font-bold">
                    ✓ Desconto aprovado pelo Gestor! Envio liberado.
                  </div>
                ) : (
                  <button
                    onClick={() => setShowApprovalModal(true)}
                    className="w-full py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded font-bold text-xs shadow-2xs"
                  >
                    Solicitar Aprovação do Gestor
                  </button>
                )}
              </div>
            )}

            <div className="pt-2 space-y-2">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="w-full py-2.5 bg-[#223237] hover:bg-[#2d3f45] text-white rounded-lg font-bold text-xs shadow-xs transition"
              >
                Salvar Alterações
              </button>

              <button
                onClick={() => navigateTo(`/cotacoes/${quote.id}`)}
                className="w-full py-2 bg-[#F5F6F0] hover:bg-[#eaece5] text-[#223237] rounded-lg font-semibold text-xs border border-[#dae0d7]"
              >
                Visualizar Proposta Pronta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#dae0d7] shadow-2xl p-5 max-w-md w-full space-y-4">
            <h3 className="font-bold text-sm text-[#223237] flex items-center space-x-2">
              <ShieldAlert size={16} className="text-amber-600" />
              <span>Solicitar Aprovação de Desconto Excepcional</span>
            </h3>

            <p className="text-xs text-[#53636A]">
              Informe a justificativa comercial para o Gestor avaliar o desconto
              acima de 5%:
            </p>

            <textarea
              rows={3}
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs"
              placeholder="Ex: Cliente fechando volume ou condição estratégica de negociação..."
            />

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-3 py-1.5 border border-[#dae0d7] rounded-lg text-xs hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRequestApproval}
                className="px-4 py-1.5 bg-[#223237] hover:bg-[#2d3f45] text-white rounded-lg text-xs font-bold"
              >
                Enviar ao Gestor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
