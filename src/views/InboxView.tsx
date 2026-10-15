import React, { useState, useEffect } from "react";
import { useCrm } from "../context/CrmContext";
import { assistantInsight, whatsappOpen } from "../domain/selectors";
import { SegmentProfile } from "../components/common/SegmentProfile";
import { formatDate } from "../utils/formatters";
export const InboxView = ({
  navigateTo,
}: {
  navigateTo: (s: string) => void;
}) => {
  const crm = useCrm(),
    { db, currentUser } = crm;
  const [id, setId] = useState(
    new URLSearchParams(location.hash.split("?")[1]).get("conversation") ||
      db.conversations[0]?.id ||
      "",
  );
  const [filter, setFilter] = useState("all"),
    [channelFilter, setChannelFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [channel, setChannel] = useState<"whatsapp" | "email" | "internal_note">(
      "whatsapp",
    ),
    [drafts, setDrafts] = useState<Record<string, string>>({}),
    [feedback, setFeedback] = useState(""),
    [busy, setBusy] = useState(false),
    [mobileDetail, setMobileDetail] = useState(false);
  const cv = db.conversations.find((c) => c.id === id);
  const contact = db.contacts.find((c) => c.id === cv?.contactId);
  const opportunity = db.opportunities.find((o) => o.id === cv?.opportunityId);
  const insight = assistantInsight(db, id);
  const key = `${id}:${channel}`;
  useEffect(() => {
    if (cv?.unreadCount) crm.updateConversation(id, { read: true });
  }, [id, cv?.unreadCount]);
  const filtered = db.conversations.filter((c) => {
    const ct = db.contacts.find((x) => x.id === c.contactId);
    return (
      (!search || ct?.name.toLowerCase().includes(search.toLowerCase())) &&
      (channelFilter === "all" ||
        db.messages.some(
          (m) => m.conversationId === c.id && m.channel === channelFilter,
        )) &&
      (filter === "all" ||
        (filter === "mine" && c.ownerId === currentUser.id) ||
        (filter === "unassigned" && !c.ownerId) ||
        (filter === "unread" && c.unreadCount > 0) ||
        (filter === "waiting_team" && c.state === "waiting_team") ||
        (filter === "waiting_client" && c.state === "waiting_client") ||
        (filter === "paused" && c.aiMode === "paused"))
    );
  });
  const report = async (p: Promise<any>) => {
    const r = await p;
    setFeedback(r.ok ? "Alteração registrada." : r.error?.message || "Falha");
    return r;
  };
  return (
    <div className={`inbox-layout ${mobileDetail ? "show-conversation" : ""}`}>
      <aside className="inbox-list panel">
        <h1>Atendimento</h1>
        <label className="field">
          Buscar comprador
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label className="field">
          Fila
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {[
              ["all", "Todas"],
              ["mine", "Minhas"],
              ["unassigned", "Sem responsável"],
              ["unread", "Não lidas"],
              ["waiting_team", "Aguardando equipe"],
              ["waiting_client", "Aguardando cliente"],
              ["paused", "Assistente pausado"],
            ].map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Canal
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">E-mail</option>
          </select>
        </label>
        {filtered.map((c) => (
          <button
            className={`conversation-card ${id === c.id ? "selected" : ""}`}
            key={c.id}
            onClick={() => {
              setId(c.id);
              setMobileDetail(true);
              history.replaceState(
                null,
                "",
                `#/atendimento?conversation=${c.id}`,
              );
            }}
          >
            <strong>
              {db.contacts.find((ct) => ct.id === c.contactId)?.name}
            </strong>
            <span>
              {c.state === "waiting_team"
                ? "Aguardando equipe"
                : c.state === "waiting_client"
                  ? "Aguardando cliente"
                  : "Encerrada"}{" "}
              · {c.unreadCount} novas
            </span>
          </button>
        ))}
        {!filtered.length && <p>Nenhuma conversa nesta fila.</p>}
      </aside>
      <section className="conversation-detail panel">
        <button className="mobile-menu" onClick={() => setMobileDetail(false)}>
          ← Conversas
        </button>
        {!cv ? (
          <p>Conversa não encontrada ou indisponível para este perfil.</p>
        ) : (
          <>
            <h2>{contact?.name}</h2>
            <div className="row">
              <span>
                Comercial:{" "}
                {db.users.find((u) => u.id === cv.ownerId)?.name ||
                  "Sem responsável"}
              </span>
              <select
                aria-label="Modo do assistente"
                value={cv.aiMode}
                onChange={(e) =>
                  report(crm.updateConversation(id, { aiMode: e.target.value }))
                }
              >
                <option value="off">Assistente desligado</option>
                <option value="copilot">Sugestões assistidas</option>
                <option value="auto_triage">Triagem automática simulada</option>
                <option value="paused">Pausado / atendimento humano</option>
              </select>
              <button
                onClick={() =>
                  report(crm.updateConversation(id, { aiMode: "paused" }))
                }
              >
                Assumir atendimento humano
              </button>
              {opportunity && (
                <button
                  onClick={() => navigateTo(`/oportunidades/${opportunity.id}`)}
                >
                  Abrir oportunidade
                </button>
              )}
            </div>
            {!!cv.candidateOpportunityIds?.length && (
              <label className="field warning">
                A qual negociação pertence esta resposta?
                <select
                  value=""
                  onChange={(e) =>
                    report(
                      crm.updateConversation(id, {
                        opportunityId: e.target.value,
                      }),
                    )
                  }
                >
                  <option value="">Selecione para associar</option>
                  {cv.candidateOpportunityIds.map((oid) => (
                    <option key={oid} value={oid}>
                      {db.opportunities.find((o) => o.id === oid)?.title || oid}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="messages" aria-label="Histórico da conversa">
              {db.messages
                .filter((m) => m.conversationId === id)
                .map((m) => (
                  <article
                    key={m.id}
                    className={`message ${m.direction === "inbound" ? "inbound" : "outbound"} ${m.channel === "internal_note" ? "note" : ""}`}
                  >
                    <small>
                      {m.channel === "internal_note"
                        ? "Nota interna"
                        : m.channel}{" "}
                      · {formatDate(m.createdAt)} · {m.deliveryStatus}
                    </small>
                    <p>{m.body}</p>
                    {m.quoteVersionId && (
                      <button
                        onClick={() => {
                          const v = db.quoteVersions.find(
                            (v) => v.id === m.quoteVersionId,
                          );
                          if (v) navigateTo(`/cotacoes/${v.quoteId}`);
                        }}
                      >
                        Abrir cotação
                      </button>
                    )}
                  </article>
                ))}
            </div>
            <div className="row">
              {(["whatsapp", "email", "internal_note"] as const).map((c) => (
                <button
                  aria-pressed={channel === c}
                  key={c}
                  onClick={() => setChannel(c)}
                >
                  {c === "internal_note"
                    ? "Nota interna"
                    : c === "email"
                      ? "E-mail"
                      : "WhatsApp"}
                </button>
              ))}
            </div>
            {channel === "whatsapp" && !whatsappOpen(db, id) && (
              <p className="warning">
                Janela de 24 horas encerrada. Envie um modelo e aguarde resposta
                para retomar texto livre.
              </p>
            )}
            <label className="field">
              {channel === "internal_note"
                ? "Nota visível apenas à equipe"
                : "Mensagem ao comprador"}
              <textarea
                rows={3}
                value={drafts[key] || ""}
                onChange={(e) =>
                  setDrafts({ ...drafts, [key]: e.target.value })
                }
              />
            </label>
            <div className="row">
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const r = await report(
                    crm.sendChatMessage(id, channel, drafts[key] || ""),
                  );
                  if (r.ok) setDrafts((x) => ({ ...x, [key]: "" }));
                  setBusy(false);
                }}
              >
                {channel === "internal_note"
                  ? "Salvar nota"
                  : "Enviar mensagem simulada"}
              </button>
              {channel === "whatsapp" && (
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await report(
                      crm.sendChatMessage(
                        id,
                        "whatsapp",
                        "Olá! Podemos retomar o atendimento da sua solicitação?",
                        true,
                      ),
                    );
                    setBusy(false);
                  }}
                >
                  Enviar modelo de retomada
                </button>
              )}
              <button
                onClick={async () => {
                  const body = prompt("Resposta fictícia do comprador");
                  if (body)
                    await report(
                      crm.receiveInboundMessage(
                        id,
                        channel === "email" ? "email" : "whatsapp",
                        body,
                      ),
                    );
                }}
              >
                Simular resposta recebida
              </button>
            </div>
            <p role="status">{feedback}</p>
            {insight && (
              <section className="assistant panel">
                <h3>Assistente comercial</h3>
                <SegmentProfile key={contact?.companyId} companyId={contact?.companyId||""}/>
                <p>{insight.reason}</p>
                <p>{insight.actionRequired}</p>
                <small>Fontes aprovadas: {insight.citedDoc}</small>
                <div className="row">
                  {insight.suggestedDraft && (
                    <button
                      onClick={() =>
                        setDrafts({ ...drafts, [key]: insight.suggestedDraft })
                      }
                    >
                      Inserir sugestão para revisar
                    </button>
                  )}
                  <select
                    aria-label="Encaminhar ao apoio técnico"
                    value={cv.technicalOwnerId || ""}
                    onChange={(e) =>
                      report(
                        crm.updateConversation(id, {
                          technicalOwnerId: e.target.value,
                        }),
                      )
                    }
                  >
                    <option value="">Encaminhar ao apoio técnico</option>
                    {db.users
                      .filter((u) => u.active && u.role === "technical")
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                </div>
              </section>
            )}
          </>
        )}
      </section>
    </div>
  );
};
