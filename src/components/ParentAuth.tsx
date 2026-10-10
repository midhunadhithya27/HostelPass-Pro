import React, { useState } from 'react';
import { hostelStore } from '../services/store';
import { ParentProfile } from '../types';
import { 
  Users, 
  Mail, 
  Lock, 
  Phone, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Heart
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface ParentAuthProps {
  onSuccess: (parent: ParentProfile) => void;
  onSwitchRole: () => void;
}

export const ParentAuth: React.FC<ParentAuthProps> = ({ onSuccess, onSwitchRole }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Parent Login States:
  // Prompt: "parent's name, parent's email id, relation to student, password, student's phone number, parents phone number, otp verification for both the phone numbers"
  const [loginName, setLoginName] = useState('Senthil Nathan S');
  const [loginEmail, setLoginEmail] = useState('senthil.parent@gmail.com');
  const [loginRelation, setLoginRelation] = useState<'Father' | 'Mother' | 'Guardian'>('Father');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [loginStudentPhone, setLoginStudentPhone] = useState('+91 91234 56789');
  const [loginParentPhone, setLoginParentPhone] = useState('+91 98401 23456');

  // Parent Register States:
  // Prompt: "parent's name, email, password, phone number, (except password everything should match with the respective student) allow only one registration either for their mother or father"
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('+91 ');
  const [regRelation, setRegRelation] = useState<'Father' | 'Mother' | 'Guardian'>('Father');

  const handleDemoFill = () => {
    setLoginName('Senthil Nathan S');
    setLoginEmail('senthil.parent@gmail.com');
    setLoginRelation('Father');
    setLoginPassword('password123');
    setLoginStudentPhone('+91 91234 56789');
    setLoginParentPhone('+91 98401 23456');
    setError('');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parents = hostelStore.getParents();
    const students = hostelStore.getStudents();

    // Match parent profile
    const parent = parents.find(p => 
      p.email.trim().toLowerCase() === loginEmail.trim().toLowerCase()
    );

    if (!parent) {
      setError(`No parent registered with email ${loginEmail}. Please register first or verify.`);
      soundService.playWarningChime();
      return;
    }

    if (parent.password && parent.password !== loginPassword) {
      setError('Incorrect parent password.');
      soundService.playWarningChime();
      return;
    }

    // Find linked student
    const student = students.find(s => s.rollNumber === parent.linkedStudentRoll);
    if (!student) {
      setError('Linked student record could not be found.');
      return;
    }

    // Verify phone numbers match
    const cleanStudentPhone = loginStudentPhone.replace(/[\s-]/g, '');
    const cleanRegisteredStudentPhone = student.studentPhone.replace(/[\s-]/g, '');
    if (cleanStudentPhone !== cleanRegisteredStudentPhone) {
      setError(`Entered student phone (${loginStudentPhone}) does not match student's registered number.`);
      return;
    }

    const cleanParentPhone = loginParentPhone.replace(/[\s-]/g, '');
    const cleanRegisteredParentPhone = parent.phone.replace(/[\s-]/g, '');
    if (cleanParentPhone !== cleanRegisteredParentPhone) {
      setError(`Entered parent phone does not match registered phone.`);
      return;
    }

    // Trigger Dual OTP dispatch
    const msg = `HostelPass Dual Security: Parent login requested for ${parent.name}. Both Parent and Student OTP dispatched.`;
    hostelStore.sendOtp('parent', parent.phone, msg, student.studentPhone);

    setSuccessMsg(`Dual OTP sent: Code 1 to Parent (${parent.phone}) and Code 2 to Student (${student.studentPhone}).`);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!regName || !regEmail || !regPassword || !regPhone) {
      setError('Please fill all parent registration fields.');
      return;
    }

    const res = hostelStore.registerParent({
      name: regName,
      email: regEmail,
      phone: regPhone,
      relation: regRelation,
      password: regPassword,
    });

    if (!res.success) {
      setError(res.message);
      soundService.playWarningChime();
    } else if (res.parent) {
      soundService.playSuccessChime();
      onSuccess(res.parent);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-slate-900/90 border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="text-center pb-6 border-b border-slate-800">
        <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl mb-3 shadow-inner">
          <Heart className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Parent Authorization Portal</h2>
        <p className="text-xs text-slate-400 mt-1">
          Real-time leave authorization with instant emergency override
        </p>

        {/* Tab Switcher */}
        <div className="mt-5 grid grid-cols-2 p-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'login' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Parent Login
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'register' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Parent Register (1:1 Link)
          </button>
        </div>
      </div>

      {/* Demo Credentials Quick-Chip */}
      {mode === 'login' && (
        <div className="mt-4 p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
          <div className="text-slate-300">
            <span className="font-semibold text-amber-300">Demo Parent: </span>
            <span className="font-mono text-slate-200">senthil.parent@gmail.com</span> (Father of Karthik)
          </div>
          <button
            type="button"
            onClick={handleDemoFill}
            className="px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 rounded-md font-medium text-xs flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            1-Click Fill
          </button>
        </div>
      )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Parent's Full Name</label>
              <input
                type="text"
                required
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="e.g. Senthil Nathan S"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Parent's Email ID</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="senthil.parent@gmail.com"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Relation to Student</label>
              <select
                value={loginRelation}
                onChange={(e) => setLoginRelation(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-500 outline-none"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Parent Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Parent's Phone Number</label>
              <input
                type="text"
                required
                value={loginParentPhone}
                onChange={(e) => setLoginParentPhone(e.target.value)}
                placeholder="+91 98401 23456"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Student's Phone Number</label>
              <input
                type="text"
                required
                value={loginStudentPhone}
                onChange={(e) => setLoginStudentPhone(e.target.value)}
                placeholder="+91 91234 56789"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-500 outline-none font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-200">
            🔒 <strong>Dual OTP Verification:</strong> Login sends verification codes to both parent's phone and student's phone for fraud prevention.
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 text-sm transition-all"
          >
            <span>Send Dual OTP & Log In</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        /* PARENT REGISTRATION FORM */
        <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
            <span className="font-bold text-amber-400 block mb-0.5">📌 One-to-One Student Linking Rule</span>
            All details (Name, Email, and Phone) must match the parent information submitted by your child during student registration. Only one parent registration (Mother or Father) is permitted per student.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Parent's Full Name *</label>
            <input
              type="text"
              required
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="e.g. Senthil Nathan S"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Parent's Email Address *</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="senthil.parent@gmail.com"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Parent's Phone Number *</label>
              <input
                type="text"
                required
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+91 98401 23456"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Relation to Student *</label>
              <select
                value={regRelation}
                onChange={(e) => setRegRelation(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-500 outline-none"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Create Password *</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Create secure password"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 text-sm transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            Verify Student Link & Complete Parent Registration
          </button>
        </form>
      )}

      {/* Switch role link */}
      <div className="mt-6 pt-4 border-t border-slate-800 text-center">
        <button
          type="button"
          onClick={onSwitchRole}
          className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
        >
          Need Student, Warden, or Watchman access instead? Switch role
        </button>
      </div>
    </div>
  );
};
