import React, { useState } from "react";
import { useCrm } from "../context/CrmContext";

export function ExperienceView({ request = false }: { request?: boolean }) {
  const { createLead, storageError } = useCrm();
  const [selection] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("mw-catalog-request") || "null");
    } catch {
      return null;
    }
  });
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [company, setCompany] = useState(""),
    [segment, setSegment] = useState(""),
    [region, setRegion] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [duplicate, setDuplicate] = useState(false);
  const [quantities, setQuantities] = useState<number[]>(
    () => selection?.items?.map(() => 1) || [],
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || done) return;
    setBusy(true);
    setError("");
    try {
      const res = await createLead({
        eventId: selection.eventId,
        name,
        email,
        companyName: company,
        segment,
        region,
        source: "catalog",
        duplicateChoice: duplicate ? "link" : undefined,
        interest: selection.items
          .map(
            (x: any, i: number) =>
              `${quantities[i]} × ${x.name} (${x.sku}) · ${x.model || ""}`,
          )
          .join("\n"),
        catalogContext: {
          machineModel: selection.items
            .map((x: any) => x.model)
            .filter(Boolean)
            .join(", "),
          selectedItems: selection.items.map((x: any, i: number) => ({
            sku: x.sku,
            quantity: quantities[i],
          })),
        },
      });
      if (res.ok) {
        setDone(true);
        sessionStorage.removeItem("mw-catalog-request");
      } else {
        setError(res.error?.message || "Não foi possível salvar");
        if (res.error?.code === "DUPLICATE") setDuplicate(true);
      }
    } catch {
      setError("Não foi possível concluir. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="experience">
      <header>
        <a href="#/apresentacao">
          <img src="/logo-megawhip.png" alt="MegaWhip" />
        </a>
        <a href="#/visao-geral">Explorar CRM ↗</a>
      </header>
      <main>
        <p className="eyebrow">MEGAWHIP · EXPERIÊNCIA DEMONSTRATIVA</p>
        {!request ? (
          <>
            <h1>
              Da conexão certa
              <br />
              ao próximo negócio.
            </h1>
            <p>
              Explore as peças. Descubra como o interesse chega à equipe
              comercial.
            </p>
            <div className="experience-grid">
              <a href="/catalogo-maquinas/index.html">
                <span>01 / ENCONTRAR</span>
                <h2>Catálogo por máquina</h2>
                <p>
                  Fotografias e aplicações publicadas, organizadas por
                  equipamento.
                </p>
                <b>Encontrar peças →</b>
              </a>
              <a href="#/visao-geral">
                <span>02 / CONECTAR</span>
                <h2>Ecossistema comercial</h2>
                <p>Atendimento, leads, propostas e inteligência de mercado.</p>
                <b>Explorar o CRM →</b>
              </a>
            </div>
            <p className="experience-note">
              Para testar a jornada, adicione peças no catálogo e escolha
              “Simular atendimento”. O lead fica neste navegador. Nenhuma
              mensagem será enviada.
            </p>
          </>
        ) : done ? (
          <section>
            <h1>Interesse recebido.</h1>
            <p>
              Sua seleção foi registrada como lead demonstrativo, com as
              quantidades e o segmento informados. A qualificação e a conversão
              continuam no CRM.
            </p>
            <a className="experience-action" href="#/leads">
              Ver o lead no CRM →
            </a>
            <a href="#/apresentacao">Voltar à apresentação</a>
          </section>
        ) : !selection?.items?.length ? (
          <>
            <h1>Selecione suas peças.</h1>
            <p>
              Abra um catálogo e adicione os itens de interesse antes de simular
              o atendimento.
            </p>
            <a href="/catalogo-maquinas/index.html">Abrir catálogo →</a>
          </>
        ) : (
          <>
            <h1>
              Vamos conectar
              <br />
              seu interesse.
            </h1>
            <p>
              Demonstração local: use dados fictícios. Nenhum contato real será
              realizado.
            </p>
            <form onSubmit={submit}>
              <div className="experience-grid">
                <section>
                  {selection.items.map((x: any, i: number) => (
                    <label key={i}>
                      {x.name} · {x.sku}
                      <small>{x.model}</small>
                      <input
                        aria-label={`Quantidade ${x.sku}`}
                        type="number"
                        min="1"
                        max="9999"
                        required
                        value={quantities[i]}
                        onChange={(e) =>
                          setQuantities(
                            quantities.map((q, j) =>
                              j === i ? Number(e.target.value) : q,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                </section>
                <section>
                  <label>
                    Nome
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label>
                    E-mail
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label>
                    Empresa
                    <input
                      required
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </label>
                  <label>
                    Segmento
                    <select
                      aria-label="Segmento"
                      value={segment}
                      onChange={(e) => setSegment(e.target.value)}
                    >
                      <option value="">Ainda não informado</option>
                      <option>Cana de açúcar</option>
                      <option>Grãos</option>
                      <option>Algodão</option>
                      <option>Construção</option>
                      <option>Outros</option>
                    </select>
                  </label>
                  <label>
                    Região de atuação
                    <input
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="Cidade / UF"
                    />
                  </label>
                  <p role="alert">{error || storageError}</p>
                  <button
                    className="experience-action"
                    disabled={busy || !!storageError}
                  >
                    {busy
                      ? "Registrando…"
                      : duplicate
                        ? "Confirmar vínculo com contato existente"
                        : "Simular entrada no CRM →"}
                  </button>
                </section>
              </div>
            </form>
          </>
        )}
      </main>
      <footer>
        Protótipo local · Envios e integrações simulados · Catálogo sujeito à
        validação técnica
      </footer>
    </div>
  );
}
