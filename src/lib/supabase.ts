import { createClient, SupabaseClient } from '@supabase/supabase-js';
import emailjs from '@emailjs/browser';
import { EventItem, AttendanceRecord, Participant, StaffUser } from '../types';
import { INITIAL_EVENTS, INITIAL_ATTENDEES, INITIAL_STAFF_USERS } from './initialData';

// Storage keys for resilient offline and custom user credentials
const STORAGE_KEY_CONFIG = 'asistevent_supabase_config';
const STORAGE_KEY_EVENTS = 'asistevent_events_cache';
const STORAGE_KEY_ATTENDEES = 'asistevent_attendees_cache';
const STORAGE_KEY_PARTICIPANTS = 'asistevent_participants_cache';
const STORAGE_KEY_STAFF = 'asistevent_staff_cache';
const STORAGE_KEY_EMAILJS = 'asistevent_emailjs_config';

export interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const DEFAULT_SUPABASE_URL = 'https://ngcijcmdhskpyohzbply.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_y5-ZnwvkZUgyIbRk-E0x2g__0_24h5i';

export function getSavedConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey && !envUrl.includes('your-project')) {
    return { url: envUrl, anonKey: envKey };
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading saved Supabase config:', e);
  }

  return {
    url: envUrl || DEFAULT_SUPABASE_URL,
    anonKey: envKey || DEFAULT_SUPABASE_KEY
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  initSupabaseClient();
}

let supabaseInstance: SupabaseClient | null = null;

export function initSupabaseClient(): SupabaseClient | null {
  const config = getSavedConfig();
  if (config.url && config.anonKey && config.url.startsWith('http')) {
    try {
      supabaseInstance = createClient(config.url, config.anonKey, {
        auth: { persistSession: true }
      });
      return supabaseInstance;
    } catch (err) {
      console.warn('Could not initialize Supabase client:', err);
    }
  }
  supabaseInstance = null;
  return null;
}

export function getSupabase(): SupabaseClient | null {
  if (!supabaseInstance) {
    initSupabaseClient();
  }
  return supabaseInstance;
}

export function isSupabaseConnected(): boolean {
  const config = getSavedConfig();
  return Boolean(config.url && config.anonKey && config.url.startsWith('http'));
}

// Local cache helpers to maintain instant UI response and seamless synchronization
function getLocalCache<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalCache<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to cache in localStorage:', e);
  }
}

/**
 * Client-side image compressor: scales down and optimizes image to JPEG before upload
 */
