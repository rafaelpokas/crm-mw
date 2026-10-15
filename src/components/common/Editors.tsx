import React, { useState } from "react";
import { useCrm } from "../../context/CrmContext";
import { fileStore } from "../../domain/storage";
export function AttachmentPanel({ opportunityId }: { opportunityId: string }) {
  const { db, uploadAttachment, deleteAttachment } = useCrm();
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel">
      <h2>Arquivos da oportunidade</h2>
      <label className="field">
        Anexar PDF, PNG ou JPEG (até 5 MB)
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            const r = await uploadAttachment(opportunityId, f);
            setFeedback(
              r.ok ? "Arquivo armazenado." : r.error?.message || "Falha",
            );
            setBusy(false);
            e.target.value = "";
          }}
        />
      </label>
      <p role="status">{feedback}</p>
      {(db.attachments || [])
        .filter((a) => a.opportunityId === opportunityId)
        .map((a) => (
          <div className="row" key={a.id}>
            <span>
              {a.name} · {Math.ceil(a.size / 1024)} KB
            </span>
            <button
              onClick={async () => {
                try {
                  const f = await fileStore("get", a.id);
                  if (!f) throw Error();
                  const url = URL.createObjectURL(f);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = a.name;
                  link.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch {
                  setFeedback("Arquivo não disponível no armazenamento local.");
                }
              }}
            >
              Baixar
            </button>
            <button
              onClick={async () => {
                if (!confirm("Remover este anexo?")) return;
                const r = await deleteAttachment(a.id);
                setFeedback(
                  r.ok ? "Anexo removido." : r.error?.message || "Falha",
                );
              }}
            >
              Remover
            </button>
          </div>
        ))}
      {!(db.attachments || []).some(
        (a) => a.opportunityId === opportunityId,
      ) && <p>Nenhum arquivo anexado.</p>}
    </section>
  );
}
export function RecordEditor({
  kind,
  record,
}: {
  kind: "Company" | "Contact" | "Product";
  record?: any;
}) {
  const crm = useCrm();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<any>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const defaults =
    kind === "Company"
      ? {
          name: "",
          segment: "",
          city: "",
          state: "",
          document: null,
          fictitious: true,
        }
      : kind === "Contact"
        ? {
            name: "",
            companyId: "",
            email: "",
            whatsappMockId: "",
            preferredChannel: "email",
            doNotContact: false,
          }
        : {
            name: "",
            sku: "",
            category: "",
            unit: "un",
            unitPriceCents: null,
            availability: "Sob consulta",
            active: true,
            requiresTechnicalApproval: true,
            knowledgeId: "",
            application: "",
          };
  const fields: Record<string, string> =
    kind === "Company"
      ? { name: "Nome", segment: "Segmento", city: "Cidade", state: "UF" }
      : kind === "Contact"
        ? {
            name: "Nome",
            email: "E-mail",
            whatsappMockId: "WhatsApp demonstrativo",
          }
        : {
            name: "Nome",
            sku: "SKU",
            category: "Categoria",
            unit: "Unidade",
            unitPriceCents: "Preço em centavos (vazio = sob consulta)",
            availability: "Disponibilidade",
            application: "Aplicação documentada",
          };
  return (
    <>
      <button
        onClick={() => {
          setValues({ ...defaults, ...record });
          setError("");
          setOpen(true);
        }}
      >
        {record ? "Editar" : "Cadastrar"}{" "}
        {kind === "Company"
          ? "empresa"
          : kind === "Contact"
            ? "contato"
            : "produto"}
      </button>
      {open && (
        <div className="modal-backdrop">
          <form
            role="dialog"
            aria-modal="true"
            aria-label="Editar cadastro"
            className="panel modal"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const r = await crm[`save${kind}`](record?.id, values);
              setBusy(false);
              if (r.ok) setOpen(false);
              else setError(r.error?.message || "Falha");
            }}
          >
            <h2>{record ? "Editar" : "Novo cadastro"}</h2>
            {Object.entries(fields).map(([key, label]) => (
              <label className="field" key={key}>
                {label}
                <input
                  required={key === "name" || key === "sku"}
                  type={key === "unitPriceCents" ? "number" : "text"}
                  min={key === "unitPriceCents" ? 0 : undefined}
                  value={values[key] ?? ""}
                  onChange={(e) =>
                    setValues({
                      ...values,
                      [key]:
                        key === "unitPriceCents"
                          ? e.target.value === ""
                            ? null
                            : Number(e.target.value)
                          : e.target.value,
                    })
                  }
                />
              </label>
            ))}
            {kind === "Contact" && (
              <>
                <label className="field">
                  Empresa
                  <select
                    value={values.companyId}
                    onChange={(e) =>
                      setValues({ ...values, companyId: e.target.value })
                    }
                  >
                    <option value="">Pessoa física / sem empresa</option>
                    {crm.db.companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={values.doNotContact}
                    onChange={(e) =>
                      setValues({ ...values, doNotContact: e.target.checked })
                    }
                  />{" "}
                  Não contatar
                </label>
              </>
            )}
            {kind === "Product" && (
              <>
                <label>
                  <input
                    type="checkbox"
                    checked={values.active}
                    onChange={(e) =>
                      setValues({ ...values, active: e.target.checked })
                    }
                  />{" "}
                  Ativo
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={values.requiresTechnicalApproval}
                    onChange={(e) =>
                      setValues({
                        ...values,
                        requiresTechnicalApproval: e.target.checked,
                      })
                    }
                  />{" "}
                  Exige validação técnica
                </label>
              </>
            )}
            <p role="alert">{error}</p>
            <div className="row">
              <button type="button" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button disabled={busy} type="submit">
                {busy ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
export function OpportunityEditor({ id }: { id: string }) {
  const { db, currentUser, updateOpportunity } = useCrm();
  const o = db.opportunities.find((o) => o.id === id)!;
  const [title, setTitle] = useState(o.title),
    [estimate, setEstimate] = useState(o.estimatedValueCents?.toString() || ""),
    [technical, setTechnical] = useState(o.technicalStatus),
    [feedback, setFeedback] = useState("");
  return (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await updateOpportunity(id, {
          title,
          estimatedValueCents: estimate === "" ? null : Number(estimate),
          ...(["manager", "technical"].includes(currentUser.role)
            ? { technicalStatus: technical }
            : {}),
        });
        setFeedback(
          r.ok ? "Oportunidade atualizada." : r.error?.message || "Falha",
        );
      }}
    >
      <h2>Dados comerciais e análise técnica</h2>
      <label className="field">
        Interesse / título
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="field">
        Estimativa em centavos (vazio = desconhecida)
        <input
          type="number"
          min="0"
          value={estimate}
          onChange={(e) => setEstimate(e.target.value)}
        />
      </label>
      {["manager", "technical"].includes(currentUser.role) && (
        <label className="field">
          Análise técnica
          <select
            value={technical}
            onChange={(e) => setTechnical(e.target.value as any)}
          >
            <option value="pending">Pendente</option>
            <option value="approved_demo">Aprovada na demonstração</option>
            <option value="rejected_demo">Reprovada na demonstração</option>
          </select>
        </label>
      )}
      <button>Salvar alterações</button>
      <p role="status">{feedback}</p>
    </form>
  );
}
