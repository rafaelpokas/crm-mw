import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import type { CrmDatabase } from "../data/types";
import { execute, freshDatabase, uid, CommandResult } from "../domain/engine";
import { scopedDatabase, metricsFor } from "../domain/selectors";
import { loadDatabase, persistDatabase, fileStore } from "../domain/storage";
import { runScenario } from "../domain/scenarios";
const commandNames = [
 "createCampaign", "approveCampaign", "executeCampaign", "approveMarketAlert", "dismissMarketAlert", "dispatchOrderToErp", "simulateCatalogSubmission",
  "createLead",
  "updateLead",
  "qualifyLead",
  "convertLead",
  "assignOwner",
  "assignLead",
  "moveOpportunity",
  "updateOpportunity",
  "saveQuoteDraft",
  "requestApproval",
  "decideApproval",
  "createQuoteForOpportunity",
  "reviseQuote",
  "sendQuote",
  "sendChatMessage",
  "receiveInboundMessage",
  "acceptQuote",
  "rejectQuote",
  "completeTask",
  "createTask",
  "updateTask",
  "advanceClock",
  "markNotificationRead",
  "markAllNotificationsRead",
  "setSimulatedError",
  "updateKnowledge",
  "updateRule",
  "updateIntegration",
  "updateUser",
  "saveCompany",
  "saveContact",
  "saveProduct",
  "updateConversation",
  "addAttachment",
  "removeAttachment",
] as const;
type Commands = Record<
  (typeof commandNames)[number],
  (...args: any[]) => Promise<CommandResult>
