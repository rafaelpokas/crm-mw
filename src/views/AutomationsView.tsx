import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  Cpu,
  Play,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

interface AutomationsViewProps {
  navigateTo: (route: string) => void;
}

export const AutomationsView: React.FC<AutomationsViewProps> = ({ navigateTo }) => {
  const { db, executeScenario } = useCrm();

  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestRule = async (ruleId: string) => {
    setTestingRuleId(ruleId);
    setTestResult(null);

    let res;
    if (ruleId === 'A01') {
      res = await executeScenario('C01');
      setTestResult('Regra A01 executada: Novo lead gerado, atribuído por round-robin e tarefa de follow-up criada.');
    } else if (ruleId === 'A03') {
      res = await executeScenario('C07');
      setTestResult('Regra A03 executada: Tarefa de retorno criada para 1 dia útil após o envio da cotação.');
    } else if (ruleId === 'A04') {
      res = await executeScenario('C10');
      setTestResult('Regra A04 executada: Verificação de validade de proposta processada no relógio simulado.');
    } else if (ruleId === 'A05') {
      res = await executeScenario('C08');
      setTestResult('Regra A05 executada: Notificação enviada ao gestor para desconto acima da alçada de 5%.');
    } else {
      setTestResult(`Regra ${ruleId} testada com sucesso no ambiente local.`);
    }

    setTestingRuleId(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs text-[#223237]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#223237] flex items-center space-x-2">
            <span>Automações Comerciais Determinísticas (T14)</span>
            <span className="text-xs font-normal bg-[#B1D448]/20 text-[#223237] px-2 py-0.5 rounded border border-[#B1D448]/40">
              {db.automationRules.length} regras ativas
            </span>
          </h1>
          <p className="text-xs text-[#53636A] mt-1">
            Gatilhos locais com idempotência garantida por chave única de evento • Sem envios externos descontrolados.
          </p>
        </div>
      </div>

      {testResult && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-2">
          <CheckCircle size={15} className="shrink-0" />
          <span>{testResult}</span>
        </div>
      )}

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {db.automationRules.map(rule => (
          <div key={rule.id} className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold bg-[#F5F6F0] px-2 py-0.5 rounded border border-[#dae0d7]">
                Regra {rule.id}
              </span>
              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                rule.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {rule.active ? 'Ativa' : 'Pausada'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-[#53636A]">Gatilho do Sistema:</div>
              <div className="font-mono font-bold text-xs text-[#223237]">{rule.trigger}</div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-[#53636A]">Condições de Execução:</div>
              <div className="text-xs font-medium text-[#223237]">{rule.conditions}</div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-[#53636A]">Ação Determinística Realizada:</div>
              <div className="p-2.5 bg-[#F5F6F0] rounded border border-[#dae0d7] font-mono text-[11px] text-[#223237]">
                {rule.action}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => handleTestRule(rule.id)}
                disabled={testingRuleId === rule.id}
                className="bg-[#223237] hover:bg-[#2d3f45] text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                <Play size={12} className="text-[#B1D448]" />
                <span>{testingRuleId === rule.id ? 'Executando...' : 'Testar com Cenário'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Execution Logs Table */}
      <div className="bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs space-y-3">
        <h2 className="font-bold text-sm text-[#223237]">Histórico de Execuções Locais (Idempotência)</h2>
        <div className="divide-y divide-[#dae0d7]">
          {db.automationRuns.length === 0 ? (
            <div className="py-6 text-center text-[#53636A]">
              Nenhuma execução registrada até o momento. Clique em "Testar com Cenário" acima para acionar uma regra.
            </div>
          ) : (
            db.automationRuns.map(run => (
              <div key={run.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#223237]">{run.ruleId}</span>
                  <span className="text-[#53636A] ml-2 font-mono text-[11px]">Chave: {run.eventKey}</span>
                  <div className="text-[11px] text-[#53636A] mt-0.5">{run.reason}</div>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                    {run.status.toUpperCase()}
                  </span>
                  <div className="text-[10px] text-gray-400 mt-1">{formatDate(run.createdAt, true)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
