import React, { useState, useMemo } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  CalendarCheck,
  Plus,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Check,
  Calendar,
  User
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { Task, TaskType } from '../data/types';

interface TasksViewProps {
  navigateTo: (route: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ navigateTo }) => {
  const { db, currentUser, completeTask, createTask } = useCrm();

  const [statusFilter, setStatusFilter] = useState<'open' | 'completed' | 'all'>('open');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  // Form states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskOppId, setTaskOppId] = useState<string>(db.opportunities[0]?.id || '');
  const [taskType, setTaskType] = useState<TaskType>('follow_up');
  const [taskDue, setTaskDue] = useState('2026-10-14T10:00');

  const filteredTasks = useMemo(() => {
    const clockTime = new Date(db.meta.clock).getTime();
    return db.tasks
      .filter(t => {
        if (statusFilter === 'open' && t.status !== 'open') return false;
        if (statusFilter === 'completed' && t.status !== 'completed') return false;
        if (selectedOwner !== 'all' && t.ownerId !== selectedOwner) return false;
        return true;
      })
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  }, [db.tasks, statusFilter, selectedOwner, db.meta.clock]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    await createTask({
      opportunityId: taskOppId,
      title: taskTitle,
      dueAt: `${taskDue}:00-03:00`,
      type: taskType
    });

    setTaskTitle('');
    setNewTaskOpen(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs text-[#223237]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#dae0d7] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#223237] flex items-center space-x-2">
            <span>Agenda Comercial & Follow-ups (T12)</span>
            <span className="text-xs font-normal bg-[#B1D448]/20 text-[#223237] px-2 py-0.5 rounded border border-[#B1D448]/40">
              {filteredTasks.length} tarefas
            </span>
          </h1>
          <p className="text-xs text-[#53636A] mt-1">
            Controle de retornos a compradores, aprovações de gestor e validações técnicas de engenharia.
          </p>
        </div>

        <button
          onClick={() => setNewTaskOpen(true)}
          className="bg-[#223237] hover:bg-[#2d3f45] text-white px-3.5 py-2 rounded-lg font-semibold flex items-center space-x-1.5 transition"
        >
          <Plus size={15} className="text-[#B1D448]" />
          <span>Nova Tarefa</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center space-x-3 flex-wrap">
        <div className="flex space-x-1 bg-white p-1 rounded-lg border border-[#dae0d7]">
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-3 py-1 rounded-md font-semibold transition ${
              statusFilter === 'open' ? 'bg-[#223237] text-white' : 'text-[#53636A] hover:bg-[#F5F6F0]'
            }`}
          >
            Pendentes / Abertas
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1 rounded-md font-semibold transition ${
              statusFilter === 'completed' ? 'bg-[#223237] text-white' : 'text-[#53636A] hover:bg-[#F5F6F0]'
            }`}
          >
            Concluídas
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md font-semibold transition ${
              statusFilter === 'all' ? 'bg-[#223237] text-white' : 'text-[#53636A] hover:bg-[#F5F6F0]'
            }`}
          >
            Todas
          </button>
        </div>

        <div className="flex items-center space-x-1 bg-white px-3 py-1.5 rounded-lg border border-[#dae0d7]">
          <Filter size={13} className="text-[#53636A]" />
          <select
            value={selectedOwner}
            onChange={e => setSelectedOwner(e.target.value)}
            className="bg-transparent text-xs text-[#223237] focus:outline-hidden"
          >
            <option value="all">Todos os Responsáveis</option>
            {db.users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-xl border border-[#dae0d7] shadow-xs overflow-hidden">
        <div className="divide-y divide-[#dae0d7]/70">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-[#53636A]">
              Nenhuma tarefa encontrada com os filtros selecionados.
            </div>
          ) : (
            filteredTasks.map(task => {
              const clockTime = new Date(db.meta.clock).getTime();
              const dueTime = new Date(task.dueAt).getTime();
              const isOverdue = task.status === 'open' && dueTime < clockTime;
              const opp = db.opportunities.find(o => o.id === task.opportunityId);
              const owner = db.users.find(u => u.id === task.ownerId);

              return (
                <div
                  key={task.id}
                  className={`p-4 flex items-center justify-between gap-4 transition ${
                    isOverdue ? 'bg-red-50/30' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={() => completeTask(task.id)}
                      disabled={task.status === 'completed'}
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition mt-0.5 ${
                        task.status === 'completed'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-[#dae0d7] hover:border-[#B1D448] text-transparent hover:text-gray-300'
                      }`}
                    >
                      <Check size={12} />
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold text-xs ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-[#223237]'}`}>
                          {task.title}
                        </span>

                        {isOverdue && (
                          <span className="bg-red-100 text-red-800 px-1.5 py-0.2 rounded font-bold text-[10px] flex items-center space-x-1">
                            <AlertTriangle size={10} />
                            <span>Atrasada</span>
                          </span>
                        )}

                        {task.automationKey && (
                          <span className="bg-blue-50 text-blue-800 px-1.5 py-0.2 rounded font-semibold text-[10px]">
                            Automação {task.automationKey.split('-')[0]}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-[#53636A] flex items-center space-x-3">
                        {opp && (
                          <span
                            onClick={() => navigateTo(`/oportunidades/${opp.id}`)}
                            className="text-[#223237] hover:underline cursor-pointer font-medium"
                          >
                            Oportunidade: {opp.title} ({opp.id})
                          </span>
                        )}
                        <span>•</span>
                        <span>Responsável: <strong>{owner?.name}</strong></span>
                        <span>•</span>
                        <span>Vencimento: {formatDate(task.dueAt, true)}</span>
                      </div>
                    </div>
                  </div>

                  {opp && (
                    <button
                      onClick={() => navigateTo(`/oportunidades/${opp.id}`)}
                      className="text-[#223237] hover:text-[#B1D448] font-bold text-xs flex items-center space-x-1 shrink-0"
                    >
                      <span>Abrir Oportunidade</span>
                      <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* New Task Modal */}
      {newTaskOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#dae0d7] shadow-2xl p-5 max-w-md w-full space-y-4">
            <h3 className="font-bold text-sm text-[#223237]">Agendar Nova Tarefa Comercial</h3>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-[#53636A] font-semibold mb-1">Título da Ação *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="Ex: Ligar para confirmar aprovação do comprador..."
                  className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[#53636A] font-semibold mb-1">Oportunidade Vinculada</label>
                <select
                  value={taskOppId}
                  onChange={e => setTaskOppId(e.target.value)}
                  className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs bg-white"
                >
                  {db.opportunities.map(o => (
                    <option key={o.id} value={o.id}>{o.id} - {o.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#53636A] font-semibold mb-1">Tipo de Tarefa</label>
                  <select
                    value={taskType}
                    onChange={e => setTaskType(e.target.value as any)}
                    className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs bg-white"
                  >
                    <option value="follow_up">Follow-up Comercial</option>
                    <option value="technical_review">Revisão Técnica</option>
                    <option value="quote_draft">Elaborar Cotação</option>
                    <option value="manager_approval">Aprovação Gestor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#53636A] font-semibold mb-1">Data / Hora</label>
                  <input
                    type="datetime-local"
                    value={taskDue}
                    onChange={e => setTaskDue(e.target.value)}
                    className="w-full p-2 border border-[#dae0d7] rounded-lg text-xs bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewTaskOpen(false)}
                  className="px-3 py-1.5 border border-[#dae0d7] rounded-lg text-xs hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#223237] hover:bg-[#2d3f45] text-white rounded-lg text-xs font-bold"
                >
                  Salvar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
