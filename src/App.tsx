import React, { useState, useEffect } from "react";
import { CrmProvider, useCrm } from "./context/CrmContext";
import { TopBar } from "./components/layout/TopBar";
import { SideBar } from "./components/layout/SideBar";
import { GlobalSearchModal } from "./components/common/GlobalSearchModal";

import { ExperienceView } from "./views/ExperienceView";
import { CampaignsView } from "./views/CampaignsView";
import { MarketIntelligenceView } from "./views/MarketIntelligenceView";
// Views
import { DashboardView } from "./views/DashboardView";
import { InboxView } from "./views/InboxView";
import { LeadsView } from "./views/LeadsView";
import { PipelineView } from "./views/PipelineView";
import { OpportunityDetailView } from "./views/OpportunityDetailView";
import { QuotesListView } from "./views/QuotesListView";
import { QuoteEditorView } from "./views/QuoteEditorView";
import { QuoteDetailView } from "./views/QuoteDetailView";
import { CustomersView } from "./views/CustomersView";
import { CatalogView } from "./views/CatalogView";
import { TasksView } from "./views/TasksView";
import { ReportsView } from "./views/ReportsView";
import { AutomationsView } from "./views/AutomationsView";
import { KnowledgeView } from "./views/KnowledgeView";
import { SettingsViews } from "./views/SettingsViews";
import { DemoControlCenterView } from "./views/DemoControlCenterView";
import { CustomerSimulatorView } from "./views/CustomerSimulatorView";

