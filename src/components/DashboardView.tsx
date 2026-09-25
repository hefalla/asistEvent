import React, { useState } from 'react';
import { 
  BarChart3, 
  CalendarCheck, 
  Plus, 
  QrCode, 
  Users, 
  Download, 
  RefreshCw, 
  Activity, 
  AlertTriangle, 
  Check, 
  Clock, 
  ChevronRight, 
  Building2, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { StaffUser, EventItem, AttendanceRecord } from '../types';
import { exportAttendeesToCSV } from '../lib/csvExport';
import { hasFullEventAccess, getAccessibleEvents, getAccessibleAttendees } from '../lib/permissions';

interface DashboardViewProps {
  currentUser: StaffUser;
  events: EventItem[];
  attendees: AttendanceRecord[];
  onNavigate: (path: string) => void;
  onOpenCreateEvent: () => void;
  onOpenScanner: () => void;
  onRefreshData: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  events,
  attendees,
  onNavigate,
  onOpenCreateEvent,
  onOpenScanner,
  onRefreshData
}) => {
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const isFullAccess = hasFullEventAccess(currentUser);
  const scopedEvents = getAccessibleEvents(events, currentUser);
  const scopedAttendees = getAccessibleAttendees(attendees, events, currentUser);

  // Filter scoped events by area if selected
  const areaFilteredEvents = selectedArea === 'all'
    ? scopedEvents
    : scopedEvents.filter(e => e.category === selectedArea);

  const checkedCount = scopedAttendees.filter(a => a.checked_in).length;
  const activeEventsCount = areaFilteredEvents.filter(e => e.status === 'active').length;
  const totalCapacity = areaFilteredEvents.reduce((acc, curr) => acc + (curr.capacity || 0), 0);
  const totalOccupied = areaFilteredEvents.reduce((acc, curr) => acc + (curr.attended_count || 0), 0);
  const averageOccupancy = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
  const criticalCount = areaFilteredEvents.filter(e => {
    const rate = Math.round(((e.attended_count || 0) / (e.capacity || 1)) * 100);
    return rate >= 90;
  }).length;

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefreshData();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleExport = () => {
    setExportMessage('Generando reporte CSV...');
    setTimeout(() => {
      exportAttendeesToCSV(
        scopedAttendees,
        isFullAccess ? 'Consolidado_General_Bienestar' : `Reporte_Bienestar_${currentUser.role}`
      );
      setExportMessage('¡Reporte CSV descargado con éxito!');
      setTimeout(() => setExportMessage(null), 3000);
    }, 400);
  };

  // Dynamically resolve gender-appropriate greeting
  const isFemale = currentUser.gender === 'female' ||
    currentUser.name.toLowerCase().startsWith('dra.') ||
    currentUser.name.toLowerCase().includes('elena') ||
    currentUser.name.toLowerCase().includes('sandra') ||
    currentUser.name.toLowerCase().includes('valentina') ||
    currentUser.name.toLowerCase().includes('patricia') ||
    currentUser.role === 'enfermera' ||
    currentUser.role === 'lider_bienestar';

  const greeting = isFemale ? 'Bienvenida' : 'Bienvenido';

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Top Banner with Welcome Greeting, Area Filter, and Refresh */}
      <div className="bg-white dark:bg-[#0e1713] rounded-3xl p-6 lg:p-8 border border-[#d6eade] dark:border-[#1b2f23] shadow-xl shadow-black/5 dark:shadow-black/40 flex flex-col gap-6 relative overflow-hidden transition-colors">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-950 dark:text-white">
                {greeting}, <span className="text-emerald-600 dark:text-emerald-400">{currentUser.name}</span>
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border shadow-sm ${
                isFullAccess
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                  : 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-500/30'
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {isFullAccess ? 'Acceso Total Institucional' : 'Gestión de Eventos Propios'}
              </span>
            </div>
            <p className="text-sm text-emerald-800/80 dark:text-emerald-200/70 mt-1 max-w-2xl">
              {isFullAccess
                ? 'Monitoreo biométrico y aforo en tiempo real de todos los eventos del campus (Líder de Bienestar & Apoyo Administrativo).'
                : `Supervisión de eventos creados por tu cuenta (${scopedEvents.length} eventos). Solo la Líder de Bienestar y el Apoyo Administrativo disponen de acceso total institucional.`}
            </p>
          </div>

          {/* Area Filter Selector & Refresh Button */}
          <div className="flex items-center gap-2 self-start lg:self-auto bg-[#f0f7f2] dark:bg-[#13221a] p-1.5 rounded-2xl border border-[#d6eade] dark:border-[#203729]">
            <div className="flex items-center pl-2.5 pr-1 text-xs text-emerald-800/80 dark:text-emerald-300/80 font-medium">
              <Building2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Filtrar Área:</span>
            </div>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="bg-white dark:bg-[#0b140f] text-emerald-900 dark:text-emerald-100 text-xs font-medium py-1.5 px-3 rounded-xl border border-[#d6eade] dark:border-[#1b3024] focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">
                {isFullAccess ? 'Sede Global (Todas las áreas)' : 'Mis Eventos (Todas las áreas)'}
              </option>
              <option value="deportes">Deportes y Recreación</option>
              <option value="musica">Música y Cultura</option>
              <option value="psicologia">Salud Mental y Psicología</option>
              <option value="salud">Medicina y Tamizaje</option>
            </select>
            <button
              type="button"
              onClick={handleRefresh}
              className="p-1.5 rounded-xl text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:text-emerald-900 dark:hover:text-emerald-200 transition-colors"
              title="Sincronizar en vivo"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Master Two-Column Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 z-10">
          {/* Left Column: Resumen de Hoy */}
          <div className="lg:col-span-6 bg-[#f7fbf8] dark:bg-[#111e17] rounded-2xl p-6 border border-[#d6eade] dark:border-[#1d3427] flex flex-col justify-between shadow-sm relative transition-colors">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#e2efe6] dark:border-[#1b3024]">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                  <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-emerald-950 dark:text-white text-base font-bold">
                    {isFullAccess ? 'Resumen Institucional' : 'Resumen de Mis Eventos'}
                  </h2>
                </div>
                <span className="text-[11px] font-mono font-medium text-emerald-800 dark:text-emerald-300/80 bg-emerald-100/70 dark:bg-[#16271e] px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-[#243d2f]">
                  {isFullAccess ? 'Acceso Total' : 'Eventos Creados'}
                </span>
              </div>

              {/* 4 Grid Metric Display */}
              <div className="grid grid-cols-2 gap-y-6 gap-x-4 py-5">
                {/* Metric 1 */}
                <div className="flex flex-col">
                  <span className="text-xs text-emerald-800/80 dark:text-emerald-300/70 font-medium">Eventos Activos:</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono leading-none">
                      {activeEventsCount}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">en curso</span>
                  </div>
                  <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/60 mt-1">
                    {isFullAccess ? 'Global de la sede' : 'Creados por ti'}
                  </span>
                </div>

                {/* Metric 2 */}
                <div className="flex flex-col">
                  <span className="text-xs text-emerald-800/80 dark:text-emerald-300/70 font-medium">Completadas / Asistencias:</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300 font-mono leading-none">
                      {checkedCount}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">check-ins</span>
                  </div>
                  <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/60 mt-1">
                    Registros confirmados
                  </span>
                </div>

                {/* Metric 3 */}
                <div className="flex flex-col">
                  <span className="text-xs text-emerald-800/80 dark:text-emerald-300/70 font-medium">Aforo Promedio:</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-teal-700 dark:text-teal-300 font-mono leading-none">
                      {averageOccupancy}%
                    </span>
                    <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                      {averageOccupancy >= 80 ? 'alta conv.' : 'moderado'}
                    </span>
                  </div>
                  <div className="w-full bg-[#e2efe6] dark:bg-[#17271f] h-2 rounded-full mt-2 overflow-hidden border border-[#d6eade] dark:border-[#223b2e]">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-700" 
                      style={{ width: `${Math.min(averageOccupancy, 100)}%` }} 
                    />
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="flex flex-col">
                  <span className="text-xs text-emerald-800/80 dark:text-emerald-300/70 font-medium">Capacidad Crítica / Alertas:</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono leading-none">
                      {criticalCount}
                    </span>
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800/40">
                      {criticalCount > 0 ? 'Límite ≥90%' : 'Normal'}
                    </span>
                  </div>
                  <span className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-1">
                    {criticalCount > 0 ? 'Eventos con aforo crítico' : 'Aforo dentro del margen'}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Scan Mini Feed */}
            <div className="mt-2 p-3 bg-white dark:bg-[#14231b] rounded-xl border border-[#d6eade] dark:border-[#20372a] flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200/80">
              <div className="flex items-center gap-2 truncate">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span className="truncate">
                  <strong className="text-emerald-950 dark:text-white font-semibold">Estado del sistema:</strong> Monitoreo de asistencias y PIN activo
                </span>
              </div>
              <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400/80 ml-2 whitespace-nowrap">En vivo</span>
            </div>
          </div>

          {/* Right Column: Próximos Eventos Institucionales */}
          <div className="lg:col-span-6 bg-[#f7fbf8] dark:bg-[#111e17] rounded-2xl p-6 border border-[#d6eade] dark:border-[#1d3427] flex flex-col justify-between shadow-sm transition-colors">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#e2efe6] dark:border-[#1b3024]">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                  <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-emerald-950 dark:text-white text-base font-bold">
                    {isFullAccess ? 'Eventos Institucionales de la Sede' : 'Eventos Creados por Ti'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('eventos-institucionales')}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 flex items-center gap-0.5 transition-colors cursor-pointer"
                >
                  Ver agenda
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Event list */}
              {scopedEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-emerald-800/70 dark:text-emerald-300/70 flex flex-col items-center gap-3">
                  <p>Aún no has creado ningún evento institucional.</p>
                  <button
                    type="button"
                    onClick={onOpenCreateEvent}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    + Crear Primer Evento
                  </button>
                </div>
              ) : (
                <ul className="flex flex-col gap-2.5 mt-4">
                  {scopedEvents.slice(0, 4).map(ev => {
                    const occRate = Math.round(((ev.attended_count || 0) / (ev.capacity || 1)) * 100);
                    const isCrit = occRate >= 90;
                    return (
                      <li key={ev.id} className="p-3 rounded-xl bg-white dark:bg-[#14231b] hover:bg-emerald-50/60 dark:hover:bg-[#182b21] transition-colors border border-[#d6eade] dark:border-[#1f3629] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                            isCrit 
                              ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-300'
                              : 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300'
                          }`}>
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-emerald-950 dark:text-white truncate">
                              {ev.title}
                            </span>
                            <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/70 truncate">
                              {ev.location}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800/40">
                            {ev.time}
                          </span>
                          <span className={`text-xs font-semibold font-mono ${isCrit ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-700 dark:text-emerald-400'}`}>
                            {ev.attended_count || 0}/{ev.capacity}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions (Acciones Rápidas) */}
        <div className="bg-[#f7fbf8] dark:bg-[#111e17] rounded-2xl p-6 border border-[#d6eade] dark:border-[#1d3427] flex flex-col gap-4 z-10 transition-colors">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-emerald-950 dark:text-white">Acciones Rápidas</h2>
            <span className="text-xs text-emerald-700/80 dark:text-emerald-400/70 font-medium">Atajos de gestión ágil</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <button
              type="button"
              onClick={onOpenCreateEvent}
              className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 dark:shadow-emerald-950/60 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Evento</span>
            </button>

            <button
              type="button"
              onClick={onOpenScanner}
              className="py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:hover:bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 dark:shadow-emerald-950/60 transition-all active:scale-[0.98]"
            >
              <QrCode className="w-4 h-4" />
              <span>Simulador QR</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('lista-de-asistentes')}
              className="py-3 px-4 rounded-xl bg-white dark:bg-[#16291e] hover:bg-emerald-50 dark:hover:bg-[#1d3627] text-emerald-900 dark:text-emerald-200 border border-[#d6eade] dark:border-[#274433] font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Gestionar Asistentes</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('equipo-bienestar')}
              className="py-3 px-4 rounded-xl bg-white dark:bg-[#16291e] hover:bg-emerald-50 dark:hover:bg-[#1d3627] text-emerald-900 dark:text-emerald-200 border border-[#d6eade] dark:border-[#274433] font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Equipo de Bienestar</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="py-3 px-4 rounded-xl bg-white dark:bg-[#16291e] hover:bg-emerald-50 dark:hover:bg-[#1d3627] text-emerald-900 dark:text-emerald-200 border border-[#d6eade] dark:border-[#274433] font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{exportMessage || 'Reporte CSV'}</span>
            </button>
          </div>
        </div>

        {/* Participation Distribution by Area */}
        <div className="bg-[#f7fbf8] dark:bg-[#111e17] rounded-2xl p-6 border border-[#d6eade] dark:border-[#1d3427] flex flex-col gap-4 z-10 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-emerald-950 dark:text-white">Distribución de Participación por Área</h3>
              <span className="text-xs text-emerald-700/80 dark:text-emerald-400/70">
                Porcentaje sobre los asistentes validados en el ciclo institucional 2026-II
              </span>
            </div>
            <span className="self-start sm:self-auto text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-700/40">
              100% Cobertura
            </span>
          </div>

          {/* Stacked Visual Bar */}
          <div className="w-full flex flex-col gap-3">
            <div className="w-full h-4 bg-[#e2efe6] dark:bg-[#14231b] rounded-full overflow-hidden flex p-0.5 gap-0.5 border border-[#d6eade] dark:border-[#1d3427]">
              <div className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-l-full transition-all duration-700" style={{ width: '42%' }} title="Deportes: 42%" />
              <div className="bg-teal-600 dark:bg-teal-500 h-full transition-all duration-700" style={{ width: '25%' }} title="Cultura y Música: 25%" />
              <div className="bg-cyan-600 h-full transition-all duration-700" style={{ width: '18%' }} title="Psicología: 18%" />
              <div className="bg-emerald-800 dark:bg-emerald-700 h-full rounded-r-full transition-all duration-700" style={{ width: '15%' }} title="Salud Física: 15%" />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs text-emerald-900 dark:text-emerald-200/80 font-medium">Deportes</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                    42% <span className="text-emerald-600 dark:text-emerald-500 font-normal">(144)</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 dark:bg-teal-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs text-emerald-900 dark:text-emerald-200/80 font-medium">Cultura y Música</span>
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-300 font-mono">
                    25% <span className="text-teal-600 dark:text-teal-500 font-normal">(86)</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs text-emerald-900 dark:text-emerald-200/80 font-medium">Psicología</span>
                  <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300 font-mono">
                    18% <span className="text-cyan-600 dark:text-cyan-500 font-normal">(61)</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-800 dark:bg-emerald-700 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs text-emerald-900 dark:text-emerald-200/80 font-medium">Salud Física</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                    15% <span className="text-emerald-600 dark:text-emerald-600 font-normal">(51)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Institutional sync footnote */}
          <div className="flex items-center justify-between text-xs text-emerald-700/80 dark:text-emerald-400/80 pt-2 border-t border-[#e2efe6] dark:border-[#1a2e22]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Datos homologados con el Sistema de Bienestar al Aprendiz
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
              Supabase Sincronizado
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
