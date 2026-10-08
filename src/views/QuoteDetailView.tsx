import React, { useState, useMemo } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  FileText,
  Download,
  Send,
  Edit3,
  Copy,
  ExternalLink,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Mail,
  MessageSquare,
  ShieldAlert,
  Clock,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { formatCurrency, formatBps, formatDate } from '../utils/formatters';
import { generateQuotePdf } from '../utils/pdfGenerator';

interface QuoteDetailViewProps {
  quoteId: string;
  navigateTo: (route: string) => void;
}

export const QuoteDetailView: React.FC<QuoteDetailViewProps> = ({ quoteId, navigateTo }) => {
  const { db, currentUser, sendQuote, reviseQuote, setSimulatedError } = useCrm();

  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<('whatsapp' | 'email')[]>(['whatsapp', 'email']);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string; canRetryWhatsApp?: boolean } | null>(null);

  const quote = useMemo(() => {
    return db.quotes.find(q => q.id === quoteId);
  }, [db.quotes, quoteId]);

  const currentVersion = useMemo(() => {
    if (!quote) return null;
    return db.quoteVersions.find(v => v.id === quote.currentVersionId);
  }, [db.quoteVersions, quote]);

  const opp = useMemo(() => {
    if (!quote) return null;
    return db.opportunities.find(o => o.id === quote.opportunityId);
  }, [db.opportunities, quote]);

  const company = useMemo(() => {
    if (!opp) return null;
    return db.companies.find(c => c.id === opp.companyId);
  }, [db.companies, opp]);

  const contact = useMemo(() => {
    if (!opp) return null;
    return db.contacts.find(c => c.id === opp.contactId);
  }, [db.contacts, opp]);

  if (!quote || !currentVersion) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-[#223237]">Cotação não encontrada</h2>
        <button onClick={() => navigateTo('/cotacoes')} className="px-4 py-2 bg-[#223237] text-white rounded text-xs">
          Voltar às Cotações
        </button>
      </div>
    );
  }

  const handleDownloadPdf = () => {
    generateQuotePdf(quote, currentVersion, company || undefined, contact || undefined);
  };

  const handleCreateNewRevision = async () => {
    const res = await reviseQuote(quote.id);
    if (res.ok && res.data) {
      navigateTo(`/cotacoes/${quote.id}/editar`);
    }
  };

  const handleSendQuote = async (retryChannel?: 'whatsapp' | 'email') => {
    setSending(true);
    setSendResult(null);

    const res = await sendQuote(currentVersion.id, selectedChannels, retryChannel);
    setSending(false);

    if (!res.ok) {
      setSendResult({
        ok: false,
        message: res.error?.message || 'Falha ao enviar cotação.',
        canRetryWhatsApp: db.simulatedErrors.failWhatsApp
      });
    } else {
      setSendResult({
        ok: true,
        message: 'Cotação enviada com sucesso! Histórico atualizado e tarefa de retorno agendada (A03).'
      });
      setTimeout(() => {
        setSendModalOpen(false);
      }, 2500);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-xs text-[#223237]">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
        <div>
          <button
            onClick={() => navigateTo(opp ? `/oportunidades/${opp.id}` : '/cotacoes')}
            className="text-[#53636A] hover:text-[#223237] font-semibold flex items-center space-x-1"
          >
            <ArrowLeft size={13} />
            <span>Voltar à Oportunidade</span>
          </button>
          <div className="flex items-center space-x-3 pt-1">
            <h1 className="text-xl font-bold text-[#223237]">
              Cotação Comercial: {quote.number}
            </h1>
            <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
              currentVersion.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
              currentVersion.status === 'sent' ? 'bg-blue-100 text-blue-800' :
              currentVersion.status === 'expired' ? 'bg-rose-100 text-rose-800' :
              'bg-amber-100 text-amber-800'
            }`}>
              Revisão {currentVersion.revision} • {currentVersion.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          <button
            onClick={handleDownloadPdf}
            className="bg-white border border-[#dae0d7] hover:bg-gray-50 text-[#223237] px-3.5 py-2 rounded-lg font-bold flex items-center space-x-1.5 shadow-2xs transition"
          >
            <Download size={14} />
            <span>Baixar PDF Demonstrativo</span>
          </button>

          {currentVersion.status === 'draft' ? (
            <button
              onClick={() => navigateTo(`/cotacoes/${quote.id}/editar`)}
              className="bg-[#223237] hover:bg-[#2d3f45] text-white px-3.5 py-2 rounded-lg font-bold flex items-center space-x-1.5 transition"
            >
              <Edit3 size={14} className="text-[#B1D448]" />
              <span>Editar Rascunho</span>
            </button>
          ) : (
            <button
              onClick={handleCreateNewRevision}
              className="bg-[#223237] hover:bg-[#2d3f45] text-white px-3.5 py-2 rounded-lg font-bold flex items-center space-x-1.5 transition"
              title="Gera uma nova revisão imutável"
            >
              <Copy size={14} className="text-[#B1D448]" />
              <span>Nova Revisão (Rev. {currentVersion.revision + 1})</span>
            </button>
          )}

          <button
            onClick={() => setSendModalOpen(true)}
            className="bg-[#B1D448] hover:bg-[#c2e652] text-[#223237] px-4 py-2 rounded-lg font-bold flex items-center space-x-1.5 shadow-xs transition"
          >
            <Send size={14} />
            <span>Simular Envio ao Comprador</span>
          </button>
        </div>
      </div>

      {/* Simulator Shortcut Banner */}
      <div className="p-3 bg-emerald-50/70 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-950">
        <div className="flex items-center space-x-2">
          <Sparkles size={16} className="text-emerald-700" />
          <span>
            <strong>Simulador do Comprador (T21):</strong> Veja exatamente como o cliente visualiza esta cotação para download e aceite formal.
          </span>
        </div>
        <button
          onClick={() => navigateTo(`/simulador/cliente/${quote.number}`)}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 rounded-md font-bold flex items-center space-x-1"
        >
          <span>Abrir Visão do Comprador</span>
          <ExternalLink size={12} />
        </button>
      </div>

      {/* DOCUMENT PREVIEW CONTAINER (Styled like formal invoice / quote) */}
      <div className="bg-white rounded-xl border border-[#dae0d7] shadow-md p-8 max-w-4xl mx-auto space-y-6">
        {/* Document Header */}
        <div className="flex items-start justify-between border-b-2 border-[#223237] pb-5">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-[#223237] text-[#B1D448] font-black text-xl rounded-xl flex items-center justify-center">
              MW
            </div>
            <div>
              <div className="font-black text-xl tracking-wider text-[#223237]">MEGAWHIP</div>
              <div className="text-[11px] text-[#53636A] font-semibold">
                SISTEMAS ELÉTRICOS & CHICOTES EMBARCADOS
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="font-mono font-bold text-base text-[#223237]">{quote.number}</div>
            <div className="text-xs text-[#53636A]">Revisão: {currentVersion.revision}</div>
            <div className="text-xs text-[#53636A]">Emissão: {formatDate(quote.createdAt, false)}</div>
          </div>
        </div>

        {/* Demo Watermark Banner */}
        <div className="bg-red-50 border border-red-200 text-red-700 p-2 text-center rounded font-bold text-[11px] tracking-wide uppercase">
          Documento Demonstrativo • Sem Validade Comercial ou Fiscal Real
        </div>

        {/* Two Info Blocks: Client & Conditions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#F5F6F0] rounded-lg border border-[#dae0d7] space-y-1">
            <div className="font-bold text-[11px] uppercase tracking-wider text-[#53636A]">Dados do Cliente</div>
            <div className="font-bold text-sm text-[#223237]">{company?.name}</div>
            <div className="text-xs text-[#53636A]">Contato: {contact?.name}</div>
            <div className="text-xs text-[#53636A]">E-mail: {contact?.email}</div>
            <div className="text-xs text-[#53636A] font-mono">WhatsApp: {contact?.whatsappMockId}</div>
          </div>

          <div className="p-4 bg-[#F5F6F0] rounded-lg border border-[#dae0d7] space-y-1">
            <div className="font-bold text-[11px] uppercase tracking-wider text-[#53636A]">Condições da Proposta</div>
            <div className="text-xs text-[#223237]">
              Validade da Proposta: <strong>{formatDate(currentVersion.validUntil, false)}</strong>
            </div>
            <div className="text-xs text-[#223237]">
              Pagamento: <strong>{currentVersion.paymentTerms}</strong>
            </div>
            <div className="text-xs text-[#223237]">
              Prazo de Entrega: <strong>{currentVersion.deliveryTerms}</strong>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="space-y-2">
          <div className="font-bold text-xs text-[#223237]">Itens da Proposta</div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#dae0d7] bg-[#223237] text-white font-bold text-[11px]">
                <th className="py-2 px-3">Item</th>
                <th className="py-2 px-3">SKU</th>
                <th className="py-2 px-3">Descrição</th>
                <th className="py-2 px-3 text-right">Qtd</th>
                <th className="py-2 px-3 text-right">Unitário</th>
                <th className="py-2 px-3 text-right">Desconto</th>
                <th className="py-2 px-3 text-right">Total Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dae0d7]/70 text-xs">
              {currentVersion.lines.map((line, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}>
                  <td className="py-2.5 px-3 text-[#53636A]">{String(idx + 1).padStart(2, '0')}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#223237]">{line.skuSnapshot}</td>
                  <td className="py-2.5 px-3 text-[#223237]">{line.nameSnapshot}</td>
                  <td className="py-2.5 px-3 text-right font-bold">{line.quantity}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(line.unitPriceCents)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#53636A]">{formatBps(line.discountBps)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#223237]">
                    {formatCurrency(line.netCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="flex justify-end pt-3">
          <div className="w-72 bg-[#F5F6F0] p-4 rounded-xl border border-[#dae0d7] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#53636A]">Subtotal Bruto:</span>
              <span className="font-mono">{formatCurrency(currentVersion.lines.reduce((a, b) => a + b.grossCents, 0))}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Desconto Comercial:</span>
              <span className="font-mono">-{formatCurrency(currentVersion.lines.reduce((a, b) => a + b.discountCents, 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#53636A]">Frete:</span>
              <span className="font-mono">
                {currentVersion.freightPending ? 'A definir' : formatCurrency(currentVersion.freightCents)}
              </span>
            </div>
            <div className="pt-2 border-t border-[#dae0d7] flex justify-between items-baseline font-bold">
              <span className="text-sm text-[#223237]">TOTAL:</span>
              <span className="text-lg font-mono text-[#223237]">
                {formatCurrency(currentVersion.totalCents)}
              </span>
            </div>
          </div>
        </div>

        {/* Technical & Commercial Notes */}
        <div className="p-4 bg-[#F5F6F0] rounded-lg border border-[#dae0d7] text-[11px] text-[#53636A] space-y-1">
          <strong className="text-[#223237] block">Avisos Técnicos e Notas Legais:</strong>
          <div>• Proposta comercial emitida em ambiente de protótipo MegaWhip para validação de produto.</div>
          <div>• Chicotes fabricados com condutores automotivos de alta resistência, conectores selados e proteção antichamas.</div>
          <div>• Revisões posteriores substituem integralmente o teor deste documento.</div>
        </div>
      </div>

      {/* MULTICHANNEL SEND MODAL (C07) */}
      {sendModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#dae0d7] shadow-2xl p-6 max-w-lg w-full space-y-4">
            <h3 className="font-bold text-base text-[#223237] flex items-center space-x-2">
              <Send size={18} className="text-[#B1D448]" />
              <span>Simular Envio Multicanal da Cotação</span>
            </h3>

            <p className="text-xs text-[#53636A]">
              Selecione os canais de envio simulados. O histórico da oportunidade será atualizado com os comprovantes independentes de cada canal.
            </p>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-[#dae0d7] hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedChannels.includes('whatsapp')}
                  onChange={e => {
                    if (e.target.checked) setSelectedChannels(prev => [...prev, 'whatsapp']);
                    else setSelectedChannels(prev => prev.filter(c => c !== 'whatsapp'));
                  }}
                />
                <MessageSquare size={16} className="text-emerald-600" />
                <div className="flex-1">
                  <div className="font-bold text-xs text-[#223237]">WhatsApp Comercial</div>
                  <div className="text-[10px] text-[#53636A]">Destino: {contact?.whatsappMockId}</div>
                </div>
              </label>

              <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-[#dae0d7] hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedChannels.includes('email')}
                  onChange={e => {
                    if (e.target.checked) setSelectedChannels(prev => [...prev, 'email']);
                    else setSelectedChannels(prev => prev.filter(c => c !== 'email'));
                  }}
                />
                <Mail size={16} className="text-blue-600" />
                <div className="flex-1">
                  <div className="font-bold text-xs text-[#223237]">E-mail Corporativo</div>
                  <div className="text-[10px] text-[#53636A]">Destino: {contact?.email}</div>
                </div>
              </label>
            </div>

            {/* Error simulation toggle hint for C07 */}
            <div className="bg-[#F5F6F0] p-2.5 rounded border border-[#dae0d7] flex items-center justify-between text-[11px]">
              <span className="text-[#53636A]">Simular falha no WhatsApp (C07):</span>
              <button
                type="button"
                onClick={() => setSimulatedError('failWhatsApp', !db.simulatedErrors.failWhatsApp)}
                className={`px-2 py-0.5 rounded font-bold ${
                  db.simulatedErrors.failWhatsApp ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {db.simulatedErrors.failWhatsApp ? 'Falha Ativa' : 'Normal'}
              </button>
            </div>

            {sendResult && (
              <div className={`p-3 rounded-lg text-xs ${
                sendResult.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {sendResult.message}
                {sendResult.canRetryWhatsApp && (
                  <div className="mt-2 pt-2 border-t border-red-200 flex justify-end">
                    <button
                      onClick={() => handleSendQuote('whatsapp')}
                      className="px-3 py-1 bg-red-700 text-white rounded font-bold hover:bg-red-800"
                    >
                      Tentar Novamente (Apenas WhatsApp)
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setSendModalOpen(false)}
                className="px-3 py-2 border border-[#dae0d7] rounded-lg text-xs font-semibold hover:bg-gray-50"
              >
                Fechar
              </button>
              <button
                onClick={() => handleSendQuote()}
                disabled={sending || selectedChannels.length === 0}
                className="px-5 py-2 bg-[#223237] hover:bg-[#2d3f45] text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
              >
                {sending ? 'Enviando...' : 'Confirmar Envio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