async function compressImageForUpload(file: File, maxDimension = 600, quality = 0.85): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no válido o corrupto.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar el lienzo para optimizar la imagen.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              reject(new Error('Error al generar blob comprimido.'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a staff member's profile photograph to Supabase Storage ('staff-avatars' bucket)
 * with automatic optimization, error handling, and robust fallback.
 */
export async function uploadStaffAvatar(
  file: File,
  staffId: string
): Promise<{ success: boolean; url?: string; source?: 'storage' | 'base64'; message?: string; error?: string }> {
  if (!file.type.startsWith('image/')) {
    return { success: false, error: 'El archivo seleccionado debe ser una imagen válida (JPG, PNG, WebP).' };
  }

  // 1. Optimize image client-side to keep uploads fast (<1 sec) and low payload size (<100KB)
  let compressed: { blob: Blob; dataUrl: string };
  try {
    compressed = await compressImageForUpload(file);
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al procesar la fotografía.' };
  }

  const supabase = getSupabase();
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt) ? fileExt : 'jpg';
  const fileName = `${staffId}-${Date.now()}.${cleanExt}`;
  const filePath = `avatars/${fileName}`;

  // 2. If Supabase is connected, attempt upload to 'staff-avatars' bucket
  if (supabase) {
    try {
      let uploadRes = await supabase.storage.from('staff-avatars').upload(filePath, compressed.blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

      // If bucket does not exist, attempt to create it automatically
      if (
        uploadRes.error &&
        (uploadRes.error.message.includes('not found') ||
          uploadRes.error.message.includes('Bucket') ||
          uploadRes.error.message.includes('does not exist'))
      ) {
        try {
          await supabase.storage.createBucket('staff-avatars', { public: true });
          uploadRes = await supabase.storage.from('staff-avatars').upload(filePath, compressed.blob, {
            contentType: 'image/jpeg',
            upsert: true
          });
        } catch {
          // ignore bucket creation error and proceed
        }
      }

      if (!uploadRes.error && uploadRes.data) {
        const { data: publicData } = supabase.storage.from('staff-avatars').getPublicUrl(filePath);
        if (publicData?.publicUrl) {
          return {
            success: true,
            url: publicData.publicUrl,
            source: 'storage',
            message: 'Fotografía subida y almacenada exitosamente en Supabase Storage (bucket staff-avatars).'
          };
        }
      } else {
        console.warn('Supabase Storage upload warning:', uploadRes.error?.message);
      }
    } catch (err: any) {
      console.warn('Supabase Storage upload exception:', err?.message);
    }
  }

  // 3. Fallback: return optimized dataUrl so photo is immediately visible and stored in staff_users table
  return {
    success: true,
    url: compressed.dataUrl,
    source: 'base64',
    message: 'Fotografía optimizada y vinculada al perfil institucional.'
  };
}

// ==========================================
// SUPABASE DATABASE OPERATIONS (REAL TIME)
// ==========================================

export async function fetchStaffUsers(): Promise<StaffUser[]> {
  const supabase = getSupabase();
  const cached = getLocalCache<StaffUser[]>(STORAGE_KEY_STAFF, INITIAL_STAFF_USERS);

  const enrichStaff = (users: StaffUser[]): StaffUser[] => {
    return users.map(user => {
      const matchInit = INITIAL_STAFF_USERS.find(
        u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase()
      );
      const matchCached = cached.find(
        u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase()
      );
      return {
        ...user,
        doc_type: user.doc_type || matchCached?.doc_type || matchInit?.doc_type || 'CC',
        doc_number: user.doc_number || matchCached?.doc_number || matchInit?.doc_number || '',
        password: user.password || matchCached?.password || matchInit?.password || user.doc_number || matchCached?.doc_number || matchInit?.doc_number || '',
        status: user.status || matchCached?.status || matchInit?.status || 'active'
      };
    });
  };

  if (!supabase) {
    return enrichStaff(cached);
  }

  try {
    const { data, error } = await supabase.from('staff_users').select('*').order('created_at', { ascending: true });
    if (!error && data) {
      const enriched = enrichStaff(data as StaffUser[]);
      setLocalCache(STORAGE_KEY_STAFF, enriched);
      return enriched;
    }
    return enrichStaff(cached);
  } catch (err) {
    console.warn('Supabase fetchStaffUsers fallback:', err);
    return enrichStaff(cached);
  }
}

export async function createStaffUser(
  newStaff: Omit<StaffUser, 'id'> & { id?: string }
): Promise<{ success: boolean; data?: StaffUser; error?: string }> {
  const supabase = getSupabase();
  const staffId = newStaff.id || `staff-${Date.now().toString(36)}`;
  
  const docNumber = (newStaff.doc_number || '').trim();
  const password = (newStaff.password || docNumber).trim();

  const fullStaffUser: StaffUser = {
    ...newStaff,
    id: staffId,
    doc_type: newStaff.doc_type || 'CC',
    doc_number: docNumber,
    password: password,
    status: newStaff.status || 'active'
  };

  if (supabase) {
    try {
      // First attempt: try with full fields including doc_type, doc_number, password, status
      const insertPayload: any = {
        id: fullStaffUser.id,
        name: fullStaffUser.name,
        email: fullStaffUser.email,
        role: fullStaffUser.role,
        role_display: fullStaffUser.role_display,
        avatar: fullStaffUser.avatar,
        gender: fullStaffUser.gender || 'female',
        category_scope: fullStaffUser.category_scope || 'all',
        rbac_level: fullStaffUser.rbac_level,
        description: fullStaffUser.description || '',
        doc_type: fullStaffUser.doc_type,
        doc_number: fullStaffUser.doc_number,
        password: fullStaffUser.password,
        status: fullStaffUser.status
      };

      let { data, error } = await supabase.from('staff_users').insert([insertPayload]).select().single();

      // If remote Supabase table does not yet have doc_number/password/status columns
      if (error && (error.code === '42703' || error.message.includes('doc_number') || error.message.includes('password') || error.message.includes('doc_type') || error.message.includes('status'))) {
        console.warn('Retrying insert into staff_users with core schema columns...');
        const basePayload = {
          id: fullStaffUser.id,
          name: fullStaffUser.name,
          email: fullStaffUser.email,
          role: fullStaffUser.role,
          role_display: fullStaffUser.role_display,
          avatar: fullStaffUser.avatar,
          gender: fullStaffUser.gender || 'female',
          category_scope: fullStaffUser.category_scope || 'all',
          rbac_level: fullStaffUser.rbac_level,
          description: fullStaffUser.description || ''
        };
        const retryResult = await supabase.from('staff_users').insert([basePayload]).select().single();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        console.error('Supabase error inserting staff_user:', error);
        return { success: false, error: error.message };
      }

      if (data) {
        const finalUser: StaffUser = {
          ...data,
          doc_type: fullStaffUser.doc_type,
          doc_number: fullStaffUser.doc_number,
          password: fullStaffUser.password,
          status: fullStaffUser.status
        };
        // Update local cache
        const cached = getLocalCache<StaffUser[]>(STORAGE_KEY_STAFF, INITIAL_STAFF_USERS);
        const updated = [...cached.filter(u => u.id !== finalUser.id), finalUser];
        setLocalCache(STORAGE_KEY_STAFF, updated);
        return { success: true, data: finalUser };
      }
    } catch (err: any) {
      console.error('Supabase network error inserting staff_user:', err);
      return { success: false, error: err.message || 'Error de conexión' };
    }
  }

  // Local fallback
  const cached = getLocalCache<StaffUser[]>(STORAGE_KEY_STAFF, INITIAL_STAFF_USERS);
  const updated = [...cached.filter(u => u.id !== fullStaffUser.id), fullStaffUser];
  setLocalCache(STORAGE_KEY_STAFF, updated);
  return { success: true, data: fullStaffUser };
}

export async function updateStaffUser(
  updatedStaff: StaffUser
): Promise<{ success: boolean; data?: StaffUser; error?: string }> {
  const supabase = getSupabase();
  const cached = getLocalCache<StaffUser[]>(STORAGE_KEY_STAFF, INITIAL_STAFF_USERS);

  const cleanDoc = (updatedStaff.doc_number || '').trim();
  const cleanPass = (updatedStaff.password || cleanDoc).trim();

  const normalizedUser: StaffUser = {
    ...updatedStaff,
    doc_number: cleanDoc,
    password: cleanPass,
    status: updatedStaff.status || 'active'
  };

  // 1. Always update local cache immediately for instant, resilient response
  const updatedList = cached.map(u => (u.id === normalizedUser.id ? { ...u, ...normalizedUser } : u));
  setLocalCache(STORAGE_KEY_STAFF, updatedList);

  // 2. Synchronize active local session if this is the currently logged-in user
  try {
    const currentSession = localStorage.getItem('asistevent_staff_user');
    if (currentSession) {
      const parsed = JSON.parse(currentSession);
      if (parsed.id === normalizedUser.id) {
        localStorage.setItem('asistevent_staff_user', JSON.stringify({ ...parsed, ...normalizedUser }));
      }
    }
  } catch (e) {
    console.warn('Could not update active local session:', e);
  }

  // 3. Try to update in Supabase if online
  if (supabase) {
    try {
      const fullUpdatePayload: any = {
        name: normalizedUser.name,
        email: normalizedUser.email,
        role: normalizedUser.role,
        role_display: normalizedUser.role_display,
        avatar: normalizedUser.avatar,
        gender: normalizedUser.gender || 'female',
        category_scope: normalizedUser.category_scope || 'all',
        rbac_level: normalizedUser.rbac_level,
        description: normalizedUser.description || '',
        doc_type: normalizedUser.doc_type,
        doc_number: normalizedUser.doc_number,
        password: normalizedUser.password,
        status: normalizedUser.status
      };

      let { data, error } = await supabase
        .from('staff_users')
        .update(fullUpdatePayload)
        .eq('id', normalizedUser.id)
        .select()
        .single();

      // Retry with core columns if optional columns do not exist in remote Supabase table
      if (error && (error.code === '42703' || error.message.includes('column') || error.message.includes('status') || error.message.includes('doc_number') || error.message.includes('password'))) {
        const corePayload = {
          name: normalizedUser.name,
          email: normalizedUser.email,
          role: normalizedUser.role,
          role_display: normalizedUser.role_display,
          avatar: normalizedUser.avatar,
          gender: normalizedUser.gender || 'female',
          category_scope: normalizedUser.category_scope || 'all',
          rbac_level: normalizedUser.rbac_level,
          description: normalizedUser.description || ''
        };
        const retryResult = await supabase
          .from('staff_users')
          .update(corePayload)
          .eq('id', normalizedUser.id)
          .select()
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        console.warn('Supabase remote update returned error, kept local cache:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase updateStaffUser network error, retained local cache:', err.message);
    }
  }

  return { success: true, data: normalizedUser };
}

export async function toggleStaffStatus(
  staffId: string,
  newStatus: 'active' | 'disabled'
): Promise<{ success: boolean; data?: StaffUser; error?: string }> {
  const cached = getLocalCache<StaffUser[]>(STORAGE_KEY_STAFF, INITIAL_STAFF_USERS);
  const target = cached.find(u => u.id === staffId);
  if (!target) {
    return { success: false, error: 'Funcionario no encontrado' };
  }
  return updateStaffUser({ ...target, status: newStatus });
}

export async function fetchEvents(): Promise<EventItem[]> {
  const supabase = getSupabase();
  const cached = getLocalCache<EventItem[]>(STORAGE_KEY_EVENTS, INITIAL_EVENTS);

  if (!supabase) {
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });

    if (!error && data) {
      setLocalCache(STORAGE_KEY_EVENTS, data as EventItem[]);
      return data as EventItem[];
    }
    return cached;
  } catch (err) {
    console.warn('Supabase fetchEvents fallback to cache:', err);
    return cached;
  }
}

function getCoverForCategory(category?: string): string {
  switch (category) {
    case 'deportes':
      return '/src/assets/images/event_volleyball_court_1790266140041.jpg';
    case 'musica':
      return '/src/assets/images/event_folkloric_music_1790266151429.jpg';
    case 'danzas':
      return '/src/assets/images/event_folkloric_music_1790266151429.jpg';
    case 'salud':
      return '/src/assets/images/event_health_screening_1790266161602.jpg';
    case 'psicologia':
      return '/src/assets/images/event_mindfulness_workshop_1790266176598.jpg';
    default:
      return '/src/assets/images/event_volleyball_court_1790266140041.jpg';
  }
}

export async function saveEvent(event: Partial<EventItem>): Promise<EventItem> {
  const newEvent: EventItem = {
    id: event.id || `ev-${Date.now()}`,
    code: event.code || `EV-2026-${Math.floor(Math.random() * 90 + 10)}`,
    title: event.title || 'Nuevo Evento Institucional',
    description: event.description || '',
    category: event.category || 'deportes',
    date: event.date || new Date().toISOString().split('T')[0],
    time: event.time || '10:00 AM',
    location: event.location || 'Campus Central',
    capacity: event.capacity || 50,
    registered_count: event.registered_count || 0,
    attended_count: event.attended_count || 0,
    status: event.status || 'active',
    cover_image: event.cover_image || getCoverForCategory(event.category),
    qr_enabled: event.qr_enabled ?? true,
    created_by: event.created_by,
    created_at: event.created_at || new Date().toISOString()
  };

  const cached = getLocalCache<EventItem[]>(STORAGE_KEY_EVENTS, INITIAL_EVENTS);
  const updated = [newEvent, ...cached.filter(e => e.id !== newEvent.id)];
  setLocalCache(STORAGE_KEY_EVENTS, updated);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('events').upsert([newEvent]);
    } catch (err) {
      console.warn('Supabase saveEvent sync error:', err);
    }
  }

  return newEvent;
}

