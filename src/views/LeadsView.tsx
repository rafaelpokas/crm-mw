import React, { useState, useMemo } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  Users,
  Plus,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Check
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { LeadSource, LeadStatus } from '../data/types';

interface LeadsViewProps {
  navigateTo: (route: string) => void;
  initialMode?: 'list' | 'new';
}

export const LeadsView: React.FC<LeadsViewProps> = ({ navigateTo, initialMode = 'list' }) => {
  const { db, currentUser, createLead, assignOwner } = useCrm();

  const [mode, setMode] = useState<'list' | 'new'>(initialMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [batchAssignOwnerId, setBatchAssignOwnerId] = useState<string>('U002');

  // New Lead Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formWhatsApp, setFormWhatsApp] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formInterest, setFormInterest] = useState('');
  const [formSource, setFormSource] = useState<LeadSource>('site');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Duplicate Check Warning
  const duplicateMatch = useMemo(() => {
    if (!formEmail.trim() && !formWhatsApp.trim()) return null;
    const normEmail = formEmail.trim().toLowerCase();
    const normWa = formWhatsApp.trim();

    return db.contacts.find(c =>
      (normEmail && c.email.toLowerCase() === normEmail) ||
      (normWa && c.whatsappMockId === normWa)
    );
  }, [formEmail, formWhatsApp, db.contacts]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return db.leads.filter(lead => {
      const contact = db.contacts.find(c => c.id === lead.contactId);
      const company = contact ? db.companies.find(comp => comp.id === contact.companyId) : null;

      if (sourceFilter !== 'all' && lead.source !== sourceFilter) return false;
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
      if (ownerFilter !== 'all' && lead.ownerId !== ownerFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const contactMatch = contact?.name.toLowerCase().includes(q);
        const compMatch = company?.name.toLowerCase().includes(q);
        const interestMatch = lead.interest.toLowerCase().includes(q);
        if (!contactMatch && !compMatch && !interestMatch) return false;
      }

      return true;
    });
  }, [db.leads, db.contacts, db.companies, sourceFilter, statusFilter, ownerFilter, searchQuery]);

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const handleBatchAssign = async () => {
    if (currentUser.role !== 'manager' && currentUser.role !== 'admin') {
      alert('Apenas gestores ou administradores podem atribuir leads em lote.');
      return;
    }
    for (const leadId of selectedLeadIds) {
      const lead = db.leads.find(l => l.id === leadId);
      if (lead && lead.convertedOpportunityId) {
        await assignOwner(lead.convertedOpportunityId, batchAssignOwnerId);
      }
    }
    setSelectedLeadIds([]);
    alert('Leads atribuídos com sucesso ao novo responsável!');
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formName.trim()) {
      setFormError('Nome do comprador é obrigatório.');
      return;
    }
    if (!formEmail.trim() && !formWhatsApp.trim()) {
      setFormError('Informe pelo menos um meio de contato (E-mail ou WhatsApp fictício).');
      return;
    }

    setFormSubmitting(true);
    const res = await createLead({
      name: formName,
      email: formEmail,
      whatsappMockId: formWhatsApp,
      companyName: formCompany,
      interest: formInterest,
      source: formSource
    });
    setFormSubmitting(false);

    if (!res.ok && res.error) {
      setFormError(res.error.message);
    } else {
      setFormSuccess('Lead cadastrado e distribuído por round-robin com sucesso!');
      setFormName('');
      setFormEmail('');
      setFormWhatsApp('');
      setFormCompany('');
      setFormInterest('');
      setTimeout(() => {
        setMode('list');
      }, 1200);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs text-[#223237]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#223237] flex items-center space-x-2">
            <span>Gestão de Leads Comerciais</span>
            <span className="text-xs font-normal bg-[#B1D448]/20 text-[#223237] px-2 py-0.5 rounded border border-[#B1D448]/40">
              {filteredLeads.length} registrados
            </span>
          </h1>
          <p className="text-xs text-[#53636A] mt-1">
            Entrada de novos compradores por site, WhatsApp, indicação ou manual com verificação de duplicidade.
          </p>
        </div>

        <div className="flex space-x-2">
          {mode === 'list' ? (
            <button
              onClick={() => setMode('new')}
              className="bg-[#223237] hover:bg-[#2d3f45] text-white px-3.5 py-2 rounded-lg font-semibold flex items-center space-x-1.5 transition"
            >
              <Plus size={15} className="text-[#B1D448]" />
              <span>Novo Lead</span>
            </button>
          ) : (
            <button
              onClick={() => setMode('list')}
              className="bg-white border border-[#dae0d7] text-[#223237] px-3.5 py-2 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Voltar para Lista
            </button>
          )}
        </div>
      </div>

      {mode === 'new' ? (
        /* T04: New Lead Form */
        <div className="bg-white p-6 rounded-xl border border-[#dae0d7] shadow-xs max-w-2xl mx-auto space-y-5">
          <div className="border-b border-[#dae0d7] pb-3">
            <h2 className="text-base font-bold text-[#223237]">Formulário de Cadastro de Lead (T04)</h2>
            <p className="text-[#53636A] text-xs">
              Todos os dados são fictícios para simulação da triagem e distribuição automática da MegaWhip.
            </p>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
              {formSuccess}
            </div>
          )}

          {duplicateMatch && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start space-x-2">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Atenção: Contato já existente encontrado!</strong>
                <p className="mt-0.5 text-[#53636A]">
                  O contato <strong>{duplicateMatch.name}</strong> já está cadastrado com este e-mail/WhatsApp. O sistema anexará a nova solicitação ao contato existente para manter o histórico unificado.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateLead} className="space-y-4">
            <div>
              <label className="block font-semibold text-[#223237] mb-1">
                Nome do Comprador / Solicitante *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Ex: João da Silva Demo"
                className="w-full p-2.5 border border-[#dae0d7] rounded-lg text-xs focus:border-[#B1D448] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#223237] mb-1">
                  E-mail Demonstrativo
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="comprador@example.com"
                  className="w-full p-2.5 border border-[#dae0d7] rounded-lg text-xs focus:border-[#B1D448] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#223237] mb-1">
                  WhatsApp Identificador Mock
                </label>
                <input
                  type="text"
                  value={formWhatsApp}
                  onChange={e => setFormWhatsApp(e.target.value)}
                  placeholder="WA-DEMO-999"
                  className="w-full p-2.5 border border-[#dae0d7] rounded-lg text-xs focus:border-[#B1D448] focus:outline-hidden font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#223237] mb-1">
                  Empresa / Oficina / Revenda
                </label>
                <input
                  type="text"
                  value={formCompany}
                  onChange={e => setFormCompany(e.target.value)}
                  placeholder="Ex: Tratores e Chicotes Agro Demo"
                  className="w-full p-2.5 border border-[#dae0d7] rounded-lg text-xs focus:border-[#B1D448] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#223237] mb-1">
                  Canal de Origem
                </label>
                <select
                  value={formSource}
                  onChange={e => setFormSource(e.target.value as any)}
                  className="w-full p-2.5 border border-[#dae0d7] rounded-lg text-xs bg-white focus:outline-hidden"
                >
                  <option value="site">Formulário do Site</option>
                  <option value="whatsapp">WhatsApp Comercial</option>
                  <option value="email">E-mail Corporativo</option>
                  <option value="referral">Indicação</option>
                  <option value="event">Feira / Evento Agro</option>
                  <option value="manual">Cadastro Manual</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#223237] mb-1">
                Interesse / Produtos Solicitados / Detalhes
              </label>
              <textarea
                rows={3}
                value={formInterest}
                onChange={e => setFormInterest(e.target.value)}
                placeholder="Ex: 2 unidades DEMO-MW-001 e 4 conectores DEMO-MW-002 para colheitadeira..."
                className="w-full p-2.5 border border-[#dae0d7] rounded-lg text-xs focus:border-[#B1D448] focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setMode('list')}
                className="px-4 py-2 border border-[#dae0d7] rounded-lg text-xs font-semibold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                className="px-5 py-2 bg-[#223237] hover:bg-[#2d3f45] text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
              >
                {formSubmitting ? 'Salvando...' : 'Cadastrar e Distribuir Lead'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* T03: Leads Table List */
        <div className="bg-white rounded-xl border border-[#dae0d7] shadow-xs overflow-hidden space-y-3 p-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-2.5 text-[#53636A]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por comprador, empresa ou interesse..."
                className="w-full pl-9 pr-3 py-1.5 border border-[#dae0d7] rounded-md text-xs placeholder-[#53636A] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center space-x-2 flex-wrap">
              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
                className="border border-[#dae0d7] rounded-md px-2 py-1 text-xs bg-white text-[#223237]"
              >
                <option value="all">Todas as Origens</option>
                <option value="site">Site</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
                <option value="referral">Indicação</option>
              </select>

              <select
                value={ownerFilter}
                onChange={e => setOwnerFilter(e.target.value)}
                className="border border-[#dae0d7] rounded-md px-2 py-1 text-xs bg-white text-[#223237]"
              >
                <option value="all">Todos os Responsáveis</option>
                {db.users.filter(u => u.role === 'seller').map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>

              {/* Batch Actions for Manager */}
              {selectedLeadIds.length > 0 && (
                <div className="flex items-center space-x-1 bg-amber-50 border border-amber-300 p-1 rounded-md">
                  <span className="text-[11px] font-bold text-amber-900 px-1">
                    {selectedLeadIds.length} selecionados
                  </span>
                  <select
                    value={batchAssignOwnerId}
                    onChange={e => setBatchAssignOwnerId(e.target.value)}
                    className="text-[11px] border border-amber-300 rounded px-1 py-0.5 bg-white"
                  >
                    {db.users.filter(u => u.role === 'seller').map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleBatchAssign}
                    className="bg-amber-800 text-white px-2 py-0.5 rounded text-[11px] font-bold hover:bg-amber-900"
                  >
                    Atribuir
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#dae0d7] bg-[#F5F6F0] text-[#53636A] font-bold text-[11px]">
                  <th className="py-2.5 px-3 w-8">
                    <button onClick={toggleSelectAll}>
                      {selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0 ? (
                        <CheckSquare size={14} className="text-[#223237]" />
                      ) : (
                        <Square size={14} className="text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3">Comprador / Empresa</th>
                  <th className="py-2.5 px-3">Origem</th>
                  <th className="py-2.5 px-3">Interesse / Resumo</th>
                  <th className="py-2.5 px-3">Responsável</th>
                  <th className="py-2.5 px-3">Entrada</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dae0d7]/70 text-xs">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#53636A]">
                      Nenhum lead encontrado com os filtros informados.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map(lead => {
                    const contact = db.contacts.find(c => c.id === lead.contactId);
                    const company = contact ? db.companies.find(comp => comp.id === contact.companyId) : null;
                    const owner = db.users.find(u => u.id === lead.ownerId);
                    const isSelected = selectedLeadIds.includes(lead.id);

                    return (
                      <tr key={lead.id} className={`hover:bg-[#F5F6F0]/60 transition ${isSelected ? 'bg-amber-50/40' : ''}`}>
                        <td className="py-3 px-3">
                          <button onClick={() => toggleSelectLead(lead.id)}>
                            {isSelected ? (
                              <CheckSquare size={14} className="text-[#223237]" />
                            ) : (
                              <Square size={14} className="text-gray-400" />
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-bold text-[#223237]">{contact?.name || 'Comprador'}</div>
                          <div className="text-[11px] text-[#53636A]">{company?.name || 'Empresa não informada'}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{contact?.email} • {contact?.whatsappMockId}</div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                            {lead.source}
                          </span>
                        </td>

                        <td className="py-3 px-3 max-w-xs truncate text-[#53636A]">
                          {lead.interest}
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-medium text-[#223237]">
                            {owner?.name || 'Fila sem responsável'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-[#53636A] whitespace-nowrap text-[11px]">
                          {formatDate(lead.createdAt, false)}
                        </td>

                        <td className="py-3 px-3 text-right">
                          {lead.convertedOpportunityId ? (
                            <button
                              onClick={() => navigateTo(`/oportunidades/${lead.convertedOpportunityId}`)}
                              className="inline-flex items-center space-x-1 text-[#223237] hover:text-[#B1D448] font-bold text-xs"
                            >
                              <span>Ver Oportunidade</span>
                              <ChevronRight size={13} />
                            </button>
                          ) : (
                            <span className="text-gray-400">Em qualificação</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
