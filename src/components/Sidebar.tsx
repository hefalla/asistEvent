import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  QrCode, 
  UserCheck, 
  Users,
  Shield, 
  Sun,
  Moon,
  MonitorSmartphone,
  CheckCircle2,
  X,
  LogOut
} from 'lucide-react';
import { StaffUser } from '../types';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  activePath: string;
  onNavigate: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onToggleKiosk: () => void;
  currentUser: StaffUser;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePath,
  onNavigate,
  isOpen,
  onClose,
  onToggleKiosk,
  currentUser,
  onLogout
}) => {
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'dashboard', label: 'Panel General', icon: LayoutDashboard },
    { id: 'eventos-institucionales', label: 'Eventos Institucionales', icon: CalendarDays },
    { id: 'control-de-acceso', label: 'Control de Acceso', icon: QrCode },
    { id: 'lista-de-asistentes', label: 'Lista de Asistentes', icon: UserCheck },
    { id: 'equipo-bienestar', label: 'Equipo de Bienestar', icon: Users },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed left-0 top-0 h-full w-72 bg-white dark:bg-[#0a110d] border-r border-[#e2efe6] dark:border-[#182720] flex flex-col justify-between py-5 px-4 transition-all duration-300 ease-in-out lg:translate-x-0 lg:z-30 overflow-y-auto ${
          isOpen ? 'translate-x-0 shadow-2xl z-50' : '-translate-x-full z-30'
        }`}
      >
        <div className="flex flex-col gap-5">
          {/* Top Logo & Close Button on Mobile */}
          <div className="flex items-center justify-between px-2">
            <div 
              onClick={() => { onNavigate('dashboard'); onClose(); }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 dark:shadow-emerald-900/40">
                <CheckCircle2 className="w-5 h-5 text-emerald-100" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-emerald-900 dark:text-emerald-200 tracking-tight leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                  AsistEvent
                </span>
                <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/60 font-medium">
                  Bienestar Institucional
                </span>
              </div>
            </div>

            <button 
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-emerald-700 dark:text-emerald-400/70 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-900 dark:hover:text-emerald-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Institutional Status Line */}
          <div className="px-2">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#f0f7f2] dark:bg-[#101b15] rounded-xl border border-[#d6eade] dark:border-[#1a2e22]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
                  Red Campus Activa
                </span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-mono">
                EN LÍNEA
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex flex-col gap-1 px-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                      : 'text-emerald-800/80 dark:text-emerald-300/70 hover:bg-[#f0f7f2] dark:hover:bg-[#121e17] hover:text-emerald-950 dark:hover:text-emerald-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-600 dark:text-emerald-400/80'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: User Session, Kiosk Toggle & OS Info */}
        <div className="flex flex-col gap-3 px-1 pt-4 border-t border-[#e2efe6] dark:border-[#182720]">
          {/* Quick Actions (Kiosk Mode & Theme) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onToggleKiosk}
              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-[#f0f7f2] dark:bg-[#111c16] hover:bg-emerald-100/60 dark:hover:bg-[#182b20] border border-[#d6eade] dark:border-[#1c3024] text-xs font-medium text-emerald-900 dark:text-emerald-200 transition-colors"
              title="Abrir modo kiosco de autoservicio"
            >
              <MonitorSmartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Modo Kiosco</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-[#f0f7f2] dark:bg-[#111c16] hover:bg-emerald-100/60 dark:hover:bg-[#182b20] border border-[#d6eade] dark:border-[#1c3024] text-xs font-medium text-emerald-900 dark:text-emerald-200 transition-colors"
              title="Alternar modo claro / oscuro"
            >
              {theme === 'dark' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Oscuro</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Claro</span>
                </>
              )}
            </button>
          </div>

          {/* Active Logged-in User Card */}
          <div className="p-3 bg-[#f0f7f2] dark:bg-[#111c16] rounded-2xl border border-[#d6eade] dark:border-[#1c3024] flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <img 
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-emerald-500/40 shrink-0"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100 truncate">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium truncate">
                  {currentUser.role_display.split('—')[0].trim()}
                </span>
                <span className="text-[9px] font-medium text-emerald-600/80 dark:text-emerald-400/70">
                  {currentUser.role === 'lider_bienestar' || currentUser.role === 'apoyo_administrativo'
                    ? 'Acceso Institucional Total'
                    : 'Gestor de Eventos Propios'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-white dark:bg-[#16251d] hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/80 dark:border-red-900/40 text-xs font-medium transition-colors cursor-pointer group"
            >
              <LogOut className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>

          {/* Institutional Signature */}
          <div className="flex items-center justify-between px-1 text-emerald-700/70 dark:text-emerald-400/50 text-[11px]">
            <span className="font-mono">Bienestar OS</span>
            <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <Shield className="w-3 h-3" />
              <span className="font-semibold text-[10px]">SENA • 2026</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
