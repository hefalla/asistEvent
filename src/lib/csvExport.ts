import { AttendanceRecord } from '../types';

export function exportAttendeesToCSV(attendees: AttendanceRecord[], eventName: string = 'Asistencia_Bienestar'): void {
  const headers = [
    'ID',
    'Nombre Completo',
    'Correo Institucional',
    'Rol',
    'Tipo Documento',
    'Numero Documento',
    'Ficha / Dependencia',
    'Hora Check-in',
    'Metodo',
    'Estado Asistencia'
  ];

  const rows = attendees.map(a => [
    a.id,
    `"${a.name.replace(/"/g, '""')}"`,
    `"${a.email.replace(/"/g, '""')}"`,
    `"${a.role}"`,
    `"${a.doc_type}"`,
    `"${a.doc_number}"`,
    `"${(a.ficha || '').replace(/"/g, '""')}"`,
    `"${a.time}"`,
    `"${a.method || 'no_registrado'}"`,
    a.checked_in ? 'Asistio' : 'Pendiente'
  ]);

  const csvContent = '\uFEFF' + [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const cleanEventName = eventName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `asistencia_${cleanEventName}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
