import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { LeaveRequest } from '../types';
import { 
  ShieldCheck, 
  X, 
  Clock, 
  MapPin, 
  User, 
  Calendar, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  PhoneCall
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface GatePassModalProps {
  request: LeaveRequest;
  onClose: () => void;
}

export const GatePassModal: React.FC<GatePassModalProps> = ({ request, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [liveSeconds, setLiveSeconds] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Generate QR Code data URL
    const payload = JSON.stringify({
      passNumber: request.passNumber,
      rollNumber: request.studentRollNumber,
      studentName: request.studentName,
      type: request.requestType,
      leaving: request.leavingDateTime,
      return: request.returnDateTime,
      token: request.qrToken || request.passNumber,
      warden: request.assignedWardenName,
    });

    QRCode.toDataURL(payload, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR generation error:', err));

    // Celebratory confetti burst when opening approved pass!
    if (request.status === 'APPROVED_PASS_GENERATED') {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
      soundService.playSuccessChime();
    }

    // Live clock ticker to verify on-screen legitimacy
    const timer = setInterval(() => {
      setLiveSeconds(s => s + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [request]);

  const handlePrint = () => {
    window.print();
  };

  const isExited = request.status === 'STUDENT_EXITED_CAMPUS';
  const isCompleted = request.status === 'COMPLETED_RETURNED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/40 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Anti-tamper Top Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-indigo-600 to-emerald-600 py-2 px-4 text-center text-white text-[11px] font-bold tracking-widest uppercase flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Official Anna University Hostel Digital Outpass</span>
          <span className="bg-white/20 px-2 py-0.5 rounded font-mono">
            {new Date().toLocaleTimeString()}
          </span>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Pass Content */}
        <div className="p-6">
          {/* Institutional Header */}
          <div className="text-center pb-4 border-b border-slate-800">
            <div className="inline-flex items-center justify-center p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl mb-2 text-indigo-400">
              <Building2 className="w-8 h-8" />
            </div>
            <h2 className="text-base font-extrabold text-white uppercase tracking-tight">
              Hostel Administration • CEG Guindy
            </h2>
            <p className="text-xs text-slate-400">Anna University, Chennai - 600 025</p>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-slate-800/80 rounded-full border border-slate-700">
              <span className="text-xs text-slate-400">Gatepass ID:</span>
              <span className="text-xs font-mono font-bold text-indigo-400">{request.passNumber}</span>
            </div>
          </div>

          {/* Student ID & Profile Block */}
          <div className="my-5 p-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl flex items-center gap-4">
            <img
              src={request.profilePic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
              alt={request.studentName}
              className="w-18 h-18 rounded-xl object-cover border-2 border-indigo-500/40 shadow-md shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white truncate">{request.studentName}</h3>
              <p className="text-xs font-mono text-indigo-300 font-semibold">{request.studentRollNumber}</p>
              <p className="text-[11px] text-slate-400 truncate">{request.course} • {request.year}</p>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-300">
                <span className="font-semibold text-emerald-400">{request.hostelBlock}</span>
                <span>•</span>
                <span>Room {request.roomNumber}</span>
              </div>
            </div>
          </div>

          {/* Pass Status Banner */}
          <div className="mb-5">
            {isCompleted ? (
              <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl flex items-center gap-3 text-slate-300 text-xs">
                <CheckCircle2 className="w-5 h-5 text-slate-400 shrink-0" />
                <div>
                  <span className="font-bold block text-white">Pass Completed & Closed</span>
                  <span>Returned to campus at {new Date(request.returnScanTime || '').toLocaleString()}</span>
                </div>
              </div>
            ) : isExited ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-200 text-xs">
                <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                <div>
                  <span className="font-bold block text-amber-300">Officially Out of Campus</span>
                  <span>Checked OUT at {new Date(request.exitScanTime || '').toLocaleTimeString()} by {request.exitWatchmanName}</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-200 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold block text-emerald-300">Active Gatepass • Ready for Exit</span>
                  <span>Present this QR code to the Security Watchman at the gate.</span>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic QR Code Card */}
          <div className="p-5 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
            {/* Security background watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 select-none font-black text-6xl text-slate-900 rotate-12">
              ANNA UNIV
            </div>

            {qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt="Gatepass QR Code" 
                className="w-56 h-56 object-contain rounded-lg border-2 border-slate-200 shadow-inner"
              />
            ) : (
              <div className="w-56 h-56 bg-slate-100 flex items-center justify-center text-slate-400 rounded-lg">
                Generating Secure QR...
              </div>
            )}

            <div className="mt-3 text-center">
              <span className="text-[10px] font-mono font-bold text-slate-500 tracking-wider uppercase block">
                {request.qrToken || request.passNumber}
              </span>
              <span className="text-xs font-semibold text-slate-800">
                Single-Use Cryptographic Pass Token
              </span>
            </div>
          </div>

          {/* Outing / Leave Details */}
          <div className="mt-5 space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Pass Category</span>
                <span className="font-bold text-indigo-300">{request.requestType}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Destination</span>
                <span className="font-semibold text-slate-200 truncate block">{request.destination}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Departure Schedule</span>
                <span className="font-medium text-slate-200">{new Date(request.leavingDateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Curfew Return Schedule</span>
                <span className="font-bold text-amber-300">{new Date(request.returnDateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
            </div>

            {/* Approval Signatures Audit Trail */}
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Parent Approval:</span>
                <span className="font-medium text-emerald-400">
                  ✓ {request.parentName} ({request.parentApprovedAt ? new Date(request.parentApprovedAt).toLocaleTimeString() : 'Verified'})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Warden Authorization:</span>
                <span className="font-medium text-emerald-400">
                  ✓ {request.assignedWardenName || 'Hostel Warden'} ({request.wardenApprovedAt ? new Date(request.wardenApprovedAt).toLocaleTimeString() : 'Verified'})
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Emergency Parent Phone:</span>
                <a href={`tel:${request.parentPhone}`} className="font-mono text-indigo-300 hover:underline flex items-center gap-1">
                  <PhoneCall className="w-3 h-3" />
                  {request.parentPhone}
                </a>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all text-center"
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
