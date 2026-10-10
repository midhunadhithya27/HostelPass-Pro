import React, { useState, useEffect } from 'react';
import { hostelStore } from '../services/store';
import { ParentProfile, LeaveRequest, StudentProfile } from '../types';
import { 
  Heart, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Phone, 
  Calendar, 
  MapPin, 
  Bell, 
  Volume2, 
  AlertTriangle,
  Building,
  Check,
  Send,
  PhoneCall,
  History
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface ParentDashboardProps {
  parent: ParentProfile;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ parent }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [linkedStudent, setLinkedStudent] = useState<StudentProfile | null>(null);
  const [activeApprovalReq, setActiveApprovalReq] = useState<LeaveRequest | null>(null);
  const [remarks, setRemarks] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('Parent has not permitted outing during this period.');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const updateData = () => {
    const allReqs = hostelStore.getRequests();
    // Filter requests matching this parent's email or linked student roll
    const filtered = allReqs.filter(r => 
      r.parentEmail.toLowerCase() === parent.email.toLowerCase() ||
      r.studentRollNumber === parent.linkedStudentRoll
    );
    setRequests(filtered);

    const students = hostelStore.getStudents();
    const student = students.find(s => s.rollNumber === parent.linkedStudentRoll);
    setLinkedStudent(student || null);
  };

  useEffect(() => {
    updateData();
    const unsub = hostelStore.subscribe(updateData);
    return unsub;
  }, [parent]);

  const pendingRequests = requests.filter(r => r.status === 'PENDING_PARENT');
  const processedRequests = requests.filter(r => r.status !== 'PENDING_PARENT');

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeApprovalReq) return;

    if (actionType === 'approve') {
      const res = hostelStore.parentApproveRequest(activeApprovalReq.id, remarks || 'Approved by Parent');
      if (res.success) {
        setFeedback({ type: 'success', message: `Approved! Outpass request #${activeApprovalReq.passNumber} has been dispatched to the Warden Queue.` });
        soundService.playSuccessChime();
        setActiveApprovalReq(null);
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } else {
      const res = hostelStore.parentRejectRequest(activeApprovalReq.id, rejectionReason);
      if (res.success) {
        setFeedback({ type: 'success', message: `Request declined. Student has been notified; warden will not receive this request.` });
        soundService.playWarningChime();
        setActiveApprovalReq(null);
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    }
  };

  const handleTestSiren = () => {
    soundService.playEmergencyBypassSiren();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Parent Identity & Linked Student Card */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/30 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-2xl shadow-inner shrink-0">
            <Heart className="w-10 h-10" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">{parent.name}</h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                {parent.relation}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Registered Phone: <span className="font-mono text-slate-200">{parent.phone}</span> • Email: <span className="text-slate-200">{parent.email}</span>
            </p>
            
            {/* Linked Student Tag */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400">Linked Student:</span>
              <span className="font-bold text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                {parent.linkedStudentName} ({parent.linkedStudentRoll})
              </span>
              {linkedStudent && (
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  linkedStudent.campusStatus === 'IN_CAMPUS' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {linkedStudent.campusStatus === 'IN_CAMPUS' ? '● Inside Hostel' : '● Currently Out on Pass'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Emergency Bypass Sound Tester */}
        <div className="p-4 bg-slate-950/80 border border-rose-500/30 rounded-2xl text-xs space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-rose-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Emergency Sound Bypass
            </span>
            <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-mono">
              ENABLED
            </span>
          </div>
          <p className="text-[11px] text-slate-400 max-w-xs">
            Plays a distinct audible buzzer when your child submits a leave request, even if phone is on silent.
          </p>
          <button
            onClick={handleTestSiren}
            className="w-full py-1.5 px-3 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5" />
            Test Loud Emergency Buzzer
          </button>
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

      {/* PENDING APPROVAL QUEUE (CRITICAL REQUIREMENT) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              Pending Student Approval Requests ({pendingRequests.length})
            </h3>
            <p className="text-xs text-slate-400">
              Prompt parent authorization required. Only parent-approved requests route to the warden!
            </p>
          </div>
          {pendingRequests.length > 0 && (
            <span className="px-3 py-1 bg-rose-500/20 text-rose-300 text-xs font-bold rounded-full border border-rose-500/30 animate-pulse">
              Action Required Immediately
            </span>
          )}
        </div>

        {pendingRequests.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-200">No Pending Requests</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              All leave and outing requests from {parent.linkedStudentName} have been processed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingRequests.map(req => (
              <div 
                key={req.id} 
                className="p-5 bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/20 border-2 border-amber-500/50 rounded-2xl shadow-xl space-y-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src={req.profilePic}
                      alt={req.studentName}
                      className="w-12 h-12 rounded-xl object-cover border border-amber-500/40"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">{req.studentName}</h4>
                        <span className="text-xs font-mono bg-slate-800 text-indigo-300 px-2 py-0.5 rounded">
                          {req.studentRollNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {req.hostelBlock} • Room {req.roomNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-300 font-bold text-xs rounded-full border border-amber-500/40">
                      {req.requestType} Application
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Pass #{req.passNumber}
                    </span>
                  </div>
                </div>

                {/* Form Parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Destination</span>
                    <span className="font-semibold text-slate-200 mt-1 block">{req.destination}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Departure Date & Time</span>
                    <span className="font-semibold text-slate-200 mt-1 block">
                      {new Date(req.leavingDateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
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

                {/* Decision Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">
                    Submitted: {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => {
                        setActiveApprovalReq(req);
                        setActionType('reject');
                      }}
                      className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Decline Request
                    </button>
                    <button
                      onClick={() => {
                        setActiveApprovalReq(req);
                        setActionType('approve');
                      }}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      Approve & Dispatch to Warden
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History of Past Requests */}
      <div className="mt-8">
        <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-indigo-400" />
          Processed Leave & Outing History
        </h3>
        <div className="space-y-3">
          {processedRequests.length === 0 ? (
            <p className="text-xs text-slate-500">No past requests recorded.</p>
          ) : (
            processedRequests.map(req => (
              <div 
                key={req.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{req.requestType} to {req.destination}</span>
                    <span className="text-[10px] font-mono text-slate-400">({req.passNumber})</span>
                  </div>
                  <p className="text-slate-400 mt-1">
                    Dates: {new Date(req.leavingDateTime).toLocaleDateString()} - {new Date(req.returnDateTime).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {req.status === 'REJECTED_BY_PARENT' && (
                    <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 rounded-lg font-medium">
                      Declined by You
                    </span>
                  )}
                  {req.status === 'PENDING_WARDEN' && (
                    <span className="px-2.5 py-1 bg-violet-500/20 text-violet-300 rounded-lg font-medium">
                      Warden Queue ({req.assignedWardenName})
                    </span>
                  )}
                  {req.status === 'APPROVED_PASS_GENERATED' && (
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg font-medium">
                      ✓ Approved by Warden • Pass Active
                    </span>
                  )}
                  {req.status === 'STUDENT_EXITED_CAMPUS' && (
                    <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-lg font-medium animate-pulse">
                      ● Currently Out of Campus
                    </span>
                  )}
                  {req.status === 'COMPLETED_RETURNED' && (
                    <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-lg font-medium">
                      ✓ Safely Returned
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Decision Modal */}
      {activeApprovalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
            <h3 className="text-base font-bold text-white mb-2">
              {actionType === 'approve' ? 'Authorize Student Leave Request' : 'Decline Leave Request'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {actionType === 'approve' 
                ? `You are authorizing ${activeApprovalReq.studentName} for ${activeApprovalReq.requestType} to ${activeApprovalReq.destination}. This will forward the application to the Warden.`
                : `Specify why you are declining the request. The student will be informed immediately and the request will terminate.`}
            </p>

            <form onSubmit={handleActionSubmit} className="space-y-4">
              {actionType === 'approve' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Parent Remarks / Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Approved. Advised to return safely before 8 PM."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-500 outline-none"
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
                    placeholder="Provide justification for decline..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-rose-500 outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveApprovalReq(null)}
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
                  Confirm {actionType === 'approve' ? 'Approval' : 'Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
