import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  Send,
  Plus,
  Play,
  Pause,
  CheckCircle,
  Users,
  Mail,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Filter,
  ExternalLink,
  Instagram,
  FileSpreadsheet
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { audience } from "../domain/ecosystem";
import { Campaign } from '../data/types';

interface CampaignsViewProps {
  navigateTo: (route: string) => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({ navigateTo }) => {
  const {
    db,
    currentUser,
    createCampaign,
    approveCampaign,
    executeCampaign,
    createLead,
    simulateCatalogSubmission
  } = useCrm();

  const [activeTab, setActiveTab] = useState<'campaigns' | 'capture_simulator'>('campaigns');
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // New campaign form state
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [targetSegment, setTargetSegment] = useState('Cana de açúcar');
  const [targetRegion, setTargetRegion] = useState('Ribeirão Preto / SP');
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');

  // Capture simulation state
  const [simName, setSimName] = useState('Comprador Fazenda Primavera');
  const [simEmail, setSimEmail] = useState('comprador.primavera@example.com');
  const [simWa, setSimWa] = useState('WA-DEMO-SIM-01');
  const [simSource, setSimSource] = useState<'instagram' | 'landing_page' | 'catalog'>('instagram');
  const [simSegment, setSimSegment] = useState('');
  const [simMachine, setSimMachine] = useState('Colheitadeira John Deere CH570');

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !messageBody.trim()) return;

    const res = await createCampaign({
      title,
      objective,
      targetSegment,
      targetRegion,
      channel,
      audienceCount: 2,
      excludedUnsubscribedCount: 0,
      subject,
      messageBody,
      approvedBy: null,
      approvedAt: null
    });

