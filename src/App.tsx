import React, { useState, useEffect } from 'react';
import { hostelStore } from './services/store';
import { UserRole, AppNotification } from './types';
import { Navbar } from './components/Navbar';
import { StudentAuth } from './components/StudentAuth';
import { ParentAuth } from './components/ParentAuth';
import { WardenAuth } from './components/WardenAuth';
import { WatchmanAuth } from './components/WatchmanAuth';
import { StudentDashboard } from './components/StudentDashboard';
import { ParentDashboard } from './components/ParentDashboard';
import { WardenDashboard } from './components/WardenDashboard';
import { WatchmanDashboard } from './components/WatchmanDashboard';
import { OtpModal } from './components/OtpModal';
import { NotificationModal } from './components/NotificationModal';
import { soundService } from './services/soundService';
import { ShieldCheck, Bell, Sparkles } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>(hostelStore.getCurrentRole());
  const [currentUser, setCurrentUser] = useState<any>(hostelStore.getCurrentUser());
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Sync state with store
  const syncState = () => {
    const role = hostelStore.getCurrentRole();
    setCurrentRole(role);
    setCurrentUser(hostelStore.getCurrentUser());

    const notifs = hostelStore.getNotifications();
    const unread = notifs.filter(n => (n.recipientRole === role || n.recipientRole === 'student') && !n.read).length;
    setUnreadCount(unread);

    // If there is a new urgent notification within last 3 seconds, show toast
    const latest = notifs[0];
    if (latest && !latest.read && Date.now() - new Date(latest.timestamp).getTime() < 4000) {
      setActiveToast(latest);
      setTimeout(() => setActiveToast(null), 5000);
    }
  };

  useEffect(() => {
    syncState();
    const unsub = hostelStore.subscribe(syncState);
    return unsub;
  }, []);

  const handleSelectRole = (role: UserRole) => {
    hostelStore.setCurrentRole(role);
    setCurrentRole(role);
    // Switch to corresponding user for that role
    if (role === 'student') {
      const studs = hostelStore.getStudents();
      hostelStore.setCurrentUser(studs[0] || null);
    } else if (role === 'parent') {
      const parents = hostelStore.getParents();
      hostelStore.setCurrentUser(parents[0] || null);
    } else if (role === 'warden') {
      const wardens = hostelStore.getWardens();
      hostelStore.setCurrentUser(wardens[0] || null);
    } else if (role === 'watchman') {
      const watchmen = hostelStore.getWatchmen();
      hostelStore.setCurrentUser(watchmen[0] || null);
    }
    soundService.playNotificationPing();
  };

  const handleLogout = () => {
    hostelStore.setCurrentUser(null);
    setCurrentUser(null);
    soundService.playNotificationPing();
  };

  const handleOtpSuccess = () => {
    // When OTP completes successfully, reload user based on role
    if (currentRole === 'student') {
      const students = hostelStore.getStudents();
      hostelStore.setCurrentUser(students[0]);
    } else if (currentRole === 'parent') {
      const parents = hostelStore.getParents();
      hostelStore.setCurrentUser(parents[0]);
    } else if (currentRole === 'warden') {
      const wardens = hostelStore.getWardens();
      hostelStore.setCurrentUser(wardens[0]);
    } else if (currentRole === 'watchman') {
      const watchmen = hostelStore.getWatchmen();
      hostelStore.setCurrentUser(watchmen[0]);
    }
    syncState();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Navbar
        currentRole={currentRole}
        onSelectRole={handleSelectRole}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadCount={unreadCount}
        onLogout={handleLogout}
        currentUser={currentUser}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentUser ? (
          // Authenticated Role Dashboards
          <div>
            {currentRole === 'student' && <StudentDashboard student={currentUser} />}
            {currentRole === 'parent' && <ParentDashboard parent={currentUser} />}
            {currentRole === 'warden' && <WardenDashboard warden={currentUser} />}
            {currentRole === 'watchman' && <WatchmanDashboard watchman={currentUser} />}
          </div>
        ) : (
          // Authentication (Login & Register with OTP)
          <div className="py-6">
            {currentRole === 'student' && (
              <StudentAuth 
                onSuccess={(s) => hostelStore.setCurrentUser(s)} 
                onSwitchRole={() => handleSelectRole('parent')} 
              />
            )}
            {currentRole === 'parent' && (
              <ParentAuth 
                onSuccess={(p) => hostelStore.setCurrentUser(p)} 
                onSwitchRole={() => handleSelectRole('warden')} 
              />
            )}
            {currentRole === 'warden' && (
              <WardenAuth 
                onSuccess={(w) => hostelStore.setCurrentUser(w)} 
                onSwitchRole={() => handleSelectRole('watchman')} 
              />
            )}
            {currentRole === 'watchman' && (
              <WatchmanAuth 
                onSuccess={(g) => hostelStore.setCurrentUser(g)} 
                onSwitchRole={() => handleSelectRole('student')} 
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-900 bg-slate-950/80 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 College of Engineering, Guindy (CEG) • Anna University Hostel Administration</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Parent Authorization Protocol: Active</span>
            <span>•</span>
            <span>Warden Queue Cap: 100/100</span>
            <span>•</span>
            <span>Live Gate Sentinel</span>
          </div>
        </div>
      </footer>

      {/* Two-Factor OTP Modal (Dispatched upon login or action) */}
      <OtpModal
        onSuccess={handleOtpSuccess}
        onCancel={() => hostelStore.setActiveOtp(null)}
      />

      {/* Notification Center & Emergency Siren Panel */}
      <NotificationModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        currentRole={currentRole}
      />

      {/* Floating Push Notification Toast */}
      {activeToast && (
        <div 
          onClick={() => {
            setIsNotificationsOpen(true);
            setActiveToast(null);
          }}
          className="fixed bottom-5 right-5 z-50 max-w-sm p-4 bg-slate-900/95 border-2 border-indigo-500/60 rounded-2xl shadow-2xl backdrop-blur-md cursor-pointer animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl shrink-0 mt-0.5">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-white">{activeToast.title}</h5>
              <p className="text-xs text-slate-300 mt-1 line-clamp-2">{activeToast.message}</p>
              <span className="text-[10px] text-indigo-400 font-semibold mt-1 inline-block">
                Tap to view details →
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