function AppContent() {
  const [routeWithQuery, setCurrentRoute] = useState<string>(() => {
    const hash = window.location.hash.replace("#", "");
    return hash || "/apresentacao";
  });

  const currentRoute = routeWithQuery.split("?")[0];
  const { storageError, resetDemo, currentUser } = useCrm();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Sync hash with route
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && hash !== routeWithQuery) {
        if (
          (window as any).__crmDirty &&
          !confirm("Há alterações não salvas. Deseja sair?")
        ) {
          history.replaceState(null, "", "#" + routeWithQuery);
          return;
        }
        (window as any).__crmDirty = false;
        setCurrentRoute(hash);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [routeWithQuery]);

  const navigateTo = (route: string) => {
    if (
      (window as any).__crmDirty &&
      !confirm("Há alterações não salvas. Deseja sair?")
    )
      return;
    (window as any).__crmDirty = false;
    setMenuOpen(false);
    window.location.hash = route;
    setCurrentRoute(route);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const previous = new WeakMap<Element, HTMLElement>();
    const selector =
      '[role="dialog"], .modal-backdrop > form, .fixed.inset-0.z-50 > div';
    const observer = new MutationObserver(() => {
      document.querySelectorAll(selector).forEach((dialog) => {
        if (!previous.has(dialog)) {
          previous.set(dialog, document.activeElement as HTMLElement);
          dialog.setAttribute("role", "dialog");
          dialog.setAttribute("aria-modal", "true");
          (
            dialog.querySelector("input,textarea,select,button") as HTMLElement
          )?.focus();
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const key = (e: KeyboardEvent) => {
      const dialog = Array.from(document.querySelectorAll(selector)).at(-1);
      if (!dialog) return;
      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]",
        ),
      ).filter((x) => x.getClientRects().length);
      if (e.key === "Tab" && items.length) {
        const first = items[0],
          last = items.at(-1)!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      if (e.key === "Escape") {
        const close = items.find((x) =>
          /cancelar|fechar|esc/i.test(x.textContent || ""),
        );
        close?.click();
        previous.get(dialog)?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", key);
    };
  }, []);
  // Global keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Router matching
  const renderCurrentView = () => {
    // T21: Customer simulator (isolated view)
    if (currentRoute.startsWith("/simulador/cliente/")) {
      const token = currentRoute.replace("/simulador/cliente/", "");
      return (
        <CustomerSimulatorView tokenOrNumber={token} navigateTo={navigateTo} />
      );
    }

    if (
      (currentRoute.startsWith("/configuracoes") ||
        ["/automacoes","/campanhas","/inteligencia"].includes(currentRoute)) &&
      !["manager", "admin"].includes(currentUser.role)
    )
      return (
        <div className="page">
          <h1>Acesso restrito</h1>
          <p>Esta área está disponível para gestão e administração.</p>
        </div>
      );
    if(currentRoute === "/campanhas") return <CampaignsView navigateTo={navigateTo}/>;
    if(currentRoute === "/inteligencia") return <MarketIntelligenceView navigateTo={navigateTo}/>;
    // T01: Dashboard
    if (currentRoute === "/visao-geral" || currentRoute === "/") {
      return <DashboardView navigateTo={navigateTo} />;
    }

    // T02: Inbox
    if (currentRoute === "/atendimento") {
      return <InboxView navigateTo={navigateTo} />;
    }

    // T04: New Lead
    if (currentRoute === "/leads/novo") {
      return <LeadsView initialMode="new" navigateTo={navigateTo} />;
    }

    // T03: Leads List
    if (currentRoute === "/leads") {
      return <LeadsView initialMode="list" navigateTo={navigateTo} />;
    }

    // T05: Pipeline Kanban
    if (currentRoute === "/funil") {
      return <PipelineView navigateTo={navigateTo} />;
    }

    // T06: Opportunity Detail
    if (currentRoute.startsWith("/oportunidades/")) {
      const oppId = currentRoute.replace("/oportunidades/", "");
      return (
        <OpportunityDetailView opportunityId={oppId} navigateTo={navigateTo} />
      );
    }

    // T08: Quote Editor
    if (
      currentRoute.startsWith("/cotacoes/") &&
      currentRoute.endsWith("/editar")
    ) {
      const quoteId = currentRoute
        .replace("/cotacoes/", "")
        .replace("/editar", "");
      return <QuoteEditorView quoteId={quoteId} navigateTo={navigateTo} />;
    }

    // T09: Quote Detail
    if (
      currentRoute.startsWith("/cotacoes/") &&
      !currentRoute.endsWith("/editar")
    ) {
      const quoteId = currentRoute.replace("/cotacoes/", "");
      return <QuoteDetailView quoteId={quoteId} navigateTo={navigateTo} />;
    }

    // T07: Quotes List
    if (currentRoute === "/cotacoes") {
      return <QuotesListView navigateTo={navigateTo} />;
    }

    // T10: Customers
    if (currentRoute.startsWith("/clientes/")) {
      const customerId = currentRoute.replace("/clientes/", "");
      return <CustomersView customerId={customerId} navigateTo={navigateTo} />;
    }
    if (currentRoute === "/clientes") {
      return <CustomersView navigateTo={navigateTo} />;
    }

    // T11: Catalog
    if (currentRoute.startsWith("/catalogo/")) {
      const prodId = currentRoute.replace("/catalogo/", "");
      return <CatalogView productId={prodId} navigateTo={navigateTo} />;
    }
    if (currentRoute === "/catalogo") {
      return <CatalogView navigateTo={navigateTo} />;
    }

    // T12: Tasks
    if (currentRoute === "/tarefas") {
      return <TasksView navigateTo={navigateTo} />;
    }

    // T13: Reports
    if (currentRoute === "/relatorios") {
      return <ReportsView navigateTo={navigateTo} />;
    }

    // T14: Automations
    if (currentRoute === "/automacoes") {
      return <AutomationsView navigateTo={navigateTo} />;
    }

    // T15: Knowledge
    if (currentRoute === "/conhecimento") {
      return <KnowledgeView navigateTo={navigateTo} />;
    }

    // T16 to T19: Settings
    if (currentRoute === "/configuracoes/equipe") {
      return <SettingsViews section="equipe" navigateTo={navigateTo} />;
    }
    if (currentRoute === "/configuracoes/integracoes") {
      return <SettingsViews section="integracoes" navigateTo={navigateTo} />;
    }
    if (currentRoute === "/configuracoes/importacao") {
      return <SettingsViews section="importacao" navigateTo={navigateTo} />;
    }
    if (currentRoute === "/configuracoes/auditoria") {
      return <SettingsViews section="auditoria" navigateTo={navigateTo} />;
    }

    // T20: Demo Control Center
    if (currentRoute === "/demonstracao") {
      return <DemoControlCenterView navigateTo={navigateTo} />;
    }

    // 404 Recovery View
    return (
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-[#223237]">
          Rota Não Encontrada
        </h2>
        <p className="text-xs text-[#53636A]">
          A página solicitada ({currentRoute}) não existe ou foi movida.
        </p>
        <button
          onClick={() => navigateTo("/visao-geral")}
          className="px-4 py-2 bg-[#223237] text-white rounded-lg text-xs font-semibold"
        >
          Voltar à visão geral
        </button>
      </div>
    );
  };

  // If on customer simulator (T21), don't show internal CRM sidebar/topbar
  const isCustomerSimulator = currentRoute.startsWith("/simulador/cliente/");

  if(currentRoute === "/apresentacao" || currentRoute === "/solicitar") return <ExperienceView key={currentRoute} request={currentRoute === "/solicitar"}/>;
  if (isCustomerSimulator) {
    return (
      <div className="min-h-screen bg-[#F5F6F0]">{renderCurrentView()}</div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F5F6F0] overflow-hidden">
      {/* SideBar */}
      <div className={`sidebar-shell ${menuOpen ? "is-open" : ""}`}>
        <button className="mobile-menu" onClick={() => setMenuOpen(false)}>
          Fechar menu
        </button>
        <SideBar currentRoute={currentRoute} navigateTo={navigateTo} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <button className="mobile-menu" onClick={() => setMenuOpen(true)}>
          Abrir menu
        </button>
        <TopBar
          onOpenSearch={() => setSearchModalOpen(true)}
          onOpenNewLead={() => navigateTo("/leads/novo")}
          onOpenDemoCenter={() => navigateTo("/demonstracao")}
          currentRoute={currentRoute}
          navigateTo={navigateTo}
        />

        <main className="flex-1 overflow-y-auto min-w-0">
          {storageError && (
            <div className="storage-error" role="alert">
              {storageError}
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Restaurar a demonstração e remover alterações locais?",
                    )
                  )
                    resetDemo();
                }}
              >
                Restaurar demonstração
              </button>
            </div>
          )}
          <React.Fragment key={currentRoute + currentUser.id}>
            {renderCurrentView()}
          </React.Fragment>
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        navigateTo={navigateTo}
      />
    </div>
  );
}

export default function App() {
  return (
    <CrmProvider>
      <AppContent />
    </CrmProvider>
  );
}
