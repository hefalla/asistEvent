import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode as QrCodeIcon, 
  Calendar, 
  MapPin, 
  Clock, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { EventItem } from '../types';

interface EventQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
  onOpenCheckinView?: (eventId: string) => void;
}

export const EventQRModal: React.FC<EventQRModalProps> = ({
  isOpen,
  onClose,
  event,
  onOpenCheckinView
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Generate the check-in URL for this specific event
  const getCheckinUrl = (): string => {
    if (!event) return '';
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?checkin=${event.id}`;
  };

  const checkinUrl = getCheckinUrl();

  useEffect(() => {
    if (isOpen && event) {
      const url = `${window.location.origin}${window.location.pathname}?checkin=${event.id}`;
      QRCode.toDataURL(url, {
        width: 380,
        margin: 2,
        color: {
          dark: '#064e3b', // SENA Emerald Dark
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      })
        .then((urlData) => {
          setQrDataUrl(urlData);
        })
        .catch((err) => {
          console.error('Error generating QR code:', err);
        });
    }
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-Asistencia-${event.code || event.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = () => {
    if (!checkinUrl) return;
    navigator.clipboard.writeText(checkinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0f1914] rounded-3xl border border-[#d6eade] dark:border-[#1d3427] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#f0f7f2] dark:bg-[#13221a] border-b border-[#d6eade] dark:border-[#1c3225] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
              <QrCodeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-emerald-950 dark:text-white">
                  Código QR de Asistencia
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/40">
                  {event.code}
                </span>
              </div>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                Escaneo directo para registro con Documento y PIN
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex flex-col items-center">
          
          {/* Event Summary Card */}
          <div className="w-full p-4 rounded-2xl bg-[#f0f7f2] dark:bg-[#13221a] border border-[#d6eade] dark:border-[#1e3427] space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50">
                {event.category}
              </span>
              <span className="text-xs text-emerald-700/70 dark:text-emerald-400/60 font-medium">
                Aforo: {event.capacity} personas
              </span>
            </div>

            <h4 className="text-sm font-bold text-emerald-950 dark:text-white leading-snug">
              {event.title}
            </h4>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80">
              <span className="flex items-center gap-1.5 truncate">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">{event.date}</span>
              </span>
              <span className="flex items-center gap-1.5 truncate">
                <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">{event.time}</span>
              </span>
              <span className="col-span-2 flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">{event.location}</span>
              </span>
            </div>
          </div>

          {/* QR Code Presentation Box */}
          <div className="relative p-4 bg-white rounded-3xl border-2 border-emerald-500/30 shadow-xl flex flex-col items-center justify-center">
            {qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt={`Código QR para ${event.title}`} 
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-xs text-emerald-800/60">
                Generando código QR...
              </div>
            )}
            
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Escanea con la cámara del celular</span>
            </div>
          </div>

          {/* Explanation Banner */}
          <p className="text-xs text-center text-emerald-800/80 dark:text-emerald-300/80 max-w-sm leading-relaxed">
            Al escanear este código, el participante entrará a la pantalla de registro de este evento y <strong>únicamente deberá digitar su número de documento y PIN</strong>.
          </p>

          {/* Copy URL Field */}
          <div className="w-full flex items-center gap-2 p-1.5 pl-3 rounded-2xl bg-[#f0f7f2] dark:bg-[#13221a] border border-[#d6eade] dark:border-[#1e3427]">
            <span className="text-xs font-mono text-emerald-900/80 dark:text-emerald-300/80 truncate flex-1 select-all">
              {checkinUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-[#182b21] text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 border border-[#d6eade] dark:border-[#1f3629]'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleDownload}
              className="h-11 px-4 rounded-2xl bg-white dark:bg-[#13221a] hover:bg-emerald-50 dark:hover:bg-[#1a2f23] text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/50 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Descargar Imagen QR</span>
            </button>

            {onOpenCheckinView && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCheckinView(event.id);
                }}
                className="h-11 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 dark:shadow-emerald-950 transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Probar Registro de Asistencia</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
