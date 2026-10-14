import React, { useState, useMemo } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  Package,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  FileText,
  ShieldCheck,
  ChevronRight,
  Database,
  ShoppingCart,
  Send,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface CatalogViewProps {
  productId?: string;
  navigateTo: (route: string) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ productId, navigateTo }) => {
  const { db, simulateCatalogSubmission } = useCrm();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProdId, setSelectedProdId] = useState<string | null>(productId || null);

  // Catalog request simulation modal state
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState('Colheitadeira John Deere CH570');
  const [customerName, setCustomerName] = useState('Comprador Demo 01 (Usina)');
  const [customerEmail, setCustomerEmail] = useState('comprador01@example.com');
  const [customerWa, setCustomerWa] = useState('WA-DEMO-001');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(db.products.map(p => p.category));
    return ['all', ...Array.from(cats)];
  }, [db.products]);

  const filteredProducts = useMemo(() => {
    return db.products.filter(p => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.application.toLowerCase().includes(q);
      }
      return true;
    });
  }, [db.products, selectedCategory, searchQuery]);

  const activeProduct = useMemo(() => {
    if (!selectedProdId) return null;
    return db.products.find(p => p.id === selectedProdId);
  }, [db.products, selectedProdId]);

  const handleSendCatalogRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRequest(true);
    setRequestFeedback(null);

    const res = await simulateCatalogSubmission({
      contactName: customerName,
      contactEmail: customerEmail,
      contactWa: customerWa,
      machineModel: selectedMachine,
      selectedItems: [
        { sku: 'DEMO-MW-001', quantity: 2 },
        { sku: 'DEMO-MW-002', quantity: 4 }
      ]
    });

    setSubmittingRequest(false);
    if (res.ok) {
      setRequestFeedback('Solicitação do Catálogo transportada com sucesso para o atendimento!');
      setTimeout(() => {
        setCatalogModalOpen(false);
        if (res.data?.opportunity?.id) {
          navigateTo(`/oportunidades/${res.data.opportunity.id}`);
        }
      }, 1200);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs text-[#223237]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#223237] flex items-center space-x-2">
            <span>Catálogo Comercial & Peças Demonstrativas (T11)</span>
            <span className="text-xs font-normal bg-[#B1D448]/20 text-[#223237] px-2 py-0.5 rounded border border-[#B1D448]/40">
              {db.products.length} itens cadastrados
            </span>
          </h1>
          <p className="text-xs text-[#53636A] mt-1">
            SKUs com consulta de disponibilidade no ERP COBOL/Delphi e integração direta com o fluxo de atendimento.
          </p>
        </div>

        <button
          onClick={() => setCatalogModalOpen(true)}
          className="bg-[#223237] hover:bg-[#2d3f45] text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2 shadow-xs transition"
        >
          <ShoppingCart size={15} className="text-[#B1D448]" />
          <span>Simular Seleção no Catálogo (Jornada)</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex space-x-1 overflow-x-auto w-full sm:w-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-semibold capitalize whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-[#223237] text-white shadow-2xs'
                  : 'bg-white border border-[#dae0d7] text-[#53636A] hover:bg-gray-50'
              }`}
            >
              {cat === 'all' ? 'Todas as Categorias' : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-2.5 text-[#53636A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por SKU ou descrição..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#dae0d7] rounded-lg text-xs placeholder-[#53636A] focus:outline-hidden"
          />
        </div>
      </div>

      {/* Grid of Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map(p => {
          const isSelected = p.id === selectedProdId;
          const erpItem = db.erpStock.find(s => s.sku === p.sku);

          return (
            <div
              key={p.id}
              onClick={() => setSelectedProdId(p.id)}
              className={`bg-white rounded-xl border p-5 space-y-3 cursor-pointer shadow-xs hover:border-[#B1D448] transition ${
                isSelected ? 'border-[#B1D448] ring-2 ring-[#B1D448]/20' : 'border-[#dae0d7]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-[#223237] bg-[#F5F6F0] px-2 py-0.5 rounded border border-[#dae0d7]">
                    {p.sku}
                  </span>
                  <h3 className="font-bold text-sm text-[#223237] mt-2 line-clamp-1">{p.name}</h3>
                </div>
                <span className="text-[10px] bg-gray-100 text-[#53636A] px-2 py-0.5 rounded font-semibold capitalize">
                  {p.category}
                </span>
              </div>

              <div className="text-[11px] text-[#53636A] line-clamp-2 leading-relaxed">
                {p.application}
              </div>

              {/* Live ERP Stock indicator */}
              <div className="p-2 bg-[#F5F6F0] rounded border border-[#dae0d7] flex items-center justify-between text-[11px]">
                <span className="flex items-center space-x-1 text-gray-600">
                  <Database size={12} className="text-blue-600" />
                  <span>Estoque ERP:</span>
                </span>
                <span className="font-bold text-emerald-800">
                  {erpItem ? `${erpItem.availableStock} un disponíveis` : 'Sob consulta'}
                </span>
              </div>

              <div className="pt-2 border-t border-[#dae0d7]/70 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#53636A] block">Preço de Tabela (un):</span>
                  <span className="font-mono font-bold text-sm text-[#223237]">
                    {formatCurrency(p.unitPriceCents)}
                  </span>
                </div>

                {p.requiresTechnicalApproval ? (
                  <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded">
                    Requer Eng.
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                    Catálogo Padrão
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Product Detail Modal */}
      {activeProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#dae0d7] shadow-2xl p-6 max-w-lg w-full space-y-4">
            <div className="flex justify-between items-start border-b border-[#dae0d7] pb-3">
              <div>
                <span className="font-mono font-bold text-xs bg-[#F5F6F0] px-2 py-0.5 rounded border border-[#dae0d7]">
                  {activeProduct.sku}
                </span>
                <h3 className="text-base font-bold text-[#223237] mt-1">{activeProduct.name}</h3>
              </div>
              <button onClick={() => setSelectedProdId(null)} className="text-[#53636A] hover:text-[#223237] text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#53636A] block text-[11px]">Categoria:</span>
                <strong className="text-[#223237]">{activeProduct.category} (Unidade: {activeProduct.unit})</strong>
              </div>

              <div>
                <span className="text-[#53636A] block text-[11px]">Preço Unitário Base:</span>
                <span className="font-mono text-base font-bold text-[#223237]">
                  {formatCurrency(activeProduct.unitPriceCents)}
                </span>
              </div>

              <div>
                <span className="text-[#53636A] block text-[11px]">Aplicação Técnica Aprovada:</span>
                <p className="p-2.5 bg-[#F5F6F0] rounded border border-[#dae0d7] text-[#223237] leading-relaxed">
                  {activeProduct.application}
                </p>
              </div>

              {activeProduct.requiresTechnicalApproval && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px]">
                  <strong>Aviso de Engenharia:</strong> Este item envolve desenvolvimento sob medida ou engenharia reversa. O envio da cotação requer validação técnica dimensional prévia.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedProdId(null)}
                className="px-4 py-2 bg-[#223237] text-white rounded-lg font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Request Simulation Modal (Item 1 & 4 from 13/10 Update) */}
      {catalogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#dae0d7] shadow-2xl p-6 max-w-lg w-full space-y-4">
            <div className="border-b border-[#dae0d7] pb-3">
              <h3 className="font-bold text-base text-[#223237] flex items-center space-x-2">
                <ShoppingCart size={18} className="text-[#B1D448]" />
                <span>Simulação: Cliente Seleciona Peças no Catálogo</span>
              </h3>
              <p className="text-xs text-[#53636A] mt-1">
                Transporta máquina, SKUs selecionados, quantidades e dados de contato para o CRM sem perder o contexto da seleção.
              </p>
            </div>

            {requestFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded font-bold text-xs">
                {requestFeedback}
              </div>
            )}

            <form onSubmit={handleSendCatalogRequest} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Máquina / Implemento Selecionado:</label>
                <select
                  value={selectedMachine}
                  onChange={e => setSelectedMachine(e.target.value)}
                  className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs bg-white"
                >
                  <option value="Colheitadeira John Deere CH570">Colheitadeira John Deere CH570 (Cana)</option>
                  <option value="Trator Case Magnum 340">Trator Case Magnum 340 (Grãos)</option>
                  <option value="Pulverizador Patriot 350">Pulverizador Patriot 350</option>
                  <option value="Transbordo canavieiro">Transbordo canavieiro (OEM)</option>
                </select>
              </div>

              <div className="p-2.5 bg-gray-50 border border-[#dae0d7] rounded-lg space-y-1">
                <div className="font-bold text-[11px] text-[#223237]">Itens Transportados do Catálogo:</div>
                <div className="text-[11px] text-[#53636A]">
                  • 2x DEMO-MW-001 (Chicote padrão demonstrativo)<br />
                  • 4x DEMO-MW-002 (Conector demonstrativo)
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Nome do Comprador:</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">E-mail Corporativo:</label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">WhatsApp Fictício:</label>
                <input
                  type="text"
                  required
                  value={customerWa}
                  onChange={e => setCustomerWa(e.target.value)}
                  className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCatalogModalOpen(false)}
                  className="px-3 py-1.5 border border-[#dae0d7] rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-5 py-2 bg-[#223237] hover:bg-[#2d3f45] text-white rounded-lg font-bold text-xs"
                >
                  {submittingRequest ? 'Transportando...' : 'Confirmar e Abrir no CRM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
