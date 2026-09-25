import volleyballImg from '../assets/images/event_volleyball_court_1790266140041.jpg';
import folkloricMusicImg from '../assets/images/event_folkloric_music_1790266151429.jpg';
import healthScreeningImg from '../assets/images/event_health_screening_1790266161602.jpg';
import mindfulnessWorkshopImg from '../assets/images/event_mindfulness_workshop_1790266176598.jpg';
import { EventCategory } from '../types';

export const EVENT_CATEGORY_COVERS: Record<EventCategory, string> = {
  deportes: volleyballImg,
  musica: folkloricMusicImg,
  danzas: folkloricMusicImg,
  salud: healthScreeningImg,
  psicologia: mindfulnessWorkshopImg
};

export const DEFAULT_EVENT_COVER = volleyballImg;

export const EVENT_IMAGE_PRESETS = [
  { id: 'deportes', label: 'Deportes y Voleibol', url: volleyballImg, category: 'deportes' },
  { id: 'musica', label: 'Música y Folclor', url: folkloricMusicImg, category: 'musica' },
  { id: 'salud', label: 'Jornada de Salud', url: healthScreeningImg, category: 'salud' },
  { id: 'psicologia', label: 'Mindfulness y Psicología', url: mindfulnessWorkshopImg, category: 'psicologia' },
];

/**
 * Resolves an event's cover image reliably across dev and production (GitHub Pages).
 * Corrects legacy paths like '/src/assets/images/...' to the bundled asset URLs.
 */
export function getEventCoverImage(coverImage?: string | null, category?: string | null): string {
  if (coverImage) {
    const trimmed = coverImage.trim();

    // 1. If it's a data URL or blob URL, return directly
    if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
      return trimmed;
    }

    // 2. If it's a remote URL from a CDN (Unsplash, Supabase Storage, etc.)
    if (/^https?:\/\//i.test(trimmed) && !trimmed.includes('/src/assets/images/')) {
      return trimmed;
    }

    // 3. Match legacy file names or keywords stored in localStorage / Supabase
    if (trimmed.includes('volleyball')) return volleyballImg;
    if (trimmed.includes('folkloric') || trimmed.includes('music')) return folkloricMusicImg;
    if (trimmed.includes('health')) return healthScreeningImg;
    if (trimmed.includes('mindfulness')) return mindfulnessWorkshopImg;
  }

  // 4. Fallback to category cover
  if (category && category in EVENT_CATEGORY_COVERS) {
    return EVENT_CATEGORY_COVERS[category as EventCategory];
  }

  return DEFAULT_EVENT_COVER;
}
