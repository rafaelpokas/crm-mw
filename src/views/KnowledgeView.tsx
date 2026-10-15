import React, { useState } from "react";
import { useCrm } from "../context/CrmContext";
export const KnowledgeView = ({
  navigateTo,
}: {
  navigateTo: (s: string) => void;
}) => {
  const { db, currentUser, updateKnowledge } = useCrm();
  const [id, setId] = useState(db.knowledgeDocuments[0]?.id || ""),
    [editing, setEditing] = useState(false),
    [title, setTitle] = useState(""),
    [content, setContent] = useState(""),
    [feedback, setFeedback] = useState("");
  const doc = db.knowledgeDocuments.find((d) => d.id === id);
  const save = async (status: string) => {
    const r = await updateKnowledge(id || null, { title, content, status });
    setFeedback(r.ok ? "Documento salvo." : r.error?.message || "Falha");
    if (r.ok) {
      setId(r.data.id);
      setEditing(false);
    }
  };
  return (
    <div className="page">
      <h1>Conhecimento do assistente</h1>
      <p>Somente fontes aprovadas são apresentadas pelo assistente.</p>
      <p role="status">{feedback}</p>
      {["manager", "admin", "technical"].includes(currentUser.role) && (
        <button
          onClick={() => {
            setId("");
            setTitle("");
            setContent("");
            setEditing(true);
          }}
        >
          Novo documento
        </button>
      )}
      <div className="grid md:grid-cols-3 gap-4">
        <aside className="panel">
          {db.knowledgeDocuments.map((d) => (
            <button
              className="conversation-card"
              key={d.id}
              onClick={() => {
                setId(d.id);
                setEditing(false);
              }}
            >
              {d.title}
              <small>
                v{d.version} · {d.status}
              </small>
            </button>
          ))}
        </aside>
        <section className="panel md:col-span-2">
          {editing ? (
            <>
              <label className="field">
                Título
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="field">
                Conteúdo
                <textarea
                  rows={12}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </label>
              <button onClick={() => save("draft")}>Salvar rascunho</button>
            </>
          ) : doc ? (
            <>
              <h2>{doc.title}</h2>
              <small>
                Versão {doc.version} · {doc.status}
              </small>
              <p className="whitespace-pre-wrap">{doc.content}</p>
              {["manager", "admin", "technical"].includes(currentUser.role) && (
                <div className="row">
                  <button
                    onClick={() => {
                      setTitle(doc.title);
                      setContent(doc.content);
                      setEditing(true);
                    }}
                  >
                    Editar conteúdo
                  </button>
                  {currentUser.role === "manager" && (
                    <button
                      onClick={async () => {
                        const r = await updateKnowledge(doc.id, {
                          status:
                            doc.status === "approved" ? "inactive" : "approved",
                        });
                        setFeedback(
                          r.ok
                            ? "Status atualizado."
                            : r.error?.message || "Falha",
                        );
                      }}
                    >
                      {doc.status === "approved"
                        ? "Desativar fonte"
                        : "Aprovar fonte"}
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <p>Selecione um documento.</p>
          )}
        </section>
      </div>
    </div>
  );
};
