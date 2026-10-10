import React, { useState, useEffect } from 'react';
import { hostelStore } from '../services/store';
import { AppNotification, UserRole } from '../types';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  X, 
  Radio, 
  Play, 
  CheckCheck
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose, currentRole }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'emergency'>('all');
  const [bypassActive, setBypassActive] = useState(false);
  const [fiveMinTimer, setFiveMinTimer] = useState(300); // 5 minutes simulation
  const [autoRepeatEnabled, setAutoRepeatEnabled] = useState(true);

  useEffect(() => {
    const update = () => {
      setNotifications(hostelStore.getNotifications());
    };
    update();
    const unsub = hostelStore.subscribe(update);
    return unsub;
  }, []);

  // 5-minute reminder loop simulation for parents when a pending request exists
  useEffect(() => {
    if (!isOpen && !autoRepeatEnabled) return;

    const interval = setInterval(() => {
      setFiveMinTimer(prev => {
        if (prev <= 1) {
          // If parent has pending requests, fire emergency sound!
          const requests = hostelStore.getRequests();
          const hasPending = requests.some(r => r.status === 'PENDING_PARENT');
          if (hasPending && currentRole === 'parent') {
            soundService.playEmergencyBypassSiren();
            hostelStore.addNotification({
              recipientRole: 'parent',
              recipientIdentifier: 'current',
              title: '🚨 5-Minute Recurring Emergency Reminder!',
              message: 'Pending student leave request requires urgent approval. Phone silent-mode bypass tone activated.',
              type: 'emergency',
              urgentBypass: true,
            });
          }
          return 300; // Reset 5 minutes
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, autoRepeatEnabled, currentRole]);

  if (!isOpen) return null;

  // Filter notifications for this role or identifier
  const roleNotifs = notifications.filter(n => n.recipientRole === currentRole || n.recipientRole === 'student');
  const filtered = roleNotifs.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'emergency') return n.type === 'emergency' || n.urgentBypass;
    return true;
  });

  const handleTestBypass = () => {
    setBypassActive(true);
    soundService.playEmergencyBypassSiren();
    setTimeout(() => setBypassActive(false), 2500);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Push Notifications
                {filtered.filter(n => !n.read).length > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-indigo-500 text-white rounded-full">
                    {filtered.filter(n => !n.read).length} new
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Real-time status updates & approval telemetry</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Emergency Bypass Feature Banner (Specifically for Parent & Critical Alerting) */}
        {currentRole === 'parent' && (
          <div className="p-4 mx-4 mt-4 bg-rose-950/40 border border-rose-500/40 rounded-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className={`p-2 rounded-lg ${bypassActive ? 'bg-rose-500 text-white animate-ping' : 'bg-rose-500/20 text-rose-400'}`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    Parent Emergency Sound Bypass Enabled
                    <span className="px-1.5 py-0.2 text-[10px] bg-rose-500/30 text-rose-200 rounded font-mono">24/7 ACTIVE</span>
                  </h4>
                  <p className="text-xs text-rose-200/80 mt-0.5">
                    Overrides phone silent mode for student leave requests. Re-alerts every 5 minutes until approved.
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-rose-300/80">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" /> Next 5-min alert: {formatTimer(fiveMinTimer)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleTestBypass}
                className="shrink-0 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-md flex items-center gap-1.5 transition-all"
              >
                <Play className="w-3 h-3 fill-current" />
                Test Siren
              </button>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="px-5 py-3 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              All ({roleNotifs.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === 'unread' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('emergency')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === 'emergency' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:bg-rose-950/40'
              }`}
            >
              🚨 Urgent Alerts
            </button>
          </div>

          <button
            onClick={() => hostelStore.markAllNotificationsRead(currentRole)}
            className="text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        </div>

        {/* Notifications List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 divide-y divide-slate-800/50">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500 mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-300">No notifications found</p>
              <p className="text-xs text-slate-500 mt-1">You are all caught up with hostel gatepass activities.</p>
            </div>
          ) : (
            filtered.map((item) => {
              const isUrgent = item.type === 'emergency' || item.urgentBypass;
              const isSuccess = item.type === 'success';
              return (
                <div
                  key={item.id}
                  onClick={() => hostelStore.markNotificationAsRead(item.id)}
                  className={`pt-3 first:pt-0 p-3 rounded-xl transition-all cursor-pointer ${
                    !item.read ? 'bg-slate-800/40 border border-slate-700/60' : 'hover:bg-slate-800/20'
                  } ${isUrgent ? 'border-l-4 border-l-rose-500' : isSuccess ? 'border-l-4 border-l-emerald-500' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {isUrgent ? (
                        <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      ) : isSuccess ? (
                        <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
                          <Bell className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className={`text-xs font-bold leading-tight ${isUrgent ? 'text-rose-300' : 'text-slate-100'}`}>
                          {item.title}
                        </h5>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {item.message}
                      </p>
                      {item.urgentBypass && (
                        <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-semibold bg-rose-500/20 text-rose-300 rounded border border-rose-500/30">
                          ⚡ Loud Bypass Tone Enabled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Push service active (WebSocket/Broadcast)</span>
          </div>
          <button
            onClick={() => soundService.playNotificationPing()}
            className="hover:text-indigo-400 flex items-center gap-1 transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5" />
            Sound check
          </button>
        </div>
      </div>
    </div>
  );
};
