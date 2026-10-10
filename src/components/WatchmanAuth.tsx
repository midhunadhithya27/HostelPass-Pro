import React, { useState } from 'react';
import { hostelStore } from '../services/store';
import { WatchmanProfile } from '../types';
import { 
  ShieldAlert, 
  Phone, 
  User, 
  FileText, 
  Upload, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Check
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface WatchmanAuthProps {
  onSuccess: (watchman: WatchmanProfile) => void;
  onSwitchRole: () => void;
}

export const WatchmanAuth: React.FC<WatchmanAuthProps> = ({ onSuccess, onSwitchRole }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Watchman Login States:
  const [loginName, setLoginName] = useState('');
  const [loginPhone, setLoginPhone] = useState('');

  // Watchman Register States:
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('+91 ');
  const [regProofId, setRegProofId] = useState('');
  const [regGatePost, setRegGatePost] = useState('Main Gate 1 - CEG Campus');
  const [proofFileName, setProofFileName] = useState('');

  const handleProofFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFileName(file.name);
      setRegProofId(`AU-DOC-VERIFIED (${file.name})`);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const watchmen = hostelStore.getWatchmen();
    const cleanLoginPhone = loginPhone.replace(/[\s-]/g, '');

    const watchman = watchmen.find(w => {
      const cleanWPhone = w.phone.replace(/[\s-]/g, '');
      const nameMatch = w.name.toLowerCase().includes(loginName.trim().toLowerCase()) ||
                         loginName.trim().toLowerCase().includes(w.name.toLowerCase());
      return cleanWPhone === cleanLoginPhone && nameMatch;
    });

    if (!watchman) {
      setError(`No registered security officer matches name "${loginName}" and phone "${loginPhone}".`);
      soundService.playWarningChime();
      return;
    }

    // Send OTP to Watchman's Phone with session binding
    const msg = `HostelPass Gate Sentinel: Security Check-In OTP for Officer ${watchman.name}.`;
    hostelStore.sendOtp('watchman', watchman.phone, msg, undefined, watchman);

    setSuccessMsg(`OTP sent to Security Officer phone (${watchman.phone}). Please verify to open Gate Terminal.`);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!regName || !regPhone || !regProofId) {
      setError('Please provide officer name, phone number, and working proof ID/document.');
      return;
    }

    const res = hostelStore.registerWatchman({
      name: regName,
      phone: regPhone,
      collegeProofId: regProofId,
      gatePost: regGatePost,
    });

    if (!res.success) {
      setError(res.message);
      soundService.playWarningChime();
    } else if (res.watchman) {
      soundService.playSuccessChime();
      onSuccess(res.watchman);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-slate-900/90 border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="text-center pb-6 border-b border-slate-800">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl mb-3 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Security Gate Sentinel</h2>
        <p className="text-xs text-slate-400 mt-1">
          Campus Gate In/Out Verification & Real-Time Student Headcount Balancer
        </p>

        {/* Tab Switcher */}
        <div className="mt-5 grid grid-cols-2 p-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'login' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Watchman Login
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'register' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Register Security Officer
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* LOGIN FORM */}
      {mode === 'login' ? (
        <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Watchman Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="e.g. Murugan K."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Registered Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                placeholder="+91 98840 55667"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-emerald-500 outline-none font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-200">
            🛡️ Login initiates two-factor authentication via SMS OTP to guard against unauthorized access to gate control terminals.
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-sm transition-all"
          >
            <span>Send Security OTP & Access Terminal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        /* WATCHMAN REGISTRATION FORM */
        <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Watchman / Security Officer Full Name *</label>
            <input
              type="text"
              required
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="e.g. K. Murugan (Security Guard)"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
            <input
              type="text"
              required
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              placeholder="+91 98840 55667"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-emerald-500 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Gate Post *</label>
            <select
              value={regGatePost}
              onChange={(e) => setRegGatePost(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-emerald-500 outline-none"
            >
              <option value="Main Gate 1 - CEG Campus">Main Gate 1 - CEG Campus</option>
              <option value="South Campus Gate 3">South Campus Gate 3</option>
              <option value="Hostel Zone Barrier Post 2">Hostel Zone Barrier Post 2</option>
              <option value="Kotturpuram Gate 4">Kotturpuram Gate 4</option>
            </select>
          </div>

          {/* Working Proof ID / Document or Photo Upload */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
            <label className="block text-xs font-semibold text-slate-200">
              College Working Proof ID / Service Photo *
            </label>
            <input
              type="text"
              value={regProofId}
              onChange={(e) => setRegProofId(e.target.value)}
              placeholder="e.g. AU-SEC-2024-9182"
              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:border-emerald-500 outline-none font-mono"
            />
            
            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {proofFileName ? `Attached: ${proofFileName}` : 'Attach photo ID or ID card scan:'}
              </span>
              <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg cursor-pointer flex items-center gap-1.5 border border-slate-700 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Upload Proof File
                <input type="file" onChange={handleProofFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-sm transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete Security Guard Registration
          </button>
        </form>
      )}

      {/* Switch role link */}
      <div className="mt-6 pt-4 border-t border-slate-800 text-center">
        <button
          type="button"
          onClick={onSwitchRole}
          className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
        >
          Need Student, Parent, or Warden access instead? Switch role
        </button>
      </div>
    </div>
  );
};
