import React, { useState } from 'react';
import { useCrm } from '../../context/CrmContext';
import {
  Bell,
  Search,
  Plus,
  Clock,
  Sparkles,
  ChevronDown,
  UserCheck,
  CheckCircle,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

interface TopBarProps {
  onOpenSearch: () => void;
  onOpenNewLead: () => void;
  onOpenDemoCenter: () => void;
  currentRoute: string;
  navigateTo: (route: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenSearch,
  onOpenNewLead,
  onOpenDemoCenter,
  currentRoute,
  navigateTo
}) => {
  const {
    db,
    currentUser,
    setCurrentUserId,
    markNotificationRead,
    markAllNotificationsRead,
    advanceClock
  } = useCrm();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [clockAdvancing, setClockAdvancing] = useState(false);

  const unreadNotifs = db.notifications.filter(n => !n.read && (n.recipientId === currentUser.id || currentUser.role === 'admin' || currentUser.role === 'manager'));

  const handleAdvanceOneDay = async () => {
    setClockAdvancing(true);
    await advanceClock(1);
    setClockAdvancing(false);
  };

  return (
    <header className="h-16 bg-[#223237] text-white border-b border-[#2d3f45] px-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Search & Demo Badge */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenSearch}
          className="flex items-center space-x-2 bg-[#2d3f45] hover:bg-[#384c54] text-gray-300 hover:text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-[#3b4f57]"
          title="Buscar por contato, empresa, cotação, oportunidade ou SKU"
        >
          <Search size={14} className="text-[#B1D448]" />
          <span>Buscar geral...</span>
          <kbd className="bg-[#1b282c] px-1.5 py-0.5 rounded text-[10px] text-gray-400 font-mono">⌘K</kbd>
        </button>

        {/* Discreet Demo Banner */}
        <div className="hidden md:flex items-center space-x-1.5 bg-[#1b282c] border border-[#2d3f45] px-2.5 py-1 rounded text-[11px] text-[#B1D448]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B1D448] animate-pulse"></span>
          <span className="font-medium">Demonstração</span>
          <span className="text-gray-400">• dados fictícios • envios simulados</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Simulated Clock Widget */}
        <div className="hidden lg:flex items-center bg-[#1b282c] border border-[#2d3f45] rounded-md px-2.5 py-1 text-xs text-gray-300">
          <Clock size={13} className="text-[#B1D448] mr-1.5" />
          <span className="font-mono text-[11px]">
            {formatDate(db.meta.clock, true)}
          </span>
          <button
            onClick={handleAdvanceOneDay}
            disabled={clockAdvancing}
            className="ml-2 bg-[#2d3f45] hover:bg-[#384c54] text-[#B1D448] hover:text-white px-1.5 py-0.5 rounded text-[10px] font-semibold transition"
            title="Avançar relógio em 1 dia (testa vencimentos A04)"
          >
            {clockAdvancing ? '...' : '+1 dia'}
          </button>
        </div>

        {/* Quick Demo Scenarios Button */}
        <button
          onClick={onOpenDemoCenter}
          className="flex items-center space-x-1.5 bg-[#B1D448] hover:bg-[#c3e655] text-[#223237] px-2.5 py-1.5 rounded-md text-xs font-semibold shadow-xs transition"
          title="Abrir Central de Demonstração e Cenários C01 a C16"
        >
          <Sparkles size={14} />
          <span className="hidden sm:inline">Cenários Demo</span>
        </button>

        {/* Quick New Lead Button */}
        <button
          onClick={onOpenNewLead}
          className="flex items-center space-x-1 bg-[#2d3f45] hover:bg-[#384c54] text-white px-2.5 py-1.5 rounded-md text-xs font-medium border border-[#3b4f57] transition"
        >
          <Plus size={14} className="text-[#B1D448]" />
          <span className="hidden sm:inline">Novo Lead</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowUserMenu(false);
            }}
            className="relative p-1.5 text-gray-300 hover:text-white rounded-md hover:bg-[#2d3f45] transition"
            title="Notificações locais"
          >
            <Bell size={18} />
            {unreadNotifs.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadNotifs.length}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-[#1e2c31] border border-[#2d3f45] rounded-lg shadow-xl py-2 z-50 text-xs">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2d3f45]">
                <span className="font-semibold text-gray-200">Notificações</span>
                {unreadNotifs.length > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[11px] text-[#B1D448] hover:underline"
                  >
                    Marcar todas lidas
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-[#2d3f45]/50">
                {db.notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">Nenhuma notificação recente.</div>
                ) : (
                  db.notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationRead(n.id);
                        if (n.linkRoute) {
                          navigateTo(n.linkRoute);
                          setShowNotifMenu(false);
                        }
                      }}
                      className={`p-3 cursor-pointer hover:bg-[#25363c] transition ${!n.read ? 'bg-[#25363c]/50' : 'opacity-70'}`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-semibold text-gray-200">{n.title}</span>
                        <span className="text-[10px] text-gray-400">{formatDate(n.createdAt, false)}</span>
                      </div>
                      <p className="text-gray-300 mt-1 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Impersonator Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifMenu(false);
            }}
            className="flex items-center space-x-2 bg-[#1b282c] hover:bg-[#25363c] border border-[#2d3f45] rounded-md px-2 py-1 text-xs transition"
          >
            <div className="w-5 h-5 rounded-full bg-[#B1D448] text-[#223237] font-bold flex items-center justify-center text-[10px]">
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-gray-200 font-medium leading-none text-[11px]">{currentUser.name}</div>
              <div className="text-[10px] text-gray-400 capitalize">{currentUser.role === 'seller' ? 'Vendedor' : currentUser.role === 'manager' ? 'Gestor' : currentUser.role === 'technical' ? 'Técnico' : 'Admin'}</div>
            </div>
            <ChevronDown size={12} className="text-gray-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-[#1e2c31] border border-[#2d3f45] rounded-lg shadow-xl py-2 z-50 text-xs">
              <div className="px-3 py-1.5 border-b border-[#2d3f45] text-gray-400 text-[11px]">
                Alternar Perfil para Teste de Permissões:
              </div>
              <div className="divide-y divide-[#2d3f45]/50">
                {db.users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setCurrentUserId(u.id);
                      setShowUserMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#25363c] transition ${u.id === currentUser.id ? 'bg-[#25363c] text-[#B1D448]' : 'text-gray-200'}`}
                  >
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-[10px] text-gray-400 capitalize">
                        {u.role === 'seller' ? 'Vendedor (alçada 5%)' : u.role === 'manager' ? 'Gestor (aprovação)' : u.role === 'technical' ? 'Apoio Técnico' : 'Administrador'}
                      </div>
                    </div>
                    {u.id === currentUser.id && <CheckCircle size={14} className="text-[#B1D448]" />}
                  </button>
                ))}
              </div>
              <div className="px-3 pt-2 mt-1 border-t border-[#2d3f45] text-[10px] text-gray-400">
                Perfis simulam regras de alçada e visualização sem login real.
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
