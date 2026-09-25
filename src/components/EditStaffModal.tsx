import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  User, 
  Mail, 
  CreditCard, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  Image as ImageIcon, 
  Check, 
  UserCheck, 
  UserX,
  Layers,
  HeartHandshake,
  Upload,
  Camera,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderUp
} from 'lucide-react';
import { StaffUser, StaffRole, EventCategory, DocumentType } from '../types';
import { isLiderBienestar } from '../lib/permissions';
import { uploadStaffAvatar } from '../lib/supabase';

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: StaffUser | null;
  currentUser: StaffUser;
  onSave: (updatedUser: StaffUser) => Promise<{ success: boolean; data?: StaffUser; error?: string }>;
  initialTab?: 'profile' | 'password';
}

// Curated high quality avatars presets for fast selection
const AVATAR_PRESETS = [
  { id: 'f1', label: 'Directiva', gender: 'female', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250' },
  { id: 'm1', label: 'Administrativo', gender: 'male', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250' },
  { id: 'm2', label: 'Deportivo', gender: 'male', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250' },
  { id: 'm3', label: 'Cultural', gender: 'male', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250' },
  { id: 'f2', label: 'Cultural F.', gender: 'female', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=250' },
  { id: 'f3', label: 'Psicología', gender: 'female', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=250' },
  { id: 'f4', label: 'Salud', gender: 'female', url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250' },
  { id: 'm4', label: 'Líder General', gender: 'male', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=250' }
];

export const EditStaffModal: React.FC<EditStaffModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  currentUser,
  onSave,
  initialTab = 'profile'
}) => {
  if (!isOpen || !targetUser) return null;

  const isLeader = isLiderBienestar(currentUser);
  const isSelf = currentUser.id === targetUser.id;
  const isFullAdmin = isLeader;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'governance'>(
    initialTab === 'password' ? 'password' : 'profile'
  );

  // Form State
  const [name, setName] = useState(targetUser.name || '');
  const [email, setEmail] = useState(targetUser.email || '');
  const [docType, setDocType] = useState<DocumentType>(targetUser.doc_type || 'CC');
  const [docNumber, setDocNumber] = useState(targetUser.doc_number || '');
  const [currentPassword, setCurrentPassword] = useState(targetUser.password || targetUser.doc_number || '');
  
  // Password Change Fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Photo / Avatar State
  const [avatar, setAvatar] = useState(targetUser.avatar || AVATAR_PRESETS[0].url);
  const [gender, setGender] = useState<'female' | 'male'>(targetUser.gender || 'female');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Role & Scope State
  const [role, setRole] = useState<StaffRole>(targetUser.role || 'apoyo_administrativo');
  const [categoryScope, setCategoryScope] = useState<EventCategory | 'all'>(targetUser.category_scope || 'all');
  const [status, setStatus] = useState<'active' | 'disabled'>(targetUser.status || 'active');
  const [description, setDescription] = useState(targetUser.description || '');

  // Submission State
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (targetUser) {
      setName(targetUser.name || '');
      setEmail(targetUser.email || '');
      setDocType(targetUser.doc_type || 'CC');
      setDocNumber(targetUser.doc_number || '');
      setCurrentPassword(targetUser.password || targetUser.doc_number || '');
      setNewPassword('');
      setConfirmPassword('');
      setAvatar(targetUser.avatar || AVATAR_PRESETS[0].url);
      setGender(targetUser.gender || 'female');
      setRole(targetUser.role || 'apoyo_administrativo');
      setCategoryScope(targetUser.category_scope || 'all');
      setStatus(targetUser.status || 'active');
      setDescription(targetUser.description || '');
      setErrorMessage(null);
      setUploadFeedback(null);
      setActiveTab(initialTab === 'password' ? 'password' : 'profile');
    }
  }, [targetUser, initialTab]);

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

  // Upload handler for user's personal photo to Supabase
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadFeedback({
        type: 'error',
        message: 'Por favor selecciona un archivo de imagen válido (JPG, PNG o WebP).'
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadFeedback({
        type: 'error',
        message: 'El tamaño de la imagen no debe superar los 10 MB.'
      });
      return;
    }

    setIsUploadingPhoto(true);
    setUploadFeedback({
      type: 'info',
      message: 'Optimizando y subiendo fotografía a Supabase...'
    });

    const res = await uploadStaffAvatar(file, targetUser.id);
    setIsUploadingPhoto(false);

    if (res.success && res.url) {
      setAvatar(res.url);
      setUploadFeedback({
        type: 'success',
        message: res.message || 'Fotografía procesada y vinculada exitosamente.'
      });
    } else {
      setUploadFeedback({
        type: 'error',
        message: res.error || 'Ocurrió un error al subir la fotografía a Supabase.'
      });
    }

    // Reset file input so same file can be re-selected if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage('Por favor ingresa el nombre completo.');
      return;
    }

    const cleanDoc = docNumber.trim();
    if (!cleanDoc) {
      setErrorMessage('Por favor ingresa el número de documento de identidad.');
      return;
    }

    // Password validation logic
    let resolvedPassword = currentPassword.trim() || cleanDoc;

    if (newPassword.trim()) {
      if (newPassword.trim().length < 4) {
        setErrorMessage('La nueva contraseña debe tener al menos 4 caracteres.');
        setActiveTab('password');
        return;
      }
      if (newPassword.trim() !== confirmPassword.trim()) {
        setErrorMessage('Las contraseñas no coinciden. Por favor verifica ambos campos.');
        setActiveTab('password');
        return;
      }
      resolvedPassword = newPassword.trim();
    }

    setSaving(true);

    const rbacLevel = (role === 'lider_bienestar' || role === 'apoyo_administrativo') 
      ? 'RBAC Nivel 1' 
      : 'RBAC Nivel 2';

    const updatedData: StaffUser = {
      ...targetUser,
      name: cleanName,
      email: isFullAdmin ? email.trim().toLowerCase() : targetUser.email,
      doc_type: docType,
      doc_number: cleanDoc,
      password: resolvedPassword,
      avatar: avatar.trim() || targetUser.avatar,
      gender,
      // Role and category can only be changed if administrator
      role: isFullAdmin ? role : targetUser.role,
      role_display: isFullAdmin ? getRoleDisplayName(role) : targetUser.role_display,
      category_scope: isFullAdmin ? categoryScope : targetUser.category_scope,
      rbac_level: isFullAdmin ? rbacLevel : targetUser.rbac_level,
      // Status can only be changed if administrator and not editing self
      status: (isFullAdmin && !isSelf) ? status : targetUser.status || 'active',
      description: description.trim() || targetUser.description
    };

    const res = await onSave(updatedData);
    setSaving(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Ocurrió un error al actualizar los datos en Supabase.');
    }
  };

  const isPasswordMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0f1914] rounded-3xl border border-[#d6eade] dark:border-[#1d3427] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Titlebar */}
        <div className="px-6 py-4 sm:py-5 bg-[#f0f7f2] dark:bg-[#13221a] border-b border-[#d6eade] dark:border-[#1c3225] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
              {isSelf ? <UserCheck className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-emerald-950 dark:text-white flex items-center gap-2">
                <span>{isSelf ? 'Mi Perfil • Foto y Contraseña' : 'Modificar Datos de Funcionario'}</span>
                {status === 'disabled' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    Deshabilitado
                  </span>
                )}
              </h2>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                {isSelf 
                  ? 'Sube tu fotografía y actualiza tu contraseña almacenada en Supabase.' 
                  : `Gestión para ${targetUser.name} (${targetUser.role_display.split('—')[0].trim()})`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-emerald-700/70 dark:text-emerald-400/60 hover:bg-[#e2efe6] dark:hover:bg-[#1b2f23] hover:text-emerald-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 pb-2 bg-[#f0f7f2]/60 dark:bg-[#13221a]/60 border-b border-[#d6eade] dark:border-[#1c3225] flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#15241c] text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-[#1b2f24] border border-[#d6eade] dark:border-[#1f3629]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Datos & Fotografía</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'password'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#15241c] text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-[#1b2f24] border border-[#d6eade] dark:border-[#1f3629]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Cambiar Contraseña</span>
            {newPassword && (
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            )}
          </button>

          {isFullAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('governance')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'governance'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-[#15241c] text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-[#1b2f24] border border-[#d6eade] dark:border-[#1f3629]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Gobernanza & Roles</span>
            </button>
          )}
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Current Institutional Context Summary */}
          <div className="p-3.5 rounded-2xl bg-[#f0f7f2] dark:bg-[#122018] border border-[#d6eade] dark:border-[#1a2e22] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src={avatar || targetUser.avatar} 
                  alt="Avatar previo" 
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-sm"
                />
                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-emerald-950 dark:text-white truncate">{targetUser.name}</span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium truncate">
                  {targetUser.role_display.split('—')[0].trim()}
                </span>
                <span className="text-[10px] text-emerald-700/70 dark:text-emerald-400/60 font-mono truncate">
                  {targetUser.email}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50">
                {targetUser.rbac_level}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                {isSelf ? 'Tu Cuenta' : 'Funcionario'}
              </span>
            </div>
          </div>

          {/* ==================================================== */}
          {/* TAB 1: DATOS PERSONALES & FOTOGRAFÍA */}
          {/* ==================================================== */}
          {activeTab === 'profile' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* UPLOAD FOTOGRAFÍA SECTION */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Subir Fotografía del Funcionario (Supabase Storage)</span>
                  </label>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                    JPG, PNG, WebP
                  </span>
                </div>

                {/* Upload action box */}
                <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-2xl bg-white dark:bg-[#13221a] border border-[#d6eade] dark:border-[#1d3527]">
                  {/* Photo Preview with Camera trigger */}
                  <div className="relative group shrink-0">
                    <img 
                      src={avatar} 
                      alt="Fotografía de perfil" 
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-emerald-500 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-1 cursor-pointer"
                      title="Cambiar foto"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Cambiar</span>
                    </button>
                  </div>

                  <div className="flex flex-col flex-1 gap-2 text-center sm:text-left">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950 dark:text-white">
                        Sube una foto desde este dispositivo
                      </h4>
                      <p className="text-[11px] text-emerald-800/70 dark:text-emerald-400/70 mt-0.5 leading-snug">
                        Se optimizará automáticamente y quedará almacenada en Supabase Storage (bucket <code>staff-avatars</code>).
                      </p>
                    </div>

                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handlePhotoFileChange} 
                        accept="image/png, image/jpeg, image/webp" 
                        className="hidden" 
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingPhoto ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Subiendo a Supabase...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Examinar y Subir Foto</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Upload feedback banner */}
                {uploadFeedback && (
                  <div className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
                    uploadFeedback.type === 'success' 
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700' 
                      : uploadFeedback.type === 'error'
                        ? 'bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800'
                        : 'bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-700'
                  }`}>
                    {uploadFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    {uploadFeedback.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />}
                    {uploadFeedback.type === 'info' && <RefreshCw className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 animate-spin" />}
                    <span className="font-medium">{uploadFeedback.message}</span>
                  </div>
                )}

                {/* Quick Presets selector as alternate option */}
                <div className="space-y-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-emerald-900/80 dark:text-emerald-300/80">
                      O selecciona una fotografía institucional predeterminada:
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {AVATAR_PRESETS.map((p) => {
                      const isSelected = avatar === p.url;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setAvatar(p.url);
                            setGender(p.gender as 'female' | 'male');
                            setUploadFeedback(null);
                          }}
                          className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all p-0.5 group cursor-pointer ${
                            isSelected 
                              ? 'border-emerald-500 ring-2 ring-emerald-500/40 scale-105' 
                              : 'border-[#d6eade] dark:border-[#1e3427] hover:border-emerald-400 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <img src={p.url} alt={p.label} className="w-full h-full object-cover rounded-lg" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white drop-shadow" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 1. Nombre Completo */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Nombre Completo</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Lic. Carlos Andrés Gómez"
                  className="w-full h-11 px-4 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* 2. Correo Institucional */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Correo Electrónico Institucional</span>
                  {!isFullAdmin && (
                    <span className="text-[10px] text-emerald-700/70 dark:text-emerald-400/60 font-normal">
                      (Gestionado por Bienestar)
                    </span>
                  )}
                </label>
                <input
                  type="email"
                  required
                  disabled={!isFullAdmin}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full h-11 px-4 rounded-xl text-xs font-medium border ${
                    isFullAdmin 
                      ? 'bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500' 
                      : 'bg-emerald-50/50 dark:bg-[#101c15] text-emerald-900/70 dark:text-emerald-400/60 border-emerald-200/50 dark:border-[#1a2d21] cursor-not-allowed'
                  }`}
                />
              </div>

              {/* 3. Documento de Identidad */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Tipo Doc.</span>
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as DocumentType)}
                    className="w-full h-11 px-3 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="CC">C.C. — Cédula</option>
                    <option value="TI">T.I. — Tarjeta</option>
                    <option value="CE">C.E. — Extranjería</option>
                    <option value="PEP">P.E.P. — Permiso</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <span>Número de Documento</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="Ej: 1020304050"
                    className="w-full h-11 px-4 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 font-mono font-medium"
                  />
                </div>
              </div>

              {/* 4. Descripción / Perfil profesional */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                  Descripción o Función en Bienestar
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe brevemente tus funciones o área institucional..."
                  className="w-full p-3 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 font-medium resize-none"
                />
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: SEGURIDAD & CAMBIO DE CONTRASEÑA */}
          {/* ==================================================== */}
          {activeTab === 'password' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-start gap-3">
                <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-emerald-950 dark:text-emerald-200">
                    Gestión de Contraseña en Supabase
                  </span>
                  <span className="text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                    Cada funcionario puede definir su propia contraseña segura. Al guardar, quedará actualizada en la base de datos de Supabase y en la sesión activa.
                  </span>
                </div>
              </div>

              {/* Nueva Contraseña */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Nueva Contraseña</span>
                  </span>
                  <span className="text-[10px] text-emerald-700/70 dark:text-emerald-400/60">
                    Mínimo 4 caracteres
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ingresa la nueva contraseña..."
                    className="w-full h-11 pl-4 pr-11 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 font-mono font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700/60 dark:text-emerald-400/60 hover:text-emerald-950 dark:hover:text-white cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar Nueva Contraseña */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Confirmar Nueva Contraseña</span>
                  </span>
                  {isPasswordMatch && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Las contraseñas coinciden
                    </span>
                  )}
                  {isPasswordMismatch && (
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> No coinciden
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Vuelve a escribir la nueva contraseña..."
                    className={`w-full h-11 pl-4 pr-11 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs border focus:outline-none font-mono font-medium ${
                      isPasswordMismatch 
                        ? 'border-rose-400 dark:border-rose-700 focus:border-rose-500' 
                        : isPasswordMatch 
                          ? 'border-emerald-500 focus:border-emerald-500' 
                          : 'border-[#d6eade] dark:border-[#1f3629] focus:border-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700/60 dark:text-emerald-400/60 hover:text-emerald-950 dark:hover:text-white cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botón rápido para restablecer a documento */}
              <div className="pt-2 border-t border-[#e2efe6] dark:border-[#192b21] flex items-center justify-between">
                <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                  ¿Deseas usar tu número de documento como contraseña?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const doc = docNumber.trim();
                    if (doc) {
                      setNewPassword(doc);
                      setConfirmPassword(doc);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Asignar Documento ({docNumber || 'CC'})
                </button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: GOBERNANZA & ROLES (SOLO LÍDER) */}
          {/* ==================================================== */}
          {activeTab === 'governance' && isFullAdmin && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 dark:text-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Privilegios y Cobertura (Exclusivo Líder de Bienestar)</span>
              </div>

              {/* Rol Institucional */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                  Rol Institucional Asignado
                </label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value as StaffRole)}
                  className="w-full h-11 px-3 rounded-xl bg-white dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="lider_bienestar">Líder de Bienestar (Acceso Total y Creación de Miembros)</option>
                  <option value="apoyo_administrativo">Apoyo Administrativo (Acceso Total a Eventos)</option>
                  <option value="gestor_deportivo">Coordinador de Deportes y Recreación</option>
                  <option value="gestor_cultural_musica">Gestor Cultural — Música</option>
                  <option value="gestor_cultural_danzas">Gestor Cultural — Danzas</option>
                  <option value="psicologo">Orientación y Salud Mental / Psicología</option>
                  <option value="enfermera">Atención Médica y Primeros Auxilios</option>
                </select>
              </div>

              {/* Área / Especialidad */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                  Área de Cobertura de Eventos
                </label>
                <select
                  value={categoryScope}
                  onChange={(e) => setCategoryScope(e.target.value as EventCategory | 'all')}
                  className="w-full h-11 px-3 rounded-xl bg-white dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="all">Todas las Áreas (Bienestar General)</option>
                  <option value="deportes">Deportes y Recreación</option>
                  <option value="musica">Música y Ensambles</option>
                  <option value="danzas">Danzas y Folclor</option>
                  <option value="psicologia">Salud Mental y Psicología</option>
                  <option value="salud">Primeros Auxilios y Salud</option>
                </select>
              </div>

              {/* Estado de Vinculación - Not allowed on self */}
              {!isSelf && (
                <div className="space-y-1.5 pt-2 border-t border-[#d6eade] dark:border-[#1d3427]">
                  <label className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 flex items-center justify-between">
                    <span>Estado de Vinculación en el Sistema</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      status === 'active' 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {status === 'active' ? 'Funcionario Activo' : 'Funcionario Deshabilitado'}
                    </span>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus('active')}
                      className={`h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        status === 'active'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white dark:bg-[#13221a] text-emerald-800 dark:text-emerald-300 border-[#d6eade] dark:border-[#1f3629] hover:bg-emerald-50 dark:hover:bg-[#192c21]'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Habilitado (Activo)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatus('disabled')}
                      className={`h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        status === 'disabled'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-white dark:bg-[#13221a] text-rose-700 dark:text-rose-400 border-[#d6eade] dark:border-[#1f3629] hover:bg-rose-50 dark:hover:bg-rose-950/40'
                      }`}
                    >
                      <UserX className="w-4 h-4" />
                      <span>Deshabilitar Acceso</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e2efe6] dark:border-[#192b21]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || isUploadingPhoto}
              className="h-11 px-5 rounded-2xl bg-[#f0f7f2] dark:bg-[#13221a] hover:bg-emerald-100 dark:hover:bg-[#182b21] text-emerald-800 dark:text-emerald-300/80 hover:text-emerald-950 dark:hover:text-white border border-[#d6eade] dark:border-[#1f3629] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || isUploadingPhoto}
              className="h-11 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-700/20 dark:shadow-emerald-950 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando en Supabase...' : 'Guardar Modificaciones'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
