import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  Users, 
  Search, 
  Download, 
  KeyRound, 
  QrCode, 
  Camera, 
  AlertCircle, 
  Zap, 
  Sparkles,
  ShieldCheck,
  Check,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AttendanceRecord, EventItem, StaffUser } from '../types';
import { processFastCheckin } from '../lib/supabase';
import { exportAttendeesToCSV } from '../lib/csvExport';
import { hasFullEventAccess, canAccessSpecificEvent } from '../lib/permissions';

interface AccessControlViewProps {
  currentEvent: EventItem;
  attendees: AttendanceRecord[];
  currentUser?: StaffUser;
  events?: EventItem[];
  onSelectEvent?: (eventId: string) => void;
  onRefreshData: () => void;
}

export const AccessControlView: React.FC<AccessControlViewProps> = ({
  currentEvent,
  attendees,
  currentUser,
  events,
  onSelectEvent,
  onRefreshData
}) => {
  const [docNumber, setDocNumber] = useState('');
  const [pin, setPin] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'checked' | 'pending'>('all');
  const [isScanningSimulated, setIsScanningSimulated] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error' | null;
    title: string;
    message: string;
  } | null>(null);

  const hasAccess = currentUser ? canAccessSpecificEvent(currentEvent, currentUser) : true;
  const isFullAccess = currentUser ? hasFullEventAccess(currentUser) : false;

  const eventAttendees = attendees.filter(a => a.event_id === currentEvent.id || !a.event_id);
  const checkedInCount = eventAttendees.filter(a => a.checked_in).length;
  const totalCount = eventAttendees.length;
  const occupancyPercentage = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;

  const filteredAttendees = eventAttendees.filter(a => {
    const matchFilter = filterType === 'all' 
      ? true 
      : filterType === 'checked' ? a.checked_in : !a.checked_in;
    const term = searchTerm.toLowerCase();
    const matchSearch = a.name.toLowerCase().includes(term) || 
                        a.doc_number.includes(term) || 
                        (a.ficha || '').toLowerCase().includes(term);
    return matchFilter && matchSearch;
  });

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber.trim() || !pin.trim()) return;

    const res = await processFastCheckin(docNumber, pin, currentEvent.id, 'kiosk_pin');
    
    if (res.status === 'confirmed') {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#22c55e', '#10b981', '#4ade80']
      });
      setFeedback({
        type: 'success',
        title: '¡Asistencia Verificada (<1.8 seg)!',
        message: res.message
      });
      setDocNumber('');
      setPin('');
      onRefreshData();
    } else if (res.status === 'duplicate') {
      setFeedback({
        type: 'warning',
        title: 'Marcación Duplicada Detectada',
        message: res.message
      });
    } else {
      setFeedback({
        type: 'error',
        title: res.status === 'wrong_pin' ? 'PIN Incorrecto' : 'Asistente no encontrado',
        message: res.message
      });
    }
  };

  const handleSimulateQRScan = async () => {
    setIsScanningSimulated(true);
    const unverified = eventAttendees.filter(a => !a.checked_in);
    
    setTimeout(async () => {
      setIsScanningSimulated(false);
      if (unverified.length > 0) {
        const candidate = unverified[Math.floor(Math.random() * unverified.length)];
        const res = await processFastCheckin(candidate.doc_number, candidate.pin, currentEvent.id, 'qr_scanner');
        if (res.success) {
          confetti({
            particleCount: 30,
            spread: 50,
            origin: { y: 0.6 },
            colors: ['#10b981', '#34d399']
          });
          setFeedback({
            type: 'success',
            title: '¡Credencial QR Escaneada en Kiosco!',
            message: `Ingreso validado para ${candidate.name} vía escáner óptico.`
          });
          onRefreshData();
        }
      } else {
        setFeedback({
          type: 'warning',
          title: '100% de Asistentes Verificados',
          message: 'Todos los participantes convocados ya han registrado su asistencia en este evento.'
        });
      }
    }, 1200);
  };

  const handleQuickVerifyRow = (attendee: AttendanceRecord) => {
    setDocNumber(attendee.doc_number);
    setPin(attendee.pin);
  };

  if (!hasAccess) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
        <div className="bg-white dark:bg-[#0e1713] rounded-3xl p-10 border border-[#d6eade] dark:border-[#1b2f23] shadow-xl text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="flex flex-col max-w-lg">
            <h2 className="text-xl font-bold text-emerald-950 dark:text-white">
              Control de Acceso Restringido
            </h2>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/70 mt-2 leading-relaxed">
              Los roles del equipo de bienestar solo deben ver y tener acceso a los eventos y listados de asistencia que han creado. Solo la Líder de Bienestar y el Apoyo Administrativo disponen de acceso a toda la información de eventos.
            </p>
          </div>
          {events && events.length > 0 && onSelectEvent && (
            <div className="flex flex-col items-center gap-2 mt-2">
              <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Selecciona uno de los eventos creados por ti:
              </span>
              <div className="flex flex-wrap gap-2 justify-center">
                {events.map(ev => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onSelectEvent(ev.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
                  >
                    {ev.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Top Event Context & Quick Stats Banner */}
      <div className="bg-white dark:bg-[#0e1713] rounded-3xl p-6 lg:p-8 border border-[#d6eade] dark:border-[#1b2f23] shadow-xl shadow-black/5 dark:shadow-black/40 flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-colors">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 shadow-inner">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700/40">
                {currentEvent.code}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                isFullAccess
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/40'
                  : 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700/40'
              }`}>
                {isFullAccess ? 'Acceso Total Institucional' : 'Evento Creado por Ti'}
              </span>
              <span className="text-xs text-emerald-700/90 dark:text-emerald-400/80 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                En Curso • Punto de Validación
              </span>
            </div>

            {/* Event Title or Selector if user has multiple accessible events */}
            {events && events.length > 1 && onSelectEvent ? (
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={currentEvent.id}
                  onChange={(e) => onSelectEvent(e.target.value)}
                  className="text-base sm:text-lg font-bold text-emerald-950 dark:text-white bg-[#f0f7f2] dark:bg-[#13221a] py-1 px-2.5 rounded-xl border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.code})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <h1 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-white tracking-tight mt-1 truncate">
                {currentEvent.title}
              </h1>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-emerald-800/80 dark:text-emerald-300/70 text-xs mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {currentEvent.date} • {currentEvent.time}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {currentEvent.location}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Cupo: {currentEvent.capacity} participantes
              </span>
            </div>
          </div>
        </div>

        {/* Live Attendance Progress Ring & Counters */}
        <div className="flex items-center gap-5 self-end xl:self-auto bg-[#f0f7f2] dark:bg-[#13221a] px-5 py-3 rounded-2xl border border-[#d6eade] dark:border-[#1f3629]">
          <div className="flex flex-col text-right">
            <span className="text-xs text-emerald-800/80 dark:text-emerald-400/70 font-medium">Aforo Registrado</span>
            <div className="flex items-baseline gap-1.5 justify-end">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {checkedInCount}
              </span>
              <span className="text-xs text-emerald-700/70 dark:text-emerald-400/60">
                / {totalCount} ({currentEvent.capacity} máx)
              </span>
            </div>
            <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">
              {occupancyPercentage}% cupo cubierto
            </span>
          </div>

          {/* SVG Circular Ring Gauge */}
          <div className="relative w-13 h-13 shrink-0 flex items-center justify-center">
            <svg className="w-13 h-13 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-[#d6eade] dark:text-[#192b21]"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.8"
              />
              <path
                className="text-emerald-600 dark:text-emerald-400 transition-all duration-700 ease-out"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeDasharray={`${occupancyPercentage}, 100`}
                strokeLinecap="round"
                strokeWidth="3.8"
              />
            </svg>
            <span className="absolute text-xs font-bold text-emerald-950 dark:text-white font-mono">
              {occupancyPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Operational Grid: Table + Checkin Station */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 Cols): Table & Filters */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Actions & Filters Bar */}
          <div className="bg-white dark:bg-[#0e1713] p-4 rounded-2xl border border-[#d6eade] dark:border-[#1b2f23] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 transition-colors">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700/60 dark:text-emerald-400/60" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por documento o nombre..."
                className="w-full pl-9 pr-4 py-2 bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white placeholder:text-emerald-700/50 dark:placeholder:text-emerald-400/40 text-xs rounded-xl border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Filter Segmented Tabs */}
            <div className="flex items-center gap-1 bg-[#f0f7f2] dark:bg-[#13221a] p-1 rounded-xl border border-[#d6eade] dark:border-[#1f3629]">
              {[
                { id: 'all', label: `Todos (${totalCount})` },
                { id: 'checked', label: `Check-in (${checkedInCount})` },
                { id: 'pending', label: `Pendiente (${totalCount - checkedInCount})` },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterType === f.id
                      ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                      : 'text-emerald-800/70 dark:text-emerald-300/60 hover:text-emerald-950 dark:hover:text-emerald-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* CSV Export Button */}
            <button
              type="button"
              onClick={() => exportAttendeesToCSV(eventAttendees, currentEvent.title)}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md shadow-emerald-700/20 dark:shadow-emerald-950 transition-all shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar (CSV)</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-[#0e1713] rounded-2xl border border-[#d6eade] dark:border-[#1b2f23] shadow-sm overflow-hidden flex flex-col transition-colors">
            <div className="p-4 flex items-center justify-between bg-[#f0f7f2] dark:bg-[#111e17] border-b border-[#d6eade] dark:border-[#1b2f23]">
              <div className="flex items-center gap-2 text-emerald-950 dark:text-white font-bold text-sm">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Padrón Oficial de Asistentes</span>
              </div>
              <span className="text-xs text-emerald-700/80 dark:text-emerald-400/70 font-mono">
                Mostrando {filteredAttendees.length} de {totalCount} registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f7fbf8] dark:bg-[#122018] text-emerald-800/80 dark:text-emerald-300/70 border-b border-[#e2efe6] dark:border-[#1b3024]">
                    <th className="py-3 px-4 font-semibold">Participante</th>
                    <th className="py-3 px-3 font-semibold">Rol</th>
                    <th className="py-3 px-3 font-semibold">Documento</th>
                    <th className="py-3 px-3 font-semibold">Ficha / Dependencia</th>
                    <th className="py-3 px-3 font-semibold">Hora Acceso</th>
                    <th className="py-3 px-3 font-semibold">Estado</th>
                    <th className="py-3 px-4 font-semibold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2efe6] dark:divide-[#17271e]">
                  {filteredAttendees.map((att, idx) => (
                    <tr 
                      key={att.id || idx}
                      className="hover:bg-[#f0f7f2] dark:hover:bg-[#13221a] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700/40 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-xs">
                            {att.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-emerald-950 dark:text-white truncate">{att.name}</span>
                            <span className="text-[11px] text-emerald-700/70 dark:text-emerald-400/60 truncate">{att.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f0f7f2] dark:bg-[#16271e] text-emerald-800 dark:text-emerald-300 border border-[#d6eade] dark:border-[#223b2d]">
                          {att.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-900 dark:text-emerald-200">
                        <span className="text-emerald-600 dark:text-emerald-400/60 text-[10px] mr-1">{att.doc_type}</span>
                        {att.doc_number}
                      </td>
                      <td className="py-3 px-3 text-emerald-800/90 dark:text-emerald-300/80 truncate max-w-[140px]">
                        {att.ficha || '--'}
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-700 dark:text-emerald-300">
                        {att.time}
                      </td>
                      <td className="py-3 px-3">
                        {att.checked_in ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600/40">
                            <Check className="w-3 h-3" /> Asistió
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#f0f7f2] dark:bg-[#16271e] text-emerald-700 dark:text-emerald-400/60 border border-[#d6eade] dark:border-[#223b2d]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40"></span> Registrado
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {att.checked_in ? (
                          <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold flex items-center justify-end gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Verificado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQuickVerifyRow(att)}
                            className="px-2.5 py-1 rounded-lg bg-[#f0f7f2] dark:bg-[#16281f] hover:bg-emerald-600 hover:text-white text-emerald-800 dark:text-emerald-300 border border-[#d6eade] dark:border-[#243e2e] transition-all font-medium text-[11px]"
                          >
                            Cargar PIN
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (4 Cols): Check-in Rápido Station */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Fast PIN Verification Card (<5s) */}
          <div className="bg-white dark:bg-[#0e1713] rounded-2xl p-5 border border-[#d6eade] dark:border-[#1b2f23] shadow-sm flex flex-col gap-4 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2efe6] dark:border-[#1b3024]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-950 dark:text-white leading-tight">Check-in Rápido</h3>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/70">Validación biométrica o PIN &lt;5s</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700/40">
                Kiosco Listo
              </span>
            </div>

            {/* Validation Form */}
            <form onSubmit={handleCheckinSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 mb-1 block">
                  Número de Documento
                </label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="Ej. 1024567890"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#f0f7f2] dark:bg-[#13221a] rounded-xl text-xs font-mono text-emerald-950 dark:text-white placeholder:text-emerald-700/40 dark:placeholder:text-emerald-400/40 border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 mb-1 block">
                  PIN de Evento (4 dígitos)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#f0f7f2] dark:bg-[#13221a] rounded-xl text-xs font-mono text-emerald-950 dark:text-white tracking-widest placeholder:text-emerald-700/40 dark:placeholder:text-emerald-400/40 border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-1 bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white font-semibold text-xs py-3 rounded-xl shadow-lg shadow-emerald-700/20 dark:shadow-emerald-950 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Validar e Ingresar</span>
              </button>
            </form>

            {/* Feedback Alert Box */}
            {feedback && (
              <div 
                className={`p-3 rounded-xl flex items-start gap-2.5 text-xs transition-all border ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/40'
                    : feedback.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-500/40'
                    : 'bg-red-50 dark:bg-red-950/80 text-red-800 dark:text-red-200 border-red-300 dark:border-red-500/40'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-bold">{feedback.title}</span>
                  <span className="text-[11px] opacity-90 mt-0.5">{feedback.message}</span>
                </div>
              </div>
            )}

            <div className="p-2.5 bg-[#f0f7f2] dark:bg-[#13221a] rounded-xl border border-[#d6eade] dark:border-[#1f3629] flex items-center justify-between text-xs text-emerald-800/80 dark:text-emerald-300/70">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Modo Offline Activo (Sincronizado Supabase)
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
          </div>

          {/* Quick Scan Card & Visual Token */}
          <div className="bg-gradient-to-br from-emerald-700 to-teal-800 dark:from-[#112419] dark:to-[#0c1811] text-white rounded-2xl p-5 border border-emerald-600/30 dark:border-[#1e3828] shadow-lg flex flex-col gap-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white bg-black/20 dark:bg-emerald-950/90 px-2 py-0.5 rounded border border-white/20 dark:border-emerald-700/40">
                Lector de Códigos QR
              </span>
              <QrCode className="w-5 h-5 text-emerald-200 dark:text-emerald-400" />
            </div>

            <div className="flex flex-col">
              <h4 className="text-sm font-bold text-white">Módulo Check-in Kiosco</h4>
              <p className="text-xs text-emerald-100/80 dark:text-emerald-200/70 mt-0.5">
                Habilita el escaneo autónomo de credenciales digitales SENA para entrada fluida.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSimulateQRScan}
              disabled={isScanningSimulated}
              className="w-full mt-2 py-2.5 rounded-xl bg-white dark:bg-[#172c20] hover:bg-emerald-50 dark:hover:bg-[#1e3828] text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-600/40 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Camera className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${isScanningSimulated ? 'animate-spin' : ''}`} />
              <span>{isScanningSimulated ? 'Escaneando credencial...' : 'Simular Lectura QR'}</span>
            </button>
          </div>

          {/* Role breakdown chips */}
          <div className="bg-white dark:bg-[#0e1713] p-4 rounded-2xl border border-[#d6eade] dark:border-[#1b2f23] shadow-sm flex flex-col gap-2 transition-colors">
            <span className="text-[10px] font-bold text-emerald-700/80 dark:text-emerald-400/70 uppercase tracking-wider">
              Distribución por Rol
            </span>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-[#f0f7f2] dark:bg-[#13221a] px-3 py-1 rounded-full text-xs text-emerald-900 dark:text-emerald-200 border border-[#d6eade] dark:border-[#1f3629]">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Aprendices: <span className="font-bold text-emerald-950 dark:text-white">36</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#f0f7f2] dark:bg-[#13221a] px-3 py-1 rounded-full text-xs text-emerald-900 dark:text-emerald-200 border border-[#d6eade] dark:border-[#1f3629]">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                Instructores: <span className="font-bold text-emerald-950 dark:text-white">8</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#f0f7f2] dark:bg-[#13221a] px-3 py-1 rounded-full text-xs text-emerald-900 dark:text-emerald-200 border border-[#d6eade] dark:border-[#1f3629]">
                <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
                Funcionarios: <span className="font-bold text-emerald-950 dark:text-white">4</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
