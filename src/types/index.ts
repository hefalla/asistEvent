export type ParticipantRole = 'aprendiz' | 'instructor' | 'funcionario' | 'invitado';

export type DocumentType = 'CC' | 'TI' | 'CE' | 'PEP';

export type EventCategory = 'deportes' | 'musica' | 'danzas' | 'psicologia' | 'salud';

export type StaffRole = 
  | 'lider_bienestar'
  | 'gestor_deportivo'
  | 'gestor_cultural_musica'
  | 'gestor_cultural_danzas'
  | 'psicologo'
  | 'enfermera'
  | 'apoyo_administrativo';

export interface Participant {
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  doc_type: DocumentType;
  doc_number: string;
  email: string;
  role: ParticipantRole;
  program?: string;
  ficha?: string;
  jornada?: 'diurna' | 'mixta' | 'nocturna' | 'virtual';
  area_formacion?: string;
  pin: string; // 4-digit security PIN
  created_at: string;
}

export interface EventItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: EventCategory;
  date: string;
  time: string;
  location: string;
  capacity: number;
  registered_count: number;
  attended_count: number;
  status: 'active' | 'finished' | 'draft';
  cover_image: string;
  qr_enabled: boolean;
  created_by?: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  event_id: string;
  event_title?: string;
  participant_id: string;
  name: string;
  email: string;
  role: string;
  doc_type: DocumentType;
  doc_number: string;
  ficha: string;
  time: string;
  checked_in: boolean;
  pin: string;
  method?: 'kiosk_pin' | 'qr_scanner' | 'manual_staff';
  created_at: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  role_display: string;
  avatar: string;
  gender?: 'female' | 'male';
  category_scope?: EventCategory | 'all';
  rbac_level: string;
  description: string;
  doc_type?: DocumentType;
  doc_number?: string;
  password?: string;
  status?: 'active' | 'disabled';
}

export interface DashboardMetric {
  activeEvents: number;
  totalCheckins: number;
  qrPercentage: number;
  averageOccupancy: number;
  criticalAlerts: number;
  lastCheckin?: {
    name: string;
    ficha: string;
    location: string;
    secondsAgo: number;
  };
}
