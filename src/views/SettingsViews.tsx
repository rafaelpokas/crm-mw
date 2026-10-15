import React, { useState } from "react";
import { useCrm } from "../context/CrmContext";
import { parseCsv } from "../domain/csv";
import { formatDate } from "../utils/formatters";
export const SettingsViews = ({
  section,
  navigateTo,
}: {
  section: "equipe" | "integracoes" | "importacao" | "auditoria";
  navigateTo: (s: string) => void;
}) => {
  const crm = useCrm(),
    { db } = crm;
  const [feedback, setFeedback] = useState(""),
    [text, setText] = useState(""),
    [mapping, setMapping] = useState<Record<string, number>>({
      name: 0,
      email: 1,
      whatsappMockId: 2,
      companyName: 3,
      interest: 4,
    }),
    [preview, setPreview] = useState<any[]>([]),
    [busy, setBusy] = useState(false),
    [actor, setActor] = useState(""),
    [action, setAction] = useState(""),
    [entity, setEntity] = useState(""),
    [date, setDate] = useState("");
  let rows: string[][] = [];
  try {
    rows = parseCsv(text);
  } catch {}
  const report = async (p: Promise<any>) => {
    const r = await p;
    setFeedback(r.ok ? "Alteração salva." : r.error?.message || "Falha");
  };
  const prepare = () => {
    try {
      const parsed = parseCsv(text);
      if (parsed.length < 2) throw Error("CSV precisa de cabeçalho e dados.");
      const seen = new Set<string>();
      setPreview(
        parsed.slice(1).map((row, index) => {
          const p = Object.fromEntries(
            Object.entries(mapping).map(([k, i]) => [k, (row[i] || "").trim()]),
          );
          let error = !p.name
            ? "Nome obrigatório"
            : !p.email && !p.whatsappMockId
              ? "Informe um contato"
              : p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)
                ? "E-mail inválido"
                : "";
          const keys = [p.email?.toLowerCase(), p.whatsappMockId].filter(
            Boolean,
          );
          const duplicate =
            keys.some((k) => seen.has(k)) ||
            db.contacts.some(
              (c) =>
                (p.email && c.email.toLowerCase() === p.email.toLowerCase()) ||
                (p.whatsappMockId && c.whatsappMockId === p.whatsappMockId),
            );
          keys.forEach((k) => seen.add(k));
          return { ...p, index: index + 2, error, duplicate };
        }),
      );
      setFeedback(
        "Confira a prévia antes de importar. Duplicidades serão ignoradas.",
      );
    } catch (e: any) {
      setFeedback(e.message);
    }
  };
  return (
    <div className="page">
      <h1>
        {
          {
            equipe: "Equipe e distribuição",
            integracoes: "Conexões demonstrativas",
            importacao: "Importar leads",
            auditoria: "Histórico de alterações",
          }[section]
        }
      </h1>
      <p role="status">{feedback}</p>
      {section === "equipe" && (
        <>
          <p>
            Somente vendedores ativos recebem a distribuição. Ao desativar, os
            registros abertos são redistribuídos.
          </p>
          {db.users.map((u) => (
            <div className="panel row" key={u.id}>
              <span>
                {u.name} · {u.role} · {u.active ? "Ativo" : "Inativo"}
              </span>
              <button
                onClick={() => {
                  const name = prompt("Nome", u.name);
                  if (name) report(crm.updateUser(u.id, { name }));
                }}
              >
                Editar nome
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      u.active
                        ? "Desativar e redistribuir registros abertos?"
                        : "Ativar este usuário?",
                    )
                  )
                    report(crm.updateUser(u.id, { active: !u.active }));
                }}
              >
                {u.active ? "Desativar e redistribuir" : "Ativar"}
              </button>
            </div>
          ))}
        </>
      )}
      {section === "integracoes" && (
        <>
          <p>
            Conexões locais. Nenhuma mensagem é enviada para serviços externos.
          </p>
          {db.integrations.map((i) => (
            <div className="panel row" key={i.id}>
              <strong>{i.channel}</strong>
              <span>{i.state}</span>
              {i.channel !== "erp" ? (
                <>
                  <button
                    onClick={() =>
                      report(
                        crm.updateIntegration(
                          i.id,
                          i.state === "connected"
                            ? "disconnected"
                            : "connected",
                        ),
                      )
                    }
                  >
                    {i.state === "connected" ? "Desconectar" : "Conectar"}
                  </button>
                  <button
                    onClick={() =>
                      setFeedback(
                        i.state === "connected"
                          ? "Conexão mock disponível."
                          : "Teste falhou: conexão indisponível.",
                      )
                    }
                  >
                    Testar conexão
                  </button>
                  {["whatsapp", "email"].includes(i.channel) && (
                    <label>
                      <input
                        type="checkbox"
                        checked={
                          i.channel === "whatsapp"
                            ? db.simulatedErrors.failWhatsApp
                            : db.simulatedErrors.failEmail
                        }
                        onChange={(e) =>
                          report(
                            crm.setSimulatedError(
                              i.channel === "whatsapp"
                                ? "failWhatsApp"
                                : "failEmail",
                              e.target.checked,
                            ),
                          )
                        }
                      />{" "}
                      Simular falha
                    </label>
                  )}
                </>
              ) : (
                <span>Fora do escopo</span>
              )}
            </div>
          ))}
        </>
      )}
      {section === "importacao" && (
        <div className="panel">
          <label className="field">
            Arquivo CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setText(await file.text());
                  setPreview([]);
                }
              }}
            />
          </label>
          <label className="field">
            Conteúdo CSV
            <textarea
              rows={6}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setPreview([]);
              }}
              placeholder="nome;email;whatsapp;empresa;interesse"
            />
          </label>
          <div className="row">
            {Object.entries({
              name: "Nome",
              email: "E-mail",
              whatsappMockId: "WhatsApp",
              companyName: "Empresa",
              interest: "Interesse",
            }).map(([key, label]) => (
              <label className="field" key={key}>
                {label}
                <select
                  value={mapping[key]}
                  onChange={(e) => {
                    setMapping({ ...mapping, [key]: Number(e.target.value) });
                    setPreview([]);
                  }}
                >
                  <option value={-1}>Não informado</option>
                  {rows[0]?.map((h, i) => (
                    <option value={i} key={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button onClick={prepare}>Validar e visualizar</button>
          {preview.length > 0 && (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Nome</th>
                    <th>Contato</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p) => (
                    <tr key={p.index}>
                      <td>{p.index}</td>
                      <td>{p.name}</td>
                      <td>{p.email || p.whatsappMockId}</td>
                      <td>
                        {p.error ||
                          (p.duplicate ? "Duplicado — ignorar" : "Válido")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  let imported = 0,
                    ignored = 0,
                    errors = 0;
                  for (const p of preview) {
                    if (p.error) {
                      errors++;
                      continue;
                    }
                    if (p.duplicate) {
                      ignored++;
                      continue;
                    }
                    const r = await crm.createLead({ ...p, source: "manual" });
                    if (r.ok) imported++;
                    else if (r.error?.code === "DUPLICATE") ignored++;
                    else errors++;
                  }
                  setFeedback(
                    `${imported} importados · ${ignored} duplicados ignorados · ${errors} com erro`,
                  );
                  setPreview([]);
                  setBusy(false);
                }}
              >
                Confirmar importação
              </button>
            </>
          )}
        </div>
      )}
      {section === "auditoria" && (
        <>
          <div className="panel row">
            <label>
              Ator
              <select value={actor} onChange={(e) => setActor(e.target.value)}>
                <option value="">Todos</option>
                {[
                  ...db.users.map((u) => ({ id: u.id, name: u.name })),
                  { id: "customer", name: "Comprador simulado" },
                  { id: "system", name: "Sistema" },
                ].map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ação
              <input
                value={action}
                onChange={(e) => setAction(e.target.value)}
              />
            </label>
            <label>
              Registro
              <input
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
              />
            </label>
            <label>
              Data
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          {[...db.activities]
            .reverse()
            .filter(
              (a) =>
                (!actor || a.actorId === actor) &&
                a.action.includes(action) &&
                a.entityId.includes(entity) &&
                (!date || a.createdAt.startsWith(date)),
            )
            .map((a) => (
              <details className="panel" key={a.id}>
                <summary>
                  {formatDate(a.createdAt)} ·{" "}
                  {db.users.find((u) => u.id === a.actorId)?.name || a.actorId}{" "}
                  · {a.action} · {a.entityId}
                </summary>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    Antes<pre>{JSON.stringify(a.before, null, 2)}</pre>
                  </div>
                  <div>
                    Depois<pre>{JSON.stringify(a.after, null, 2)}</pre>
                  </div>
                </div>
              </details>
            ))}
        </>
      )}
    </div>
  );
};
