import React, { useState, useEffect } from 'react';
import { 
  X, 
  CalendarDays, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  QrCode, 
  Save, 
  Check, 
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { EventCategory, EventItem, StaffUser } from '../types';
import { saveEvent, compressImageForUpload } from '../lib/supabase';
import { EVENT_CATEGORY_COVERS, EVENT_IMAGE_PRESETS, getEventCoverImage } from '../lib/eventImages';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: StaffUser;
  onEventCreated: (event: EventItem) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onEventCreated
}) => {
  const getDefaultCategory = (): EventCategory => {
    if (currentUser?.category_scope && currentUser.category_scope !== 'all') {
      return currentUser.category_scope;
    }
    return 'deportes';
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>(getDefaultCategory);
  const [coverImage, setCoverImage] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [date, setDate] = useState('2026-11-10');
  const [time, setTime] = useState('09:30 AM');
  const [location, setLocation] = useState('Coliseo Principal');
  const [capacity, setCapacity] = useState<number>(80);
  const [qrEnabled, setQrEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rbacError, setRbacError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const defaultCat = currentUser?.category_scope && currentUser.category_scope !== 'all'
        ? currentUser.category_scope
        : 'deportes';
      setCategory(defaultCat);
      setCoverImage(EVENT_CATEGORY_COVERS[defaultCat] || EVENT_CATEGORY_COVERS.deportes);
      setRbacError(null);
      setImageUploadError(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleCategorySelect = (cat: EventCategory) => {
    setRbacError(null);
    setCategory(cat);
    setCoverImage(EVENT_CATEGORY_COVERS[cat] || EVENT_CATEGORY_COVERS.deportes);
  };

  const handleCustomImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageUploadError('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    try {
      setIsUploadingImage(true);
      setImageUploadError(null);
      const res = await compressImageForUpload(file, 800, 0.85);
      setCoverImage(res.dataUrl);
    } catch (err: any) {
      setImageUploadError(err.message || 'Error al procesar la imagen.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);

    const resolvedCover = coverImage || EVENT_CATEGORY_COVERS[category] || EVENT_CATEGORY_COVERS.deportes;

    const newEv = await saveEvent({
      title: title.trim(),
      description: description.trim() || 'Actividad institucional coordinada por Bienestar.',
      category,
      date,
      time,
      location: location.trim(),
      capacity: Number(capacity) || 50,
      registered_count: 0,
      attended_count: 0,
      status: 'active',
      cover_image: resolvedCover,
      qr_enabled: qrEnabled,
      created_by: currentUser.id
    });

    setIsSubmitting(false);
    setTitle('');
    setDescription('');
    onEventCreated(newEv);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md">
      <div className="bg-white dark:bg-[#0f1914] w-full max-w-2xl rounded-3xl border border-[#d6eade] dark:border-[#1d3427] shadow-2xl shadow-black/20 dark:shadow-black/80 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-[#f0f7f2] dark:bg-[#13221a] border-b border-[#d6eade] dark:border-[#1c3225] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-emerald-950 dark:text-white">Crear Nuevo Evento Institucional</h3>
              <span className="text-xs text-emerald-700/80 dark:text-emerald-300/70">
                Formulario de registro y reserva de aforo en campus
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-emerald-700/60 dark:text-emerald-400/60 hover:bg-[#e2efe6] dark:hover:bg-[#1b2f23] hover:text-emerald-950 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* RBAC Notice Banner */}
        <div className="px-6 py-3 bg-[#e8f5ec] dark:bg-[#14261c] border-b border-[#d6eade] dark:border-[#1c3325] flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-900/90 dark:text-emerald-200/80 leading-relaxed">
            <strong className="text-emerald-800 dark:text-emerald-300 font-semibold">Creador asignado:</strong> Como <span className="font-semibold text-emerald-950 dark:text-emerald-100">{currentUser.name} ({currentUser.role_display.split('—')[0].trim()})</span>, el evento se registrará con tu autoría y aparecerá inmediatamente en tu panel de eventos y en tu lista de asistentes.
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              Título Oficial del Evento *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Ej. Taller Integral de Manejo del Estrés y Ansiedad"
              className="w-full bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white placeholder:text-emerald-700/40 dark:placeholder:text-emerald-400/40 text-xs px-3.5 py-2.5 rounded-xl border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              Descripción Breve
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción temática y objetivos de bienestar..."
              className="w-full bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white placeholder:text-emerald-700/40 dark:placeholder:text-emerald-400/40 text-xs px-3.5 py-2 rounded-xl border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              Categoría de Bienestar *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'deportes', label: 'Deporte' },
                { id: 'musica', label: 'Música' },
                { id: 'danzas', label: 'Danzas' },
                { id: 'psicologia', label: 'Psicología' },
                { id: 'salud', label: 'Salud' },
              ].map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCategorySelect(c.id as EventCategory)}
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                    category === c.id
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-700/20 dark:shadow-emerald-950'
                      : 'bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-800/80 dark:text-emerald-300/70 border-[#d6eade] dark:border-[#1f3629] hover:bg-emerald-100/50 dark:hover:bg-[#172a20] hover:text-emerald-950 dark:hover:text-white'
                  }`}
                >
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            {rbacError && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {rbacError}
              </span>
            )}
          </div>

          {/* Cover Image Selector & Live Preview */}
          <div className="flex flex-col gap-2 p-3.5 bg-[#f0f7f2] dark:bg-[#13221a] rounded-2xl border border-[#d6eade] dark:border-[#1f3629]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-emerald-950 dark:text-white flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Imagen de Portada del Evento</span>
              </label>
              <label className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-white flex items-center gap-1 cursor-pointer bg-white dark:bg-[#182b21] px-2.5 py-1 rounded-lg border border-[#d6eade] dark:border-[#223d2e] shadow-xs">
                <Upload className="w-3 h-3" />
                <span>{isUploadingImage ? 'Procesando...' : 'Subir Imagen'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleCustomImageFile}
                  disabled={isUploadingImage}
                />
              </label>
            </div>

            {imageUploadError && (
              <span className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {imageUploadError}
              </span>
            )}

            <div className="flex items-center gap-3">
              <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0 border border-emerald-300 dark:border-emerald-600/50 shadow-sm relative bg-black/10">
                <img
                  src={getEventCoverImage(coverImage, category)}
                  alt="Vista previa portada"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {EVENT_IMAGE_PRESETS.map((p) => {
                  const isSelected = (coverImage || EVENT_CATEGORY_COVERS[category]) === p.url;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setCoverImage(p.url)}
                      className={`relative rounded-lg overflow-hidden border p-1 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40'
                          : 'border-[#d6eade] dark:border-[#223d2e] hover:border-emerald-400 bg-white dark:bg-[#15251c]'
                      }`}
                    >
                      <div className="w-full h-7 rounded overflow-hidden mb-1">
                        <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] font-medium text-emerald-950 dark:text-emerald-100 block truncate">
                        {p.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Fecha Programada *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/70 dark:text-emerald-400/60" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs pl-9 pr-3 py-2.5 rounded-xl border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Hora de Inicio *
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/70 dark:text-emerald-400/60" />
                <input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  placeholder="09:30 AM"
                  className="w-full bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs pl-9 pr-3 py-2.5 rounded-xl border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Location & Capacity Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Lugar / Sede *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/70 dark:text-emerald-400/60" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  placeholder="Ej. Coliseo, Aula Magna, Sala B"
                  className="w-full bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs pl-9 pr-3 py-2.5 rounded-xl border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Aforo Máximo Permitido *
              </label>
              <div className="relative">
                <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/70 dark:text-emerald-400/60" />
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  required
                  className="w-full bg-[#f0f7f2] dark:bg-[#13221a] text-emerald-950 dark:text-white text-xs pl-9 pr-3 py-2.5 rounded-xl border border-[#d6eade] dark:border-[#1f3629] focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Toggle: Dynamic QR */}
          <div className="flex items-center justify-between p-3.5 bg-[#f0f7f2] dark:bg-[#13221a] rounded-2xl border border-[#d6eade] dark:border-[#1f3629]">
            <div className="flex items-center gap-2.5">
              <QrCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-emerald-950 dark:text-white">
                  Generación Dinámica de Código QR
                </span>
                <span className="text-[11px] text-emerald-700/80 dark:text-emerald-300/60">
                  Habilita verificación instantánea en los tótems del campus
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={qrEnabled}
              onChange={(e) => setQrEnabled(e.target.checked)}
              className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
            />
          </div>

          {/* Footer */}
          <div className="p-4 mt-2 bg-[#f0f7f2] dark:bg-[#13221a] rounded-2xl border border-[#d6eade] dark:border-[#1c3225] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300/70 hover:bg-emerald-100 dark:hover:bg-[#182b21] hover:text-emerald-950 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-700/20 dark:shadow-emerald-950 transition-all active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Publicar y Programar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
