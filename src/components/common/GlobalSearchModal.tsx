import React, { useState, useMemo, useEffect } from 'react';
import { useCrm } from '../../context/CrmContext';
import { Search, X, Building2, User, FileText, Package, Briefcase, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  navigateTo: (route: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, navigateTo }) => {
  const { db } = useCrm();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase().trim();

    const matchedContacts = db.contacts
      .filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.whatsappMockId.toLowerCase().includes(q))
      .slice(0, 4);

    const matchedCompanies = db.companies
      .filter(c => c.name.toLowerCase().includes(q) || c.segment.toLowerCase().includes(q))
      .slice(0, 4);

    const matchedOpps = db.opportunities
      .filter(o => o.title.toLowerCase().includes(q) || o.id.toLowerCase().includes(q))
      .slice(0, 4);

    const matchedQuotes = db.quotes
      .filter(qt => qt.number.toLowerCase().includes(q) || qt.id.toLowerCase().includes(q))
      .slice(0, 4);

    const matchedProducts = db.products
      .filter(p => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      .slice(0, 4);

    const totalCount = matchedContacts.length + matchedCompanies.length + matchedOpps.length + matchedQuotes.length + matchedProducts.length;

    return {
      contacts: matchedContacts,
      companies: matchedCompanies,
      opportunities: matchedOpps,
      quotes: matchedQuotes,
      products: matchedProducts,
      totalCount
    };
  }, [query, db]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="bg-[#223237] border border-[#3b4f57] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden text-gray-200">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#2d3f45] flex items-center space-x-3">
          <Search size={18} className="text-[#B1D448]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nome de contato, empresa, código de oportunidade, cotação ou SKU..."
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 focus:outline-hidden"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          )}
          <button onClick={onClose} className="text-xs bg-[#2d3f45] px-2 py-1 rounded text-gray-400 hover:text-white">
            ESC
          </button>
        </div>

        {/* Search Results Container */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4 text-xs">
          {!query.trim() && (
            <div className="text-center py-8 text-gray-400">
              <p>Digite para buscar em tempo real na base sintética da MegaWhip.</p>
              <div className="mt-3 flex justify-center space-x-2">
                <span className="bg-[#2d3f45] px-2 py-0.5 rounded text-[11px] text-[#B1D448]">DEMO-MW-001</span>
                <span className="bg-[#2d3f45] px-2 py-0.5 rounded text-[11px] text-[#B1D448]">Agro Horizonte</span>
                <span className="bg-[#2d3f45] px-2 py-0.5 rounded text-[11px] text-[#B1D448]">MW-DEMO-2026-001</span>
              </div>
            </div>
          )}

          {results && results.totalCount === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p>Nenhum registro encontrado para "{query}".</p>
              <button
                onClick={() => {
                  onClose();
                  navigateTo('/leads/novo');
                }}
                className="mt-3 inline-flex items-center space-x-1.5 bg-[#B1D448] text-[#223237] px-3 py-1.5 rounded font-semibold"
              >
                <span>Cadastrar novo lead</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}

          {results && results.totalCount > 0 && (
            <>
              {/* Opportunities */}
              {results.opportunities.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 flex items-center space-x-1">
                    <Briefcase size={12} className="text-[#B1D448]" />
                    <span>Oportunidades ({results.opportunities.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.opportunities.map(o => (
                      <div
                        key={o.id}
                        onClick={() => {
                          onClose();
                          navigateTo(`/oportunidades/${o.id}`);
                        }}
                        className="p-2 rounded bg-[#1e2c31] hover:bg-[#283b42] cursor-pointer flex items-center justify-between transition"
                      >
                        <div>
                          <div className="font-semibold text-white">{o.title}</div>
                          <div className="text-[11px] text-gray-400">ID: {o.id} • Etapa: {o.stage}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-[#B1D448]">{formatCurrency(o.estimatedValueCents)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quotes */}
              {results.quotes.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 flex items-center space-x-1">
                    <FileText size={12} className="text-[#B1D448]" />
                    <span>Cotações ({results.quotes.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.quotes.map(qt => (
                      <div
                        key={qt.id}
                        onClick={() => {
                          onClose();
                          navigateTo(`/cotacoes/${qt.id}`);
                        }}
                        className="p-2 rounded bg-[#1e2c31] hover:bg-[#283b42] cursor-pointer flex items-center justify-between transition"
                      >
                        <div className="font-semibold text-white">{qt.number}</div>
                        <div className="text-gray-400 text-[11px]">Ver documento</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contacts */}
              {results.contacts.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 flex items-center space-x-1">
                    <User size={12} className="text-[#B1D448]" />
                    <span>Contatos ({results.contacts.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.contacts.map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          onClose();
                          navigateTo(`/clientes/${c.companyId}`);
                        }}
                        className="p-2 rounded bg-[#1e2c31] hover:bg-[#283b42] cursor-pointer flex items-center justify-between transition"
                      >
                        <div>
                          <div className="font-semibold text-white">{c.name}</div>
                          <div className="text-[11px] text-gray-400">{c.email} • {c.whatsappMockId}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Companies */}
              {results.companies.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 flex items-center space-x-1">
                    <Building2 size={12} className="text-[#B1D448]" />
                    <span>Empresas ({results.companies.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.companies.map(comp => (
                      <div
                        key={comp.id}
                        onClick={() => {
                          onClose();
                          navigateTo(`/clientes/${comp.id}`);
                        }}
                        className="p-2 rounded bg-[#1e2c31] hover:bg-[#283b42] cursor-pointer flex items-center justify-between transition"
                      >
                        <div>
                          <div className="font-semibold text-white">{comp.name}</div>
                          <div className="text-[11px] text-gray-400">{comp.segment} • {comp.city}/{comp.state}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {results.products.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 flex items-center space-x-1">
                    <Package size={12} className="text-[#B1D448]" />
                    <span>Produtos do Catálogo ({results.products.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.products.map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          onClose();
                          navigateTo(`/catalogo/${p.id}`);
                        }}
                        className="p-2 rounded bg-[#1e2c31] hover:bg-[#283b42] cursor-pointer flex items-center justify-between transition"
                      >
                        <div>
                          <div className="font-semibold text-white font-mono">{p.sku}</div>
                          <div className="text-[11px] text-gray-400">{p.name}</div>
                        </div>
                        <div className="font-mono text-[#B1D448]">
                          {formatCurrency(p.unitPriceCents)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
