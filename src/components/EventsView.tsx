import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Users, 
  Calendar, 
  MapPin, 
  QrCode, 
  Edit3, 
  MoreVertical, 
  Music, 
  Activity, 
  HeartHandshake, 
  HeartPulse,
  Layers,
  CalendarDays,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  X,
  Lock,
  Sparkles
} from 'lucide-react';
import { EventItem, EventCategory, StaffUser } from '../types';
import { hasFullEventAccess, getAccessibleEvents, canFinalizeOrDeleteEvent } from '../lib/permissions';
import { INITIAL_STAFF_USERS } from '../lib/initialData';
import { getEventCoverImage } from '../lib/eventImages';

interface EventsViewProps {
  events: EventItem[];
  currentUser: StaffUser;
  onOpenCreateEvent: () => void;
  onSelectEventForAttendees: (eventId: string) => void;
  onSelectEventForAccess: (eventId: string) => void;
  onUpdateEventStatus?: (eventId: string, newStatus: 'active' | 'finished' | 'draft') => void;
  onDeleteEvent?: (eventId: string) => void;
  onShowEventQR?: (event: EventItem) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  currentUser,
  onOpenCreateEvent,
  onSelectEventForAttendees,
  onSelectEventForAccess,
  onUpdateEventStatus,
  onDeleteEvent,
  onShowEventQR
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'finished' | 'draft'>('active');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openMenuEventId, setOpenMenuEventId] = useState<string | null>(null);
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const isFullAccess = hasFullEventAccess(currentUser);
  const accessibleEvents = getAccessibleEvents(events, currentUser);

  const filteredEvents = accessibleEvents.filter(ev => {
    const matchStatus = selectedStatus === 'all' || ev.status === selectedStatus;
    const matchCategory = selectedCategory === 'all' || ev.category === selectedCategory;
    const matchSearch = ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        ev.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        ev.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchCategory && matchSearch;
  });

  const totalOccupied = accessibleEvents.reduce((acc, curr) => acc + (curr.attended_count || 0), 0);
  const totalCapacity = accessibleEvents.reduce((acc, curr) => acc + (curr.capacity || 0), 0);

  const countActive = accessibleEvents.filter(e => e.status === 'active').length;
  const countFinished = accessibleEvents.filter(e => e.status === 'finished').length;
  const countDraft = accessibleEvents.filter(e => e.status === 'draft').length;

  const showToast = (message: string) => {
    setFeedbackToast(message);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 3500);
  };

  const handleFinalizeOrReactivate = (event: EventItem) => {
    setOpenMenuEventId(null);
    if (!onUpdateEventStatus) return;
    const nextStatus = event.status === 'finished' ? 'active' : 'finished';
    onUpdateEventStatus(event.id, nextStatus);
    showToast(
      nextStatus === 'finished' 
        ? `Evento "${event.title}" marcado como finalizado.` 
        : `Evento "${event.title}" reactivado exitosamente.`
    );
  };

  const handleConfirmDelete = () => {
    if (!eventToDelete || !onDeleteEvent) return;
    const title = eventToDelete.title;
    onDeleteEvent(eventToDelete.id);
    setEventToDelete(null);
    setOpenMenuEventId(null);
    showToast(`Evento "${title}" y sus registros asociados fueron eliminados.`);
  };

  const getCategoryMeta = (cat: EventCategory) => {
    switch(cat) {
      case 'deportes':
        return { label: 'Deportes', icon: Activity };
      case 'musica':
        return { label: 'Música', icon: Music };
      case 'danzas':
        return { label: 'Danzas y Folclor', icon: Sparkles };
      case 'psicologia':
        return { label: 'Psicología', icon: HeartHandshake };
      case 'salud':
        return { label: 'Salud Integral', icon: HeartPulse };
      default:
        return { label: 'General', icon: Layers };
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-950 text-emerald-100 border border-emerald-700/60 px-4 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
          <button 
            type="button" 
            onClick={() => setFeedbackToast(null)}
            className="p-1 text-emerald-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-[#0e1713] p-6 lg:p-8 rounded-3xl border border-[#d6eade] dark:border-[#1b2f23] shadow-sm transition-colors">
        <div className="flex flex-col gap-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-emerald-800/80 dark:text-emerald-300/80 font-medium">
            <span className="font-semibold text-emerald-900 dark:text-emerald-200">
              {isFullAccess ? 'Supervisión Global de Eventos' : 'Gestión de Eventos Propios'}
            </span>
            <span>·</span>
            <span className="text-emerald-700/70 dark:text-emerald-400/60">
              {isFullAccess ? 'Acceso Institucional Total' : `${currentUser.name} (${currentUser.role_display.split('—')[0].trim()})`}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-950 dark:text-white">
            {isFullAccess ? 'Agenda de Eventos de Bienestar' : 'Mis Eventos Institucionales'}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-200/70">
            {isFullAccess
              ? 'Programación, control de aforo y listados centralizados de todos los eventos del campus.'
              : `Visualizando únicamente los eventos creados por ti (${accessibleEvents.length} eventos).`}
          </p>
        </div>

        {/* Metric Box & Create Button */}
        <div className="flex items-center gap-3 sm:gap-4 self-start lg:self-center flex-wrap">
          <div className="flex items-center gap-3 bg-[#f0f7f2] dark:bg-[#13221a] px-4 py-3 rounded-2xl border border-[#d6eade] dark:border-[#203729]">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#182b21] flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-[#d6eade] dark:border-[#264433] shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-emerald-700/80 dark:text-emerald-400/70">Aforo Ocupado</span>
              <span className="text-base font-bold text-emerald-950 dark:text-white font-mono">
                {totalOccupied} <span className="text-xs text-emerald-700/70 dark:text-emerald-400/60 font-normal">/ {totalCapacity} cupos</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCreateEvent}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-3 rounded-2xl shadow-md transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Evento</span>
          </button>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="flex flex-col gap-4 bg-white dark:bg-[#0e1713] p-5 rounded-2xl border border-[#d6eade] dark:border-[#1b2f23] shadow-sm transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/60 dark:text-emerald-400/60" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, ponente o lugar..."
              className="w-full bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white placeholder:text-emerald-700/50 dark:placeholder:text-emerald-400/40 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-[#d6eade] dark:border-[#203729] focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Status Segment Control (Functional buttons) */}
          <div className="flex items-center bg-[#f0f7f2] dark:bg-[#13221a] p-1 rounded-xl border border-[#d6eade] dark:border-[#203729]">
            {[
              { id: 'all', label: `Todos (${accessibleEvents.length})` },
              { id: 'active', label: `Activos (${countActive})` },
              { id: 'finished', label: `Finalizados (${countFinished})` },
              { id: 'draft', label: `Borradores (${countDraft})` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedStatus === tab.id
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-emerald-800/70 dark:text-emerald-300/60 hover:text-emerald-950 dark:hover:text-emerald-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Categories Controls */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          <span className="text-[11px] text-emerald-800/70 dark:text-emerald-400/60 font-semibold uppercase tracking-wider mr-1 shrink-0">
            Categoría:
          </span>
          {[
            { id: 'all', label: 'Todos', count: accessibleEvents.length },
            { id: 'deportes', label: 'Deportes', count: accessibleEvents.filter(e => e.category === 'deportes').length },
            { id: 'musica', label: 'Música', count: accessibleEvents.filter(e => e.category === 'musica').length },
            { id: 'danzas', label: 'Danzas', count: accessibleEvents.filter(e => e.category === 'danzas').length },
            { id: 'psicologia', label: 'Psicología', count: accessibleEvents.filter(e => e.category === 'psicologia').length },
            { id: 'salud', label: 'Salud Integral', count: accessibleEvents.filter(e => e.category === 'salud').length },
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all border ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white border-emerald-500 font-semibold shadow-sm'
                  : 'bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-800/80 dark:text-emerald-300/70 border-[#d6eade] dark:border-[#203729] hover:bg-emerald-100/60 dark:hover:bg-[#182b21] hover:text-emerald-950 dark:hover:text-white'
              }`}
            >
              <span>{cat.label}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-black/20 text-[10px] font-mono">
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Events Grid or Empty State */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white dark:bg-[#0e1713] rounded-3xl p-12 border border-[#d6eade] dark:border-[#1b2f23] text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#f0f7f2] dark:bg-[#13221a] border border-[#d6eade] dark:border-[#203729] text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CalendarDays className="w-8 h-8" />
          </div>
          <div className="flex flex-col max-w-md">
            <h3 className="text-base font-bold text-emerald-950 dark:text-white">
              {accessibleEvents.length === 0 ? 'No tienes eventos creados' : 'No hay eventos con los filtros seleccionados'}
            </h3>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/70 mt-1 leading-relaxed">
              {accessibleEvents.length === 0
                ? 'Como miembro del equipo de bienestar, puedes crear eventos institucionales y administrar sus registros.'
                : 'Intenta cambiar los filtros de categoría o estado activo.'}
            </p>
          </div>
          {accessibleEvents.length === 0 && (
            <button
              type="button"
              onClick={onOpenCreateEvent}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              + Crear Mi Primer Evento
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredEvents.map((event) => {
          const catMeta = getCategoryMeta(event.category);
          const CatIcon = catMeta.icon;
          const occupancyRate = Math.round((event.attended_count / (event.capacity || 1)) * 100);
          const isCritical = occupancyRate >= 90;
          const canManage = canFinalizeOrDeleteEvent(event, currentUser);
          const isMenuOpen = openMenuEventId === event.id;

          const author = INITIAL_STAFF_USERS.find(u => u.id === event.created_by);
          const authorLabel = author ? author.name.split(' ')[0] : (event.created_by ? 'Autor' : null);

          return (
            <div
              key={event.id}
              className="group relative flex flex-col justify-between bg-white dark:bg-[#0e1713] rounded-3xl p-6 border border-[#d6eade] dark:border-[#1b2f23] shadow-sm hover:border-emerald-400 dark:hover:border-emerald-500/40 transition-all duration-200"
            >
              <div className="flex flex-col gap-4">
                {/* Clean Unboxed Metadata Header (Zero-Pill Discipline) */}
                <div className="flex items-center justify-between gap-3 relative">
                  <div className="flex items-center gap-2 text-xs text-emerald-800/80 dark:text-emerald-300/70 flex-wrap">
                    <span className="flex items-center gap-1 font-semibold text-emerald-900 dark:text-emerald-100">
                      <CatIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {catMeta.label}
                    </span>
                    <span className="text-emerald-300 dark:text-emerald-800">·</span>
                    <span className={`font-medium ${
                      event.status === 'finished' 
                        ? 'text-neutral-500 dark:text-neutral-400' 
                        : event.status === 'draft' 
                        ? 'text-amber-600 dark:text-amber-400' 
                        : 'text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {event.status === 'finished' ? 'Finalizado' : event.status === 'draft' ? 'Borrador' : 'Activo'}
                    </span>
                    {isCritical && (
                      <>
                        <span className="text-emerald-300 dark:text-emerald-800">·</span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">Aforo Crítico</span>
                      </>
                    )}
                    {isFullAccess && authorLabel && (
                      <>
                        <span className="text-emerald-300 dark:text-emerald-800">·</span>
                        <span className="text-emerald-700/60 dark:text-emerald-400/60">Por {authorLabel}</span>
                      </>
                    )}
                    {!isFullAccess && event.created_by === currentUser.id && (
                      <>
                        <span className="text-emerald-300 dark:text-emerald-800">·</span>
                        <span className="text-teal-700 dark:text-teal-400 font-medium">Creado por ti</span>
                      </>
                    )}
                  </div>

                  {/* Actions Dropdown Toggle Button */}
                  <div className="relative">
                    <button 
                      type="button" 
                      onClick={() => setOpenMenuEventId(isMenuOpen ? null : event.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-700/70 dark:text-emerald-400/70 hover:bg-[#f0f7f2] dark:hover:bg-[#15261d] hover:text-emerald-900 dark:hover:text-emerald-200 transition-colors"
                      title="Opciones del evento"
                      aria-label="Opciones del evento"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Action Menu Popover */}
                    {isMenuOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-[#111e17] rounded-2xl border border-[#d6eade] dark:border-[#1d3527] shadow-xl p-1.5 z-40 animate-in fade-in duration-100">
                        {canManage ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleFinalizeOrReactivate(event)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-900 dark:text-emerald-100 hover:bg-[#f0f7f2] dark:hover:bg-[#16291e] rounded-xl transition-colors text-left"
                            >
                              {event.status === 'finished' ? (
                                <>
                                  <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  <span>Reactivar Evento</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  <span>Finalizar Evento</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuEventId(null);
                                setEventToDelete(event);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors text-left"
                            >
                              <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                              <span>Eliminar Evento</span>
                            </button>
                          </>
                        ) : (
                          <div className="px-3 py-2 text-[11px] text-emerald-700/60 dark:text-emerald-400/60 flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>Solo el autor o líderes pueden modificar este evento</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Event Title & Cover Art snippet */}
                <div className="flex gap-4 items-start">
                  <div className="w-20 h-20 rounded-2xl bg-[#f0f7f2] dark:bg-[#14231b] shrink-0 overflow-hidden relative border border-[#d6eade] dark:border-[#1f3629] flex items-center justify-center">
                    <img 
                      src={getEventCoverImage(event.cover_image, event.category)}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={(e) => {
                        const fallback = getEventCoverImage(undefined, event.category);
                        if (e.currentTarget.src !== fallback) {
                          e.currentTarget.src = fallback;
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h2 className="text-base font-bold text-emerald-950 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors line-clamp-1">
                      {event.title}
                    </h2>
                    <p className="text-xs text-emerald-800/70 dark:text-emerald-200/60 line-clamp-2 mt-1">
                      {event.description}
                    </p>
                  </div>
                </div>

                {/* Schedule & Location specs */}
                <div className="grid grid-cols-2 gap-3 bg-[#f0f7f2] dark:bg-[#13221a] p-3 rounded-2xl border border-[#d6eade] dark:border-[#1f3629]">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/60 uppercase font-medium">Fecha & Hora</span>
                      <span className="text-xs font-semibold text-emerald-950 dark:text-emerald-100 truncate">
                        {event.date}, {event.time}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/60 uppercase font-medium">Lugar</span>
                      <span className="text-xs font-semibold text-emerald-950 dark:text-emerald-100 truncate">
                        {event.location}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Capacity Bar Section */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-emerald-800/80 dark:text-emerald-300/70">Ocupación de Aforo</span>
                    <span className="text-emerald-950 dark:text-white font-mono">
                      {event.attended_count} / {event.capacity} asistentes{' '}
                      <span className={isCritical ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                        ({occupancyRate}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#e2efe6] dark:bg-[#14231b] rounded-full overflow-hidden border border-[#d6eade] dark:border-[#203729]">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        isCritical 
                          ? 'bg-gradient-to-r from-amber-500 to-red-500' 
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      }`}
                      style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Grid */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#e2efe6] dark:border-[#182a20]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectEventForAttendees(event.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f0f7f2] hover:bg-emerald-100 dark:bg-[#14231b] dark:hover:bg-[#192e23] text-emerald-900 dark:text-emerald-200 border border-[#d6eade] dark:border-[#203729] text-xs font-medium transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Ver Asistentes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectEventForAccess(event.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Control Acceso</span>
                  </button>

                  {onShowEventQR && (
                    <button
                      type="button"
                      onClick={() => onShowEventQR(event)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#15241c] hover:bg-emerald-50 dark:hover:bg-[#1a2f23] text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/60 text-xs font-semibold shadow-sm transition-all cursor-pointer"
                      title="Ver y descargar Código QR de Asistencia"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>QR Asistencia</span>
                    </button>
                  )}
                </div>

                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleFinalizeOrReactivate(event)}
                    title={event.status === 'finished' ? 'Reactivar evento' : 'Finalizar evento'}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      event.status === 'finished'
                        ? 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
                        : 'border-[#d6eade] dark:border-[#203729] text-emerald-800/80 dark:text-emerald-300/80 hover:bg-[#f0f7f2] dark:hover:bg-[#13221a]'
                    }`}
                  >
                    {event.status === 'finished' ? 'Reactivar' : 'Finalizar'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Delete Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0f1914] w-full max-w-md rounded-3xl border border-red-200 dark:border-red-900/40 p-6 shadow-2xl flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-emerald-950 dark:text-white">
                ¿Eliminar este evento institucional?
              </h3>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/70 leading-relaxed">
                Estás a punto de eliminar <span className="font-semibold text-emerald-950 dark:text-white">"{eventToDelete.title}"</span>. Esta acción borrará el evento y todos los registros de asistencia asociados.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors cursor-pointer"
              >
                Sí, eliminar evento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