export async function updateEventStatus(
  eventId: string,
  status: 'active' | 'finished' | 'draft'
): Promise<EventItem | null> {
  const cached = getLocalCache<EventItem[]>(STORAGE_KEY_EVENTS, INITIAL_EVENTS);
  const targetIndex = cached.findIndex(e => e.id === eventId);
  if (targetIndex === -1) return null;

  const updatedEvent: EventItem = {
    ...cached[targetIndex],
    status
  };

  const updatedList = [...cached];
  updatedList[targetIndex] = updatedEvent;
  setLocalCache(STORAGE_KEY_EVENTS, updatedList);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('events').update({ status }).eq('id', eventId);
    } catch (err) {
      console.warn('Supabase updateEventStatus sync error:', err);
    }
  }

  return updatedEvent;
}

export async function deleteEvent(eventId: string): Promise<boolean> {
  // Update events cache
  const cachedEvents = getLocalCache<EventItem[]>(STORAGE_KEY_EVENTS, INITIAL_EVENTS);
  const remainingEvents = cachedEvents.filter(e => e.id !== eventId);
  setLocalCache(STORAGE_KEY_EVENTS, remainingEvents);

  // Update attendees cache: clean up associated checkins
  const cachedAttendees = getLocalCache<AttendanceRecord[]>(STORAGE_KEY_ATTENDEES, INITIAL_ATTENDEES);
  const remainingAttendees = cachedAttendees.filter(a => a.event_id !== eventId);
  setLocalCache(STORAGE_KEY_ATTENDEES, remainingAttendees);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('checkins').delete().eq('event_id', eventId);
      await supabase.from('events').delete().eq('id', eventId);
    } catch (err) {
      console.warn('Supabase deleteEvent sync error:', err);
    }
  }

  return true;
}

export async function fetchAttendees(eventId?: string): Promise<AttendanceRecord[]> {
  const cached = getLocalCache<AttendanceRecord[]>(STORAGE_KEY_ATTENDEES, INITIAL_ATTENDEES);
  const supabase = getSupabase();

  if (!supabase) {
    return eventId ? cached.filter(a => a.event_id === eventId) : cached;
  }

  try {
    let query = supabase.from('checkins').select('*').order('created_at', { ascending: false });
    if (eventId) {
      query = query.eq('event_id', eventId);
    }
    const { data, error } = await query;

    if (!error && data) {
      setLocalCache(STORAGE_KEY_ATTENDEES, data as AttendanceRecord[]);
      return data as AttendanceRecord[];
    }
    return eventId ? cached.filter(a => a.event_id === eventId) : cached;
  } catch (err) {
    console.warn('Supabase fetchAttendees fallback to cache:', err);
    return eventId ? cached.filter(a => a.event_id === eventId) : cached;
  }
}

export async function registerParticipant(participant: Omit<Participant, 'id' | 'created_at'>): Promise<{ success: boolean; participant?: Participant; message: string }> {
  // Strict check: 4-digit PIN
  if (!/^\d{4}$/.test(participant.pin)) {
    return { success: false, message: 'El PIN de seguridad debe contener exactamente 4 dígitos numéricos.' };
  }

  // Check unique document
  const cachedParticipants = getLocalCache<Participant[]>(STORAGE_KEY_PARTICIPANTS, []);
  const cachedAttendees = getLocalCache<AttendanceRecord[]>(STORAGE_KEY_ATTENDEES, INITIAL_ATTENDEES);

  const existsInParticipants = cachedParticipants.some(p => p.doc_number === participant.doc_number);
  const existsInAttendees = cachedAttendees.some(a => a.doc_number === participant.doc_number);

  if (existsInParticipants || existsInAttendees) {
    return { success: false, message: `Ya existe un registro con el número de documento ${participant.doc_number}.` };
  }

  const newParticipant: Participant = {
    ...participant,
    id: `part-${Date.now()}`,
    created_at: new Date().toISOString()
  };

  // Add to default active event attendee roster
  const defaultEvent = INITIAL_EVENTS[0];
  const newAttendee: AttendanceRecord = {
    id: `att-${Date.now()}`,
    event_id: defaultEvent.id,
    event_title: defaultEvent.title,
    participant_id: newParticipant.id,
    name: newParticipant.full_name,
    email: newParticipant.email,
    role: newParticipant.role.charAt(0).toUpperCase() + newParticipant.role.slice(1),
    doc_type: newParticipant.doc_type,
    doc_number: newParticipant.doc_number,
    ficha: newParticipant.ficha || newParticipant.program || 'Bienestar Institucional',
    time: '--',
    checked_in: false,
    pin: newParticipant.pin,
    created_at: newParticipant.created_at
  };

  setLocalCache(STORAGE_KEY_PARTICIPANTS, [...cachedParticipants, newParticipant]);
  setLocalCache(STORAGE_KEY_ATTENDEES, [newAttendee, ...cachedAttendees]);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('participants').insert([newParticipant]);
      await supabase.from('checkins').insert([newAttendee]);
    } catch (e) {
      console.warn('Supabase registerParticipant error:', e);
    }
  }

  return {
    success: true,
    participant: newParticipant,
    message: '¡Registro completado con éxito! Tu credencial virtual y PIN han sido vinculados.'
  };
}

