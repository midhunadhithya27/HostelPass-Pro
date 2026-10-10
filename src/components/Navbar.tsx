import React from 'react';
import { hostelStore } from '../services/store';
import { UserRole } from '../types';
import { 
  Building2, 
  GraduationCap, 
  Heart, 
  ShieldCheck, 
  ShieldAlert, 
  Bell, 
  RotateCcw, 
  LogOut,
  Sparkles
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface NavbarProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  onLogout: () => void;
  currentUser: any;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onSelectRole,
  onOpenNotifications,
  unreadCount,
  onLogout,
  currentUser,
}) => {
  const handleResetData = () => {
    if (confirm('Reset demo data to initial sample states?')) {
      hostelStore.resetToSampleData();
      soundService.playNotificationPing();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Institution Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-600/30 text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-white tracking-tight">HostelPass Pro</span>
                <span className="hidden sm:inline-block px-2 py-0.2 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  CEG Anna University
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Digital Outing & Gatepass Approval System</p>
            </div>
          </div>

          {/* Role Navigation Switcher (Student, Parent, Warden, Watchman) */}
          <nav className="flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl">
            <button
              onClick={() => onSelectRole('student')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentRole === 'student'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Student</span>
            </button>

            <button
              onClick={() => onSelectRole('parent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentRole === 'parent'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Parent</span>
            </button>

            <button
              onClick={() => onSelectRole('warden')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentRole === 'warden'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Warden</span>
            </button>

            <button
              onClick={() => onSelectRole('watchman')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentRole === 'watchman'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Watchman</span>
            </button>
          </nav>

          {/* Right Utilities */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 rounded-xl transition-colors border border-slate-700/60"
              title="Notifications & Emergency Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Reset Demo Data Button */}
            <button
              onClick={handleResetData}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/60 transition-colors"
              title="Reset Sample State"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data</span>
            </button>

            {/* Current User Quick Info / Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors"
                  title="Switch / Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
