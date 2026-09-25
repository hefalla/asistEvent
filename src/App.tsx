import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { EventsView } from './components/EventsView';
import { AccessControlView } from './components/AccessControlView';
import { AttendeesView } from './components/AttendeesView';
import { StaffManagementView } from './components/StaffManagementView';
import { PublicPortalView } from './components/PublicPortalView';
import { StaffLoginModal } from './components/StaffLoginModal';
import { CreateEventModal } from './components/CreateEventModal';
import { SupabaseModal } from './components/SupabaseModal';
import { KioskModeOverlay } from './components/KioskModeOverlay';
import { EditStaffModal } from './components/EditStaffModal';
import { EventQRModal } from './components/EventQRModal';
import { EventCheckinView } from './components/EventCheckinView';
import { StaffUser, EventItem, AttendanceRecord } from './types';
import { INITIAL_STAFF_USERS, INITIAL_EVENTS } from './lib/initialData';
import { 
  fetchEvents, 
  fetchAttendees, 
  fetchStaffUsers, 
  initSupabaseClient, 
  updateEventStatus, 
  deleteEvent,
  updateStaffUser,
  toggleStaffStatus
} from './lib/supabase';
import { hasFullEventAccess, getAccessibleEvents } from './lib/permissions';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ShieldCheck, Heart, Sparkles } from 'lucide-react';