export async function processFastCheckin(
  docNumber: string,
  pin: string,
  eventId?: string,
  method: 'kiosk_pin' | 'qr_scanner' | 'manual_staff' = 'kiosk_pin'
): Promise<{
  success: boolean;
  status: 'confirmed' | 'duplicate' | 'wrong_pin' | 'not_found';
  message: string;
  attendee?: AttendanceRecord;
}> {
  const cleanDoc = docNumber.trim();
  const cleanPin = pin.trim();

  const supabase = getSupabase();
  let attendees: AttendanceRecord[] = [];

  if (supabase) {
    try {
      const { data } = await supabase.from('checkins').select('*');
      if (data && data.length > 0) {
        attendees = data as AttendanceRecord[];
      }
    } catch (e) {
      console.warn('Could not read checkins from Supabase directly:', e);
    }
  }

  if (attendees.length === 0) {
    attendees = getLocalCache<AttendanceRecord[]>(STORAGE_KEY_ATTENDEES, INITIAL_ATTENDEES);
  }

  // Find matching record for this event
  let record = attendees.find(a => a.doc_number === cleanDoc && (!eventId || a.event_id === eventId));

  // If not found in attendees for this event, check if registered in participants or in another event
  if (!record && eventId) {
    const cachedParticipants = getLocalCache<Participant[]>(STORAGE_KEY_PARTICIPANTS, []);
    const anyAttendee = attendees.find(a => a.doc_number === cleanDoc);
    const participant = cachedParticipants.find(p => p.doc_number === cleanDoc);

    if (participant || anyAttendee) {
      const events = getLocalCache<EventItem[]>(STORAGE_KEY_EVENTS, INITIAL_EVENTS);
      const ev = events.find(e => e.id === eventId);
      const partPin = participant?.pin || anyAttendee?.pin || '';

      record = {
        id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        event_id: eventId,
        event_title: ev?.title || 'Evento Institucional',
        participant_id: participant?.id || anyAttendee?.participant_id || `part-${Date.now()}`,
        name: participant?.full_name || anyAttendee?.name || 'Participante',
        email: participant?.email || anyAttendee?.email || '',
        role: (participant?.role ? (participant.role.charAt(0).toUpperCase() + participant.role.slice(1)) : (anyAttendee?.role || 'Aprendiz')),
        doc_type: participant?.doc_type || anyAttendee?.doc_type || 'CC',
        doc_number: cleanDoc,
        ficha: participant?.ficha || anyAttendee?.ficha || 'Bienestar Institucional',
        time: '--',
        checked_in: false,
        pin: partPin,
        created_at: new Date().toISOString()
      };

      attendees = [record, ...attendees];
      setLocalCache(STORAGE_KEY_ATTENDEES, attendees);

      if (supabase) {
        supabase.from('checkins').insert([record]).then(() => {});
      }
    }
  }

  if (!record) {
    return {
      success: false,
      status: 'not_found',
      message: 'El número de documento no está registrado en el sistema. Regístrate previamente en el Portal de Bienestar.'
    };
  }

  if (record.pin !== cleanPin) {
    return {
      success: false,
      status: 'wrong_pin',
      message: 'PIN de acceso incorrecto. Verifique el código secreto de 4 dígitos configurado al registrarse.'
    };
  }

  if (record.checked_in) {
    return {
      success: false,
      status: 'duplicate',
      message: `Marcación duplicada detectada. ${record.name} ya registró su asistencia oficial a las ${record.time}.`,
      attendee: record
    };
  }

  // Update checkin
  const now = new Date();
  const hours = now.getHours();
  const mins = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = (hours % 12 || 12).toString().padStart(2, '0');
  const timeString = `${displayHours}:${mins} ${ampm}`;

  const updatedRecord: AttendanceRecord = {
    ...record,
    checked_in: true,
    time: timeString,
    method
  };

  const updatedAttendees = attendees.map(a => a.id === record.id ? updatedRecord : a);
  setLocalCache(STORAGE_KEY_ATTENDEES, updatedAttendees);

  // Increment event attended count
  const events = getLocalCache<EventItem[]>(STORAGE_KEY_EVENTS, INITIAL_EVENTS);
  const updatedEvents = events.map(ev => {
    if (ev.id === record.event_id) {
      return { ...ev, attended_count: ev.attended_count + 1 };
    }
    return ev;
  });
  setLocalCache(STORAGE_KEY_EVENTS, updatedEvents);

  if (supabase) {
    try {
      await supabase.from('checkins').update({
        checked_in: true,
        time: timeString,
        method
      }).eq('id', record.id);

      const { data: evData } = await supabase.from('events').select('attended_count').eq('id', record.event_id).single();
      if (evData) {
        await supabase.from('events').update({ attended_count: (evData.attended_count || 0) + 1 }).eq('id', record.event_id);
      }
    } catch (e) {
      console.warn('Supabase update checkin error:', e);
    }
  }

  return {
    success: true,
    status: 'confirmed',
    message: `¡Asistencia Verificada (<1.8 seg)! Ingreso autorizado para ${record.name}.`,
    attendee: updatedRecord
  };
}

export interface PinRecoveryResult {
  success: boolean;
  message: string;
  name?: string;
  email?: string;
  maskedEmail?: string;
  pin?: string;
  doc_number?: string;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email || '';
  const [user, domain] = email.split('@');
  if (user.length <= 2) {
    return `${user.slice(0, 1)}***@${domain}`;
  }
  const visibleStart = user.slice(0, 2);
  const visibleEnd = user.slice(-1);
  return `${visibleStart}****${visibleEnd}@${domain}`;
}