>;
type Context = Commands & {
  db: CrmDatabase;
  currentUser: CrmDatabase["users"][number];
  setCurrentUserId: (id: string) => void;
  latencyEnabled: boolean;
  setLatencyEnabled: (x: boolean) => void;
  simulatedErrors: CrmDatabase["simulatedErrors"];
  metrics: ReturnType<typeof metricsFor>;
  storageError: string | null;
  resetDemo: () => Promise<void>;
  executeScenario: (id: string) => Promise<CommandResult>;
  uploadAttachment: (
    opportunityId: string,
    file: File,
  ) => Promise<CommandResult>;
  deleteAttachment: (id: string) => Promise<CommandResult>;
};
const CrmContext = createContext<Context | null>(null);
export const CrmProvider = ({ children }: { children: ReactNode }) => {
  const [initial] = useState(loadDatabase);
  const [db, setDb] = useState(initial.db);
  const state = useRef(db);
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const update = () => setHash(location.hash);
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const blocked = useRef(!!initial.error?.startsWith("Não foi"));
  const [storageError, setStorageError] = useState(initial.error);
  const [userId, setUserId] = useState(db.meta.defaultUserId);
  const actor = useRef(userId);
  const [latencyEnabled, setLatencyEnabled] = useState(true);
  const latency = useRef(true);
  const commit = (next: CrmDatabase) => {
    try {
      persistDatabase(next);
      state.current = next;
      setDb(next);
      setStorageError(null);
      return true;
    } catch {
      setStorageError(
        "Não foi possível salvar. A operação não foi aplicada. Libere espaço ou restaure a demonstração.",
      );
      return false;
    }
  };
  const generation = useRef(0);
  const inflight = useRef(new Map<string, Promise<CommandResult>>());
  const perform = async (name: string, args: any[], actorId: string) => {
    if (blocked.current)
      return {
        ok: false,
        error: {
          code: "RECOVERY",
          message: "Confirme a recuperação da base antes de alterar registros.",
        },
      };
    const startedGeneration = generation.current;
    if (latency.current)
      await new Promise((r) =>
        setTimeout(r, state.current.rules.defaultLatencyMs),
      );
    if (startedGeneration !== generation.current)
      return {
        ok: false,
        error: {
          code: "CANCELLED",
          message:
            "A demonstração foi restaurada. Operação anterior cancelada.",
        },
      };
    const out = execute(state.current, actorId, name, args);
    if (out.db !== state.current && !commit(out.db))
      return {
        ok: false,
        error: { code: "STORAGE", message: "Falha ao salvar a operação." },
      };
    return out.result;
  };
  const dispatch = (name: string, args: any[]) => {
    const key = JSON.stringify([actor.current, name, args]);
    const pending = inflight.current.get(key);
    if (pending) return pending;
    const promise = perform(name, args, actor.current).finally(() =>
      inflight.current.delete(key),
    );
    inflight.current.set(key, promise);
    return promise;
  };
  const commands = Object.fromEntries(
    commandNames.map((name) => [
      name,
      (...args: any[]) => dispatch(name, args),
    ]),
  ) as Commands;
  const currentUser =
    db.users.find((u) => u.id === userId && u.active) ||
    db.users.find((u) => u.active)!;
  const setCurrentUserId = (id: string) => {
    if (blocked.current) return;
    if (state.current.users.some((u) => u.id === id && u.active)) {
      const next = structuredClone(state.current);
      next.meta.defaultUserId = id;
      if (commit(next)) {
        actor.current = id;
        setUserId(id);
      }
    }
  };
  const resetDemo = async () => {
    generation.current++;
    try {
      await fileStore("clear");
      const next = freshDatabase();
      localStorage.removeItem("mw-photo-selection");
      localStorage.removeItem("megawhip-3d-selection");
      sessionStorage.removeItem("mw-catalog-request");
      ["mw-interest-draft", "mw-plan-slide", "mw-journey-machine", "mw-journey-crm"].forEach(key => sessionStorage.removeItem(key));
      if (commit(next)) {
        blocked.current = false;
      }
      if (!blocked.current) {
        actor.current = next.meta.defaultUserId;
        setUserId(actor.current);
        latency.current = true;
        setLatencyEnabled(true);
        window.location.hash = "/visao-geral";
      }
    } catch {
      setStorageError(
        "Não foi possível limpar os anexos locais. Tente novamente.",
      );
    }
  };
  const customerMode = hash.startsWith("#/simulador/cliente/");
  const visible = customerMode ? db : scopedDatabase(db, currentUser);
  const value: Context = {
    ...commands,
    db: visible,
    currentUser,
    setCurrentUserId,
    latencyEnabled,
    setLatencyEnabled: (x) => {
      latency.current = x;
      setLatencyEnabled(x);
    },
    simulatedErrors: db.simulatedErrors,
    metrics: metricsFor(visible),
    storageError,
    resetDemo,
    executeScenario: async (id) => {
      if (blocked.current && id !== "C16")
        return {
          ok: false,
          error: {
            code: "RECOVERY",
            message: "Restaure a demonstração antes de executar cenários.",
          },
        };
      generation.current++;
      const r = runScenario(id);
      if (!r.result.ok) return r.result;
      if (id === "C16") {
        await resetDemo();
        return r.result;
      }
      r.db.meta.defaultUserId = r.actor;
      try {
        await fileStore("clear");
      } catch {
        return {
          ok: false,
          error: {
            code: "STORAGE",
            message: "Não foi possível restaurar os arquivos da demonstração.",
          },
        };
      }
      if (!commit(r.db))
        return {
          ok: false,
          error: { code: "STORAGE", message: "Falha ao salvar cenário." },
        };
      actor.current = r.actor;
      setUserId(r.actor);
      return r.result;
    },
    uploadAttachment: async (opportunityId, file) => {
      const record = {
        id: uid("F"),
        opportunityId,
        name: file.name,
        type: file.type,
        size: file.size,
      };
      const check = execute(state.current, actor.current, "addAttachment", [
        record,
      ]);
      if (!check.result.ok) return check.result;
      try {
        await fileStore("put", record.id, file);
        const result = await commands.addAttachment(record);
        if (!result.ok) await fileStore("delete", record.id);
        return result;
      } catch {
        return {
          ok: false,
          error: {
            code: "STORAGE",
            message: "Não foi possível armazenar o arquivo.",
          },
        };
      }
    },
    deleteAttachment: async (id) => {
      const check = execute(state.current, actor.current, "removeAttachment", [
        id,
      ]);
      if (!check.result.ok) return check.result;
      const r = await commands.removeAttachment(id);
      if (r.ok) await fileStore("delete", id);
      return r;
    },
  };
  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
};
export const useCrm = () => {
  const value = useContext(CrmContext);
  if (!value) throw Error("CrmProvider ausente");
  return value;
};
