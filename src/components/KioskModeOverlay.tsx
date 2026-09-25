import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  QrCode, 
  KeyRound, 
  Clock, 
  Building2, 
  ShieldCheck, 
  Sparkles,
  Camera,
  AlertCircle,
  Mail
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EventItem, AttendanceRecord } from '../types';
import { processFastCheckin } from '../lib/supabase';
import { RecoverPinModal } from './RecoverPinModal';

interface KioskModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentEvent: EventItem;
  attendees: AttendanceRecord[];
  onRefreshData: () => void;
}

export const KioskModeOverlay: React.FC<KioskModeOverlayProps> = ({
  isOpen,
  onClose,
  currentEvent,
  attendees,
  onRefreshData
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [pin, setPin] = useState('');
  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  const handleKeypadPress = (val: string) => {
    if (docNumber.length < 12) {
      setDocNumber(prev => prev + val);
    }
  };

  const handleBackspace = () => {
    setDocNumber(prev => prev.slice(0, -1));
  };

  const handleCheckin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!docNumber.trim() || !pin.trim()) return;

    const res = await processFastCheckin(docNumber, pin, currentEvent.id, 'kiosk_pin');
    
    if (res.status === 'confirmed') {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#22c55e', '#10b981', '#4ade80']
      });
      setFeedback({
        type: 'success',
        title: '¡Acceso Autorizado!',
        message: res.message
      });
      setDocNumber('');
      setPin('');
      onRefreshData();
      setTimeout(() => setFeedback(null), 4000);
    } else if (res.status === 'duplicate') {
      setFeedback({
        type: 'warning',
        title: 'Marcación Duplicada',
        message: res.message
      });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({
        type: 'error',
        title: res.status === 'wrong_pin' ? 'PIN Incorrecto' : 'No Encontrado',
        message: res.message
      });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-[#060a08] text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden">
      {/* Top Kiosk Bar */}
      <div className="flex items-center justify-between border-b border-[#18291f] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white">
              Tótem de Asistencia • Kiosco Inteligente
            </span>
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {currentEvent.title} ({currentEvent.location})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-[#0e1713] px-4 py-2 rounded-2xl border border-[#1b2f23]">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-mono font-bold text-emerald-300">
              {currentTime}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#14231b] hover:bg-emerald-950 text-emerald-300 text-xs font-semibold border border-[#1f3629] transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Salir de Vista Kiosco</span>
          </button>
        </div>
      </div>

      {/* Main Kiosk Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto max-w-6xl w-full mx-auto">
        {/* Left: Virtual QR Scanner & Camera Simulation */}
        <div className="lg:col-span-5 bg-[#0e1713] rounded-3xl p-6 border border-[#1b2f23] flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden shadow-2xl">
          <div className="w-full h-56 bg-[#080d0a] rounded-2xl border-2 border-dashed border-emerald-600/40 relative flex items-center justify-center overflow-hidden shadow-inner">
            <QrCode className="w-24 h-24 text-emerald-500/50 animate-pulse" />
            {/* Laser scanning bar */}
            <div className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-scanline" />
            <span className="absolute bottom-3 text-xs text-emerald-300/80 font-mono">
              Lector Activo • Acerque su credencial
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold text-white">Escaneo Autónomo</h3>
            <p className="text-xs text-emerald-200/70 max-w-xs">
              Ubica el código QR generado en tu carné o móvil frente a la cámara para validación en menos de 2 segundos.
            </p>
          </div>
        </div>

        {/* Right: Manual Document & PIN Entry */}
        <div className="lg:col-span-7 bg-[#0e1713] rounded-3xl p-6 sm:p-8 border border-[#1b2f23] flex flex-col gap-5 shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-[#1b2f23]">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              Marcación por Documento y PIN
            </span>
            <span className="text-xs text-emerald-400/80 font-mono">
              Backend Supabase Sincronizado
            </span>
          </div>

          {/* Feedback message */}
          {feedback && (
            <div 
              className={`p-4 rounded-2xl flex items-start gap-3 text-xs font-medium border animate-in fade-in zoom-in-95 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950 text-emerald-200 border-emerald-500/60'
                  : feedback.type === 'warning'
                  ? 'bg-amber-950 text-amber-200 border-amber-500/60'
                  : 'bg-red-950 text-red-200 border-red-500/60'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="font-bold text-sm">{feedback.title}</span>
                <span className="opacity-90 mt-0.5">{feedback.message}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-emerald-200 mb-1 block">
                Número de Documento
              </label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="1024567890"
                className="w-full text-base font-mono py-2.5 px-3.5 bg-[#13221a] text-white rounded-xl border border-[#1f3629] focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-emerald-200">
                  PIN de Seguridad (4 dígitos)
                </label>
                <button
                  type="button"
                  onClick={() => setIsRecoverModalOpen(true)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1 cursor-pointer"
                >
                  <Mail className="w-3 h-3" />
                  <span>¿Olvidaste tu PIN?</span>
                </button>
              </div>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full text-base font-mono tracking-widest text-center py-2.5 px-3.5 bg-[#13221a] text-white rounded-xl border border-[#1f3629] focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Numeric keypad for fast touch terminals */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (k === 'C') setDocNumber('');
                  else if (k === '⌫') handleBackspace();
                  else handleKeypadPress(k);
                }}
                className="h-12 rounded-xl bg-[#13221a] hover:bg-[#182b21] active:bg-emerald-600 active:text-white text-emerald-100 font-mono font-bold text-base border border-[#1f3629] transition-all"
              >
                {k}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleCheckin()}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Confirmar Ingreso en Pantalla</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-emerald-400/60 pt-4 border-t border-[#18291f]">
        <span>v2.4 Bienestar OS • Modo Kiosco Campus Central</span>
        <span className="flex items-center gap-1 text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          Conexión Segura con Supabase
        </span>
      </div>

      {/* Recover PIN Modal */}
      <RecoverPinModal
        isOpen={isRecoverModalOpen}
        onClose={() => setIsRecoverModalOpen(false)}
        initialIdentifier={docNumber}
        onPinSelected={(recoveredPin, recoveredDoc) => {
          if (recoveredDoc) setDocNumber(recoveredDoc);
          setPin(recoveredPin);
        }}
      />
    </div>
  );
};
