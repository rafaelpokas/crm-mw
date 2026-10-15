import React, { useState } from "react";
import { useCrm } from "../../context/CrmContext";
import {
  metricsFor,
  selectOpportunities,
  opportunityValue,
} from "../../domain/selectors";
import { csvCell } from "../../domain/csv";
import { formatCurrency } from "../../utils/formatters";
export function MetricsPage({
  report = false,
  navigateTo,
}: {
  report?: boolean;
  navigateTo: (s: string) => void;
}) {
  const { db, currentUser } = useCrm();
  const initial = new URLSearchParams(location.hash.split("?")[1]);
  const [owner, setOwner] = useState(initial.get("owner") || "all"),
    [source, setSource] = useState(initial.get("source") || "all"),
    [period, setPeriod] = useState(initial.get("period") || "all");
  const filters = { owner, source, period },
    m = metricsFor(db, filters),
    opps = selectOpportunities(db, filters);
  const change = (key: string, value: string) => {
    ({ owner: setOwner, source: setSource, period: setPeriod })[key]!(value);
    const qs = new URLSearchParams({ ...filters, [key]: value });
    history.replaceState(null, "", location.hash.split("?")[0] + "?" + qs);
  };
  const exportCsv = () => {
    if (!["manager", "admin"].includes(currentUser.role)) return;
    const rows = [
      [
        "ID",
        "Negociação",
        "Etapa",
        "Valor em centavos",
        "Empresa",
        "Responsável",
        "Motivo de perda",
      ],
      ...opps.map((o) => [
        o.id,
        o.title,
        o.stage,
        opportunityValue(db, o),
        db.companies.find((c) => c.id === o.companyId)?.name,
        db.users.find((u) => u.id === o.ownerId)?.name,
        o.lostReason,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\ufeff" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "megawhip-relatorio.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const stages = [
    ["new", "Nova"],
    ["qualification", "Qualificação"],
    ["quoting", "Em cotação"],
    ["quote_sent", "Cotação enviada"],
    ["negotiation", "Negociação"],
    ["won", "Ganha"],
    ["lost", "Perdida"],
  ];
  return (
    <div className="page">
      <div className="row">
        <h1>{report ? "Relatórios comerciais" : "Visão geral"}</h1>
        {report && ["manager", "admin"].includes(currentUser.role) && (
          <button onClick={exportCsv}>Exportar CSV</button>
        )}
      </div>
      <div className="panel row">
        <label>
          Responsável
          <select
            value={owner}
            onChange={(e) => change("owner", e.target.value)}
          >
            <option value="all">Todos disponíveis</option>
            {db.users
              .filter((u) => u.role === "seller")
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Origem
          <select
            value={source}
            onChange={(e) => change("source", e.target.value)}
          >
            <option value="all">Todas</option>
            {["site", "whatsapp", "email", "referral", "event", "manual"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Período
          <select
            value={period}
            onChange={(e) => change("period", e.target.value)}
          >
            <option value="all">Todo o histórico</option>
            <option value="today">Hoje</option>
            <option value="week">Últimos 7 dias</option>
            <option value="month">Este mês</option>
          </select>
        </label>
      </div>
      <div className="metrics-grid">
        {[
          ["Oportunidades abertas", m.openOpportunities],
          ["Valor em aberto", formatCurrency(m.openValueCents)],
          ["Vendas ganhas", m.wonOpportunities],
          ["Valor ganho", formatCurrency(m.wonValueCents)],
          ["Perdidas", m.lostOpportunities],
          [
            "Conversão",
            m.closedWinRate === null
              ? "—"
              : `${(m.closedWinRate * 100).toFixed(0)}%`,
          ],
          ["Tarefas atrasadas", m.overdueTasks],
          ["Respostas pendentes", m.pendingResponses],
          [
            "Primeira resposta média",
            m.firstResponseMinutes === null
              ? "—"
              : `${m.firstResponseMinutes.toFixed(0)} min`,
          ],
        ].map(([label, value]) => (
          <article className="panel metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      {m.unknownValues > 0 && (
        <p>{m.unknownValues} oportunidades ainda sem valor informado.</p>
      )}
      <section className="panel">
        <h2>Distribuição do funil</h2>
        {stages.map(([stage, label]) => {
          const selected = opps.filter((o) => o.stage === stage);
          return (
            <button
              key={stage}
              className="stage-row"
              onClick={() =>
                navigateTo(
                  `/funil?stage=${stage}&owner=${owner}&source=${source}&period=${period}`,
                )
              }
            >
              <span>{label}</span>
              <meter
                min={0}
                max={Math.max(opps.length, 1)}
                value={selected.length}
              />
              <span>
                {selected.length} ·{" "}
                {formatCurrency(
                  selected.reduce(
                    (s, o) => s + (opportunityValue(db, o) ?? 0),
                    0,
                  ),
                )}
              </span>
            </button>
          );
        })}
      </section>
      <section className="panel">
        <h2>Negociações do período</h2>
        {!opps.length && <p>Nenhuma negociação corresponde aos filtros.</p>}
        {opps.map((o) => (
          <button
            className="stage-row"
            key={o.id}
            onClick={() => navigateTo(`/oportunidades/${o.id}`)}
          >
            <span>{o.title}</span>
            <span>
              {stages.find(([s]) => s === o.stage)?.[1]} ·{" "}
              {formatCurrency(opportunityValue(db, o))}
            </span>
          </button>
        ))}
      </section>
      {report && (
        <div className="grid md:grid-cols-2 gap-4">
          <section className="panel">
            <h2>Origem das negociações</h2>
            {["site", "whatsapp", "email", "referral", "event", "manual"].map(
              (source) => (
                <p key={source}>
                  {source}:{" "}
                  {
                    opps.filter((o) =>
                      db.leads.some(
                        (l) =>
                          l.convertedOpportunityId === o.id &&
                          l.source === source,
                      ),
                    ).length
                  }
                </p>
              ),
            )}
          </section>
          <section className="panel">
            <h2>Motivos de perda</h2>
            {Object.entries(
              opps
                .filter((o) => o.stage === "lost")
                .reduce(
                  (a, o) => {
                    const reason = o.lostReason || "Não informado";
                    a[reason] = (a[reason] || 0) + 1;
                    return a;
                  },
                  {} as Record<string, number>,
                ),
            ).map(([reason, count]) => (
              <p key={reason}>
                {reason}: {count}
              </p>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
