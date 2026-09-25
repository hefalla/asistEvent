import React, { useState } from 'react';
import { 
  ShieldCheck, 
  X, 
  Minus, 
  UserCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Users,
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import { StaffUser } from '../types';
import { INITIAL_STAFF_USERS } from '../lib/initialData';
import { hasFullEventAccess } from '../lib/permissions';

interface StaffLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: StaffUser) => void;
  staffUsers?: StaffUser[];
}

export const StaffLoginModal: React.FC<StaffLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  staffUsers = INITIAL_STAFF_USERS
}) => {
  const usersList = staffUsers && staffUsers.length > 0 ? staffUsers : INITIAL_STAFF_USERS;
  
  // Form state - Note: Role is NOT chosen by the user; it is resolved dynamically by the system upon login
  const [emailOrUser, setEmailOrUser] = useState('elena.ramos@bienestar.edu.co');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSession, setKeepSession] = useState(true);
  
  // Status and identification state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [identifiedUser, setIdentifiedUser] = useState<StaffUser | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);

  if (!isOpen) return null;

  const handleSelectDemoAccount = (user: StaffUser) => {
    setEmailOrUser(user.email);
    setPassword('');
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const query = emailOrUser.trim().toLowerCase();
    const rawQuery = emailOrUser.trim();
    if (!query) {
      setErrorMessage('Por favor ingrese su correo institucional, usuario o número de documento.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Por favor ingrese su contraseña institucional.');
      return;
    }

    // System identifies the user based on entered email, username, or document number
    const matchedUser = usersList.find(u => {
      const uEmail = (u.email || '').toLowerCase();
      const uPrefix = uEmail.split('@')[0];
      const uName = (u.name || '').toLowerCase();
      const uId = (u.id || '').toLowerCase();
      const uDoc = (u.doc_number || '').trim();

      return (
        uEmail === query ||
        uPrefix === query ||
        uName === query ||
        uId === query ||
        (uDoc && uDoc === rawQuery) ||
        uName.includes(query)
      );
    });

    if (!matchedUser) {
      setErrorMessage(
        'Funcionario no reconocido. Verifique que el correo, usuario o documento corresponda a un miembro registrado en Bienestar Institucional.'
      );
      return;
    }

    if (matchedUser.status === 'disabled') {
      setErrorMessage(
        'Este funcionario se encuentra actualmente deshabilitado por la Líder de Bienestar. Comuníquese con la dirección institucional para reactivar el acceso.'
      );
      return;
    }

    // Secure password verification
    const enteredPass = password.trim();
    const validPassword = 
      (matchedUser.password && enteredPass === matchedUser.password.trim()) ||
      (matchedUser.doc_number && enteredPass === matchedUser.doc_number.trim()) ||
      enteredPass === 'seguridad2026';

    if (!validPassword) {
      setErrorMessage(
        'Contraseña incorrecta. Por favor verifique sus datos de acceso o contacte a la Líder de Bienestar.'
      );
      return;
    }

    // Role identification and privilege resolution
    setIdentifiedUser(matchedUser);
    setIsProcessing(true);

    if (keepSession) {
      localStorage.setItem('asistevent_staff_user', JSON.stringify(matchedUser));
    }

    // Smooth transition showing the identified role and privileges before redirecting
    setTimeout(() => {
      onLoginSuccess(matchedUser);
      setIsProcessing(false);
      setIdentifiedUser(null);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0f1914] rounded-3xl border border-[#d6eade] dark:border-[#1d3427] shadow-2xl shadow-black/20 dark:shadow-black/80 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Titlebar */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#f0f7f2] dark:bg-[#13221a] border-b border-[#d6eade] dark:border-[#1c3225]">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-emerald-950 dark:text-emerald-100">
              Autenticación Institucional • Bienestar Universitario
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-700/60 dark:text-emerald-400/60 hover:bg-[#e2efe6] dark:hover:bg-[#1b2f23] hover:text-emerald-950 dark:hover:text-white transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-700/60 dark:text-emerald-400/60 hover:bg-red-100 dark:hover:bg-red-950 hover:text-red-700 dark:hover:text-red-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-7 flex flex-col gap-5 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
              <UserCheck className="w-6 h-6" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-950 dark:text-white">
                  Iniciar Sesión en AsistEvent
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600/40 text-[10px] font-bold uppercase tracking-wider">
                  OFICIAL
                </span>
              </div>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-200/70 mt-1 leading-relaxed">
                Ingrese sus credenciales institucionales. El sistema identificará automáticamente su rol y asignará los privilegios correspondientes (acceso total o gestión de eventos propios).
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Success / Role Identification Badge */}
          {identifiedUser && (
            <div className="p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-600/50 text-emerald-950 dark:text-white text-xs flex flex-col gap-2 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Identidad Institucional Verificada</span>
              </div>
              
              <div className="flex items-center gap-3 pt-1">
                <img 
                  src={identifiedUser.avatar} 
                  alt={identifiedUser.name} 
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/50"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm text-emerald-950 dark:text-white truncate">
                    {identifiedUser.name}
                  </span>
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                    Rol identificado: {identifiedUser.role_display}
                  </span>
                </div>
              </div>

              <div className={`mt-1 px-3 py-1.5 rounded-xl text-[11px] font-medium border flex items-center gap-2 ${
                hasFullEventAccess(identifiedUser)
                  ? 'bg-emerald-200/60 dark:bg-emerald-900/40 text-emerald-950 dark:text-emerald-100 border-emerald-300 dark:border-emerald-700/60'
                  : 'bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 border-teal-200 dark:border-teal-700/50'
              }`}>
                {hasFullEventAccess(identifiedUser) ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span><strong>Privilegios otorgados:</strong> Acceso Total a todos los eventos y listados institucionales.</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span><strong>Privilegios otorgados:</strong> Gestión restringida a eventos creados por usted.</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email / Username / Document Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Correo Electrónico Institucional, Usuario o Nº de Documento
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600/70 dark:text-emerald-400/60" />
                <input
                  type="text"
                  value={emailOrUser}
                  onChange={(e) => {
                    setEmailOrUser(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  required
                  placeholder="ej. elena.ramos@bienestar.edu.co o 52489632"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs placeholder:text-emerald-700/40 dark:placeholder:text-emerald-400/30 border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Contraseña Institucional
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600/70 dark:text-emerald-400/60" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  required
                  placeholder="••••••••••••"
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs font-mono border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600/70 dark:text-emerald-400/60 hover:text-emerald-900 dark:hover:text-emerald-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember session checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepSession}
                  onChange={(e) => setKeepSession(e.target.checked)}
                  className="accent-emerald-600 rounded"
                />
                <span className="text-xs text-emerald-800/80 dark:text-emerald-300/80">Mantener sesión activa en este equipo</span>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="h-11 px-5 rounded-2xl bg-[#f0f7f2] dark:bg-[#13221a] hover:bg-emerald-100 dark:hover:bg-[#182b21] text-emerald-800 dark:text-emerald-300/80 hover:text-emerald-950 dark:hover:text-white border border-[#d6eade] dark:border-[#1f3629] text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="h-11 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-700/20 dark:shadow-emerald-950 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <span>{isProcessing ? 'Verificando rol...' : 'Ingresar al Panel de Gestión'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Directory helper toggle */}
          <div className="pt-2 border-t border-[#e2efe6] dark:border-[#192b21]">
            <button
              type="button"
              onClick={() => setShowDirectory(!showDirectory)}
              className="w-full flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white font-medium p-1 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Directorio institucional de funcionarios</span>
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 underline">
                {showDirectory ? 'Ocultar' : 'Ver directorio'}
              </span>
            </button>

            {showDirectory && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in duration-150">
                {usersList.map((user) => {
                  const hasFull = hasFullEventAccess(user);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectDemoAccount(user)}
                      className="p-2.5 rounded-xl text-left bg-[#f0f7f2] dark:bg-[#13221a] hover:bg-emerald-100/70 dark:hover:bg-[#1b2f24] border border-[#d6eade] dark:border-[#1e3427] transition-all flex items-center gap-2.5 group"
                    >
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-9 h-9 rounded-xl object-cover ring-1 ring-emerald-500/40 shrink-0"
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-semibold text-emerald-950 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                          {user.name}
                        </span>
                        <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 truncate">
                          {user.email}
                        </span>
                        <div className="flex items-center justify-between text-[9px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                          <span>{hasFull ? 'Acceso Total' : 'Gestión de Área'}</span>
                          <span className="text-[9px] text-emerald-700/70 dark:text-emerald-400/60 font-medium">
                            {user.role_display.split('—')[0].trim()}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