export async function recoverParticipantPin(identifier: string): Promise<PinRecoveryResult> {
  const cleanId = identifier.trim().toLowerCase();
  if (!cleanId) {
    return {
      success: false,
      message: 'Por favor ingresa tu número de documento o correo electrónico registrado.'
    };
  }

  const supabase = getSupabase();
  let participant: { name: string; email: string; pin: string; doc_number: string } | null = null;

  // 1. Try finding in Supabase participants
  if (supabase) {
    try {
      const { data } = await supabase
        .from('participants')
        .select('*')
        .or(`doc_number.eq.${cleanId},email.ilike.${cleanId}`)
        .limit(1);

      if (data && data.length > 0) {
        const p = data[0];
        participant = {
          name: p.full_name,
          email: p.email,
          pin: p.pin,
          doc_number: p.doc_number
        };
      }
    } catch (e) {
      console.warn('Supabase query participants error during pin recovery:', e);
    }
  }

  // 2. Try finding in Supabase checkins
  if (!participant && supabase) {
    try {
      const { data } = await supabase
        .from('checkins')
        .select('*')
        .or(`doc_number.eq.${cleanId},email.ilike.${cleanId}`)
        .limit(1);

      if (data && data.length > 0) {
        const c = data[0];
        participant = {
          name: c.name,
          email: c.email,
          pin: c.pin,
          doc_number: c.doc_number
        };
      }
    } catch (e) {
      console.warn('Supabase query checkins error during pin recovery:', e);
    }
  }

  // 3. Check local cache participants
  if (!participant) {
    const cachedParticipants = getLocalCache<Participant[]>(STORAGE_KEY_PARTICIPANTS, []);
    const p = cachedParticipants.find(
      x => x.doc_number.toLowerCase() === cleanId || x.email.toLowerCase() === cleanId
    );
    if (p) {
      participant = {
        name: p.full_name,
        email: p.email,
        pin: p.pin,
        doc_number: p.doc_number
      };
    }
  }

  // 4. Check local cache attendees
  if (!participant) {
    const cachedAttendees = getLocalCache<AttendanceRecord[]>(STORAGE_KEY_ATTENDEES, INITIAL_ATTENDEES);
    const a = cachedAttendees.find(
      x => x.doc_number.toLowerCase() === cleanId || (x.email && x.email.toLowerCase() === cleanId)
    );
    if (a) {
      participant = {
        name: a.name,
        email: a.email,
        pin: a.pin,
        doc_number: a.doc_number
      };
    }
  }

  if (!participant || !participant.pin) {
    return {
      success: false,
      message: 'No encontramos ningún registro con ese documento o correo. Verifica los datos o acércate a la mesa de registro de Bienestar.'
    };
  }

  const masked = maskEmail(participant.email);

  // 1. Try sending via EmailJS (Works 100% in browser on GitHub Pages and static hosting)
  const emailJsCfg = getEmailJSConfig();
  if (emailJsCfg.serviceId && emailJsCfg.templateId && emailJsCfg.publicKey) {
    try {
      await emailjs.send(
        emailJsCfg.serviceId,
        emailJsCfg.templateId,
        {
          to_email: participant.email,
          email: participant.email,
          user_email: participant.email,
          to_name: participant.name,
          name: participant.name,
          user_name: participant.name,
          doc_number: participant.doc_number,
          docNumber: participant.doc_number,
          pin: participant.pin,
          time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        },
        emailJsCfg.publicKey
      );

      return {
        success: true,
        message: `¡Correo despachado con éxito vía EmailJS! Se ha enviado el PIN a ${masked}. Revisa tu bandeja de entrada o spam.`,
        name: participant.name,
        email: participant.email,
        maskedEmail: masked,
        pin: participant.pin,
        doc_number: participant.doc_number
      };
    } catch (err: any) {
      console.error('EmailJS send error:', err);
      return {
        success: false,
        message: `Error en EmailJS: ${err?.text || err?.message || 'Verifica tu Service ID, Template ID y Public Key.'}`,
        name: participant.name,
        email: participant.email,
        maskedEmail: masked,
        pin: participant.pin,
        doc_number: participant.doc_number
      };
    }
  }

  // 2. Try sending via local backend /api/send-email (Runs on Node.js / localhost)
  let dispatchResult: { success: boolean; configured?: boolean; error?: string } = { success: true };
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: participant.email,
        name: participant.name,
        docNumber: participant.doc_number,
        pin: participant.pin
      })
    });
    if (res.ok) {
      dispatchResult = await res.json();
    } else {
      return {
        success: false,
        message: 'Para enviar correos en GitHub Pages, configura tu cuenta gratuita de EmailJS. Haz clic en "Configurar EmailJS" arriba.',
        name: participant.name,
        email: participant.email,
        maskedEmail: masked,
        pin: participant.pin,
        doc_number: participant.doc_number
      };
    }
  } catch {
    return {
      success: false,
      message: 'Para enviar correos en GitHub Pages, configura tu cuenta gratuita de EmailJS. Haz clic en "Configurar EmailJS" arriba.',
      name: participant.name,
      email: participant.email,
      maskedEmail: masked,
      pin: participant.pin,
      doc_number: participant.doc_number
    };
  }

  // If local Node is not configured
  if (!dispatchResult.success && dispatchResult.configured === false) {
    return {
      success: false,
      message: dispatchResult.error || 'Configura EmailJS o tus credenciales en .env para despachar correos reales.',
      name: participant.name,
      email: participant.email,
      maskedEmail: masked,
      pin: participant.pin,
      doc_number: participant.doc_number
    };
  }

  if (!dispatchResult.success && dispatchResult.error) {
    return {
      success: false,
      message: `Error al despachar correo real: ${dispatchResult.error}`,
      name: participant.name,
      email: participant.email,
      maskedEmail: masked,
      pin: participant.pin,
      doc_number: participant.doc_number
    };
  }

  return {
    success: true,
    message: `¡Correo despachado con éxito! Se ha enviado el PIN a ${masked}. Revisa tu bandeja de entrada o spam.`,
    name: participant.name,
    email: participant.email,
    maskedEmail: masked,
    pin: participant.pin,
    doc_number: participant.doc_number
  };
}

const DEFAULT_EMAILJS_SERVICE_ID = 'service_0nk8bmq';
const DEFAULT_EMAILJS_TEMPLATE_ID = 'template_f6064rd';
const DEFAULT_EMAILJS_PUBLIC_KEY = 'RGrA7S9feEdXwjdEF';

export function getEmailJSConfig(): EmailJSConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_EMAILJS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.serviceId && parsed.templateId && parsed.publicKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading EmailJS config from localStorage:', e);
  }

  return {
    serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || DEFAULT_EMAILJS_SERVICE_ID,
    templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || DEFAULT_EMAILJS_TEMPLATE_ID,
    publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || DEFAULT_EMAILJS_PUBLIC_KEY
  };
}

export function saveEmailJSConfig(config: EmailJSConfig): void {
  localStorage.setItem(STORAGE_KEY_EMAILJS, JSON.stringify(config));
}

export function isEmailJSConfigured(): boolean {
  const cfg = getEmailJSConfig();
  return Boolean(cfg.serviceId && cfg.templateId && cfg.publicKey);
}

export async function checkEmailServiceStatus(): Promise<{ configured: boolean; user: string | null; provider: 'emailjs' | 'smtp' | null }> {
  const emailJsCfg = getEmailJSConfig();
  if (emailJsCfg.serviceId && emailJsCfg.templateId && emailJsCfg.publicKey) {
    return { configured: true, user: emailJsCfg.serviceId, provider: 'emailjs' };
  }

  try {
    const res = await fetch('/api/email-status');
    if (res.ok) {
      const data = await res.json();
      return { ...data, provider: 'smtp' };
    }
  } catch {
    // static host without backend
  }

  return { configured: false, user: null, provider: null };
}

export async function saveSmtpCredentials(smtpUser: string, smtpPass: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/save-smtp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smtpUser, smtpPass })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Live ping tester
export async function testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, latencyMs: 0, error: 'No se han configurado la URL o la Anon Key de Supabase.' };
  }

  const start = performance.now();
  try {
    const { error } = await supabase.from('events').select('id', { count: 'exact', head: true });
    const latency = Math.round(performance.now() - start);
    if (error) {
      // If table doesn't exist yet, but credentials authenticated successfully (PGRST205)
      if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
        return { 
          ok: true, 
          latencyMs: latency, 
          error: 'Credenciales válidas. Las tablas aún no han sido creadas. Ejecuta el script SQL en el SQL Editor de Supabase.' 
        };
      }
      return { ok: false, latencyMs: latency, error: error.message };
    }
    return { ok: true, latencyMs: latency };
  } catch (err: any) {
    const latency = Math.round(performance.now() - start);
    return { ok: false, latencyMs: latency, error: err.message || 'Error de red con Supabase' };
  }
}

