import React, { useState, useRef } from 'react';
import { 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  School, 
  GraduationCap, 
  Briefcase, 
  Users, 
  Fingerprint, 
  Mail, 
  BookOpen, 
  Terminal, 
  KeyRound, 
  CheckCircle2, 
  RotateCcw, 
  HelpCircle, 
  FileCheck2, 
  Sparkles,
  ExternalLink,
  Sun,
  Moon,
  ArrowRight,
  LayoutDashboard,
  LogOut
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ParticipantRole, DocumentType, StaffUser } from '../types';
import { registerParticipant } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

interface PublicPortalViewProps {
  onOpenStaffModal: () => void;
  onRegisteredSuccess: () => void;
  onNavigate?: (path: string) => void;
  currentUser?: StaffUser | null;
  onLogout?: () => void;
}

export const PublicPortalView: React.FC<PublicPortalViewProps> = ({
  onOpenStaffModal,
  onRegisteredSuccess,
  onNavigate,
  currentUser,
  onLogout
}) => {
  const { theme, toggleTheme } = useTheme();
  const [selectedRole, setSelectedRole] = useState<ParticipantRole>('aprendiz');
  const [docType, setDocType] = useState<DocumentType>('CC');
  const [docNumber, setDocNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [program, setProgram] = useState('ADSO - Análisis y Desarrollo de Software');
  const [ficha, setFicha] = useState('2825412');
  const [jornada, setJornada] = useState<'diurna' | 'mixta' | 'nocturna' | 'virtual'>('diurna');
  const [areaFormacion, setAreaFormacion] = useState('');
  
  // 4-digit PIN OTP inputs
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const pinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePinChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...pinDigits];
    newDigits[index] = digit;
    setPinDigits(newDigits);

    if (digit && index < 3) {
      pinInputRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const fullPin = pinDigits.join('');
    if (fullPin.length !== 4) {
      setErrorMessage('Por favor ingresa los 4 dígitos de tu PIN de seguridad.');
      return;
    }

    if (!docNumber.trim() || !firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorMessage('Por favor completa todos los campos requeridos.');
      return;
    }

    setIsSubmitting(true);

    const res = await registerParticipant({
      full_name: `${firstName.trim()} ${lastName.trim()}`,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      doc_type: docType,
      doc_number: docNumber.trim(),
      email: email.trim(),
      role: selectedRole,
      program: selectedRole === 'aprendiz' ? program : undefined,
      ficha: selectedRole === 'aprendiz' ? ficha : undefined,
      jornada: selectedRole === 'aprendiz' ? jornada : undefined,
      area_formacion: selectedRole === 'instructor' ? areaFormacion : undefined,
      pin: fullPin
    });

    setIsSubmitting(false);

    if (res.success) {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#10b981', '#6ee7b7']
      });
      setSuccessMessage(res.message);
      onRegisteredSuccess();
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleClearForm = () => {
    setDocNumber('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPinDigits(['', '', '', '']);
    setSuccessMessage(null);
    setErrorMessage(null);
    setSelectedRole('aprendiz');
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-2">
      {/* Botanical Shell Container */}
      <div className="relative w-full rounded-[2.5rem] bg-gradient-to-br from-[#f0f9f3] via-[#ffffff] to-[#e6f4ea] dark:from-[#0e1713] dark:via-[#09100c] dark:to-[#070c09] p-6 lg:p-10 border border-[#d6eade] dark:border-[#1b2f23] shadow-2xl shadow-black/5 dark:shadow-black/60 transition-colors">
        
        {/* Public Portal Top Bar (No Header/Sidebar) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-5 border-b border-[#d6eade] dark:border-[#18291f]">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white shadow-lg shadow-emerald-700/20 dark:shadow-emerald-900/40 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5 text-emerald-100" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-emerald-950 dark:text-white tracking-tight leading-none">
                  AsistEvent
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600/30 text-[10px] font-bold">
                  Portal Público
                </span>
              </div>
              <span className="text-[11px] text-emerald-600/90 dark:text-emerald-400/70 font-medium">
                Bienestar Institucional • Registro y Acceso
              </span>
            </div>
          </div>

          {/* Actions: Theme Toggle & Administrative Access */}
          <div className="flex items-center flex-wrap gap-2.5 self-start md:self-auto">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all bg-white dark:bg-[#122018] text-emerald-900 dark:text-emerald-200 border-[#d6eade] dark:border-[#1f3629] hover:border-emerald-500/50 shadow-sm cursor-pointer"
              title={theme === 'dark' ? 'Modo Oscuro activo. Clic para cambiar a Modo Claro' : 'Modo Claro activo. Clic para cambiar a Modo Oscuro'}
            >
              {theme === 'dark' ? (
                <>
                  <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-700/40">
                    <Moon className="w-3.5 h-3.5" />
                  </span>
                  <span className="hidden sm:inline text-emerald-200">Oscuro</span>
                </>
              ) : (
                <>
                  <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-amber-100 text-amber-600 border border-amber-300">
                    <Sun className="w-3.5 h-3.5" />
                  </span>
                  <span className="hidden sm:inline text-emerald-900">Claro</span>
                </>
              )}
            </button>

            {/* Actions depending on authentication state */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('dashboard')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-900/20 dark:shadow-emerald-950 transition-all cursor-pointer"
                    title="Ingresar al Panel de Gestión"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Panel Administrativo</span>
                    <span className="sm:hidden">Panel</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40 text-xs font-semibold transition-all shadow-sm cursor-pointer group"
                    title="Cerrar sesión institucional"
                  >
                    <LogOut className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                    <span>Cerrar Sesión</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenStaffModal}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-900/20 dark:shadow-emerald-950 transition-all group cursor-pointer"
                title="Iniciar sesión para personal de Bienestar"
              >
                <LogIn className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                <span>Iniciar Sesión</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Two-Column Tactile Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Formulario de Autorregistro Inteligente */}
          <div className="lg:col-span-8 bg-white dark:bg-[#0f1914] rounded-3xl p-6 sm:p-8 border border-[#d6eade] dark:border-[#1c3225] shadow-xl shadow-black/5 dark:shadow-black/40 flex flex-col gap-6 transition-colors">
            {/* Header Section */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600/30 text-[11px] font-bold uppercase tracking-wider">
                  Portal Oficial 2026
                </span>
                <span className="text-xs text-emerald-700/80 dark:text-emerald-400/60 font-medium">• Bienestar al Aprendiz</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-950 dark:text-white">
                Portal de Registro <span className="text-emerald-600 dark:text-emerald-400">de Asistencias</span>
              </h1>
              <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-200/70 leading-relaxed">
                Selecciona tu modo de ingreso: autorregistro oficial para participantes con PIN de 4 dígitos o inicio de sesión administrativo para el equipo de Bienestar.
              </p>
            </div>

            {/* Segmented Tab Navigation for Quick Switch */}
            <div className="p-1.5 rounded-2xl bg-[#f0f7f2] dark:bg-[#13221a] border border-[#d6eade] dark:border-[#1f3629] flex items-center gap-1.5 shadow-inner">
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all bg-emerald-600 text-white shadow-md shadow-emerald-700/20 dark:shadow-emerald-950"
              >
                <UserPlus className="w-4 h-4" />
                <span>Registro de Participantes Nuevos</span>
              </button>

              <button
                type="button"
                onClick={onOpenStaffModal}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-emerald-800/80 dark:text-emerald-300/70 hover:text-emerald-950 dark:hover:text-white hover:bg-emerald-100/50 dark:hover:bg-[#182b21]"
              >
                <LogIn className="w-4 h-4" />
                <span>Inicio de Sesión — Equipo</span>
              </button>
            </div>

            {/* Role Selector Chips */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  Tipo de Vinculación Institucional
                </label>
                <span className="text-[11px] text-teal-700 dark:text-teal-300 font-medium">
                  {selectedRole === 'aprendiz' && 'Formulario adaptado para Aprendices'}
                  {selectedRole === 'instructor' && 'Formulario adaptado para Instructores'}
                  {selectedRole === 'funcionario' && 'Formulario para Funcionarios'}
                  {selectedRole === 'invitado' && 'Formulario para Invitados Externos'}
                </span>
              </div>

              <div className="p-1.5 rounded-2xl bg-[#f0f7f2] dark:bg-[#13221a] border border-[#d6eade] dark:border-[#1f3629] grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'aprendiz', label: 'Aprendiz', icon: School },
                  { id: 'instructor', label: 'Instructor', icon: GraduationCap },
                  { id: 'funcionario', label: 'Funcionario', icon: Briefcase },
                  { id: 'invitado', label: 'Invitado', icon: Users },
                ].map(r => {
                  const Icon = r.icon;
                  const isSelected = selectedRole === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRole(r.id as ParticipantRole)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/20 dark:shadow-emerald-950 border border-emerald-400/40'
                          : 'text-emerald-800/80 dark:text-emerald-300/70 hover:text-emerald-950 dark:hover:text-white hover:bg-emerald-100/50 dark:hover:bg-[#182b21]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
              {/* Document Group */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5 flex flex-col gap-1">
                  <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Tipo de Documento
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as DocumentType)}
                    className="w-full h-11 px-3 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="CC">Cédula de Ciudadanía (CC)</option>
                    <option value="TI">Tarjeta de Identidad (TI)</option>
                    <option value="CE">Cédula de Extranjería (CE)</option>
                    <option value="PEP">Permiso Especial (PEP / PPT)</option>
                  </select>
                </div>

                <div className="sm:col-span-7 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                      Número de Documento
                    </label>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Único
                    </span>
                  </div>
                  <div className="relative">
                    <Fingerprint className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/70 dark:text-emerald-400/60" />
                    <input
                      type="text"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ej. 1023456789"
                      required
                      maxLength={12}
                      className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs font-mono placeholder:text-emerald-700/40 dark:placeholder:text-emerald-400/30 border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Full Names and Surnames */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Nombres Completos
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ej. Valentina"
                    required
                    className="w-full h-11 px-3 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs placeholder:text-emerald-700/40 dark:placeholder:text-emerald-400/30 border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Apellidos Completos
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ej. Cardona Ríos"
                    required
                    className="w-full h-11 px-3 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs placeholder:text-emerald-700/40 dark:placeholder:text-emerald-400/30 border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Institutional Email */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  Correo Electrónico Institucional / Personal
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/70 dark:text-emerald-400/60" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aprendiz@misena.edu.co"
                    required
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs placeholder:text-emerald-700/40 dark:placeholder:text-emerald-400/30 border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Dynamic Section: Instructor Area de Formación */}
              {selectedRole === 'instructor' && (
                <div className="flex flex-col gap-1 p-3.5 bg-[#f0f7f2] dark:bg-[#14231b] rounded-2xl border border-[#d6eade] dark:border-[#20382b] transition-all">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                      Área de Formación
                    </label>
                    <span className="text-[10px] text-teal-700 dark:text-teal-300">Aplica únicamente para Instructores</span>
                  </div>
                  <div className="relative">
                    <BookOpen className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/70 dark:text-emerald-400/60" />
                    <input
                      type="text"
                      value={areaFormacion}
                      onChange={(e) => setAreaFormacion(e.target.value)}
                      placeholder="Ej. Tecnologías de la Información / Deportes / Bilingüismo"
                      required
                      className="w-full h-11 pl-9 pr-3 rounded-xl bg-white dark:bg-[#101c15] text-emerald-950 dark:text-white text-xs placeholder:text-emerald-700/40 dark:placeholder:text-emerald-400/30 border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Dynamic Section: Aprendiz Ficha & Programa */}
              {selectedRole === 'aprendiz' && (
                <div className="p-4 rounded-2xl bg-[#f0f7f2] dark:bg-[#14231b] border border-[#d6eade] dark:border-[#1f372a] flex flex-col gap-3 transition-all">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                    <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Datos de Ficha y Formación Técnica</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-7 flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-emerald-900/80 dark:text-emerald-200/80">
                        Programa de Formación
                      </label>
                      <input
                        type="text"
                        value={program}
                        onChange={(e) => setProgram(e.target.value)}
                        required
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#101c15] text-emerald-950 dark:text-white text-xs border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="sm:col-span-5 flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-emerald-900/80 dark:text-emerald-200/80">
                        Número de Ficha
                      </label>
                      <input
                        type="text"
                        value={ficha}
                        onChange={(e) => setFicha(e.target.value)}
                        required
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#101c15] text-emerald-950 dark:text-white text-xs font-mono border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-emerald-900/80 dark:text-emerald-200/80">
                      Jornada Académica
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['diurna', 'mixta', 'nocturna', 'virtual'] as const).map((j) => (
                        <label 
                          key={j}
                          className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium cursor-pointer border transition-colors ${
                            jornada === j
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-400 dark:border-emerald-500/50'
                              : 'bg-white dark:bg-[#101c15] text-emerald-800/80 dark:text-emerald-400/70 border-[#d6eade] dark:border-[#1f3629] hover:bg-emerald-50 dark:hover:bg-[#16271e]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="jornada"
                            value={j}
                            checked={jornada === j}
                            onChange={() => setJornada(j)}
                            className="accent-emerald-600"
                          />
                          <span className="capitalize">{j}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SECURITY PIN BLOCK (4-digit Key) */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-[#f0f7f2] to-teal-50 dark:from-[#122319] dark:via-[#0e1b13] dark:to-[#12241a] border border-[#d6eade] dark:border-[#203a2b] flex flex-col gap-3 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                    <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-950 dark:text-white">PIN Personal de Seguridad (4 dígitos)</span>
                  </div>
                  <span className="self-start sm:self-auto px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600/40 text-[10px] font-bold">
                    Autenticación &lt; 5 seg
                  </span>
                </div>

                <p className="text-xs text-emerald-800/80 dark:text-emerald-200/70 leading-relaxed">
                  Este código numérico secreto te servirá para confirmar asistencia inmediatamente en el Kiosco y eventos sin llenar formularios repetitivos.
                </p>

                {/* 4 OTP Digits */}
                <div className="flex items-center gap-2.5 mt-1">
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={idx}
                      ref={pinInputRefs[idx]}
                      type="password"
                      maxLength={1}
                      value={pinDigits[idx]}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(idx, e)}
                      placeholder="•"
                      required
                      className="w-12 h-12 text-center text-xl font-bold font-mono rounded-xl bg-white dark:bg-[#14251c] text-emerald-700 dark:text-emerald-300 border border-[#d6eade] dark:border-[#264433] focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/50 dark:focus:bg-[#172c20] transition-all shadow-inner"
                    />
                  ))}
                  <div className="ml-3 hidden sm:flex flex-col text-xs">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300">Fácil de recordar</span>
                    <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/60">Solo visible para ti</span>
                  </div>
                </div>
              </div>

              {/* Error Feedback */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/80 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-500/40 text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 dark:shadow-emerald-950/70 transition-all duration-200 active:scale-[0.99] cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Registrando en Supabase...' : 'Registrarse en el Sistema'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearForm}
                  className="w-full sm:w-auto h-12 px-5 rounded-2xl bg-[#f0f7f2] dark:bg-[#14231b] hover:bg-emerald-100 dark:hover:bg-[#182b21] text-emerald-800 dark:text-emerald-300/70 hover:text-emerald-950 dark:hover:text-white border border-[#d6eade] dark:border-[#1f3629] font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Limpiar</span>
                </button>
              </div>
            </form>

            {/* Success Card */}
            {successMessage && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/90 border border-emerald-300 dark:border-emerald-500/50 text-emerald-900 dark:text-emerald-200 flex items-start gap-3 transition-all">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-emerald-950 dark:text-white">¡Registro completado con éxito!</span>
                  <p className="text-xs text-emerald-800/90 dark:text-emerald-200/80 mt-1 leading-relaxed">
                    {successMessage} Ya puedes registrarte en cualquier evento de bienestar en menos de 5 segundos.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Tactile Desktop Widgets & Assistance Guides */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Guide Card */}
            <div className="bg-white dark:bg-[#0f1914] rounded-3xl p-6 border border-[#d6eade] dark:border-[#1c3225] shadow-xl shadow-black/5 dark:shadow-black/40 flex flex-col gap-4 transition-colors">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <HelpCircle className="w-5 h-5" />
                <h3 className="text-sm font-bold text-emerald-950 dark:text-white">Guía de Acceso al Portal</h3>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">
                  A
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-emerald-950 dark:text-white">Participantes Nuevos</span>
                  <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/70 mt-0.5 leading-relaxed">
                    Selecciona tu vinculación, completa tus datos y define tu PIN confidencial de 4 dígitos para agilizar tu asistencia.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-teal-100 dark:bg-[#14261d] border border-teal-300 dark:border-teal-700/50 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center justify-center shrink-0">
                  B
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-emerald-950 dark:text-white">Equipo de Bienestar</span>
                  <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/70 mt-0.5 leading-relaxed">
                    Miembros del equipo de Bienestar pueden ingresar con sus credenciales para gestionar eventos y asistencias.
                  </p>
                </div>
              </div>
            </div>

            {/* Data Privacy Badge */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#0e1713] border border-[#d6eade] dark:border-[#1b2f23] flex items-start gap-3 transition-colors">
              <FileCheck2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-emerald-950 dark:text-white">
                  Tratamiento Seguro de Datos Personales
                </span>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/70 leading-relaxed">
                  Tus datos son almacenados bajo la política de protección institucional en Supabase y son de uso exclusivamente académico y de reporte de bienestar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
