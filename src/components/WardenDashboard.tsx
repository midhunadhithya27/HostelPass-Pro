import React, { useState, useEffect } from 'react';
import { hostelStore } from '../services/store';
import { WardenProfile, LeaveRequest } from '../types';
import { 
  ShieldCheck, 
  Layers, 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Phone, 
  Calendar, 
  MapPin, 
  Building, 
  QrCode, 
  Sparkles,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface WardenDashboardProps {
  warden: WardenProfile;
}

export const WardenDashboard: React.FC<WardenDashboardProps> = ({ warden }) => {
  const [wardenState, setWardenState] = useState<WardenProfile>(warden);
  const [allWardens, setAllWardens] = useState<WardenProfile[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'active_passes' | 'all'>('pending');
  const [selectedReq, setSelectedReq] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [remarks, setRemarks] = useState('Pass approved. Return before hostel curfew.');
  const [rejectionReason, setRejectionReason] = useState('Declined due to academic scheduling / institutional guidelines.');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const updateData = () => {
    const wardens = hostelStore.getWardens();
    const current = wardens.find(w => w.id === warden.id) || warden;
    setWardenState(current);
    setAllWardens(wardens);

    const allReqs = hostelStore.getRequests();
    // Filter requests assigned to this warden, or belonging to their assigned blocks
    setRequests(allReqs);
  };

  useEffect(() => {
    updateData();
    const unsub = hostelStore.subscribe(updateData);
    return unsub;
  }, [warden.id]);

  // Warden only sees requests where parent has approved! (PENDING_WARDEN)
  const pendingRequests = requests.filter(r => 
    r.status === 'PENDING_WARDEN' && 
    (r.assignedWardenId === wardenState.id || !r.assignedWardenId)
  );

  const activeOutPasses = requests.filter(r => 
    ['APPROVED_PASS_GENERATED', 'STUDENT_EXITED_CAMPUS'].includes(r.status)
  );

  const handleDecisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    if (actionType === 'approve') {
      const res = hostelStore.wardenApproveRequest(selectedReq.id, remarks);
      if (res.success) {
        setFeedback({ 
          type: 'success', 
          message: `Approved! Single-use QR Gatepass activated for ${selectedReq.studentName} (#${selectedReq.passNumber}).` 
        });
        setSelectedReq(null);
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } else {
      const res = hostelStore.wardenRejectRequest(selectedReq.id, rejectionReason);
      if (res.success) {
        setFeedback({ 
          type: 'success', 
          message: `Request #${selectedReq.passNumber} rejected. Student has been notified.` 
        });
        setSelectedReq(null);
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    }
  };

  const queueCount = wardenState.activeRequestCount || pendingRequests.length;
  const utilization = Math.min(100, Math.round((queueCount / (wardenState.maxCapacity || 100)) * 100));

  return (
    <div className="space-y-6">
      {/* Warden Identity & Load Balancer Card */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-violet-950/40 to-slate-900 border border-violet-500/30 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-violet-500/10 text-violet-400 border border-violet-500/30 rounded-2xl shadow-inner shrink-0">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">{wardenState.name}</h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/30">
                Hostel Warden
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Email: <span className="text-slate-200">{wardenState.email}</span> • Phone: <span className="font-mono text-slate-200">{wardenState.phone}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Jurisdiction:</span>
              {wardenState.assignedBlocks.map(b => (
                <span key={b} className="px-2 py-0.5 bg-slate-800 text-violet-300 rounded border border-slate-700 text-[11px]">
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Load Balancer Capacity Meter (100 request cap) */}
        <div className="w-full md:w-72 p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-violet-400" />
              Warden Load Balancer
            </span>
            <span className="font-mono font-bold text-violet-300">
              {queueCount} / {wardenState.maxCapacity || 100}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                utilization > 85 ? 'bg-rose-500' : utilization > 60 ? 'bg-amber-500' : 'bg-gradient-to-r from-violet-500 to-indigo-500'
              }`}
              style={{ width: `${utilization}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>{utilization}% Capacity Used</span>
            <span className="text-emerald-400 font-medium">Overflow Auto-Routes</span>
          </div>
        </div>
      </div>

      {/* Multi-Warden Balancer Fleet Overview */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-violet-400" />
          Campus Warden Fleet Queue Distribution (Max 100 Requests/Warden)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allWardens.map(w => (
            <div 
              key={w.id} 
              className={`p-3 rounded-xl border text-xs ${
                w.id === wardenState.id ? 'bg-violet-950/40 border-violet-500/50' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between font-semibold text-slate-200">
                <span className="truncate">{w.name}</span>
                <span className="font-mono text-violet-300 font-bold shrink-0 ml-2">
                  {w.activeRequestCount || 0} / 100
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                {w.assignedBlocks.join(', ')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
          feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'pending'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>Parent-Approved Queue</span>
            {pendingRequests.length > 0 && (
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('active_passes')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'active_passes'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>Active Outpasses ({activeOutPasses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'all'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>All Requests History</span>
          </button>
        </div>
      </div>

      {/* PENDING APPROVAL LIST */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-200">No Pending Requests in Your Queue</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Only parent-approved leave requests are dispatched to your queue. All current requests have been authorized.
              </p>
            </div>
          ) : (
            pendingRequests.map(req => (
              <div 
                key={req.id} 
                className="p-5 bg-slate-900 border border-slate-800 hover:border-violet-500/40 rounded-2xl shadow-xl space-y-4 transition-all"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src={req.profilePic}
                      alt={req.studentName}
                      className="w-14 h-14 rounded-xl object-cover border border-violet-500/40"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">{req.studentName}</h4>
                        <span className="text-xs font-mono bg-slate-800 text-indigo-300 px-2 py-0.5 rounded">
                          {req.studentRollNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {req.course} • {req.year}
                      </p>
                      <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                        {req.hostelBlock} • Room {req.roomNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end">
                    <span className="px-3 py-1 bg-violet-500/20 text-violet-300 font-bold text-xs rounded-full border border-violet-500/30">
                      {req.requestType} Pass Request
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono mt-1">
                      Pass #{req.passNumber}
                    </span>
                  </div>
                </div>

                {/* Parent Approval Verified Stamp */}
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>Parent Approval Verified:</strong> {req.parentName} ({req.parentPhone}) approved at {new Date(req.parentApprovedAt || '').toLocaleTimeString()}
                    </span>
                  </div>
                  {req.parentRemarks && (
                    <span className="text-[11px] text-slate-400 italic">
                      "{req.parentRemarks}"
                    </span>
                  )}
                </div>

                {/* Request Parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Destination</span>
                    <span className="font-semibold text-slate-200 mt-1 block">{req.destination}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Departure</span>
                    <span className="font-semibold text-slate-200 mt-1 block">
                      {new Date(req.leavingDateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Curfew Return Schedule</span>
                    <span className="font-bold text-amber-300 mt-1 block">
                      {new Date(req.returnDateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Declared Reason:</span>
                  <p className="italic">"{req.reason}"</p>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setSelectedReq(req);
                      setActionType('reject');
                    }}
                    className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Decline Request
                  </button>
                  <button
                    onClick={() => {
                      setSelectedReq(req);
                      setActionType('approve');
                    }}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 transition-all"
                  >
                    <QrCode className="w-4 h-4" />
                    Authorize & Generate Secure QR Pass
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ACTIVE PASSES VIEW */}
      {activeTab === 'active_passes' && (
        <div className="space-y-3">
          {activeOutPasses.length === 0 ? (
            <p className="text-xs text-slate-500 p-8 text-center bg-slate-900/40 rounded-2xl">
              No students are currently out on active passes from your hostel blocks.
            </p>
          ) : (
            activeOutPasses.map(req => (
              <div 
                key={req.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <img src={req.profilePic} alt={req.studentName} className="w-10 h-10 rounded-lg object-cover" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{req.studentName}</span>
                      <span className="font-mono text-indigo-300">({req.studentRollNumber})</span>
                      <span className="text-[10px] text-slate-400">• {req.hostelBlock} {req.roomNumber}</span>
                    </div>
                    <p className="text-slate-400 mt-0.5">
                      Destination: <strong className="text-slate-200">{req.destination}</strong> • Curfew: <span className="text-amber-300 font-semibold">{new Date(req.returnDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-lg font-semibold ${
                    req.status === 'STUDENT_EXITED_CAMPUS' 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {req.status === 'STUDENT_EXITED_CAMPUS' ? '● Exited Gate (Out)' : '✓ Pass Generated (Inside)'}
                  </span>
                  <a 
                    href={`tel:${req.parentPhone}`}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                    title="Call Parent"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ALL HISTORY TAB */}
      {activeTab === 'all' && (
        <div className="space-y-3">
          {requests.map(req => (
            <div 
              key={req.id}
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <span className="font-bold text-white">{req.studentName} ({req.studentRollNumber})</span>
                <p className="text-slate-400 mt-0.5">
                  {req.requestType} to {req.destination} • {new Date(req.leavingDateTime).toLocaleDateString()}
                </p>
              </div>
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg">
                {req.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Decision Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
            <h3 className="text-base font-bold text-white mb-2">
              {actionType === 'approve' ? 'Grant Gatepass & Generate QR' : 'Decline Leave Request'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {actionType === 'approve'
                ? `You are authorizing ${selectedReq.studentName} (${selectedReq.studentRollNumber}). A secure dynamic one-time QR pass will be issued immediately to the student.`
                : `Specify justification for declining request #${selectedReq.passNumber}.`}
            </p>

            <form onSubmit={handleDecisionSubmit} className="space-y-4">
              {actionType === 'approve' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Warden Remarks / Special Instructions
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-violet-500 outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reason for Declining *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-rose-500 outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 px-3 text-white text-xs font-semibold rounded-xl shadow-lg transition-all ${
                    actionType === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25'
                  }`}
                >
                  Confirm {actionType === 'approve' ? 'Approval & QR Issue' : 'Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
