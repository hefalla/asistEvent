import { StaffUser, EventItem, AttendanceRecord } from '../types';

/**
 * Checks whether a staff user has unrestricted institutional access to ALL events and ALL attendance lists.
 * Per institutional policy:
 * "solo la lider de bienestar y el apoyo administrativo tienen acceso a toda la información de los eventos."
 */
export function hasFullEventAccess(user: StaffUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'lider_bienestar' || user.role === 'apoyo_administrativo';
}

/**
 * Filters the list of events according to the user's role.
 * - 'lider_bienestar' and 'apoyo_administrativo' can access ALL events.
 * - Other bienestar team roles can ONLY access events they created (created_by === user.id).
 */
export function getAccessibleEvents(
  events: EventItem[],
  user: StaffUser | null | undefined
): EventItem[] {
  if (!user) return [];
  if (hasFullEventAccess(user)) {
    return events;
  }
  return events.filter(e => e.created_by === user.id);
}

/**
 * Filters attendance records according to the user's role.
 * - 'lider_bienestar' and 'apoyo_administrativo' can access ALL attendance records.
 * - Other bienestar team roles can ONLY access attendance records of events they created.
 */
export function getAccessibleAttendees(
  attendees: AttendanceRecord[],
  events: EventItem[],
  user: StaffUser | null | undefined
): AttendanceRecord[] {
  if (!user) return [];
  if (hasFullEventAccess(user)) {
    return attendees;
  }
  const accessibleEvents = getAccessibleEvents(events, user);
  const accessibleEventIds = new Set(accessibleEvents.map(e => e.id));
  return attendees.filter(a => accessibleEventIds.has(a.event_id));
}

/**
 * Checks whether the user can access a specific event.
 */
export function canAccessSpecificEvent(
  event: EventItem | null | undefined,
  user: StaffUser | null | undefined
): boolean {
  if (!user || !event) return false;
  if (hasFullEventAccess(user)) return true;
  return event.created_by === user.id;
}

/**
 * Checks whether the user has permission to finalize or delete a specific event.
 * Per institutional rule:
 * "Los eventos también puede ser finalizados y/o eliminados por su creador o por los roles de Lider o Apoyo"
 */
export function canFinalizeOrDeleteEvent(
  event: EventItem | null | undefined,
  user: StaffUser | null | undefined
): boolean {
  if (!user || !event) return false;
  // Líder de Bienestar o Apoyo Administrativo
  if (hasFullEventAccess(user)) return true;
  // Su creador
  return Boolean(user.id) && event.created_by === user.id;
}

/**
 * Checks whether a staff user is the Líder de Bienestar.
 * Per institutional policy:
 * "Solo la lider puede crear nuevos miembros para el equipo de bienestar"
 */
export function isLiderBienestar(user: StaffUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'lider_bienestar';
}

export function canCreateStaffMember(user: StaffUser | null | undefined): boolean {
  return isLiderBienestar(user);
}

/**
 * Checks whether the user can edit or disable other staff members.
 * Per institutional policy, only the Líder de Bienestar has this authority.
 */
export function canManageStaff(user: StaffUser | null | undefined): boolean {
  return isLiderBienestar(user);
}


