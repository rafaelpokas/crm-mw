import React, { useState } from "react";
import { useCrm } from "../context/CrmContext";
import { testRule } from "../domain/ruleTests";
import { formatDate } from "../utils/formatters";
export const AutomationsView = ({
  navigateTo,
}: {
  navigateTo: (s: string) => void;
}) => {
  const { db, updateRule } = useCrm();
  const [feedback, setFeedback] = useState("");
  const [limit, setLimit] = useState(db.rules.sellerDiscountLimitBps / 100),
    [days, setDays] = useState(db.rules.followUpBusinessDays);
  return (
    <div className="page">
      <h1>Automações comerciais</h1>
      <p>
        {db.automationRules.filter((r) => r.active).length} regras ativas. Os
        testes usam uma cópia isolada da demonstração.
      </p>
      <p role="status">{feedback}</p>
      <form
        className="panel row"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await updateRule("A03", {
            sellerDiscountLimitBps: Math.round(limit * 100),
            followUpBusinessDays: days,
          });
          setFeedback(r.ok ? "Condições salvas." : r.error?.message || "Falha");
        }}
      >
        <label className="field">
          Alçada de desconto (%)
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
        </label>
        <label className="field">
          Prazo de retorno (dias úteis)
          <input
            type="number"
            min="1"
            max="30"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
        </label>
        <button>Salvar condições</button>
      </form>
      <div className="grid md:grid-cols-2 gap-4">
        {db.automationRules.map((r) => (
          <section className="panel" key={r.id}>
            <h2>
              {r.id} · {r.trigger}
            </h2>
            <p>{r.conditions}</p>
            <p>{r.action}</p>
            <div className="row">
              <button
                onClick={async () => {
                  const out = await updateRule(r.id, { active: !r.active });
                  setFeedback(
                    out.ok
                      ? "Regra atualizada."
                      : out.error?.message || "Falha",
                  );
                }}
              >
                {r.active ? "Pausar regra" : "Ativar regra"}
              </button>
              <button
                onClick={() => {
                  const result = testRule(db, r.id);
                  setFeedback(result.data.message);
                }}
              >
                Testar regra
              </button>
            </div>
          </section>
        ))}
      </div>
      <section className="panel">
        <h2>Execuções da operação</h2>
        {!db.automationRuns.length && <p>Nenhuma execução registrada.</p>}
        {[...db.automationRuns].reverse().map((r) => (
          <p key={r.id}>
            {formatDate(r.createdAt)} · {r.ruleId} · {r.status} · {r.reason}
          </p>
        ))}
      </section>
    </div>
  );
};