function MainAppContent() {
  const { theme } = useTheme();
  const [activePath, setActivePath] = useState<string>('portal-publico');
  const [checkinEventId, setCheckinEventId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('checkin') || params.get('event');
    } catch {
      return null;
    }
  });
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrModalEvent, setQrModalEvent] = useState<EventItem | null>(null);

  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    const saved = localStorage.getItem('asistevent_staff_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(INITIAL_STAFF_USERS);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [attendees, setAttendees] = useState<AttendanceRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('ev-2026-01');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals & Drawers
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isKioskModeOpen, setIsKioskModeOpen] = useState(false);
  const [editingStaffUser, setEditingStaffUser] = useState<StaffUser | null>(null);
  const [isEditStaffModalOpen, setIsEditStaffModalOpen] = useState(false);
  const [editModalInitialTab, setEditModalInitialTab] = useState<'profile' | 'password'>('profile');

  // Initialize Supabase & load data
  const loadData = async () => {
    try {
      const [fetchedEvents, fetchedAttendees, fetchedStaff] = await Promise.all([
        fetchEvents(),
        fetchAttendees(),
        fetchStaffUsers()
      ]);
      setEvents(fetchedEvents);
      setAttendees(fetchedAttendees);
      setStaffUsers(fetchedStaff);
      if (fetchedEvents.length > 0 && !selectedEventId) {
        setSelectedEventId(fetchedEvents[0].id);
      }
    } catch (err) {
      console.warn('Error loading application data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initSupabaseClient();
    loadData();
  }, []);

  const userAccessibleEvents = currentUser ? getAccessibleEvents(events, currentUser) : events;
  const currentEvent = userAccessibleEvents.find(e => e.id === selectedEventId) || userAccessibleEvents[0] || events.find(e => e.id === selectedEventId) || events[0] || {
    id: 'ev-default',
    code: 'EV-2026-01',
    title: 'Torneo Interfichas de Microfútbol',
    description: 'Torneo interfacultades de integración rápida y salud cardiovascular.',
    category: 'deportes' as const,
    date: '2026-10-28',
    time: '09:00 AM',
    location: 'Coliseo Principal',
    capacity: 60,
    registered_count: 48,
    attended_count: 38,
    status: 'active' as const,
    cover_image: '/src/assets/images/event_volleyball_court_1790266140041.jpg',
    qr_enabled: true,
    created_at: new Date().toISOString()
  };

  const handleEventCreated = (newEvent: EventItem) => {
    setEvents(prev => [newEvent, ...prev.filter(e => e.id !== newEvent.id)]);
    setSelectedEventId(newEvent.id);
    setActivePath('eventos-institucionales');
    setQrModalEvent(newEvent);
    setIsQRModalOpen(true);
    loadData();
  };

  const handleUpdateEventStatus = async (eventId: string, newStatus: 'active' | 'finished' | 'draft') => {
    await updateEventStatus(eventId, newStatus);
    setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, status: newStatus } : ev));
    loadData();
  };

  const handleDeleteEvent = async (eventId: string) => {
    await deleteEvent(eventId);
    setEvents(prev => prev.filter(ev => ev.id !== eventId));
    setAttendees(prev => prev.filter(a => a.event_id !== eventId));
    if (selectedEventId === eventId) {
      const remaining = events.filter(ev => ev.id !== eventId);
      if (remaining.length > 0) {
        setSelectedEventId(remaining[0].id);
      }
    }
    loadData();
  };

  const handleStaffLoginSuccess = (user: StaffUser) => {
    setCurrentUser(user);
    localStorage.setItem('asistevent_staff_user', JSON.stringify(user));
    setActivePath('dashboard');
    setIsStaffModalOpen(false);
    if (!hasFullEventAccess(user)) {
      const userEv = events.find(e => e.created_by === user.id);
      if (userEv) {
        setSelectedEventId(userEv.id);
      }
    }
  };

  const handleOpenEditStaff = (user: StaffUser, tab: 'profile' | 'password' = 'profile') => {
    setEditingStaffUser(user);
    setEditModalInitialTab(tab);
    setIsEditStaffModalOpen(true);
  };

  const handleOpenMyProfile = (tab: 'profile' | 'password' = 'profile') => {
    if (currentUser) {
      setEditingStaffUser(currentUser);
      setEditModalInitialTab(tab);
      setIsEditStaffModalOpen(true);
    }
  };

  const handleSaveStaffUser = async (updated: StaffUser) => {
    const res = await updateStaffUser(updated);
    if (res.success) {
      if (currentUser && currentUser.id === updated.id) {
        setCurrentUser(res.data || updated);
      }
      await loadData();
    }
    return res;
  };

  const handleToggleStaffStatus = async (staffId: string, newStatus: 'active' | 'disabled') => {
    const res = await toggleStaffStatus(staffId, newStatus);
    if (res.success) {
      if (currentUser && currentUser.id === staffId) {
        setCurrentUser(prev => prev ? { ...prev, status: newStatus } : null);
      }
      await loadData();
    }
    return res;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('asistevent_staff_user');
    setActivePath('portal-publico');
    setIsSidebarOpen(false);
    setIsStaffModalOpen(false);
  };

  const isPublicPortal = activePath === 'portal-publico' || !currentUser;

  // Dedicated Check-in View when scanned from QR code or opened via URL
  if (checkinEventId) {
    const checkinEv = events.find(e => e.id === checkinEventId) || INITIAL_EVENTS.find(e => e.id === checkinEventId) || currentEvent;
    return (
      <div className={`min-h-screen flex flex-col antialiased transition-colors duration-200 ${
        theme === 'dark' 
          ? 'dark bg-[#070c09] text-[#ecfdf5] selection:bg-emerald-500/25 selection:text-emerald-300' 
          : 'bg-[#f9fdfa] text-[#0f2417] selection:bg-emerald-500/25 selection:text-emerald-700'
      }`}>
        <EventCheckinView
          event={checkinEv}
          onBackToPortal={() => {
            window.history.replaceState({}, '', window.location.pathname);
            setCheckinEventId(null);
            setActivePath('portal-publico');
          }}
          onRefreshData={loadData}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col antialiased transition-colors duration-200 ${
      theme === 'dark' 
        ? 'dark bg-[#070c09] text-[#ecfdf5] selection:bg-emerald-500/25 selection:text-emerald-300' 
        : 'bg-[#f9fdfa] text-[#0f2417] selection:bg-emerald-500/25 selection:text-emerald-700'
    }`}>
      {/* If not public portal and user is authenticated: Admin Layout with clean Sidebar + Header/Main offset */}
      {!isPublicPortal && currentUser ? (
        <div className="flex min-h-screen w-full relative">
          {/* Left Sidebar */}
          <Sidebar
            activePath={activePath}
            onNavigate={(path) => setActivePath(path)}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onToggleKiosk={() => setIsKioskModeOpen(true)}
            currentUser={currentUser}
            onLogout={handleLogout}
          />

          {/* Right Area: Header + Main shifted to the right of the sidebar on lg+ */}
          <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-[padding] duration-200">
            <Header
              currentUser={currentUser}
              onOpenStaffModal={() => setIsStaffModalOpen(true)}
              onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
              onOpenEditProfile={handleOpenMyProfile}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              onNavigate={(path) => setActivePath(path)}
              activePath={activePath}
              onLogout={handleLogout}
            />

            {/* Main Content Area */}
            <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-x-hidden min-h-[calc(100vh-5rem)] flex flex-col justify-between">
              <div className="w-full flex-1">
                {activePath === 'dashboard' && (
                  <div className="animate-in fade-in duration-300">
                    <DashboardView
                      currentUser={currentUser}
                      events={events}
                      attendees={attendees}
                      onNavigate={(path) => setActivePath(path)}
                      onOpenCreateEvent={() => setIsCreateEventModalOpen(true)}
                      onOpenScanner={() => setActivePath('control-de-acceso')}
                      onRefreshData={loadData}
                    />
                  </div>
                )}

                {activePath === 'eventos-institucionales' && (
                  <div className="animate-in fade-in duration-300">
                    <EventsView
                      events={events}
                      currentUser={currentUser}
                      onOpenCreateEvent={() => setIsCreateEventModalOpen(true)}
                      onSelectEventForAttendees={(eventId) => {
                        setSelectedEventId(eventId);
                        setActivePath('lista-de-asistentes');
                      }}
                      onSelectEventForAccess={(eventId) => {
                        setSelectedEventId(eventId);
                        setActivePath('control-de-acceso');
                      }}
                      onUpdateEventStatus={handleUpdateEventStatus}
                      onDeleteEvent={handleDeleteEvent}
                      onShowEventQR={(ev) => {
                        setQrModalEvent(ev);
                        setIsQRModalOpen(true);
                      }}
                    />
                  </div>
                )}

                {activePath === 'control-de-acceso' && (
                  <div className="animate-in fade-in duration-300">
                    <AccessControlView
                      currentEvent={currentEvent}
                      attendees={attendees}
                      currentUser={currentUser}
                      events={userAccessibleEvents}
                      onSelectEvent={(eventId) => setSelectedEventId(eventId)}
                      onRefreshData={loadData}
                    />
                  </div>
                )}

                {activePath === 'lista-de-asistentes' && (
                  <div className="animate-in fade-in duration-300">
                    <AttendeesView
                      attendees={attendees}
                      events={events}
                      currentUser={currentUser}
                      onRefreshData={loadData}
                      onNavigateToEvents={() => setActivePath('eventos-institucionales')}
                    />
                  </div>
                )}

                {activePath === 'equipo-bienestar' && (
                  <div className="animate-in fade-in duration-300">
                    <StaffManagementView
                      currentUser={currentUser}
                      staffUsers={staffUsers}
                      onRefreshData={loadData}
                      onOpenLoginModal={() => setIsStaffModalOpen(true)}
                      onEditStaffUser={handleOpenEditStaff}
                      onToggleStaffStatus={handleToggleStaffStatus}
                    />
                  </div>
                )}
              </div>

              {/* Administrative Footer */}
              <footer className="w-full max-w-7xl mx-auto pt-10 pb-4 border-t border-[#e2efe6] dark:border-[#132219] mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-800/80 dark:text-emerald-400/60 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300">AsistEvent</span>
                  <span>• Sistema Integrado de Bienestar Universitario & Control de Acceso</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>© {new Date().getFullYear()} Oficina de Bienestar al Aprendiz.</span>
                </div>
              </footer>
            </main>
          </div>
        </div>
      ) : (
        /* Public Portal View (Standalone, no Header, no Sidebar) */
        <main className="flex-1 w-full p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col justify-between min-h-screen">
          <div className="w-full flex-1">
            <PublicPortalView
              currentUser={currentUser}
              onNavigate={(path) => setActivePath(path)}
              onOpenStaffModal={() => setIsStaffModalOpen(true)}
              onLogout={handleLogout}
              onRegisteredSuccess={() => {
                loadData();
              }}
            />
          </div>

          <footer className="w-full pt-8 pb-4 border-t border-[#e2efe6] dark:border-[#132219] mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-800/80 dark:text-emerald-400/60 transition-colors">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">AsistEvent</span>
              <span>• Portal Público de Asistencias & Eventos</span>
            </div>
            <div className="flex items-center gap-4">
              <span>© {new Date().getFullYear()} Oficina de Bienestar Institucional.</span>
            </div>
          </footer>
        </main>
      )}

      {/* Modals & Overlays */}
      <StaffLoginModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onLoginSuccess={handleStaffLoginSuccess}
        staffUsers={staffUsers}
      />

      <CreateEventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
        currentUser={currentUser || INITIAL_STAFF_USERS[0]}
        onEventCreated={handleEventCreated}
      />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigUpdated={loadData}
      />

      <KioskModeOverlay
        isOpen={isKioskModeOpen}
        onClose={() => setIsKioskModeOpen(false)}
        currentEvent={currentEvent}
        attendees={attendees}
        onRefreshData={loadData}
      />

      {isEditStaffModalOpen && editingStaffUser && currentUser && (
        <EditStaffModal
          isOpen={isEditStaffModalOpen}
          onClose={() => {
            setIsEditStaffModalOpen(false);
            setEditingStaffUser(null);
          }}
          targetUser={editingStaffUser}
          currentUser={currentUser}
          onSave={handleSaveStaffUser}
          initialTab={editModalInitialTab}
        />
      )}

      {/* QR Code Modal for Event Checkin */}
      <EventQRModal
        isOpen={isQRModalOpen}
        onClose={() => {
          setIsQRModalOpen(false);
          setQrModalEvent(null);
        }}
        event={qrModalEvent}
        onOpenCheckinView={(eventId) => {
          setCheckinEventId(eventId);
          window.history.replaceState({}, '', `?checkin=${eventId}`);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainAppContent />
    </ThemeProvider>
  );
}