// Complete, ready-to-use Supabase SQL Schema with DDL & ALL RECORDS
export function getSupabaseSQLSchema(): string {
  return `-- =========================================================================
-- AsistEvent: Script DDL SQL Completo para Backend Supabase (PostgreSQL)
-- Proyecto: ngcijcmdhskpyohzbply
-- Copia y pega TODO este script en: Supabase Dashboard > SQL Editor > New query > Run
-- =========================================================================

-- 1. TABLA: Usuarios del Equipo de Bienestar (Staff & Roles)
CREATE TABLE IF NOT EXISTS public.staff_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  role_display TEXT NOT NULL,
  avatar TEXT,
  gender TEXT DEFAULT 'female',
  category_scope TEXT DEFAULT 'all',
  rbac_level TEXT NOT NULL,
  description TEXT,
  doc_type TEXT DEFAULT 'CC',
  doc_number TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Asegurar columnas si la tabla ya existía
ALTER TABLE public.staff_users ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'CC';
ALTER TABLE public.staff_users ADD COLUMN IF NOT EXISTS doc_number TEXT;
ALTER TABLE public.staff_users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.staff_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. TABLA: Eventos Institucionales
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('deportes', 'musica', 'danzas', 'psicologia', 'salud')),
  date DATE NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 50,
  registered_count INTEGER NOT NULL DEFAULT 0,
  attended_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished', 'draft')),
  cover_image TEXT,
  qr_enabled BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLA: Participantes (Aprendices, Instructores, Funcionarios)
CREATE TABLE IF NOT EXISTS public.participants (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('CC', 'TI', 'CE', 'PEP')),
  doc_number TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('aprendiz', 'instructor', 'funcionario', 'invitado')),
  program TEXT,
  ficha TEXT,
  jornada TEXT CHECK (jornada IN ('diurna', 'mixta', 'nocturna', 'virtual')),
  area_formacion TEXT,
  pin TEXT NOT NULL, -- PIN de 4 dígitos para Kiosco
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABLA: Registros de Asistencia y Control de Acceso (Checkins)
CREATE TABLE IF NOT EXISTS public.checkins (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  event_title TEXT,
  participant_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  doc_number TEXT NOT NULL,
  ficha TEXT,
  time TEXT NOT NULL DEFAULT '--',
  checked_in BOOLEAN NOT NULL DEFAULT false,
  pin TEXT NOT NULL,
  method TEXT CHECK (method IN ('kiosk_pin', 'qr_scanner', 'manual_staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- HABILITAR SEGURIDAD ROW LEVEL SECURITY (RLS) Y POLÍTICAS DE ACCESO
-- =========================================================================
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Políticas para staff_users
DROP POLICY IF EXISTS "Permitir lectura publica de staff_users" ON public.staff_users;
CREATE POLICY "Permitir lectura publica de staff_users" ON public.staff_users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir insercion y actualizacion de staff_users" ON public.staff_users;
CREATE POLICY "Permitir insercion y actualizacion de staff_users" ON public.staff_users FOR ALL USING (true);

-- Políticas para events
DROP POLICY IF EXISTS "Permitir lectura publica de events" ON public.events;
CREATE POLICY "Permitir lectura publica de events" ON public.events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir gestion completa de events" ON public.events;
CREATE POLICY "Permitir gestion completa de events" ON public.events FOR ALL USING (true);

-- Políticas para participants
DROP POLICY IF EXISTS "Permitir lectura publica de participants" ON public.participants;
CREATE POLICY "Permitir lectura publica de participants" ON public.participants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir autorregistro de participants" ON public.participants;
CREATE POLICY "Permitir autorregistro de participants" ON public.participants FOR ALL USING (true);

-- Políticas para checkins
DROP POLICY IF EXISTS "Permitir lectura y checkin de asistencias" ON public.checkins;
CREATE POLICY "Permitir lectura y checkin de asistencias" ON public.checkins FOR ALL USING (true);

-- =========================================================================
-- 5. BUCKET DE SUPABASE STORAGE: staff-avatars (Fotografías del Staff)
-- =========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'staff-avatars', 
  'staff-avatars', 
  true, 
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Seguridad para Objetos en Storage
DROP POLICY IF EXISTS "Lectura publica de avatares" ON storage.objects;
CREATE POLICY "Lectura publica de avatares" ON storage.objects FOR SELECT USING (bucket_id = 'staff-avatars');

DROP POLICY IF EXISTS "Subida publica de avatares" ON storage.objects;
CREATE POLICY "Subida publica de avatares" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'staff-avatars');

DROP POLICY IF EXISTS "Actualizacion de avatares" ON storage.objects;
CREATE POLICY "Actualizacion de avatares" ON storage.objects FOR UPDATE USING (bucket_id = 'staff-avatars');

-- =========================================================================
-- REGISTROS: TABLA public.staff_users (7 Integrantes del Equipo)
-- =========================================================================
INSERT INTO public.staff_users (id, name, email, role, role_display, avatar, gender, category_scope, rbac_level, description)
VALUES 
  ('staff-elena', 'Dra. Elena Ramos', 'elena.ramos@bienestar.edu.co', 'lider_bienestar', 'Líder de Bienestar — Administrador General', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', 'female', 'all', 'RBAC Nivel 1', 'Acceso total institucional a todos los eventos, reportes consolidados y listados de asistencia.'),
  ('staff-admin', 'Julián Montoya', 'julian.montoya@bienestar.edu.co', 'apoyo_administrativo', 'Apoyo Administrativo', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', 'male', 'all', 'RBAC Nivel 1', 'Acceso total a la información de eventos, soporte en mesas de registro y listados de asistencia.'),
  ('staff-deportes', 'Prof. Marcos Valenzuela', 'marcos.valenzuela@bienestar.edu.co', 'gestor_deportivo', 'Coordinador de Deportes y Recreación', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', 'male', 'deportes', 'RBAC Nivel 2', 'Acceso exclusivo a los eventos y listados de asistencia creados por este rol deportivo.'),
  ('staff-musica', 'Mtro. Camilo Restrepo', 'camilo.restrepo@bienestar.edu.co', 'gestor_cultural_musica', 'Gestor Cultural - Música', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', 'male', 'musica', 'RBAC Nivel 2', 'Acceso exclusivo a los eventos y listados de asistencia creados para música y ensambles.'),
  ('staff-danzas', 'Lic. Sandra Morales', 'sandra.morales@bienestar.edu.co', 'gestor_cultural_danzas', 'Gestor Cultural - Danzas', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200', 'female', 'danzas', 'RBAC Nivel 2', 'Acceso exclusivo a los eventos y listados de asistencia de danzas creados por este rol.'),
  ('staff-psico', 'Psic. Valentina Quintero', 'valentina.quintero@bienestar.edu.co', 'psicologo', 'Orientación & Salud Mental', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200', 'female', 'psicologia', 'RBAC Nivel 2', 'Acceso exclusivo a los talleres y listados de asistencia creados en psicología.'),
  ('staff-salud', 'Enf. Patricia Londoño', 'patricia.londono@bienestar.edu.co', 'enfermera', 'Atención Médica y Primeros Auxilios', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200', 'female', 'salud', 'RBAC Nivel 2', 'Acceso exclusivo a las jornadas de salud y listados de asistencia creados en enfermería.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  role_display = EXCLUDED.role_display,
  gender = EXCLUDED.gender;

-- =========================================================================
-- REGISTROS: TABLA public.events (5 Eventos Institucionales)
-- =========================================================================
INSERT INTO public.events (id, code, title, description, category, date, time, location, capacity, registered_count, attended_count, status, cover_image, qr_enabled, created_by, created_at)
VALUES
  ('ev-2026-01', 'EV-2026-01', 'Torneo Relámpago de Voleibol Mixto', 'Torneo interfacultades de integración rápida y salud cardiovascular.', 'deportes', '2026-10-28', '09:00 AM', 'Coliseo Principal', 60, 48, 38, 'active', '/src/assets/images/event_volleyball_court_1790266140041.jpg', true, 'staff-deportes', '2026-09-20T08:00:00Z'),
  ('ev-2026-02', 'EV-2026-02', 'Festival de la Canción y Danzas', 'Muestra folclórica interuniversitaria y concurso de solistas.', 'musica', '2026-10-30', '02:00 PM', 'Auditorio Mayor', 200, 180, 145, 'active', '/src/assets/images/event_folkloric_music_1790266151429.jpg', true, 'staff-musica', '2026-09-21T09:30:00Z'),
  ('ev-2026-03', 'EV-2026-03', 'Jornada de Vacunación y Salud Visual', 'Tamizaje optométrico gratuito y esquema complementario de inmunización.', 'salud', '2026-11-02', '08:00 AM', 'Bloque C - Enfermería', 150, 110, 89, 'active', '/src/assets/images/event_health_screening_1790266161602.jpg', true, 'staff-salud', '2026-09-22T10:15:00Z'),
  ('ev-2026-04', 'EV-2026-04', 'Taller de Habilidades Emocionales', 'Manejo de estrés académico, resiliencia y técnicas de atención plena.', 'psicologia', '2026-11-04', '10:30 AM', 'Sala Conferencias 2', 30, 28, 22, 'active', '/src/assets/images/event_mindfulness_workshop_1790266176598.jpg', true, 'staff-psico', '2026-09-23T11:00:00Z'),
  ('ev-2026-05', 'EV-2026-05', 'Encuentro Universitario de Danzas Tradicionales', 'Taller práctico de ritmos del caribe y presentación de comparsas universitarias.', 'danzas', '2026-11-08', '03:00 PM', 'Plazoleta Central', 80, 65, 52, 'active', '/src/assets/images/event_folkloric_music_1790266151429.jpg', true, 'staff-danzas', '2026-09-23T14:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  capacity = EXCLUDED.capacity,
  status = EXCLUDED.status;

-- =========================================================================
-- REGISTROS: TABLA public.participants (20 Participantes Institucionales)
-- =========================================================================
INSERT INTO public.participants (id, full_name, doc_type, doc_number, email, role, program, ficha, jornada, area_formacion, pin, created_at)
VALUES
  ('p-1', 'Carlos Andrés Mendoza', 'CC', '1024567890', 'cmendoza@sena.edu.co', 'aprendiz', 'Análisis y Desarrollo de Software', 'Ficha 2825412 - ADSO', 'diurna', 'Tecnología', '1234', '2026-09-20T08:00:00Z'),
  ('p-2', 'Laura Valentina Rojas', 'TI', '1019887766', 'lrojas@sena.edu.co', 'aprendiz', 'Análisis y Desarrollo de Software', 'Ficha 2825412 - ADSO', 'diurna', 'Tecnología', '4321', '2026-09-20T08:05:00Z'),
  ('p-3', 'Prof. Jorge Luis Pardo', 'CC', '79456123', 'jpardo@sena.edu.co', 'instructor', 'Cultura Física y Deportes', 'Área de Deportes', 'mixta', 'Deportes', '1122', '2026-09-20T08:10:00Z'),
  ('p-4', 'Mariana Sofía Gómez', 'CC', '1033445566', 'mgomez@sena.edu.co', 'aprendiz', 'Gestión Empresarial', 'Ficha 2711090 - Gestión', 'diurna', 'Administración', '9988', '2026-09-20T08:15:00Z'),
  ('p-5', 'David Eduardo Sánchez', 'CC', '1022998877', 'dsanchez@sena.edu.co', 'aprendiz', 'Análisis y Desarrollo de Software', 'Ficha 2825412 - ADSO', 'diurna', 'Tecnología', '7766', '2026-09-20T08:20:00Z'),
  ('p-6', 'Dra. Natalia Osorio', 'CC', '52889944', 'nosorio@sena.edu.co', 'funcionario', 'Fisioterapia y Salud Ocupacional', 'Bienestar / Fisioterapia', 'diurna', 'Salud', '5544', '2026-09-20T08:25:00Z'),
  ('p-7', 'Felipe Antonio Castro', 'TI', '1098765432', 'fcastro@sena.edu.co', 'aprendiz', 'Seguridad Digital y Redes', 'Ficha 2798124 - Ciberseguridad', 'nocturna', 'Tecnología', '3322', '2026-09-20T08:30:00Z'),
  ('p-8', 'Andrea Carolina Beltrán', 'CC', '1015667788', 'abeltran@sena.edu.co', 'aprendiz', 'Análisis y Desarrollo de Software', 'Ficha 2825412 - ADSO', 'diurna', 'Tecnología', '6655', '2026-09-20T08:35:00Z'),
  ('p-9', 'Héctor Fabio Ramírez', 'CC', '14889977', 'hramirez@sena.edu.co', 'instructor', 'Gestión Documental', 'Coordinación Académica', 'diurna', 'Administración', '2211', '2026-09-20T08:40:00Z'),
  ('p-10', 'Sara Lucía Martínez', 'CC', '1044778899', 'smartinez@sena.edu.co', 'aprendiz', 'Análisis y Desarrollo de Software', 'Ficha 2825412 - ADSO', 'diurna', 'Tecnología', '8899', '2026-09-20T08:45:00Z'),
  ('p-mus-1', 'Mateo Alejandro Ríos', 'CC', '1077334455', 'marios@sena.edu.co', 'aprendiz', 'Producción Multimedia', 'Ficha 2831200 - Multimedia', 'diurna', 'Diseño', '2345', '2026-09-21T09:00:00Z'),
  ('p-mus-2', 'Valeria Cárdenas Mora', 'TI', '1088443322', 'vcardenas@sena.edu.co', 'aprendiz', 'Animación 3D', 'Ficha 2754321 - Animación 3D', 'diurna', 'Diseño', '5432', '2026-09-21T09:10:00Z'),
  ('p-mus-3', 'Lic. Andrés Felipe Suárez', 'CC', '71987654', 'asuarez@sena.edu.co', 'instructor', 'Música y Ensamble Coral', 'Música y Expresión', 'mixta', 'Cultura', '3456', '2026-09-21T09:20:00Z'),
  ('p-sal-1', 'Claudia Marcela Peña', 'CC', '1012345678', 'cpena@sena.edu.co', 'aprendiz', 'Enfermería', 'Ficha 2899001 - Enfermería', 'diurna', 'Salud', '9876', '2026-09-22T08:00:00Z'),
  ('p-sal-2', 'Dr. Roberto Estupiñán', 'CC', '19876543', 'restupinan@sena.edu.co', 'funcionario', 'Administración de Sedes', 'Administración Sede', 'diurna', 'Administración', '6789', '2026-09-22T08:15:00Z'),
  ('p-sal-3', 'Juliana Paz Henao', 'TI', '1099887766', 'jpaz@sena.edu.co', 'aprendiz', 'Contabilidad y Finanzas', 'Ficha 2844556 - Contabilidad', 'nocturna', 'Finanzas', '4567', '2026-09-22T08:30:00Z'),
  ('p-psi-1', 'Sebastián Caicedo López', 'CC', '1034567891', 'scaicedo@sena.edu.co', 'aprendiz', 'Análisis y Desarrollo de Software', 'Ficha 2825412 - ADSO', 'diurna', 'Tecnología', '8765', '2026-09-23T09:00:00Z'),
  ('p-psi-2', 'Daniela Vivas Ortiz', 'TI', '1022334411', 'dvivas@sena.edu.co', 'aprendiz', 'Gestión Empresarial', 'Ficha 2711090 - Gestión', 'diurna', 'Administración', '3210', '2026-09-23T09:15:00Z'),
  ('p-dan-1', 'Camila Andrea Buitrago', 'CC', '1018998877', 'cbuitrago@sena.edu.co', 'aprendiz', 'Producción Multimedia', 'Ficha 2831200 - Multimedia', 'diurna', 'Diseño', '7654', '2026-09-23T14:00:00Z'),
  ('p-dan-2', 'Santiago Morales Perea', 'CC', '1029887766', 'smorales@sena.edu.co', 'aprendiz', 'Análisis y Desarrollo de Software', 'Ficha 2825412 - ADSO', 'diurna', 'Tecnología', '6543', '2026-09-23T14:15:00Z')
ON CONFLICT (doc_number) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email;

-- =========================================================================
-- REGISTROS: TABLA public.checkins (20 Registros de Asistencia y Aforo)
-- =========================================================================
INSERT INTO public.checkins (id, event_id, event_title, participant_id, name, email, role, doc_type, doc_number, ficha, time, checked_in, pin, method, created_at)
VALUES
  ('att-1', 'ev-2026-01', 'Torneo Relámpago de Voleibol Mixto', 'p-1', 'Carlos Andrés Mendoza', 'cmendoza@sena.edu.co', 'Aprendiz', 'CC', '1024567890', 'Ficha 2825412 - ADSO', '09:48 AM', true, '1234', 'kiosk_pin', '2026-09-24T09:48:00Z'),
  ('att-2', 'ev-2026-01', 'Torneo Relámpago de Voleibol Mixto', 'p-2', 'Laura Valentina Rojas', 'lrojas@sena.edu.co', 'Aprendiz', 'TI', '1019887766', 'Ficha 2825412 - ADSO', '09:51 AM', true, '4321', 'qr_scanner', '2026-09-24T09:51:00Z'),
  ('att-3', 'ev-2026-01', 'Torneo Relámpago de Voleibol Mixto', 'p-3', 'Prof. Jorge Luis Pardo', 'jpardo@sena.edu.co', 'Instructor', 'CC', '79456123', 'Área de Deportes', '09:30 AM', true, '1122', 'kiosk_pin', '2026-09-24T09:30:00Z'),
  ('att-4', 'ev-2026-01', 'Torneo Relámpago de Voleibol Mixto', 'p-4', 'Mariana Sofía Gómez', 'mgomez@sena.edu.co', 'Aprendiz', 'CC', '1033445566', 'Ficha 2711090 - Gestión', '--', false, '9988', NULL, '2026-09-24T08:00:00Z'),
  ('att-5', 'ev-2026-01', 'Torneo Relámpago de Voleibol Mixto', 'p-5', 'David Eduardo Sánchez', 'dsanchez@sena.edu.co', 'Aprendiz', 'CC', '1022998877', 'Ficha 2825412 - ADSO', '09:54 AM', true, '7766', 'kiosk_pin', '2026-09-24T09:54:00Z'),
  ('att-6', 'ev-2026-01', 'Torneo Relámpago de Voleibol Mixto', 'p-6', 'Dra. Natalia Osorio', 'nosorio@sena.edu.co', 'Funcionario', 'CC', '52889944', 'Bienestar / Fisioterapia', '09:40 AM', true, '5544', 'kiosk_pin', '2026-09-24T09:40:00Z'),
  ('att-7', 'ev-2026-01', 'Torneo Relámpago de Voleibol Mixto', 'p-7', 'Felipe Antonio Castro', 'fcastro@sena.edu.co', 'Aprendiz', 'TI', '1098765432', 'Ficha 2798124 - Ciberseguridad', '--', false, '3322', NULL, '2026-09-24T08:10:00Z'),
  ('att-8', 'ev-2026-01', 'Torneo Relámpago de Voleibol Mixto', 'p-8', 'Andrea Carolina Beltrán', 'abeltran@sena.edu.co', 'Aprendiz', 'CC', '1015667788', 'Ficha 2825412 - ADSO', '09:56 AM', true, '6655', 'qr_scanner', '2026-09-24T09:56:00Z'),
  ('att-9', 'ev-2026-01', 'Torneo Relámpago de Voleibol Mixto', 'p-9', 'Héctor Fabio Ramírez', 'hramirez@sena.edu.co', 'Instructor', 'CC', '14889977', 'Coordinación Académica', '--', false, '2211', NULL, '2026-09-24T08:15:00Z'),
  ('att-10', 'ev-2026-01', 'Torneo Relámpago de Voleibol Mixto', 'p-10', 'Sara Lucía Martínez', 'smartinez@sena.edu.co', 'Aprendiz', 'CC', '1044778899', 'Ficha 2825412 - ADSO', '09:58 AM', true, '8899', 'kiosk_pin', '2026-09-24T09:58:00Z'),
  ('att-mus-1', 'ev-2026-02', 'Festival de la Canción y Danzas', 'p-mus-1', 'Mateo Alejandro Ríos', 'marios@sena.edu.co', 'Aprendiz', 'CC', '1077334455', 'Ficha 2831200 - Multimedia', '02:15 PM', true, '2345', 'qr_scanner', '2026-09-24T14:15:00Z'),
  ('att-mus-2', 'ev-2026-02', 'Festival de la Canción y Danzas', 'p-mus-2', 'Valeria Cárdenas Mora', 'vcardenas@sena.edu.co', 'Aprendiz', 'TI', '1088443322', 'Ficha 2754321 - Animación 3D', '02:22 PM', true, '5432', 'kiosk_pin', '2026-09-24T14:22:00Z'),
  ('att-mus-3', 'ev-2026-02', 'Festival de la Canción y Danzas', 'p-mus-3', 'Lic. Andrés Felipe Suárez', 'asuarez@sena.edu.co', 'Instructor', 'CC', '71987654', 'Música y Expresión', '--', false, '3456', NULL, '2026-09-24T13:00:00Z'),
  ('att-sal-1', 'ev-2026-03', 'Jornada de Vacunación y Salud Visual', 'p-sal-1', 'Claudia Marcela Peña', 'cpena@sena.edu.co', 'Aprendiz', 'CC', '1012345678', 'Ficha 2899001 - Enfermería', '08:12 AM', true, '9876', 'kiosk_pin', '2026-09-24T08:12:00Z'),
  ('att-sal-2', 'ev-2026-03', 'Jornada de Vacunación y Salud Visual', 'p-sal-2', 'Dr. Roberto Estupiñán', 'restupinan@sena.edu.co', 'Funcionario', 'CC', '19876543', 'Administración Sede', '08:30 AM', true, '6789', 'manual_staff', '2026-09-24T08:30:00Z'),
  ('att-sal-3', 'ev-2026-03', 'Jornada de Vacunación y Salud Visual', 'p-sal-3', 'Juliana Paz Henao', 'jpaz@sena.edu.co', 'Aprendiz', 'TI', '1099887766', 'Ficha 2844556 - Contabilidad', '--', false, '4567', NULL, '2026-09-24T07:45:00Z'),
  ('att-psi-1', 'ev-2026-04', 'Taller de Habilidades Emocionales', 'p-psi-1', 'Sebastián Caicedo López', 'scaicedo@sena.edu.co', 'Aprendiz', 'CC', '1034567891', 'Ficha 2825412 - ADSO', '10:35 AM', true, '8765', 'kiosk_pin', '2026-09-24T10:35:00Z'),
  ('att-psi-2', 'ev-2026-04', 'Taller de Habilidades Emocionales', 'p-psi-2', 'Daniela Vivas Ortiz', 'dvivas@sena.edu.co', 'Aprendiz', 'TI', '1022334411', 'Ficha 2711090 - Gestión', '--', false, '3210', NULL, '2026-09-24T09:30:00Z'),
  ('att-dan-1', 'ev-2026-05', 'Encuentro Universitario de Danzas Tradicionales', 'p-dan-1', 'Camila Andrea Buitrago', 'cbuitrago@sena.edu.co', 'Aprendiz', 'CC', '1018998877', 'Ficha 2831200 - Multimedia', '03:10 PM', true, '7654', 'qr_scanner', '2026-09-24T15:10:00Z'),
  ('att-dan-2', 'ev-2026-05', 'Encuentro Universitario de Danzas Tradicionales', 'p-dan-2', 'Santiago Morales Perea', 'smorales@sena.edu.co', 'Aprendiz', 'CC', '1029887766', 'Ficha 2825412 - ADSO', '03:15 PM', true, '6543', 'kiosk_pin', '2026-09-24T15:15:00Z')
ON CONFLICT (id) DO UPDATE SET
  checked_in = EXCLUDED.checked_in,
  time = EXCLUDED.time,
  method = EXCLUDED.method;
`;
}
