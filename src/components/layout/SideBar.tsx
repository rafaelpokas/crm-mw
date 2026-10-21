import React, { useState } from "react";
import { useCrm } from "../../context/CrmContext";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Kanban,
  FileSpreadsheet,
  Building2,
  Package,
  CalendarCheck,
  BarChart3,
  Cpu,
  BookOpen,
  Settings,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  FolderSync,
  History,
  UserCheck,
} from "lucide-react";

interface SideBarProps {
  currentRoute: string;
  navigateTo: (route: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const SideBar: React.FC<SideBarProps> = ({
  currentRoute,
  navigateTo,
}) => {
  const { db, metrics, currentUser } = useCrm();
  const [settingsOpen, setSettingsOpen] = useState(
    currentRoute.startsWith("/configuracoes"),
  );

  const pendingApprovalsCount = db.approvals.filter(
    (a) => a.status === "pending",
  ).length;
  const unreadMessagesCount = db.conversations.reduce(
    (acc, c) => acc + (c.unreadCount || 0),
    0,
  );

  const navItems = [
 {id:"experience",label:"Voltar ao início",route:"/apresentacao",icon:ExternalLink,badge:null},
 ...(["manager","admin"].includes(currentUser.role)?[{id:"campaigns",label:"Campanhas",route:"/campanhas",icon:Sparkles,badge:null},{id:"market",label:"Inteligência de mercado",route:"/inteligencia",icon:BarChart3,badge:null}]:[]),
    {
      id: "t01",
      label: "Visão Geral",
      route: "/visao-geral",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "t02",
      label: "Atendimento",
      route: "/atendimento",
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
      badgeColor: "bg-emerald-500",
    },
    {
      id: "t03",
      label: "Leads",
      route: "/leads",
      icon: Users,
      badge:
        metrics.unassignedLeads > 0 ? `${metrics.unassignedLeads} novos` : null,
      badgeColor: "bg-amber-500",
    },
    {
      id: "t05",
      label: "Funil de Vendas",
      route: "/funil",
      icon: Kanban,
      badge: metrics.openOpportunities > 0 ? metrics.openOpportunities : null,
      badgeColor: "bg-[#2d3f45]",
    },
    {
      id: "t07",
      label: "Cotações",
      route: "/cotacoes",
      icon: FileSpreadsheet,
      badge:
        pendingApprovalsCount > 0 ? `${pendingApprovalsCount} aprovação` : null,
      badgeColor: "bg-amber-500",
    },
    {
      id: "t10",
      label: "Clientes",
      route: "/clientes",
      icon: Building2,
      badge: null,
    },
    {
      id: "t11",
      label: "Produtos e aplicações",
      route: "/catalogo",
      icon: Package,
      badge: null,
    },
    {
      id: "t12",
      label: "Tarefas",
      route: "/tarefas",
      icon: CalendarCheck,
      badge: metrics.overdueTasks > 0 ? `${metrics.overdueTasks} atraso` : null,
      badgeColor: "bg-red-500",
    },
    {
      id: "t13",
      label: "Relatórios",
      route: "/relatorios",
      icon: BarChart3,
      badge: null,
    },
    {
      id: "t14",
      label: "Automações",
      route: "/automacoes",
      icon: Cpu,
      badge: null,
    },
    {
      id: "t15",
      label: "Base de Conhecimento",
      route: "/conhecimento",
      icon: BookOpen,
      badge: null,
    },
  ];

  const settingsSubItems = [
    {
      label: "Equipe & Alçadas",
      route: "/configuracoes/equipe",
      icon: UserCheck,
    },
    {
      label: "Canais & Integrações",
      route: "/configuracoes/integracoes",
      icon: FolderSync,
    },
    {
      label: "Importação CSV",
      route: "/configuracoes/importacao",
      icon: RefreshCw,
    },
    {
      label: "Trilha de Auditoria",
      route: "/configuracoes/auditoria",
      icon: History,
    },
  ];

  return (
    <aside className="w-64 bg-[#223237] text-gray-300 flex flex-col h-screen shrink-0 border-r border-[#2d3f45] select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-[#2d3f45] bg-[#1d2b2f]">
        <div
          className="flex items-center space-x-2.5 cursor-pointer"
          onClick={() => navigateTo("/visao-geral")}
        >
          {/* Logo mark */}
          <img
            src="/logo-megawhip.png"
            alt="MegaWhip"
            className="w-20 bg-white rounded p-1"
          />
          <div>
            <div className="font-extrabold text-base tracking-wider text-white leading-none">
              MEGAWHIP
            </div>
            <div className="text-[10px] text-[#B1D448] font-medium tracking-tight">
              CRM COMERCIAL B2B
            </div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 text-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentRoute === item.route ||
            currentRoute.startsWith(item.route + "/");
          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item.route)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition group ${
                isActive
                  ? "bg-[#B1D448] text-[#223237] font-semibold shadow-xs"
                  : "hover:bg-[#2d3f45] text-gray-300 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <Icon
                  size={16}
                  className={
                    isActive
                      ? "text-[#223237]"
                      : "text-gray-400 group-hover:text-[#B1D448]"
                  }
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-[#223237] text-white"
                      : `${item.badgeColor || "bg-gray-700"} text-white`
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Configurations Expandable */}
        <div className="pt-2">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition ${
              currentRoute.startsWith("/configuracoes")
                ? "text-[#B1D448] bg-[#2d3f45]"
                : "hover:bg-[#2d3f45] text-gray-300"
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Settings size={16} className="text-gray-400" />
              <span>Configurações</span>
            </div>
            {settingsOpen ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>

          {settingsOpen && (
            <div className="pl-6 pr-1 pt-1 space-y-0.5">
              {settingsSubItems.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = currentRoute === sub.route;
                return (
                  <button
                    key={sub.route}
                    onClick={() => navigateTo(sub.route)}
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded text-[11px] font-medium transition ${
                      isSubActive
                        ? "bg-[#B1D448] text-[#223237] font-semibold"
                        : "text-gray-400 hover:text-white hover:bg-[#2d3f45]/70"
                    }`}
                  >
                    <SubIcon size={13} />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Shortcuts: Demo Center & Customer Simulator */}
      <div className="p-3 border-t border-[#2d3f45] space-y-2 bg-[#1d2b2f]">
        <button
          onClick={() => navigateTo("/demonstracao")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition ${
            currentRoute === "/demonstracao"
              ? "bg-[#B1D448] text-[#223237]"
              : "bg-[#27383e] hover:bg-[#32464e] text-[#B1D448]"
          }`}
        >
          <div className="flex items-center space-x-2">
            <Sparkles size={14} />
            <span>Testar jornadas</span>
          </div>
          <span className="text-[10px] bg-[#1a2529] px-1.5 py-0.5 rounded text-gray-300">
            Demo
          </span>
        </button>

        <button
          onClick={() => navigateTo("/simulador/cliente/Q001-V1")}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[11px] font-medium transition ${
            currentRoute.startsWith("/simulador/cliente")
              ? "bg-[#B1D448] text-[#223237]"
              : "hover:bg-[#27383e] text-gray-300"
          }`}
          title="Ver página que o comprador recebe ao abrir a cotação"
        >
          <div className="flex items-center space-x-2">
            <ExternalLink size={13} className="text-gray-400" />
            <span>Simulador Comprador</span>
          </div>
          <span className="text-[10px] text-gray-400">Demo</span>
        </button>

        <div className="text-[10px] text-gray-500 text-center pt-1">
          MegaWhip CRM Demo v1.0 • Commet
        </div>
      </div>
    </aside>
  );
};