    if (!res.ok) setFeedbackMsg(res.error?.message || "Não foi possível concluir.");
    if (res.ok) {
      setFeedbackMsg(`Campanha "${title}" criada em rascunho. Aguarda aprovação do colaborador.`);
      setNewModalOpen(false);
      setTitle('');
      setMessageBody('');
    }
  };

  const handleApprove = async (id: string) => {
    const res = await approveCampaign(id);
    if (!res.ok) setFeedbackMsg(res.error?.message || "Não foi possível concluir.");
    if (res.ok) {
      setFeedbackMsg('Campanha aprovada formalmente! Pronta para simular o envio.');
    }
  };

  const handleExecute = async (id: string) => {
    const res = await executeCampaign(id);
    if (!res.ok) setFeedbackMsg(res.error?.message || "Não foi possível concluir.");
    if (res.ok) {
      setFeedbackMsg(`Campanha disparada para ${res.data?.sent} contato(s) elegível(is) no canal selecionado.`);
    }
  };

  const handleSimulateCapture = async () => {
    setFeedbackMsg(null);
    if (simSource === 'catalog') {
      const res = await simulateCatalogSubmission({
        contactName: simName,
        contactEmail: simEmail,
        contactWa: simWa,
        machineModel: simMachine,
        selectedItems: [
          { sku: 'DEMO-MW-001', quantity: 2 },
          { sku: 'DEMO-MW-002', quantity: 4 }
        ]
      });
      if (!res.ok) setFeedbackMsg(res.error?.message || "Não foi possível concluir.");
    if (res.ok) {
        setFeedbackMsg(`Solicitação do Catálogo recebida com sucesso! Máquina ${simMachine} e 2 SKUs transportados para o lead.`);
      }
    } else {
      const res = await createLead({
        name: simName,
        email: simEmail,
        whatsappMockId: simWa,
        source: simSource,
        companyName: `Empresa de ${simName}`,
        segment: simSegment || undefined,
        campaign: simSource === 'instagram' ? 'ad-instagram-entressafra' : 'lp-graos-safra',
        interest: `Entrada via ${simSource}: interesse em chicotes elétricos reforçados`
      });
      if (!res.ok) setFeedbackMsg(res.error?.message || "Não foi possível concluir.");
    if (res.ok) {
        setFeedbackMsg(`Lead capturado via ${simSource} com sucesso! ${!simSegment ? '⚠️ Sem segmento informado: triagem prioritária gerada.' : `Segmento: ${simSegment}.`}`);
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs text-[#223237]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#B1D448] text-[#223237] rounded-lg">
              <Send size={18} />
            </span>
            <h1 className="text-xl font-bold text-[#223237]">
              Campanhas e captação
            </h1>
          </div>
          <p className="text-xs text-[#53636A] mt-1">
            Gestão integrada de captação multiorigem (Landing Pages, Instagram, Catálogo) e réguas de relacionamento aprovadas.
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              activeTab === 'campaigns' ? 'bg-[#223237] text-white' : 'bg-gray-100 text-[#53636A]'
            }`}
          >
            Campanhas & Réguas
          </button>
          <button
            onClick={() => setActiveTab('capture_simulator')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              activeTab === 'capture_simulator' ? 'bg-[#223237] text-white' : 'bg-gray-100 text-[#53636A]'
            }`}
          >
            Simulador de Captação
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg font-semibold flex items-center space-x-2">
          <CheckCircle size={15} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {activeTab === 'campaigns' ? (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#dae0d7]">
            <div className="text-xs text-[#53636A]">
              <strong>Controle Anti-Spam:</strong> Contatos com descadastro ou bloqueio são excluídos automaticamente das listas de disparo.
            </div>
            <button
              onClick={() => setNewModalOpen(true)}
              className="bg-[#223237] hover:bg-[#2d3f45] text-white px-3.5 py-2 rounded-lg font-bold flex items-center space-x-1.5 transition"
            >
              <Plus size={14} className="text-[#B1D448]" />
              <span>Nova Campanha Comercial</span>
            </button>
          </div>

          {/* Campaigns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {db.campaigns.map(camp => (
              <div key={camp.id} className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[10px] bg-[#F5F6F0] px-2 py-0.5 rounded border border-[#dae0d7] font-bold">
                        {camp.id}
                      </span>
                      <h3 className="font-bold text-sm text-[#223237] mt-1">{camp.title}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      camp.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                      camp.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {camp.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-[#53636A] text-xs leading-relaxed">
                    {camp.objective}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#dae0d7]">
                    <div>Segmento: <strong className="text-[#223237]">{camp.targetSegment}</strong></div>
                    <div>Região: <strong className="text-[#223237]">{camp.targetRegion}</strong></div>
                    <div>Canal: <strong className="text-[#223237] capitalize">{camp.channel}</strong></div>
                    <div>Público elegível atual: <strong className="text-[#223237]">{audience(db,camp).length} clientes</strong></div>
                  </div>

                  <details><summary>Revisar mensagem e destinatários</summary><p className="whitespace-pre-wrap py-3">{camp.messageBody}</p><ul>{audience(db,camp).map(c=><li key={c.id}>{c.name} · {camp.channel === "email" ? c.email : c.whatsappMockId}</li>)}</ul></details>
                  {camp.subject && (
                    <div className="p-2 bg-[#F5F6F0] rounded text-[11px] text-[#53636A]">
                      <strong>Assunto:</strong> {camp.subject}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#dae0d7] flex items-center justify-between">
                  <div className="text-[10px] text-gray-500">
                    {camp.approvedBy ? `Aprovado por ${camp.approvedBy}` : 'Aguardando aprovação'}
                  </div>

                  <div className="flex space-x-2">
                    {camp.status === 'draft' && (
                      <button
                        onClick={() => handleApprove(camp.id)}
                        className="px-3 py-1.5 bg-[#223237] text-white rounded font-bold hover:bg-[#2d3f45] flex items-center space-x-1"
                      >
                        <ShieldCheck size={13} className="text-[#B1D448]" />
                        <span>Aprovar Campanha</span>
                      </button>
                    )}

                    {camp.status === 'scheduled' && (
                      <button
                        onClick={() => handleExecute(camp.id)}
                        className="px-3 py-1.5 bg-emerald-700 text-white rounded font-bold hover:bg-emerald-800 flex items-center space-x-1"
                      >
                        <Play size={13} />
                        <span>Simular envio</span>
                      </button>
                    )}

                    {camp.status === 'completed' && (
                      <span className="text-emerald-700 font-bold text-xs">
                        ✓ Simulação concluída ({camp.sentCount} envios)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Capture Simulator (Testing LPs, Instagram, Catalog) */
        <div className="bg-white rounded-xl border border-[#dae0d7] shadow-xs p-6 max-w-2xl mx-auto space-y-4">
          <div className="border-b border-[#dae0d7] pb-3">
            <h2 className="text-base font-bold text-[#223237]">
              Simulador de captação multiorigem
            </h2>
            <p className="text-xs text-[#53636A]">
              Teste a entrada de novos leads e clientes recorrentes por Landing Pages, Instagram e Catálogo de Peças.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-[#223237] mb-1">Origem da Captação:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'instagram', label: 'Instagram (Ad/Direct)' },
                  { id: 'landing_page', label: 'Landing Page' },
                  { id: 'catalog', label: 'Catálogo de Peças' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSimSource(opt.id as any)}
                    className={`p-2.5 rounded-lg border font-bold text-xs transition ${
                      simSource === opt.id
                        ? 'bg-[#223237] text-white border-[#223237]'
                        : 'border-[#dae0d7] hover:bg-gray-50 text-[#53636A]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#223237] mb-1">Nome do Contato:</label>
                <input
                  type="text"
                  value={simName}
                  onChange={e => setSimName(e.target.value)}
                  className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#223237] mb-1">E-mail do Comprador:</label>
                <input
                  type="email"
                  value={simEmail}
                  onChange={e => setSimEmail(e.target.value)}
                  className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#223237] mb-1">WhatsApp Fictício:</label>
                <input
                  type="text"
                  value={simWa}
                  onChange={e => setSimWa(e.target.value)}
                  className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs font-mono"
                />
              </div>

              {simSource === 'catalog' ? (
                <div>
                  <label className="block font-semibold text-[#223237] mb-1">Máquina Selecionada:</label>
                  <input
                    type="text"
                    value={simMachine}
                    onChange={e => setSimMachine(e.target.value)}
                    className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-[#223237] mb-1">Segmento Informado (Opcional):</label>
                  <select
                    value={simSegment}
                    onChange={e => setSimSegment(e.target.value)}
                    className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs bg-white"
                  >
                    <option value="">Não informado (Pendente qualificação)</option>
                    <option value="Cana de açúcar">Cana de açúcar</option>
                    <option value="Grãos (Soja/Milho)">Grãos (Soja/Milho)</option>
                    <option value="Citros">Citros</option>
                    <option value="Café">Café</option>
                  </select>
                </div>
              )}
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={handleSimulateCapture}
                className="px-5 py-2.5 bg-[#223237] hover:bg-[#2d3f45] text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 shadow-sm"
              >
                <Sparkles size={14} className="text-[#B1D448]" />
                <span>Simular Entrada e Distribuir no CRM</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Campaign Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#dae0d7] shadow-2xl p-6 max-w-lg w-full space-y-4">
            <h3 className="font-bold text-base text-[#223237]">Criar Nova Campanha Comercial</h3>

            <form onSubmit={handleCreateCampaign} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Título da Campanha *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Lançamento Chicotes Trator Magnum"
                  className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Objetivo Estratégico</label>
                <input
                  type="text"
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                  placeholder="Ex: Reativação de frotistas na entressafra"
                  className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Segmento Alvo</label>
                  <select
                    value={targetSegment}
                    onChange={e => setTargetSegment(e.target.value)}
                    className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs bg-white"
                  >
                    <option value="Cana de açúcar">Cana de açúcar</option>
                    <option value="Grãos (Soja/Milho)">Grãos (Soja/Milho)</option>
                    <option value="Café">Café</option>
                    <option value="Reposição agrícola">Reposição agrícola</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Região Alvo</label>
                  <input
                    type="text"
                    value={targetRegion}
                    onChange={e => setTargetRegion(e.target.value)}
                    className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Assunto (E-mail)</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Ex: MegaWhip: Catálogo Técnico para sua Colheitadeira"
                  className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Mensagem Proposta *</label>
                <textarea
                  rows={3}
                  required
                  value={messageBody}
                  onChange={e => setMessageBody(e.target.value)}
                  placeholder="Escreva a mensagem da campanha..."
                  className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-3 py-1.5 border border-[#dae0d7] rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#223237] text-white rounded-lg font-bold text-xs"
                >
                  Criar em Rascunho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
