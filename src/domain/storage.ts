import type { CrmDatabase } from "../data/types";
import { freshDatabase } from "./engine";
export const STORAGE_KEY = "megawhip_crm_db_v2";
export function loadDatabase(): { db: CrmDatabase; error: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return {
        db: freshDatabase(),
        error: localStorage.getItem("megawhip_crm_db_v1")
          ? "Foi encontrada uma base antiga. A demonstração usa uma nova versão; a base anterior foi preservada."
          : null,
      };
    const db = JSON.parse(raw);
    const seed = freshDatabase();
    for(const key of ["touchpoints","erpStock","erpOrderSyncs","marketCalendar","marketAlerts","campaigns"]) if(db[key] === undefined) db[key] = structuredClone((seed as any)[key]);
    if (
      db?.meta?.schemaVersion !== 2 ||
      !Number.isFinite(Date.parse(db.meta.clock)) ||
      !db.rules ||
      !db.receipts ||
      Object.keys(seed).some(
        (k) => Array.isArray((seed as any)[k]) && !Array.isArray(db[k]),
      )
    )
      throw Error("Estrutura incompatível");
    for (const key of [
      "users",
      "contacts",
      "opportunities",
      "quotes",
      "quoteVersions",
      "messages",
      "tasks",
    ]) {
      if (
        db[key].some((x: any) => !x || typeof x.id !== "string") ||
        new Set(db[key].map((x: any) => x.id)).size !== db[key].length
      )
        throw Error("Registros inválidos");
    }
    if (
      !db.users.some((u: any) => u.active) ||
      db.quotes.some(
        (q: any) =>
          !db.quoteVersions.some((v: any) => v.id === q.currentVersionId),
      )
    )
      throw Error("Referências inválidas");
    const fields: Record<string, string[]> = {
      users: ["name", "role"],
      companies: ["name", "segment", "city", "state"],
      contacts: ["name", "email", "whatsappMockId", "companyId"],
      leads: ["contactId", "source", "interest", "status", "createdAt"],
      opportunities: [
        "contactId",
        "title",
        "stage",
        "technicalStatus",
        "createdAt",
        "stageEnteredAt",
      ],
      products: [
        "name",
        "sku",
        "category",
        "unit",
        "application",
        "availability",
      ],
      quotes: ["number", "opportunityId", "currentVersionId", "createdAt"],
      quoteVersions: [
        "quoteId",
        "status",
        "approvalStatus",
        "validUntil",
        "paymentTerms",
        "deliveryTerms",
      ],
      conversations: ["contactId", "state", "aiMode", "lastInboundAt"],
      messages: [
        "conversationId",
        "channel",
        "direction",
        "body",
        "deliveryStatus",
        "createdAt",
      ],
      tasks: ["title", "opportunityId", "ownerId", "type", "status", "dueAt"],
      knowledgeDocuments: ["title", "content", "status"],
      automationRules: ["trigger", "conditions", "action"],
      automationRuns: [
        "ruleId",
        "entityId",
        "eventKey",
        "status",
        "reason",
        "createdAt",
      ],
      integrations: ["channel", "mode", "state"],
      notifications: ["recipientId", "title", "message", "createdAt"],
      activities: ["entityType", "entityId", "actorId", "action", "createdAt"],
      attachments: ["name", "opportunityId", "type", "createdAt"],
    };
    for (const [collection, keys] of Object.entries(fields)) {
      if (
        db[collection].some(
          (record: any) =>
            !record ||
            typeof record.id !== "string" ||
            keys.some((k) => typeof record[k] !== "string"),
        )
      )
        throw Error("Campos inválidos");
      if (
        new Set(db[collection].map((x: any) => x.id)).size !==
        db[collection].length
      )
        throw Error("Identificadores duplicados");
    }
    if (
      db.quoteVersions.some(
        (v: any) =>
          !Array.isArray(v.lines) ||
          !Number.isSafeInteger(v.totalCents) ||
          v.lines.some(
            (l: any) =>
              !Number.isInteger(l.quantity) ||
              l.quantity < 1 ||
              typeof l.nameSnapshot !== "string" ||
              (l.unitPriceCents !== null &&
                !Number.isSafeInteger(l.unitPriceCents)),
          ),
      )
    )
      throw Error("Cotação inválida");
    if (
      db.opportunities.some(
        (o: any) =>
          ![
            "new",
            "qualification",
            "quoting",
            "quote_sent",
            "negotiation",
            "won",
            "lost",
          ].includes(o.stage) ||
          !db.contacts.some((c: any) => c.id === o.contactId),
      )
    )
      throw Error("Oportunidade inválida");
    if (
      db.users.some(
        (u: any) =>
          !["manager", "seller", "technical", "admin"].includes(u.role) ||
          typeof u.active !== "boolean",
      )
    )
      throw Error("Perfil inválido");
    return { db, error: null };
  } catch {
    return {
      db: freshDatabase(),
      error:
        "Não foi possível recuperar a base local. A base original permanece armazenada. Use Restaurar demonstração para confirmar a recuperação.",
    };
  }
}
export function persistDatabase(db: CrmDatabase) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}
const connection = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("megawhip_files", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
export async function fileStore(
  action: "put" | "get" | "delete" | "clear",
  id?: string,
  file?: Blob,
): Promise<any> {
  const db = await connection();
  return new Promise((resolve, reject) => {
    const t = db.transaction(
      "files",
      action === "get" ? "readonly" : "readwrite",
    );
    const s = t.objectStore("files");
    const r =
      action === "put"
        ? s.put(file, id)
        : action === "get"
          ? s.get(id!)
          : action === "delete"
            ? s.delete(id!)
            : s.clear();
    t.oncomplete = () => {
      resolve(r.result);
      db.close();
    };
    t.onerror = () => {
      reject(t.error);
      db.close();
    };
  });
}
