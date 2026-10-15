import React, { useState } from "react";
import { useCrm } from "../../context/CrmContext";
export function SegmentProfile({ companyId }: { companyId: string }) {
  const { db, saveCompany, currentUser } = useCrm();
  const company = db.companies.find((c) => c.id === companyId);
  const p = company?.segmentProfile;
  const [segment, setSegment] = useState(
      p?.mainSegment || company?.segment || "",
    ),
    [region, setRegion] = useState(p?.region || ""),
    [crop, setCrop] = useState(p?.crop.join(", ") || ""),
    [confirmed, setConfirmed] = useState(p?.confidence === "confirmed"),
    [feedback, setFeedback] = useState("");
  if (!company)
    return (
      <p>
        Empresa ainda não informada. Confirme o cadastro para qualificar o
        segmento.
      </p>
    );
  return (
    <details className="panel">
      <summary>
        Perfil comercial · {p?.mainSegment || "Segmento pendente"} ·{" "}
        {p?.region || "Região pendente"}
      </summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await saveCompany(company.id, {
            ...company,
            segment,
            segmentProfile: {
              mainSegment: segment.trim(),
              additionalSegments: p?.additionalSegments || [],
              crop: crop
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean),
              supplyChainRole: p?.supplyChainRole || "",
              region: region.trim(),
              confirmedMachines: p?.confirmedMachines || [],
              qualificationStatus: !segment.trim()
                ? "pending_segment"
                : region.trim() && confirmed
                  ? "confirmed"
                  : "partial",
              confidence: confirmed ? "confirmed" : "hypothesis",
              validationSource: "Revisão do colaborador",
              lastValidatedAt: db.meta.clock,
            },
          });
          setFeedback(
            r.ok ? "Perfil atualizado." : r.error?.message || "Falha",
          );
        }}
      >
        <label className="field">
          Segmento principal
          <input
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            placeholder="Cana de açúcar, Grãos…"
          />
        </label>
        <label className="field">
          Região
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Cidade / UF"
          />
        </label>
        <label className="field">
          Culturas
          <input
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            placeholder="Separadas por vírgula"
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />{" "}
          Informações confirmadas com o cliente
        </label>
        <p role="status">{feedback}</p>
        <button disabled={currentUser.role === "technical"}>
          Salvar perfil comercial
        </button>
      </form>
    </details>
  );
}
