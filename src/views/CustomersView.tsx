import React, { useState, useMemo } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  Building2,
  Users,
  Search,
  Filter,
  Plus,
  FileText,
  Briefcase,
  ChevronRight,
  ExternalLink,
  Edit2
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

interface CustomersViewProps {
  customerId?: string;
  navigateTo: (route: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ customerId, navigateTo }) => {
  const { db } = useCrm();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    customerId || db.companies[0]?.id || 'E001'
  );
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCompany = useMemo(() => {
    return db.companies.find(c => c.id === selectedCompanyId) || db.companies[0];
  }, [db.companies, selectedCompanyId]);

  const companyContacts = useMemo(() => {
    if (!selectedCompany) return [];
    return db.contacts.filter(c => c.companyId === selectedCompany.id);
  }, [db.contacts, selectedCompany]);

  const companyOpportunities = useMemo(() => {
    if (!selectedCompany) return [];
    return db.opportunities.filter(o => o.companyId === selectedCompany.id);
  }, [db.opportunities, selectedCompany]);

  const filteredCompanies = useMemo(() => {
    return db.companies.filter(comp => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return comp.name.toLowerCase().includes(q) || comp.segment.toLowerCase().includes(q);
      }
      return true;
    });
  }, [db.companies, searchQuery]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs text-[#223237]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#223237] flex items-center space-x-2">
            <span>Base de Clientes & Empresas (T10)</span>
            <span className="text-xs font-normal bg-[#B1D448]/20 text-[#223237] px-2 py-0.5 rounded border border-[#B1D448]/40">
              {db.companies.length} contas
            </span>
          </h1>
          <p className="text-xs text-[#53636A] mt-1">
            Empresas e pessoas físicas organizadas com histórico unificado de cotações e compras.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Companies List */}
        <div className="bg-white rounded-xl border border-[#dae0d7] shadow-xs overflow-hidden flex flex-col">
          <div className="p-3 border-b border-[#dae0d7]">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-[#53636A]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar empresa ou segmento..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#F5F6F0] border border-[#dae0d7] rounded-md text-xs placeholder-[#53636A] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="divide-y divide-[#dae0d7]/70 max-h-[600px] overflow-y-auto">
            {filteredCompanies.map(comp => {
              const isSelected = comp.id === selectedCompany?.id;
              const oppsCount = db.opportunities.filter(o => o.companyId === comp.id).length;

              return (
                <div
                  key={comp.id}
                  onClick={() => setSelectedCompanyId(comp.id)}
                  className={`p-3 cursor-pointer transition ${
                    isSelected ? 'bg-[#F5F6F0] border-l-4 border-l-[#B1D448]' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="font-bold text-[#223237]">{comp.name}</div>
                    <span className="text-[10px] bg-gray-100 px-1.5 py-0.2 rounded font-mono">{comp.id}</span>
                  </div>
                  <div className="text-[11px] text-[#53636A] mt-0.5">{comp.segment}</div>
                  <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                    <span>{comp.city}/{comp.state}</span>
                    <span>{oppsCount} {oppsCount === 1 ? 'negócio' : 'negócios'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Consolidated Profile */}
        <div className="md:col-span-2 space-y-5">
          {selectedCompany ? (
            <>
              {/* Company Details Card */}
              <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-4">
                <div className="flex justify-between items-start border-b border-[#dae0d7] pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#223237]">{selectedCompany.name}</h2>
                    <div className="text-[#53636A] text-xs">
                      {selectedCompany.segment} • Localização: {selectedCompany.city}/{selectedCompany.state}
                    </div>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                    Conta Ativa (Demo)
                  </span>
                </div>

                {/* Contacts associated */}
                <div className="space-y-2">
                  <h3 className="font-bold text-xs text-[#223237]">Compradores & Contatos Vinculados</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {companyContacts.map(c => (
                      <div key={c.id} className="p-3 bg-[#F5F6F0] rounded-lg border border-[#dae0d7] space-y-1">
                        <div className="font-bold text-[#223237]">{c.name}</div>
                        <div className="text-[11px] text-[#53636A]">E-mail: {c.email}</div>
                        <div className="text-[11px] text-[#53636A] font-mono">WhatsApp: {c.whatsappMockId}</div>
                        <div className="text-[10px] text-gray-500">Canal preferencial: {c.preferredChannel}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Opportunities & Quotes History */}
              <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-3">
                <h3 className="font-bold text-xs text-[#223237]">Histórico de Negociações & Cotações</h3>
                <div className="divide-y divide-[#dae0d7]">
                  {companyOpportunities.length === 0 ? (
                    <div className="py-4 text-[#53636A]">Nenhuma negociação registrada para esta empresa.</div>
                  ) : (
                    companyOpportunities.map(o => {
                      const quote = db.quotes.find(q => q.opportunityId === o.id);
                      const ver = quote ? db.quoteVersions.find(v => v.id === quote.currentVersionId) : null;

                      return (
                        <div key={o.id} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-[#223237] flex items-center space-x-2">
                              <span>{o.title}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-blue-100 text-blue-800">
                                {o.stage}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#53636A]">
                              ID: {o.id} • Criado em: {formatDate(o.createdAt, false)}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-bold text-[#223237]">
                              {formatCurrency(o.estimatedValueCents)}
                            </div>
                            <button
                              onClick={() => navigateTo(`/oportunidades/${o.id}`)}
                              className="text-xs text-[#223237] hover:text-[#B1D448] font-semibold flex items-center space-x-1 mt-0.5"
                            >
                              <span>Ver Oportunidade</span>
                              <ChevronRight size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-[#dae0d7] text-center text-[#53636A]">
              Selecione uma empresa para visualizar o dossiê comercial.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
