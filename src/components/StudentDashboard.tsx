import React, { useState, useEffect } from 'react';
import { hostelStore } from '../services/store';
import { StudentProfile, LeaveRequest } from '../types';
import { 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  MapPin, 
  Calendar, 
  Home, 
  Phone, 
  Mail, 
  User, 
  ShieldCheck, 
  ArrowUpRight, 
  Sparkles,
  Send,
  Building,
  History
} from 'lucide-react';
import { GatePassModal } from './GatePassModal';
import { soundService } from '../services/soundService';

interface StudentDashboardProps {
  student: StudentProfile;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ student }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedPass, setSelectedPass] = useState<LeaveRequest | null>(null);

  // Form states with auto-filled fields
  const [requestType, setRequestType] = useState<'Outing' | 'Home Leave'>('Outing');
  const [leavingDateTime, setLeavingDateTime] = useState('');
  const [returnDateTime, setReturnDateTime] = useState('');
  const [reason, setReason] = useState('');
  const [destination, setDestination] = useState('');
  const [emergencyContact, setEmergencyContact] = useState(student.parentPhone);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Default times: leaving in 1 hour, return in 5 hours for outing, or 3 days for leave
  useEffect(() => {
    const now = new Date();
    const leave = new Date(now.getTime() + 60 * 60 * 1000);
    const ret = new Date(now.getTime() + (requestType === 'Outing' ? 6 : 72) * 60 * 60 * 1000);

    const formatForInput = (d: Date) => {
      const pad = (n: number) => n < 10 ? '0' + n : n;
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setLeavingDateTime(formatForInput(leave));
    setReturnDateTime(formatForInput(ret));
  }, [requestType]);

  const updateData = () => {
    const all = hostelStore.getRequests();
    const studentRequests = all.filter(r => r.studentRollNumber === student.rollNumber);
    setRequests(studentRequests);
  };

  useEffect(() => {
    updateData();
    const unsub = hostelStore.subscribe(updateData);
    return unsub;
  }, [student.rollNumber]);

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!leavingDateTime || !returnDateTime || !reason || !destination) {
      setFormError('Please fill in all required leave/outing details.');
      soundService.playWarningChime();
      return;
    }

    if (new Date(returnDateTime) <= new Date(leavingDateTime)) {
      setFormError('Return time must be scheduled after departure time.');
      soundService.playWarningChime();
      return;
    }

    const res = hostelStore.createLeaveRequest({
      studentRollNumber: student.rollNumber,
      requestType,
      leavingDateTime,
      returnDateTime,
      reason,
      destination,
      emergencyContact,
    });

    if (res.success) {
      setFormSuccess('Request created successfully! Dispatched to your parent for authorization.');
      soundService.playSuccessChime();
      setTimeout(() => {
        setShowFormModal(false);
        setFormSuccess('');
        setReason('');
        setDestination('');
      }, 1400);
    } else {
      setFormError(res.message);
      soundService.playWarningChime();
    }
  };

  const getStatusBadge = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'PENDING_PARENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            1/2: Awaiting Parent Authorization
          </span>
        );
      case 'REJECTED_BY_PARENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            Declined by Parent
          </span>
        );
      case 'PENDING_WARDEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/30">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            2/2: Parent Approved • In Warden Queue
          </span>
        );
      case 'REJECTED_BY_WARDEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            Declined by Warden
          </span>
        );
      case 'APPROVED_PASS_GENERATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm animate-pulse">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved • QR Gatepass Active!
          </span>
        );
      case 'STUDENT_EXITED_CAMPUS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Officially Out of Campus
          </span>
        );
      case 'COMPLETED_RETURNED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed & Returned
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Student Identity Card */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-700/80 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <img
              src={student.profilePic}
              alt={student.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500/60 shadow-lg"
            />
            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
              student.campusStatus === 'IN_CAMPUS' ? 'bg-emerald-500' : 'bg-amber-500'
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">{student.name}</h2>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                {student.gender}
              </span>
            </div>
            <p className="text-xs font-mono text-indigo-400 font-semibold">{student.rollNumber}</p>
            <p className="text-xs text-slate-300 mt-1">
              {student.course} • <span className="text-slate-400">{student.year}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Home className="w-3.5 h-3.5" />
                {student.hostelBlock} ({student.roomNumber})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Parent: {student.parentName} ({student.parentPhone})
              </span>
            </div>
          </div>
        </div>

        {/* Action Button: Apply Leave */}
        <button
          onClick={() => setShowFormModal(true)}
          className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 text-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Outing / Leave Form</span>
        </button>
      </div>

      {/* Registration Details Overview Box */}
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Registered Academic & Hostel Records
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">College</span>
            <span className="font-medium text-slate-200 truncate block">{student.collegeName}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Official Email</span>
            <span className="font-medium text-slate-200 truncate block">{student.email}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Date of Birth</span>
            <span className="font-medium text-slate-200">{student.dob}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Parent Linking Email</span>
            <span className="font-medium text-slate-200 truncate block">{student.parentEmail}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Current Campus State</span>
            <span className={`font-bold ${student.campusStatus === 'IN_CAMPUS' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {student.campusStatus === 'IN_CAMPUS' ? '✓ Inside Campus' : '✈ Out on Approved Pass'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-Time Request Status & History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              Live Leave & Outing Applications
            </h3>
            <p className="text-xs text-slate-400">
              Parent approval required before warden queue dispatch
            </p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            {requests.length} Total Requests
          </span>
        </div>

        {requests.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500 mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-300">No requests submitted yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Need to visit town or go home? Click "New Outing / Leave Form" to submit your application.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map((req) => {
              const hasPass = ['APPROVED_PASS_GENERATED', 'STUDENT_EXITED_CAMPUS', 'COMPLETED_RETURNED'].includes(req.status);
              return (
                <div
                  key={req.id}
                  className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                          {req.passNumber}
                        </span>
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          {req.requestType}
                        </h4>
                      </div>
                      <div>
                        {getStatusBadge(req.status)}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="my-3 space-y-2 text-xs">
                      <div className="flex items-start gap-2 text-slate-300">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-400">Destination:</strong> {req.destination}
                        </div>
                      </div>

                      <div className="flex items-start gap-2 text-slate-300">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-slate-400">Departure:</span> {new Date(req.leavingDateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      </div>

                      <div className="flex items-start gap-2 text-slate-300">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-slate-400">Curfew Return:</span> <strong className="text-amber-300">{new Date(req.returnDateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-950 rounded-xl text-slate-300 border border-slate-800/60">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Reason</span>
                        <p className="text-xs italic text-slate-300 mt-0.5">{req.reason}</p>
                      </div>

                      {/* Approval Audit Trail */}
                      <div className="pt-2 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Parent Authorization:</span>
                          <span className={req.parentApprovedAt ? 'text-emerald-400 font-medium' : req.parentRejectedAt ? 'text-rose-400' : 'text-amber-400'}>
                            {req.parentApprovedAt ? `✓ Approved (${new Date(req.parentApprovedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : req.parentRejectedAt ? 'Declined' : 'Pending Parent'}
                          </span>
                        </div>
                        {req.parentRemarks && (
                          <p className="text-[10px] text-slate-500 italic">"{req.parentRemarks}"</p>
                        )}

                        <div className="flex items-center justify-between text-slate-400">
                          <span>Warden Authorization:</span>
                          <span className={req.wardenApprovedAt ? 'text-emerald-400 font-medium' : req.wardenRejectedAt ? 'text-rose-400' : 'text-slate-500'}>
                            {req.wardenApprovedAt ? `✓ Approved by ${req.assignedWardenName}` : req.wardenRejectedAt ? 'Declined' : req.parentApprovedAt ? 'In Warden Queue' : 'Locked until parent approval'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pass QR Button if approved */}
                  {hasPass && (
                    <div className="mt-4 pt-3 border-t border-slate-800">
                      <button
                        onClick={() => setSelectedPass(req)}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>View Dynamic Gatepass QR Code</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* REQUEST FORM MODAL (Prompt: Auto-fills Student Name, Parent Name, Student/Parent Phones, Hostel Block & Room Number) */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden p-6 my-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Hostel Outing / Leave Application</h3>
                  <p className="text-xs text-slate-400">Submitted directly to parent for initial approval</p>
                </div>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateRequest} className="mt-5 space-y-4">
              {/* Auto-filled details card */}
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                    Auto-Filled from Student Profile
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">PSG iTech</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Student:</span>
                    <span className="font-semibold text-slate-200">{student.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Parent:</span>
                    <span className="font-semibold text-slate-200">{student.parentName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Hostel Block:</span>
                    <span className="font-medium text-emerald-400">{student.hostelBlock} (Room {student.roomNumber})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Parent Phone:</span>
                    <span className="font-mono text-slate-300">{student.parentPhone}</span>
                  </div>
                </div>
              </div>

              {/* Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Application Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestType('Outing')}
                    className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                      requestType === 'Outing'
                        ? 'bg-indigo-600/30 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="block text-indigo-300 font-bold">Local Outing</span>
                    <span className="text-[11px] text-slate-400">Day pass for shopping, medical, or study</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType('Home Leave')}
                    className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                      requestType === 'Home Leave'
                        ? 'bg-indigo-600/30 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="block text-indigo-300 font-bold">Home Leave</span>
                    <span className="text-[11px] text-slate-400">Overnight / holiday trip to hometown</span>
                  </button>
                </div>
              </div>

              {/* Leaving & Return Date/Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Departure Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={leavingDateTime}
                    onChange={(e) => setLeavingDateTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Expected Return Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={returnDateTime}
                    onChange={(e) => setReturnDateTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none font-medium text-amber-300"
                  />
                </div>
              </div>

              {/* Destination */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Address / Place *</label>
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Phoenix Marketcity, Velachery OR Hometown Madurai"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Purpose for Outing/Leave *</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain purpose of leaving campus in detail..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Emergency Contact Number</label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder={student.parentPhone}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none font-mono"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit to Parent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic QR Gatepass Modal */}
      {selectedPass && (
        <GatePassModal
          request={selectedPass}
          onClose={() => setSelectedPass(null)}
        />
      )}
    </div>
  );
};
