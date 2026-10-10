import React from 'react';
import { UserRole } from '../types';
import { 
  Building2, 
  GraduationCap, 
  Heart, 
  ShieldCheck, 
  ShieldAlert, 
  Bell, 
  LogOut,
  Lock
} from 'lucide-react';

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
                  PSG iTech
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Digital Outing & Gatepass Approval System</p>
            </div>
          </div>

          {/* Role Navigation Area */}
          {currentUser ? (
            /* LOCKED ROLE BADGE (Role switching strictly disabled while logged in) */
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-2xl shadow-inner">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white capitalize flex items-center gap-1.5">
                  {currentRole === 'student' && <GraduationCap className="w-4 h-4 text-indigo-400" />}
                  {currentRole === 'parent' && <Heart className="w-4 h-4 text-amber-400" />}
                  {currentRole === 'warden' && <ShieldCheck className="w-4 h-4 text-violet-400" />}
                  {currentRole === 'watchman' && <ShieldAlert className="w-4 h-4 text-emerald-400" />}
                  {currentRole} Session:
                </span>
                <span className="text-xs font-semibold text-slate-200 max-w-[140px] sm:max-w-xs truncate">
                  {currentUser.name}
                </span>
              </div>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 text-[10px] font-mono text-amber-400 border border-slate-700">
                <Lock className="w-3 h-3" />
                Role Locked
              </span>
            </div>
          ) : (
            /* Unauthenticated Portal Selector */
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
          )}

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

            {/* Logout button when user is logged in */}
            {currentUser && (
              <button
                onClick={onLogout}
                className="px-3 py-1.5 text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all flex items-center gap-1.5"
                title="Log out of this account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
