import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  BookOpen,
  CheckCircle,
  AlertTriangle,
  FileText,
  User,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { KnowledgeDocument } from '../data/types';

interface KnowledgeViewProps {
  navigateTo: (route: string) => void;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({ navigateTo }) => {
  const { db, currentUser } = useCrm();
  const [docs, setDocs] = useState<KnowledgeDocument[]>(db.knowledgeDocuments);
  const [selectedDocId, setSelectedDocId] = useState<string>('K001');

  const toggleStatus = (id: string) => {
    setDocs(prev => prev.map(d => {
      if (d.id === id) {
        const nextStatus = d.status === 'approved' ? 'draft' : 'approved';
        return {
          ...d,
          status: nextStatus,
          approvedBy: nextStatus === 'approved' ? currentUser.id : null
        };
      }
      return d;
    }));
  };

  const selectedDoc = docs.find(d => d.id === selectedDocId) || docs[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs text-[#223237]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#223237] flex items-center space-x-2">
            <span>Base de Conhecimento & Fontes da IA (T15)</span>
          </h1>
          <p className="text-xs text-[#53636A] mt-1">
            Somente documentos formalmente aprovados alimentam as respostas e triagens do assistente operacional.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Document List */}
        <div className="bg-white rounded-xl border border-[#dae0d7] shadow-xs overflow-hidden divide-y divide-[#dae0d7]">
          {docs.map(doc => {
            const isSelected = doc.id === selectedDoc.id;
            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`p-4 cursor-pointer transition ${
                  isSelected ? 'bg-[#F5F6F0] border-l-4 border-l-[#B1D448]' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono font-bold text-xs bg-[#F5F6F0] px-2 py-0.5 rounded border border-[#dae0d7]">
                    {doc.id}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    doc.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {doc.status === 'approved' ? 'Aprovado' : 'Rascunho'}
                  </span>
                </div>
                <div className="font-bold text-sm text-[#223237] mt-2">{doc.title}</div>
                <div className="text-[11px] text-[#53636A] mt-1 line-clamp-2">
                  {doc.content}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Document Content & Actions */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl border border-[#dae0d7] shadow-xs space-y-4">
          <div className="flex justify-between items-start border-b border-[#dae0d7] pb-3">
            <div>
              <span className="font-mono font-bold text-xs text-[#53636A]">
                DOCUMENTO {selectedDoc.id} • VERSÃO {selectedDoc.version}
              </span>
              <h2 className="text-lg font-bold text-[#223237] mt-1">{selectedDoc.title}</h2>
              <div className="text-xs text-[#53636A] mt-0.5">
                Status: <strong className="capitalize">{selectedDoc.status}</strong>
                {selectedDoc.approvedBy && ` • Aprovado pelo Usuário ${selectedDoc.approvedBy}`}
              </div>
            </div>

            <button
              onClick={() => toggleStatus(selectedDoc.id)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                selectedDoc.status === 'approved'
                  ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                  : 'bg-emerald-700 text-white hover:bg-emerald-800'
              }`}
            >
              {selectedDoc.status === 'approved' ? 'Suspender Aprovação' : 'Aprovar para Uso na IA'}
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-xs text-[#223237]">Conteúdo Normativo do Documento:</h3>
            <div className="p-4 bg-[#F5F6F0] rounded-xl border border-[#dae0d7] font-mono text-xs leading-relaxed text-[#223237] whitespace-pre-wrap">
              {selectedDoc.content}
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs">
            <strong>Regra de IA:</strong> Se este documento estiver como "Rascunho", nenhuma sugestão do Copiloto no Atendimento poderá citá-lo ou utilizar suas orientações técnicas.
          </div>
        </div>
      </div>
    </div>
  );
};
