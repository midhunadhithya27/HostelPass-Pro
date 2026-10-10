import React, { useState } from 'react';
import { hostelStore } from '../services/store';
import { WardenProfile, HostelBlock } from '../types';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Phone, 
  User, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Layers,
  Cpu
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface WardenAuthProps {
  onSuccess: (warden: WardenProfile) => void;
  onSwitchRole: () => void;
}

const ALL_BLOCKS: HostelBlock[] = [
  'Boys hostel-1',
  'Boys hostel-2',
  'Boys hostel (seniors)-3',
  'Girl hostel'
];

export const WardenAuth: React.FC<WardenAuthProps> = ({ onSuccess, onSwitchRole }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Warden Login States:
  const [loginName, setLoginName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPhone, setLoginPhone] = useState('');

  // Warden Register States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('+91 ');
  const [regPassword, setRegPassword] = useState('');
  const [selectedBlocks, setSelectedBlocks] = useState<HostelBlock[]>(['Boys hostel-1', 'Boys hostel-2']);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const wardens = hostelStore.getWardens();
    const warden = wardens.find(w => w.email.trim().toLowerCase() === loginEmail.trim().toLowerCase());

    if (!warden) {
      setError(`No warden profile found with email ${loginEmail}. Please verify or register.`);
      soundService.playWarningChime();
      return;
    }

    if (warden.password && warden.password !== loginPassword) {
      setError('Incorrect warden password.');
      soundService.playWarningChime();
      return;
    }

    const cleanInputPhone = loginPhone.replace(/[\s-]/g, '');
    const cleanRegisteredPhone = warden.phone.replace(/[\s-]/g, '');

    if (cleanInputPhone !== cleanRegisteredPhone) {
      setError(`Phone number does not match warden's official records (${warden.phone}).`);
      soundService.playWarningChime();
      return;
    }

    // Dispatch OTP to Warden with session binding
    const msg = `HostelPass Warden Gateway: Authorization OTP for ${warden.name} (${warden.email}).`;
    hostelStore.sendOtp('warden', warden.phone, msg, undefined, warden);

    setSuccessMsg(`OTP sent to Warden's official mobile (${warden.phone}). Please verify to enter.`);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!regName || !regEmail || !regPhone || !regPassword) {
      setError('Please fill all warden registration fields.');
      return;
    }

    const res = hostelStore.registerWarden({
      name: regName,
      email: regEmail,
      phone: regPhone,
      password: regPassword,
      assignedBlocks: selectedBlocks,
    });

    if (!res.success) {
      setError(res.message);
      soundService.playWarningChime();
    } else if (res.warden) {
      soundService.playSuccessChime();
      onSuccess(res.warden);
    }
  };

  const toggleBlock = (block: HostelBlock) => {
    if (selectedBlocks.includes(block)) {
      if (selectedBlocks.length > 1) {
        setSelectedBlocks(selectedBlocks.filter(b => b !== block));
      }
    } else {
      setSelectedBlocks([...selectedBlocks, block]);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-slate-900/90 border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="text-center pb-6 border-b border-slate-800">
        <div className="inline-flex items-center justify-center p-3 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-2xl mb-3 shadow-inner">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Hostel Warden Portal</h2>
        <p className="text-xs text-slate-400 mt-1">
          Automated Parent-to-Warden Queue • Capped at Max 100 Requests/Warden
        </p>

        {/* Tab Switcher */}
        <div className="mt-5 grid grid-cols-2 p-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'login' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Warden Login
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'register' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Register Warden
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Warden's Official Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="Dr. R. Balasubramanian"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-violet-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Official Email ID</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="warden@ceg.annauniv.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-violet-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-violet-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Registered Mobile Phone</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                placeholder="+91 94440 11223"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-violet-500 outline-none font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-start gap-2.5 text-xs text-violet-200">
            <Cpu className="w-4 h-4 shrink-0 text-violet-400 mt-0.5" />
            <div>
              <strong className="block text-violet-300">Intelligent Load-Balancing Active:</strong>
              Leave requests are assigned only AFTER parent approval, capped at 100 requests per warden. No duplicates are dispatched.
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2 text-sm transition-all"
          >
            <span>Send Warden OTP & Enter Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        /* WARDEN REGISTRATION FORM */
        <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Warden's Full Name *</label>
            <input
              type="text"
              required
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="e.g. Prof. S. Jayakumar"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-violet-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Official Email ID *</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="jayakumar.warden@ceg.annauniv.edu"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-violet-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Phone *</label>
              <input
                type="text"
                required
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+91 94440 33221"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-violet-500 outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Create Password *</label>
            <input
              type="password"
              required
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-violet-500 outline-none"
            />
          </div>

          {/* Assigned Hostel Blocks */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Assigned Hostel Blocks (Multi-select)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_BLOCKS.map(block => {
                const isSelected = selectedBlocks.includes(block);
                return (
                  <button
                    key={block}
                    type="button"
                    onClick={() => toggleBlock(block)}
                    className={`p-2 rounded-xl text-left text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-violet-950/60 border-violet-500 text-violet-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="block truncate">{block}</span>
                    <span className="text-[10px] text-slate-500">{isSelected ? '✓ Assigned' : '+ Add'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400">
            ⚡ <strong>Automated Max-100 Request Rule:</strong> Once your active queue reaches 100 requests, new requests automatically overflow to the next available warden.
          </div>

          <button
            type="submit"
            className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2 text-sm transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete Warden Registration
          </button>
        </form>
      )}

      {/* Switch role link */}
      <div className="mt-6 pt-4 border-t border-slate-800 text-center">
        <button
          type="button"
          onClick={onSwitchRole}
          className="text-xs text-slate-400 hover:text-violet-400 transition-colors"
        >
          Need Student, Parent, or Watchman access instead? Switch role
        </button>
      </div>
    </div>
  );
};
