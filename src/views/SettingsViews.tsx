import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  Users,
  ShieldCheck,
  FolderSync,
  Upload,
  History,
  CheckCircle,
  AlertTriangle,
  FileText,
  UserCheck,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

interface SettingsProps {
  section: 'equipe' | 'integracoes' | 'importacao' | 'auditoria';
  navigateTo: (route: string) => void;
}

export const SettingsViews: React.FC<SettingsProps> = ({ section, navigateTo }) => {
  const { db, currentUser, setSimulatedError } = useCrm();

  // Import mock CSV state
  const [csvText, setCsvText] = useState(
    `Nome;Empresa;Email;Origem;Interesse\nCarlos Demo;Agro São Paulo;carlos@example.com;site;Chicote para colheitadeira\nMariana Demo;Tratores Sul;mariana@example.com;whatsapp;Conectores adicionais`
  );
  const [importReport, setImportReport] = useState<{ imported: number; ignored: number } | null>(null);

  // Audit filter state
  const [auditFilterActor, setAuditFilterActor] = useState('all');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs text-[#223237]">
      {/* Settings Navigation Tabs */}
      <div className="flex space-x-2 bg-white p-2 rounded-xl border border-[#dae0d7] shadow-xs overflow-x-auto">
        {[
          { id: 'equipe', label: 'T16 - Equipe & Alçadas', icon: UserCheck },
          { id: 'integracoes', label: 'T17 - Canais & Integrações', icon: FolderSync },
          { id: 'importacao', label: 'T18 - Importação CSV', icon: Upload },
          { id: 'auditoria', label: 'T19 - Trilha de Auditoria', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = section === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigateTo(`/configuracoes/${tab.id}`)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition ${
                isActive
                  ? 'bg-[#223237] text-white shadow-2xs'
                  : 'text-[#53636A] hover:bg-[#F5F6F0]'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-[#B1D448]' : ''} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* T16: Equipe & Alçadas */}
      {section === 'equipe' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
            <h2 className="font-bold text-base text-[#223237]">Usuários Fictícios & Regras de Alçada (T16)</h2>
            <p className="text-xs text-[#53636A] mt-1">
              Vendedores possuem alçada máxima de 500 bps (5%) de desconto. Descontos superiores exigem aprovação de Gestor.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#dae0d7] shadow-xs overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F5F6F0] border-b border-[#dae0d7] text-[#53636A] font-semibold">
                  <th className="py-2.5 px-4">ID</th>
                  <th className="py-2.5 px-4">Nome do Usuário</th>
                  <th className="py-2.5 px-4">Papel / Perfil</th>
                  <th className="py-2.5 px-4">Alçada Comercial</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Round-Robin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dae0d7]/70">
                {db.users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono font-bold">{u.id}</td>
                    <td className="py-3 px-4 font-bold text-[#223237]">{u.name}</td>
                    <td className="py-3 px-4 capitalize">
                      {u.role === 'manager' ? 'Gestor Comercial' : u.role === 'seller' ? 'Vendedor' : u.role === 'technical' ? 'Apoio Técnico' : 'Administrador'}
                    </td>
                    <td className="py-3 px-4">
                      {u.role === 'seller' ? 'Até 5,00% (500 bps)' : u.role === 'manager' ? 'Ilimitada (Aprova alçadas)' : 'Sem concessão comercial'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                        Ativo
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.role === 'seller' ? 'Elegível para novos leads' : 'Não participa'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* T17: Canais & Integrações Simuladas */}
      {section === 'integracoes' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
            <h2 className="font-bold text-base text-[#223237]">Canais & Conexões de Demonstração (T17)</h2>
            <p className="text-xs text-[#53636A] mt-1">
              Todos os canais operam em modo simulado, sem chaves de API reais, cobrança ou tráfego externo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {db.integrations.map(integ => (
              <div key={integ.id} className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-[#223237] capitalize">Canal: {integ.channel}</h3>
                    <span className="text-[10px] bg-gray-100 px-1.5 py-0.2 rounded font-mono">ID: {integ.id}</span>
                  </div>
                  <span className="bg-[#B1D448]/30 text-[#223237] font-bold px-2 py-0.5 rounded text-[10px] border border-[#B1D448]">
                    SIMULADO
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div>Status da Conexão: <strong className="capitalize">{integ.state}</strong></div>
                  <div>Modo de Operação: <strong>Ambiente Local Fictício</strong></div>
                </div>

                {integ.channel === 'whatsapp' && (
                  <div className="pt-2 border-t border-[#dae0d7] flex items-center justify-between">
                    <span className="text-[11px] text-[#53636A]">Injetar falha de envio simulada:</span>
                    <button
                      onClick={() => setSimulatedError('failWhatsApp', !db.simulatedErrors.failWhatsApp)}
                      className={`px-3 py-1 rounded text-xs font-bold transition ${
                        db.simulatedErrors.failWhatsApp ? 'bg-rose-700 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {db.simulatedErrors.failWhatsApp ? 'Falha Ativa' : 'Simulação Normal'}
                    </button>
                  </div>
                )}

                {integ.channel === 'erp' && (
                  <div className="p-2.5 bg-gray-50 rounded border border-[#dae0d7] text-[11px] text-[#53636A]">
                    ERP a definir. O fechamento da oportunidade gera resumo comercial demonstrativo, sem integração transacional com estoque ou contabilidade.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* T18: Importação CSV */}
      {section === 'importacao' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
            <h2 className="font-bold text-base text-[#223237]">Importação de Contatos em Lote (T18)</h2>
            <p className="text-xs text-[#53636A] mt-1">
              Cole ou visualize o arquivo CSV de teste. E-mails duplicados são detectados para prevenir duplicidade.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-3">
            <label className="block font-bold text-xs text-[#223237]">Conteúdo CSV Separado por Ponto e Vírgula:</label>
            <textarea
              rows={6}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              className="w-full p-3 font-mono text-xs border border-[#dae0d7] rounded-lg bg-[#F5F6F0]"
            />

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setImportReport({ imported: 2, ignored: 0 });
                }}
                className="bg-[#223237] hover:bg-[#2d3f45] text-white px-4 py-2 rounded-lg font-bold text-xs"
              >
                Simular Importação e Validação
              </button>
            </div>

            {importReport && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
                Importação simulada com sucesso: {importReport.imported} linhas válidas processadas, {importReport.ignored} duplicidades ignoradas.
              </div>
            )}
          </div>
        </div>
      )}

      {/* T19: Auditoria */}
      {section === 'auditoria' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs flex justify-between items-center">
            <div>
              <h2 className="font-bold text-base text-[#223237]">Trilha de Auditoria do Sistema (T19)</h2>
              <p className="text-xs text-[#53636A] mt-1">
                Registro cronológico e imutável de todas as ações de usuários e do sistema.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[#53636A] text-xs">Filtrar Ator:</span>
              <select
                value={auditFilterActor}
                onChange={e => setAuditFilterActor(e.target.value)}
                className="border border-[#dae0d7] rounded px-2 py-1 text-xs bg-[#F5F6F0]"
              >
                <option value="all">Todos os Atores</option>
                {db.users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#dae0d7] shadow-xs overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F5F6F0] border-b border-[#dae0d7] text-[#53636A] font-semibold">
                  <th className="py-2.5 px-4">Evento</th>
                  <th className="py-2.5 px-4">Entidade</th>
                  <th className="py-2.5 px-4">Ator</th>
                  <th className="py-2.5 px-4">Ação</th>
                  <th className="py-2.5 px-4">Data / Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dae0d7]/70">
                {[...db.activities]
                  .reverse()
                  .filter(a => auditFilterActor === 'all' || a.actorId === auditFilterActor)
                  .map(act => {
                    const actor = db.users.find(u => u.id === act.actorId);
                    return (
                      <tr key={act.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono font-bold text-[11px]">{act.id}</td>
                        <td className="py-3 px-4 capitalize">{act.entityType} ({act.entityId})</td>
                        <td className="py-3 px-4 font-semibold">{actor?.name || 'Sistema'}</td>
                        <td className="py-3 px-4">{act.action}</td>
                        <td className="py-3 px-4 text-[#53636A]">{formatDate(act.createdAt, true)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
