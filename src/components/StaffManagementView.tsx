import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Mail, 
  Search, 
  Filter, 
  CheckCircle2, 
  Lock, 
  Sparkles, 
  Database, 
  X, 
  ArrowRight, 
  Eye, 
  Check, 
  User, 
  HeartHandshake, 
  Activity, 
  Music, 
  HeartPulse, 
  Layers,
  CreditCard,
  Edit3,
  UserCog,
  UserCheck,
  UserX,
  KeyRound,
  Camera
} from 'lucide-react';
import { StaffUser, StaffRole, EventCategory, DocumentType } from '../types';
import { hasFullEventAccess, isLiderBienestar } from '../lib/permissions';
import { createStaffUser } from '../lib/supabase';

interface StaffManagementViewProps {
  currentUser: StaffUser;
  staffUsers: StaffUser[];
  onRefreshData: () => Promise<void>;
  onOpenLoginModal: () => void;
  onEditStaffUser: (user: StaffUser, tab?: 'profile' | 'password') => void;
  onToggleStaffStatus: (staffId: string, newStatus: 'active' | 'disabled') => Promise<{ success: boolean; data?: StaffUser; error?: string }>;
}

// Institutional generic profile images for female and male
export const GENERIC_AVATAR_FEMALE = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250';
export const GENERIC_AVATAR_MALE = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250';

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  currentUser,
  staffUsers,
  onRefreshData,
  onOpenLoginModal,
  onEditStaffUser,
  onToggleStaffStatus
}) => {
  const isLeader = isLiderBienestar(currentUser);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'full_access' | 'area_specialist'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');

  // Modal State for New Staff Member
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [docType, setDocType] = useState<DocumentType>('CC');
  const [docNumber, setDocNumber] = useState('');
  const [role, setRole] = useState<StaffRole>('apoyo_administrativo');
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [categoryScope, setCategoryScope] = useState<EventCategory | 'all'>('all');

  // Filtered staff list
  const filteredUsers = staffUsers.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.doc_number && user.doc_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      user.role_display.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (roleFilter === 'full_access' && !hasFullEventAccess(user)) return false;
    if (roleFilter === 'area_specialist' && hasFullEventAccess(user)) return false;

    if (statusFilter === 'active' && user.status === 'disabled') return false;
    if (statusFilter === 'disabled' && user.status !== 'disabled') return false;

    return true;
  });

  const getRoleDisplayName = (r: StaffRole): string => {
    switch (r) {
      case 'lider_bienestar': return 'Líder de Bienestar — Administrador General';
      case 'apoyo_administrativo': return 'Apoyo Administrativo — Mesa Institucional';
      case 'gestor_deportivo': return 'Coordinador de Deportes y Recreación';
      case 'gestor_cultural_musica': return 'Gestor Cultural — Música y Ensambles';
      case 'gestor_cultural_danzas': return 'Gestor Cultural — Danzas y Folclor';
      case 'psicologo': return 'Orientación y Psicología Estudiantil';
      case 'enfermera': return 'Atención Médica y Primeros Auxilios';
      default: return 'Funcionario de Bienestar';
    }
  };

  const handleRoleChange = (newRole: StaffRole) => {
    setRole(newRole);
    if (newRole === 'lider_bienestar' || newRole === 'apoyo_administrativo') {
      setCategoryScope('all');
    } else if (newRole === 'gestor_deportivo') {
      setCategoryScope('deportes');
    } else if (newRole === 'gestor_cultural_musica') {
      setCategoryScope('musica');
    } else if (newRole === 'gestor_cultural_danzas') {
      setCategoryScope('danzas');
    } else if (newRole === 'psicologo') {
      setCategoryScope('psicologia');
    } else if (newRole === 'enfermera') {
      setCategoryScope('salud');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLeader) {
      setErrorMessage('Acción restringida: Solo la Líder de Bienestar tiene autorización para crear miembros del equipo.');
      return;
    }

    if (!fullName.trim() || !email.trim()) {
      setErrorMessage('Por favor completa el nombre y el correo institucional.');
      return;
    }

    const cleanDoc = docNumber.trim();
    if (!cleanDoc) {
      setErrorMessage('Por favor ingresa el número de documento de identidad del funcionario.');
      return;
    }

    if (cleanDoc.length < 5) {
      setErrorMessage('El número de documento debe tener al menos 5 dígitos.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const rbacLevel = (role === 'lider_bienestar' || role === 'apoyo_administrativo') 
      ? 'RBAC Nivel 1' 
      : 'RBAC Nivel 2';

    // Assign document number as the initial access password
    const initialPassword = cleanDoc;
    // Assign generic image automatically based on gender
    const assignedAvatar = gender === 'female' ? GENERIC_AVATAR_FEMALE : GENERIC_AVATAR_MALE;

    const res = await createStaffUser({
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
      role,
      role_display: getRoleDisplayName(role),
      avatar: assignedAvatar,
      gender,
      category_scope: categoryScope,
      rbac_level: rbacLevel,
      description: `Funcionario asignado al área de ${categoryScope === 'all' ? 'Bienestar General' : categoryScope}.`,
      doc_type: docType,
      doc_number: cleanDoc,
      password: initialPassword
    });

    setSubmitting(false);

    if (res.success) {
      setSuccessToast(
        `¡Miembro registrado! Se ha incorporado a ${fullName} al equipo institucional.`
      );
      setIsModalOpen(false);
      // Reset form
      setFullName('');
      setEmail('');
      setDocNumber('');
      setDocType('CC');
      await onRefreshData();
      setTimeout(() => setSuccessToast(null), 4000);
    } else {
      setErrorMessage(res.error || 'Ocurrió un error al guardar en la base de datos de Supabase.');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-700/20 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{successToast}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setSuccessToast(null)}
            className="p-1 rounded-lg hover:bg-emerald-700 text-emerald-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner with Role Governance Information */}
      <div className="bg-white dark:bg-[#0e1713] rounded-3xl p-6 lg:p-8 border border-[#d6eade] dark:border-[#192b21] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-600/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-950 dark:text-white">
                Equipo de Bienestar Institucional
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600/40 text-[10px] font-bold uppercase tracking-wider">
                Gobernanza RBAC
              </span>
            </div>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/70 mt-1 max-w-2xl leading-relaxed">
              Gestión centralizada del talento humano, asignación de privilegios de acceso institucional y delegación por áreas temáticas (Deportes, Cultura, Salud y Psicología).
            </p>
          </div>
        </div>

        {/* Action Button: Exclusive to Líder de Bienestar */}
        <div className="flex items-center gap-3 shrink-0">
          {isLeader ? (
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setIsModalOpen(true);
              }}
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-700/20 dark:shadow-emerald-950 transition-all active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Miembro del Equipo</span>
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
              <div 
                className="px-4 py-2.5 rounded-2xl bg-[#f0f7f2] dark:bg-[#13221a] border border-[#d6eade] dark:border-[#1d3427] text-xs text-emerald-800/80 dark:text-emerald-400/80 flex items-center gap-2 cursor-not-allowed"
                title="Función reservada exclusivamente para la Líder de Bienestar"
              >
                <Lock className="w-4 h-4 text-emerald-600/70 dark:text-emerald-400/60" />
                <span className="font-medium">Solo la Líder puede crear miembros</span>
              </div>
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
              >
                Ingresar como Líder
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Governance Security Notice if current user is not the leader */}
      {!isLeader && (
        <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/40 text-teal-950 dark:text-teal-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-bold">Política Institucional de Creación de Usuarios:</span>
            <span>
              Actualmente has iniciado sesión como <strong>{currentUser.name}</strong> ({currentUser.role_display.split('—')[0].trim()}). Por estricta normativa de seguridad, <strong>solo la Líder de Bienestar (Dra. Elena Ramos)</strong> tiene autorización para crear y registrar nuevos miembros en el equipo de Bienestar. Puedes consultar la lista de funcionarios activa a continuación.
            </span>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0e1713] border border-[#d6eade] dark:border-[#192b21] flex flex-col gap-1">
          <span className="text-[11px] font-medium text-emerald-800/70 dark:text-emerald-400/60">Total Miembros</span>
          <span className="text-2xl font-bold text-emerald-950 dark:text-white">{staffUsers.length}</span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3 h-3" />
            <span>Sincronizados en Supabase</span>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0e1713] border border-[#d6eade] dark:border-[#192b21] flex flex-col gap-1">
          <span className="text-[11px] font-medium text-emerald-800/70 dark:text-emerald-400/60">Funcionarios Activos</span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {staffUsers.filter(u => u.status !== 'disabled').length}
          </span>
          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">Acceso institucional habilitado</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0e1713] border border-[#d6eade] dark:border-[#192b21] flex flex-col gap-1">
          <span className="text-[11px] font-medium text-emerald-800/70 dark:text-emerald-400/60">Deshabilitados</span>
          <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {staffUsers.filter(u => u.status === 'disabled').length}
          </span>
          <span className="text-[10px] text-rose-700/80 dark:text-rose-400/80">Bloqueados por la Líder</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0e1713] border border-[#d6eade] dark:border-[#192b21] flex flex-col gap-1">
          <span className="text-[11px] font-medium text-emerald-800/70 dark:text-emerald-400/60">Gobernanza Activa</span>
          <span className="text-2xl font-bold text-emerald-950 dark:text-white">
            {isLeader ? 'Líder General' : 'Autogestión'}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
            {isLeader ? 'Modificación y Deshabilitación activa' : 'Edición de perfil propio permitida'}
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0e1713] border border-[#d6eade] dark:border-[#192b21] flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600/70 dark:text-emerald-400/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o rol..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => { setRoleFilter('all'); setStatusFilter('all'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              roleFilter === 'all' && statusFilter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-[#182b20]'
            }`}
          >
            Todos ({staffUsers.length})
          </button>
          <button
            type="button"
            onClick={() => { setRoleFilter('all'); setStatusFilter('active'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-[#182b20]'
            }`}
          >
            Activos ({staffUsers.filter(u => u.status !== 'disabled').length})
          </button>
          <button
            type="button"
            onClick={() => { setRoleFilter('all'); setStatusFilter('disabled'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'disabled'
                ? 'bg-rose-600 text-white'
                : 'bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-[#182b20]'
            }`}
          >
            Deshabilitados ({staffUsers.filter(u => u.status === 'disabled').length})
          </button>
          <button
            type="button"
            onClick={() => { setRoleFilter('full_access'); setStatusFilter('all'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              roleFilter === 'full_access' && statusFilter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-[#182b20]'
            }`}
          >
            Acceso Total ({staffUsers.filter(u => hasFullEventAccess(u)).length})
          </button>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => {
          const hasFull = hasFullEventAccess(user);
          const isCurrentLoggedIn = currentUser.id === user.id;
          const isDisabled = user.status === 'disabled';

          return (
            <div 
              key={user.id}
              className={`p-5 rounded-3xl bg-white dark:bg-[#0e1713] border transition-all duration-200 flex flex-col justify-between gap-4 ${
                isDisabled
                  ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/15 dark:bg-rose-950/10'
                  : isCurrentLoggedIn 
                    ? 'border-emerald-500/80 ring-2 ring-emerald-500/20 shadow-md' 
                    : 'border-[#d6eade] dark:border-[#192b21] hover:border-emerald-300 dark:hover:border-emerald-700/50'
              }`}
            >
              <div className="flex flex-col gap-3">
                {/* Header card with avatar & badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => (isLeader || isCurrentLoggedIn) && onEditStaffUser(user, 'profile')}
                      className={`relative ${isLeader || isCurrentLoggedIn ? 'cursor-pointer group' : ''}`}
                      title={isLeader || isCurrentLoggedIn ? 'Clic para subir/cambiar fotografía' : undefined}
                    >
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className={`w-12 h-12 rounded-2xl object-cover ring-2 shadow-sm transition-transform ${
                          isLeader || isCurrentLoggedIn ? 'group-hover:scale-105' : ''
                        } ${
                          isDisabled ? 'grayscale opacity-75 ring-rose-400/60' : 'ring-emerald-500/40'
                        }`}
                      />
                      {(isLeader || isCurrentLoggedIn) && (
                        <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Camera className="w-4 h-4" />
                        </div>
                      )}
                      {isDisabled && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shadow">
                          ✕
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold text-sm truncate ${
                          isDisabled ? 'text-zinc-600 dark:text-zinc-400 line-through' : 'text-emerald-950 dark:text-white'
                        }`}>
                          {user.name}
                        </span>
                        {isCurrentLoggedIn && (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9px] font-bold uppercase">
                            TÚ
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                        {user.role_display.split('—')[0].trim()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isDisabled
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                        : hasFull
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600/40'
                          : 'bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700/40'
                    }`}>
                      {isDisabled ? 'Deshabilitado' : hasFull ? 'Acceso Total' : 'Eventos Propios'}
                    </span>
                    {!isDisabled && (
                      <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Activo</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-2 text-xs text-emerald-800/80 dark:text-emerald-300/80 bg-[#f0f7f2] dark:bg-[#122018] p-2.5 rounded-xl border border-[#d6eade] dark:border-[#1a2e22]">
                  <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate font-mono text-[11px]">{user.email}</span>
                </div>

                {/* Document info */}
                {user.doc_number && (
                  <div className="flex items-center gap-2 text-xs bg-[#f0f7f2] dark:bg-[#122018] p-2.5 rounded-xl border border-[#d6eade] dark:border-[#1a2e22]">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-mono text-[11px] font-medium text-emerald-950 dark:text-emerald-100 truncate">
                      Identificación: {user.doc_type || 'CC'} {user.doc_number}
                    </span>
                  </div>
                )}

                {/* Description */}
                <p className="text-xs text-emerald-900/70 dark:text-emerald-200/70 line-clamp-2 leading-relaxed">
                  {user.description || 'Miembro activo del equipo de Bienestar Institucional.'}
                </p>
              </div>

              {/* Action buttons and bottom metadata */}
              <div className="flex flex-col gap-2.5 pt-3 border-t border-[#e2efe6] dark:border-[#192b21]">
                <div className="flex items-center justify-between text-[10px] text-emerald-700/70 dark:text-emerald-400/60">
                  <span className="font-semibold uppercase tracking-wider">{user.rbac_level}</span>
                  <span className="capitalize">Área: {user.category_scope || 'all'}</span>
                </div>

                {/* Action buttons */}
                {isLeader ? (
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => onEditStaffUser(user, 'profile')}
                      className="flex-1 h-9 px-2.5 rounded-xl bg-emerald-50 dark:bg-[#13221a] hover:bg-emerald-100 dark:hover:bg-[#1a2f23] text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/50 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Modificar datos y fotografía"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Foto / Datos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditStaffUser(user, 'password')}
                      className="h-9 px-2.5 rounded-xl bg-[#f0f7f2] dark:bg-[#122018] hover:bg-emerald-100 dark:hover:bg-[#1a2f23] text-emerald-800 dark:text-emerald-300 border border-[#d6eade] dark:border-[#1e3427] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Cambiar contraseña almacenada"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Clave</span>
                    </button>

                    {user.id !== currentUser.id && (
                      <button
                        type="button"
                        onClick={async () => {
                          const newStatus = isDisabled ? 'active' : 'disabled';
                          await onToggleStaffStatus(user.id, newStatus);
                        }}
                        className={`h-9 px-2.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                          isDisabled
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm'
                            : 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
                        }`}
                        title={isDisabled ? 'Habilitar acceso institucional' : 'Deshabilitar acceso institucional'}
                      >
                        {isDisabled ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                        <span>{isDisabled ? 'Habilitar' : 'Bloquear'}</span>
                      </button>
                    )}
                  </div>
                ) : isCurrentLoggedIn ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onEditStaffUser(user, 'profile')}
                      className="h-9 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      title="Subir o cambiar fotografía personal"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Subir Mi Foto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditStaffUser(user, 'password')}
                      className="h-9 px-2.5 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] hover:bg-emerald-100 dark:hover:bg-[#1a2f23] text-emerald-900 dark:text-emerald-200 border border-[#d6eade] dark:border-[#1e3427] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Cambiar contraseña de acceso"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Cambiar Clave</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Crear Nuevo Miembro (Exclusivo Líder) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#0f1914] rounded-3xl border border-[#d6eade] dark:border-[#1d3427] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Titlebar */}
            <div className="p-6 bg-[#f0f7f2] dark:bg-[#13221a] border-b border-[#d6eade] dark:border-[#1c3225] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-emerald-950 dark:text-white">
                      Registrar Nuevo Miembro en el Equipo
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                      Gobernanza Líder
                    </span>
                  </div>
                  <span className="text-xs text-emerald-700/80 dark:text-emerald-300/70">
                    Se creará e insertará directamente en la tabla <code className="font-mono text-emerald-800 dark:text-emerald-200">public.staff_users</code> de Supabase.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-emerald-700/60 dark:text-emerald-400/60 hover:bg-[#e2efe6] dark:hover:bg-[#1b2f23] hover:text-emerald-950 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateStaff} className="p-6 overflow-y-auto flex flex-col gap-4">
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200 text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Nombre Completo y Tratamiento *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="ej. Lic. Andrea Mendoza"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Correo Electrónico Institucional *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="ej. andrea.mendoza@bienestar.edu.co"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Document Type & Document Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Tipo de Documento *
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as DocumentType)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                  >
                    <option value="CC">Cédula de Ciudadanía (CC)</option>
                    <option value="TI">Tarjeta de Identidad (TI)</option>
                    <option value="CE">Cédula de Extranjería (CE)</option>
                    <option value="PEP">Permiso Especial (PEP)</option>
                  </select>
                </div>

                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Número de Documento de Identidad *
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600/70 dark:text-emerald-400/60" />
                    <input
                      type="text"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value.replace(/\s+/g, ''))}
                      required
                      placeholder="ej. 1025889944"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 font-mono font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Role & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Rol Institucional Asignado
                  </label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value as StaffRole)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                  >
                    <option value="apoyo_administrativo">Apoyo Administrativo (Acceso Total a Eventos)</option>
                    <option value="gestor_deportivo">Coordinador de Deportes y Recreación</option>
                    <option value="gestor_cultural_musica">Gestor Cultural — Música</option>
                    <option value="gestor_cultural_danzas">Gestor Cultural — Danzas</option>
                    <option value="psicologo">Orientación & Psicología Estudiantil</option>
                    <option value="enfermera">Atención Médica y Primeros Auxilios</option>
                    <option value="lider_bienestar">Líder de Bienestar (Administrador General)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Género Institucional
                  </label>
                  <div className="grid grid-cols-2 gap-2 h-11">
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`rounded-xl text-xs font-semibold border flex items-center justify-center transition-colors ${
                        gender === 'female'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-900 dark:text-emerald-200 border-[#d6eade] dark:border-[#1f3629]'
                      }`}
                    >
                      Femenino (Bienvenida)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`rounded-xl text-xs font-semibold border flex items-center justify-center transition-colors ${
                        gender === 'male'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-900 dark:text-emerald-200 border-[#d6eade] dark:border-[#1f3629]'
                      }`}
                    >
                      Masculino (Bienvenido)
                    </button>
                  </div>
                </div>
              </div>

              {/* Area Scope Indicator */}
              <div className="p-3 rounded-2xl bg-[#f0f7f2] dark:bg-[#13221a] border border-[#d6eade] dark:border-[#1f3629] flex items-center justify-between text-xs">
                <span className="text-emerald-800/80 dark:text-emerald-300/80">Alcance de Privilegios:</span>
                <span className={`font-bold px-2 py-0.5 rounded-full border text-[11px] ${
                  (role === 'lider_bienestar' || role === 'apoyo_administrativo')
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600/40'
                    : 'bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700/40'
                }`}>
                  {(role === 'lider_bienestar' || role === 'apoyo_administrativo')
                    ? 'Acceso Total a todos los Eventos y Listados'
                    : 'Gestión exclusiva de sus propios eventos creados'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e2efe6] dark:border-[#192b21]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="h-11 px-5 rounded-2xl bg-[#f0f7f2] dark:bg-[#13221a] hover:bg-emerald-100 dark:hover:bg-[#182b21] text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-700/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <span>{submitting ? 'Guardando en Supabase...' : 'Guardar y Dar de Alta'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
