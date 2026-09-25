import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  ShieldCheck, 
  CreditCard, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  Clock, 
  ArrowLeft, 
  Sparkles,
  UserCheck,
  RotateCcw,
  Sun,
  Moon,
  Users,
  Mail,
  Check
} from 'lucide-react';
import { EventItem, AttendanceRecord } from '../types';
import { processFastCheckin } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { RecoverPinModal } from './RecoverPinModal';

interface EventCheckinViewProps {
  event: EventItem;
  onBackToPortal: () => void;
  onRefreshData?: () => void;
}

export const EventCheckinView: React.FC<EventCheckinViewProps> = ({
  event,
  onBackToPortal,
  onRefreshData
}) => {
  const { theme, toggleTheme } = useTheme();

  // Form State: ONLY Document Number and PIN
  const [docNumber, setDocNumber] = useState('');
  const [pin, setPin] = useState('');

  // PIN Recovery Modal State
  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);
  const [pinLoadedToast, setPinLoadedToast] = useState(false);

  // Status & Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    status: 'confirmed' | 'duplicate' | 'wrong_pin' | 'not_found';
    message: string;
    attendee?: AttendanceRecord;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanDoc = docNumber.trim();
    const cleanPin = pin.trim();

    if (!cleanDoc) return;
    if (!cleanPin || cleanPin.length !== 4) return;

    setIsSubmitting(true);
    setResult(null);

    const res = await processFastCheckin(cleanDoc, cleanPin, event.id, 'qr_scanner');
    setIsSubmitting(false);
    setResult(res);

    if (res.success && res.status === 'confirmed') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      if (onRefreshData) {
        onRefreshData();
      }
    }
  };

  const handleReset = () => {
    setDocNumber('');
    setPin('');
    setResult(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#f8faf8] dark:bg-[#070d09] text-emerald-950 dark:text-emerald-100 flex flex-col items-center justify-between p-4 sm:p-6 transition-colors duration-200">
      
      {/* Top Navbar */}
      <header className="w-full max-w-xl flex items-center justify-between py-2">
        <button
          type="button"
          onClick={onBackToPortal}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-[#0f1914] text-emerald-900 dark:text-emerald-200 border border-[#d6eade] dark:border-[#1d3427] hover:bg-emerald-50 dark:hover:bg-[#15241c] text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Portal</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0f1914] border border-[#d6eade] dark:border-[#1d3427] flex items-center justify-center text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-[#15241c] transition-colors cursor-pointer shadow-sm"
          >
            {theme === 'dark' ? <Moon className="w-4 h-4 text-emerald-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
          </button>
        </div>
      </header>

      {/* Main Card Container */}
      <main className="w-full max-w-md my-auto py-4">
        <div className="bg-white dark:bg-[#0f1914] rounded-3xl border border-[#d6eade] dark:border-[#1c3225] shadow-2xl shadow-emerald-900/10 dark:shadow-black/70 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
          
          {/* Event Header Banner */}
          <div className="p-6 bg-gradient-to-br from-[#f0f7f2] to-[#e4f2e9] dark:from-[#13221a] dark:to-[#0f1b14] border-b border-[#d6eade] dark:border-[#1c3225]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
                {event.category}
              </span>
              <span className="text-[11px] font-semibold text-emerald-800/80 dark:text-emerald-400/80 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {event.code}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-white leading-tight">
              {event.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-emerald-800/80 dark:text-emerald-300/80">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{event.date}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{event.time}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{event.location}</span>
              </span>
            </div>
          </div>

          {/* Form / Result Body */}
          <div className="p-6 sm:p-7 space-y-6">

            {/* Title description */}
            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-emerald-950 dark:text-white">
                Registro Rápido de Asistencia
              </h2>
              <p className="text-xs text-emerald-800/70 dark:text-emerald-400/70">
                Digita tu número de documento y tu PIN secreto de 4 dígitos para registrar tu entrada oficial.
              </p>
            </div>

            {/* SUCCESS CONFIRMATION BADGE */}
            {result && result.status === 'confirmed' && result.attendee && (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border-2 border-emerald-500 text-emerald-950 dark:text-white flex flex-col items-center gap-3 text-center animate-in zoom-in-95 duration-200 shadow-lg shadow-emerald-700/10">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    ¡Asistencia Confirmada!
                  </span>
                  <h3 className="text-base font-bold text-emerald-950 dark:text-white">
                    {result.attendee.name}
                  </h3>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                    {result.attendee.role} • {result.attendee.ficha}
                  </p>
                </div>

                <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#13221a] border border-emerald-300 dark:border-emerald-700/60 text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Hora de ingreso: {result.attendee.time}</span>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-2 w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Registrar a Otra Persona</span>
                </button>
              </div>
            )}

            {/* DUPLICATE WARNING */}
            {result && result.status === 'duplicate' && result.attendee && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Marcación Duplicada Detectada</span>
                </div>
                <p className="leading-relaxed">
                  <strong>{result.attendee.name}</strong> ya registró su asistencia oficial a este evento a las <strong>{result.attendee.time}</strong>.
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-amber-700 dark:text-amber-400 underline cursor-pointer"
                >
                  Intentar con otro documento
                </button>
              </div>
            )}

            {/* ERROR NOT FOUND / WRONG PIN */}
            {result && (result.status === 'wrong_pin' || result.status === 'not_found') && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs flex flex-col gap-2.5 animate-in fade-in duration-150">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <span className="font-bold block">
                      {result.status === 'wrong_pin' ? 'PIN Incorrecto' : 'Documento No Encontrado'}
                    </span>
                    <span>{result.message}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/60 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsRecoverModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-100 underline cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>¿No recuerdas tu PIN? Recuérdamelo por correo electrónico</span>
                  </button>
                </div>
              </div>
            )}

            {/* PIN AUTO-LOADED TOAST */}
            {pinLoadedToast && (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-400 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in duration-200 shadow-sm">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">¡PIN cargado automáticamente desde el recordatorio! Presiona &ldquo;Registrar Mi Asistencia&rdquo;.</span>
              </div>
            )}

            {/* THE FORM: ONLY DOCUMENT NUMBER & PIN */}
            {(!result || result.status !== 'confirmed') && (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* 1. NÚMERO DE DOCUMENTO */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Número de Documento</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={docNumber}
                    onChange={(e) => {
                      setDocNumber(e.target.value);
                      if (result) setResult(null);
                    }}
                    placeholder="Ej. 1024567890"
                    className="w-full h-12 px-4 rounded-2xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-sm font-mono font-medium border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
                  />
                </div>

                {/* 2. PIN DE SEGURIDAD (4 DÍGITOS) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>PIN Secreto (4 dígitos)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-emerald-700/70 dark:text-emerald-400/60 font-mono">
                      {pin.length}/4 dígitos
                    </span>
                  </div>

                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    required
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setPin(val);
                      if (result) setResult(null);
                    }}
                    placeholder="••••"
                    className="w-full h-12 px-4 rounded-2xl bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-lg tracking-widest text-center font-mono font-bold border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
                  />
                  
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                      Código secreto de 4 números.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsRecoverModalOpen(true)}
                      className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>¿Olvidaste tu PIN?</span>
                    </button>
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={isSubmitting || !docNumber.trim() || pin.length !== 4}
                  className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 dark:shadow-emerald-950 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Verificando asistencia...' : 'Registrar Mi Asistencia'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Footer note */}
          <div className="p-4 bg-[#f0f7f2] dark:bg-[#13221a] border-t border-[#d6eade] dark:border-[#1c3225] flex items-center justify-center gap-2 text-[11px] text-emerald-700/80 dark:text-emerald-400/80 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sistema Institucional AsistEvent • Validación biométrica y PIN</span>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="text-center text-xs text-emerald-800/60 dark:text-emerald-400/50 py-2">
        Oficina de Bienestar al Aprendiz • Control de Asistencia Oficial
      </footer>

      {/* PIN Recovery Modal */}
      <RecoverPinModal
        isOpen={isRecoverModalOpen}
        onClose={() => setIsRecoverModalOpen(false)}
        initialIdentifier={docNumber}
        onPinSelected={(recoveredPin, recoveredDoc) => {
          if (recoveredDoc) {
            setDocNumber(recoveredDoc);
          }
          setPin(recoveredPin);
          if (result) setResult(null);
          setPinLoadedToast(true);
          setTimeout(() => setPinLoadedToast(false), 4000);
        }}
      />
    </div>
  );
};
