import { useQueryState } from "../hooks/useQueryState";
import React, { useState } from "react";
import { useCrm } from "../context/CrmContext";
import { formatDate } from "../utils/formatters";
export const TasksView = ({
  navigateTo,
}: {
  navigateTo: (s: string) => void;
}) => {
  const { db, currentUser, createTask, updateTask, completeTask } = useCrm();
  const [status, setStatus] = useQueryState<string>("status", "open"),
    [owner, setOwner] = useQueryState<string>("owner", "all"),
    [feedback, setFeedback] = useState(""),
    [title, setTitle] = useState(""),
    [opportunityId, setOpp] = useState(db.opportunities[0]?.id || ""),
    [due, setDue] = useState(db.meta.clock.slice(0, 10) + "T10:00"),
    [type, setType] = useState("follow_up");
  const report = async (p: Promise<any>) => {
    const r = await p;
    setFeedback(r.ok ? "Tarefa atualizada." : r.error?.message || "Falha");
    return r;
  };
  return (
    <div className="page">
      <h1>Agenda comercial</h1>
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await report(
            createTask({
              opportunityId,
              title,
              dueAt: due + ":00-03:00",
              type,
            }),
          );
          if (r.ok) setTitle("");
        }}
      >
        <h2>Nova tarefa</h2>
        <div className="row">
          <label className="field">
            Título
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="field">
            Negociação
            <select
              required
              value={opportunityId}
              onChange={(e) => setOpp(e.target.value)}
            >
              {db.opportunities.map((o) => (
                <option value={o.id} key={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Prazo
            <input
              required
              type="datetime-local"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </label>
          <label className="field">
            Tipo
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="follow_up">Retorno</option>
              <option value="technical_review">Análise técnica</option>
              <option value="quote_draft">Preparar cotação</option>
            </select>
          </label>
          <button>Criar tarefa</button>
        </div>
      </form>
      <p role="status">{feedback}</p>
      <div className="row">
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Todos</option>
            <option value="open">Abertas</option>
            <option value="completed">Concluídas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </label>
        <label>
          Responsável
          <select value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="all">Todos</option>
            {db.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {db.tasks
        .filter(
          (t) =>
            (status === "all" || t.status === status) &&
            (owner === "all" || t.ownerId === owner),
        )
        .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
        .map((t) => (
          <div className="panel" key={t.id}>
            <h2>{t.title}</h2>
            <p>
              {formatDate(t.dueAt)} ·{" "}
              {db.users.find((u) => u.id === t.ownerId)?.name ||
                "Sem responsável"}{" "}
              · {t.status}{" "}
              {t.status === "open" &&
              Date.parse(t.dueAt) < Date.parse(db.meta.clock)
                ? "· Atrasada"
                : ""}
            </p>
            {t.outcome && <p>{t.outcome}</p>}
            <div className="row">
              <button
                onClick={() =>
                  navigateTo(
                    t.opportunityId
                      ? `/oportunidades/${t.opportunityId}`
                      : "/leads",
                  )
                }
              >
                {t.opportunityId ? "Abrir negociação" : "Abrir lead"}
              </button>
              {t.status === "open" && (
                <>
                  <button
                    onClick={() => {
                      const outcome = prompt("Resultado da tarefa");
                      if (outcome) report(completeTask(t.id, outcome));
                    }}
                  >
                    Concluir
                  </button>
                  <button
                    onClick={() => {
                      const value = prompt(
                        "Novo prazo (AAAA-MM-DD HH:MM)",
                        t.dueAt.slice(0, 16).replace("T", " "),
                      );
                      if (value)
                        report(
                          updateTask(t.id, {
                            dueAt: value.replace(" ", "T") + ":00-03:00",
                          }),
                        );
                    }}
                  >
                    Reagendar
                  </button>
                  <button
                    onClick={() => {
                      const value = prompt("Título da tarefa", t.title);
                      if (value) report(updateTask(t.id, { title: value }));
                    }}
                  >
                    Editar
                  </button>
                  {["manager", "admin"].includes(currentUser.role) && (
                    <select
                      aria-label="Responsável da tarefa"
                      value={t.ownerId}
                      onChange={(e) =>
                        report(updateTask(t.id, { ownerId: e.target.value }))
                      }
                    >
                      {db.users
                        .filter((u) => u.active)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
    </div>
  );
};
