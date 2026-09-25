import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  Filter, 
  ShieldCheck, 
  Check, 
  KeyRound,
  FileSpreadsheet,
  CalendarDays
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AttendanceRecord, EventItem, StaffUser } from '../types';
import { exportAttendeesToCSV } from '../lib/csvExport';
import { processFastCheckin } from '../lib/supabase';
import { hasFullEventAccess, getAccessibleEvents, getAccessibleAttendees } from '../lib/permissions';

interface AttendeesViewProps {
  attendees: AttendanceRecord[];
  events: EventItem[];
  currentUser: StaffUser;
  onRefreshData: () => void;
  onNavigateToEvents?: () => void;
}

export const AttendeesView: React.FC<AttendeesViewProps> = ({
  attendees,
  events,
  currentUser,
  onRefreshData,
  onNavigateToEvents
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked' | 'pending'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedAttendeeForPin, setSelectedAttendeeForPin] = useState<AttendanceRecord | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const isFullAccess = hasFullEventAccess(currentUser);
  const userAccessibleEvents = getAccessibleEvents(events, currentUser);
  const userAccessibleAttendees = getAccessibleAttendees(attendees, events, currentUser);

  const filtered = userAccessibleAttendees.filter(a => {
    const matchEvent = selectedEventId === 'all' || a.event_id === selectedEventId;
    const matchStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'checked' ? a.checked_in : !a.checked_in;
    const matchRole = roleFilter === 'all' || a.role.toLowerCase() === roleFilter.toLowerCase();
    const term = searchTerm.toLowerCase();
    const matchSearch = a.name.toLowerCase().includes(term) ||
                        a.doc_number.includes(term) ||
                        (a.ficha || '').toLowerCase().includes(term) ||
                        a.email.toLowerCase().includes(term) ||
                        (a.event_title || '').toLowerCase().includes(term);
    return matchEvent && matchStatus && matchRole && matchSearch;
  });

  const total = userAccessibleAttendees.length;
  const attended = userAccessibleAttendees.filter(a => a.checked_in).length;
  const pending = total - attended;
  const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

  const handleQuickPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendeeForPin || !pinInput) return;

    const res = await processFastCheckin(
      selectedAttendeeForPin.doc_number,
      pinInput,
      selectedAttendeeForPin.event_id,
      'manual_staff'
    );

    if (res.success) {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
      setSelectedAttendeeForPin(null);
      setPinInput('');
      setPinError(null);
      onRefreshData();
    } else {
      setPinError(res.message);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Top Header Card with Summary Metrics */}
      <div className="bg-white dark:bg-[#0e1713] rounded-3xl p-6 lg:p-8 border border-[#d6eade] dark:border-[#1b2f23] shadow-xl shadow-black/5 dark:shadow-black/40 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-colors">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
              isFullAccess
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600/30'
                : 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-600/30'
            }`}>
              {isFullAccess ? 'Acceso Total Institucional' : 'Listados de Eventos Propios'}
            </span>
            <span className="text-xs text-emerald-700/80 dark:text-emerald-400/60 font-medium">
              • {isFullAccess ? 'Líder & Apoyo Administrativo' : currentUser.role_display.split('—')[0].trim()}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-950 dark:text-white">
            {isFullAccess ? 'Lista General de Asistentes' : 'Listados de Asistencia de Mis Eventos'}
          </h1>
          <p className="text-sm text-emerald-800/80 dark:text-emerald-200/70 max-w-3xl">
            {isFullAccess
              ? 'Padrón centralizado con verificación de PIN institucional y actas oficiales de todos los eventos del campus.'
              : `Acceso restringido: Visualizando únicamente los registros de asistencia de los eventos creados por ti (${userAccessibleEvents.length} eventos). Solo la Líder de Bienestar y el Apoyo Administrativo tienen acceso global.`}
          </p>
        </div>

        {/* Metrics Row */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="bg-[#f0f7f2] dark:bg-[#13221a] px-4 py-3 rounded-2xl border border-[#d6eade] dark:border-[#1f3629] flex flex-col">
            <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/70 font-medium">Inscritos</span>
            <span className="text-xl font-bold text-emerald-950 dark:text-white font-mono">{total}</span>
          </div>

          <div className="bg-[#f0f7f2] dark:bg-[#13221a] px-4 py-3 rounded-2xl border border-[#d6eade] dark:border-[#1f3629] flex flex-col">
            <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/70 font-medium">Confirmados</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{attended}</span>
          </div>

          <div className="bg-[#f0f7f2] dark:bg-[#13221a] px-4 py-3 rounded-2xl border border-[#d6eade] dark:border-[#1f3629] flex flex-col">
            <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/70 font-medium">Efectividad</span>
            <span className="text-xl font-bold text-teal-700 dark:text-teal-300 font-mono">{rate}%</span>
          </div>

          <button
            type="button"
            disabled={filtered.length === 0}
            onClick={() => exportAttendeesToCSV(filtered, isFullAccess ? 'Lista_Asistentes_Consolidada' : `Lista_Asistentes_${currentUser.role}`)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-emerald-500 text-white font-semibold text-xs px-5 py-3.5 rounded-2xl shadow-lg shadow-emerald-700/20 dark:shadow-emerald-950/60 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Descargar CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white dark:bg-[#0e1713] p-5 rounded-2xl border border-[#d6eade] dark:border-[#1b2f23] shadow-sm flex flex-col gap-4 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/60 dark:text-emerald-400/60" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, documento, correo, evento o ficha..."
              className="w-full bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white placeholder:text-emerald-700/40 dark:placeholder:text-emerald-400/40 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Event Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs py-2.5 px-3 rounded-xl border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
            >
              <option value="all">
                {isFullAccess
                  ? `Todos los Eventos (${events.length})`
                  : `Todos mis Eventos Creados (${userAccessibleEvents.length})`}
              </option>
              {userAccessibleEvents.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="md:col-span-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs py-2.5 px-3 rounded-xl border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
            >
              <option value="all">Todos los Roles</option>
              <option value="aprendiz">Aprendiz</option>
              <option value="instructor">Instructor</option>
              <option value="funcionario">Funcionario</option>
              <option value="invitado">Invitado</option>
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 pt-1 border-t border-[#e2efe6] dark:border-[#17271e] overflow-x-auto">
          <span className="text-xs text-emerald-800/80 dark:text-emerald-400/60 font-semibold uppercase tracking-wider mr-2 shrink-0">
            Estado:
          </span>
          {[
            { id: 'all', label: `Todos (${total})` },
            { id: 'checked', label: `Asistieron (${attended})` },
            { id: 'pending', label: `Pendientes (${pending})` },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-800 dark:text-emerald-300/70 border border-[#d6eade] dark:border-[#1f3629] hover:text-emerald-950 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[#0e1713] rounded-3xl border border-[#d6eade] dark:border-[#1b2f23] shadow-lg shadow-black/5 dark:shadow-black/30 overflow-hidden flex flex-col transition-colors">
        <div className="p-4 flex items-center justify-between bg-[#f0f7f2] dark:bg-[#111e17] border-b border-[#d6eade] dark:border-[#1b2f23]">
          <div className="flex items-center gap-2 text-emerald-950 dark:text-white font-bold text-sm">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Padrón de Asistentes</span>
          </div>
          <span className="text-xs text-emerald-700/80 dark:text-emerald-400/70 font-mono">
            {filtered.length} registros filtrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f7fbf8] dark:bg-[#122018] text-emerald-800/80 dark:text-emerald-300/70 border-b border-[#e2efe6] dark:border-[#1b3024]">
                <th className="py-3.5 px-4 font-semibold">Participante</th>
                <th className="py-3.5 px-3 font-semibold">Evento Asociado</th>
                <th className="py-3.5 px-3 font-semibold">Rol</th>
                <th className="py-3.5 px-3 font-semibold">Documento</th>
                <th className="py-3.5 px-3 font-semibold">Ficha / Programa</th>
                <th className="py-3.5 px-3 font-semibold">Hora de Marcación</th>
                <th className="py-3.5 px-3 font-semibold">Estado</th>
                <th className="py-3.5 px-4 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2efe6] dark:divide-[#17271e]">
              {userAccessibleEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                        <CalendarDays className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-emerald-950 dark:text-white">
                        Sin eventos creados por tu usuario
                      </h3>
                      <p className="text-xs text-emerald-800/80 dark:text-emerald-300/70 leading-relaxed">
                        Los roles del equipo de bienestar únicamente tienen acceso a los listados de asistencia de los eventos que han creado. La Líder de Bienestar y el Apoyo Administrativo disponen de acceso a toda la información institucional.
                      </p>
                      {onNavigateToEvents && (
                        <button
                          type="button"
                          onClick={onNavigateToEvents}
                          className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          Ir a Eventos y Crear Uno
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-emerald-800/60 dark:text-emerald-400/60">
                    No se encontraron asistentes con los criterios de búsqueda o filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filtered.map((att, idx) => {
                  const evMatched = events.find(e => e.id === att.event_id);
                  const eventName = evMatched?.title || att.event_title || 'Evento Institucional';
                  return (
                    <tr key={att.id || idx} className="hover:bg-[#f0f7f2] dark:hover:bg-[#13221a] transition-colors">
                      <td className="py-3.5 px-4">
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
                      <td className="py-3.5 px-3">
                        <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-100 line-clamp-1 max-w-[180px]" title={eventName}>
                          {eventName}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#f0f7f2] dark:bg-[#16271e] text-emerald-800 dark:text-emerald-300 border border-[#d6eade] dark:border-[#223b2d]">
                          {att.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-emerald-900 dark:text-emerald-200">
                        <span className="text-emerald-600 dark:text-emerald-400/60 text-[10px] mr-1">{att.doc_type}</span>
                        {att.doc_number}
                      </td>
                      <td className="py-3.5 px-3 text-emerald-800/90 dark:text-emerald-300/80 truncate max-w-[150px]">
                        {att.ficha || '--'}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-emerald-700 dark:text-emerald-300">
                        {att.time}
                      </td>
                      <td className="py-3.5 px-3">
                        {att.checked_in ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600/40">
                            <Check className="w-3 h-3" /> Asistió
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#f0f7f2] dark:bg-[#16271e] text-emerald-700 dark:text-emerald-400/60 border border-[#d6eade] dark:border-[#223b2d]">
                            <Clock className="w-3 h-3 text-emerald-500/50" /> Registrado
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {att.checked_in ? (
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-end gap-1">
                            <ShieldCheck className="w-4 h-4" /> Verificado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAttendeeForPin(att);
                              setPinInput('');
                              setPinError(null);
                            }}
                            className="px-3 py-1 rounded-xl bg-[#f0f7f2] dark:bg-[#16281f] hover:bg-emerald-600 hover:text-white text-emerald-800 dark:text-emerald-300 border border-[#d6eade] dark:border-[#243e2e] transition-all font-medium text-xs shadow-sm cursor-pointer"
                          >
                            Validar PIN
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Popover: Validar PIN Manualmente */}
      {selectedAttendeeForPin && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0e1713] rounded-3xl p-6 border border-[#d6eade] dark:border-[#1b2f23] max-w-sm w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-600/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-emerald-950 dark:text-white">Validar Asistencia</h3>
                <span className="text-xs text-emerald-700/80 dark:text-emerald-300/70 truncate">
                  {selectedAttendeeForPin.name}
                </span>
              </div>
            </div>

            <p className="text-xs text-emerald-800/80 dark:text-emerald-200/70">
              Ingresa el PIN de 4 dígitos configurado por el participante (Doc: {selectedAttendeeForPin.doc_number}).
            </p>

            <form onSubmit={handleQuickPinSubmit} className="flex flex-col gap-3">
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••"
                className="w-full text-center tracking-widest text-lg font-mono py-3 bg-[#f0f7f2] dark:bg-[#13221a] rounded-xl text-emerald-950 dark:text-white border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500"
              />

              {pinError && (
                <span className="text-xs text-red-500 dark:text-red-400 text-center font-medium">
                  {pinError}
                </span>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAttendeeForPin(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-800/70 dark:text-emerald-300/70 hover:bg-emerald-50 dark:hover:bg-[#16271e]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/20 dark:shadow-emerald-950"
                >
                  Confirmar Asistencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
