import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Bell, 
  Menu, 
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  User,
  UserCog,
  Shield,
  ExternalLink,
  KeyRound,
  Camera
} from 'lucide-react';
import { StaffUser } from '../types';
import { isSupabaseConnected } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  currentUser: StaffUser;
  onOpenStaffModal?: () => void;
  onOpenSupabaseModal?: () => void;
  onOpenEditProfile?: (tab?: 'profile' | 'password') => void;
  onToggleSidebar: () => void;
  onNavigate: (path: string) => void;
  activePath: string;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenStaffModal,
  onOpenSupabaseModal,
  onOpenEditProfile,
  onToggleSidebar,
  onNavigate,
  activePath,
  onLogout
}) => {
  const isConnected = isSupabaseConnected();
  const { theme, toggleTheme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getSectionTitle = (path: string) => {
    switch (path) {
      case 'dashboard': return 'Panel General';
      case 'eventos-institucionales': return 'Eventos Institucionales';
      case 'control-de-acceso': return 'Control de Acceso';
      case 'lista-de-asistentes': return 'Lista de Asistentes';
      case 'equipo-bienestar': return 'Equipo de Bienestar';
      default: return 'Panel General';
    }
  };

  const isFullAccess = currentUser.role === 'lider_bienestar' || currentUser.role === 'apoyo_administrativo';

  return (
    <header className="sticky top-0 z-20 h-16 w-full bg-white/90 dark:bg-[#0a110d]/90 backdrop-blur-md border-b border-[#e2efe6] dark:border-[#182720] px-4 lg:px-8 transition-colors duration-200">
      <div className="h-full w-full flex items-center justify-between gap-4">
        {/* Left: Mobile Menu + Mobile Logo OR Desktop Breadcrumb */}
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
            title="Abrir menú"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* On mobile (<lg): Display AsistEvent brand */}
          <div 
            onClick={() => onNavigate('dashboard')}
            className="flex lg:hidden items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-100" />
            </div>
            <span className="font-bold text-base text-emerald-900 dark:text-emerald-200 tracking-tight leading-none">
              AsistEvent
            </span>
          </div>

          {/* On desktop (>=lg): Clean Typographic Breadcrumb */}
          <div className="hidden lg:flex items-center gap-2.5 text-sm">
            <span className="font-semibold text-emerald-900 dark:text-emerald-300 tracking-tight">
              AsistEvent
            </span>
            <span className="text-emerald-300 dark:text-emerald-800 font-light select-none">/</span>
            <span className="text-emerald-800 dark:text-emerald-100 font-medium">
              {getSectionTitle(activePath)}
            </span>
            <span className="text-emerald-300 dark:text-emerald-800 font-light select-none">·</span>
            <span className="text-xs text-emerald-700/70 dark:text-emerald-400/60 flex items-center gap-1 font-normal">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              Campus Central • Sede Salud y Deportes
            </span>
          </div>
        </div>

        {/* Right: Controls & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Connection Status Badge */}
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-800 dark:text-emerald-300"
            title={isConnected ? 'Sistema en línea y sincronizado' : 'Modo local sin conexión'}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}></span>
            </span>
            <span className="hidden md:inline text-xs text-emerald-900 dark:text-emerald-200">
              {isConnected ? 'En línea' : 'Modo Local'}
            </span>
          </div>

          {/* Theme Toggle (Sun/Moon icon button) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Modo Oscuro activo (Clic para Modo Claro)' : 'Modo Claro activo (Clic para Modo Oscuro)'}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-emerald-800/80 dark:text-emerald-300/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-950 dark:hover:text-emerald-100 transition-colors"
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-emerald-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>

          {/* Quick Notification Bell */}
          <button
            type="button"
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-emerald-800/80 dark:text-emerald-300/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-950 dark:hover:text-emerald-100 transition-colors"
            title="Notificaciones del sistema"
            aria-label="Notificaciones"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </button>

          <div className="h-5 w-px bg-emerald-200/60 dark:bg-emerald-900/40 mx-1"></div>

          {/* User Profile Dropdown Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-transparent hover:border-emerald-200/80 dark:hover:border-emerald-800/40 transition-colors cursor-pointer group"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
            >
              <img 
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-emerald-500/40"
              />
              <div className="flex flex-col items-start text-left hidden sm:flex">
                <span className="text-xs font-semibold text-emerald-950 dark:text-emerald-100 leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium leading-tight">
                  {currentUser.role_display.split('—')[0].trim()}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-emerald-700/60 dark:text-emerald-400/60 transition-transform duration-200 ${
                isUserMenuOpen ? 'rotate-180' : ''
              }`} />
            </button>

            {/* Dropdown Panel */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#0f1914] rounded-2xl border border-[#d6eade] dark:border-[#1e3427] shadow-xl shadow-black/10 dark:shadow-black/60 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Info Header */}
                <div className="flex items-center gap-3 p-2.5 bg-[#f0f7f2] dark:bg-[#13221a] rounded-xl border border-[#d6eade] dark:border-[#1e3427]">
                  <img 
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-xl object-cover ring-1 ring-emerald-500/40"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-emerald-950 dark:text-white truncate">
                      {currentUser.name}
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium truncate">
                      {currentUser.role_display.split('—')[0].trim()}
                    </span>
                    <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60 truncate">
                      {currentUser.email}
                    </span>
                  </div>
                </div>

                {/* Scope & Permissions info */}
                <div className="py-2.5 px-2 text-[11px] text-emerald-800/80 dark:text-emerald-300/80 flex items-center justify-between border-b border-[#e2efe6] dark:border-[#182720]">
                  <span className="text-emerald-700/70 dark:text-emerald-400/60">Permisos:</span>
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                    {isFullAccess ? 'Acceso Total Institucional' : 'Gestor de Eventos Propios'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 pt-2">
                  {onOpenEditProfile && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenEditProfile('profile');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-900 dark:text-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <UserCog className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Mi Perfil & Fotografía</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenEditProfile('password');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-900 dark:text-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Cambiar Contraseña</span>
                      </button>
                    </>
                  )}

                  {onOpenStaffModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenStaffModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Iniciar Sesión / Cambiar Usuario</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-[#e2efe6] dark:border-[#182720]"></div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Exit Icon Button */}
          <button
            type="button"
            onClick={onLogout}
            title="Cerrar sesión institucional"
            aria-label="Cerrar sesión"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-red-600/80 dark:text-red-400/80 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
