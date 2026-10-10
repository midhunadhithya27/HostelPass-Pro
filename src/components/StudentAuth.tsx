import React, { useState } from 'react';
import { hostelStore } from '../services/store';
import { StudyYear, Gender, HostelBlock, StudentProfile } from '../types';
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Building, 
  Calendar, 
  GraduationCap, 
  Home, 
  Camera, 
  Upload, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  X,
  Video
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface StudentAuthProps {
  onSuccess: (student: StudentProfile) => void;
  onSwitchRole: () => void;
}

const HOSTEL_BLOCKS: HostelBlock[] = [
  'Thamarai Block (Men)',
  'Kaveri Block (Men)',
  'Vaigai Block (Men)',
  'Kurunji Block (Women)',
  'Mullai Block (Women)',
  'Malligai Block (Women)',
  'PG & International Block'
];

const STUDY_YEARS: StudyYear[] = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'PG / Research'];

export const StudentAuth: React.FC<StudentAuthProps> = ({ onSuccess, onSwitchRole }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Login Form States
  const [loginRoll, setLoginRoll] = useState('2023105084');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [loginParentPhone, setLoginParentPhone] = useState('+91 98401 23456');

  // Registration Form States
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [collegeName, setCollegeName] = useState('College of Engineering, Guindy (CEG), Anna University');
  const [password, setPassword] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('+91 ');
  const [parentEmail, setParentEmail] = useState('');
  const [profilePic, setProfilePic] = useState('https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80');
  const [dob, setDob] = useState('2004-05-12');
  const [year, setYear] = useState<StudyYear>('3rd Year');
  const [course, setCourse] = useState('B.E. Computer Science and Engineering');
  const [gender, setGender] = useState<Gender>('Male');
  const [hostelBlock, setHostelBlock] = useState<HostelBlock>('Thamarai Block (Men)');
  const [roomNumber, setRoomNumber] = useState('B-304');
  const [studentPhone, setStudentPhone] = useState('+91 ');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const cameraVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = React.useRef<MediaStream | null>(null);

  // Handle Photo Upload via file
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Open camera for live student photo capture
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false
      });
      cameraStreamRef.current = stream;
      setIsCameraOpen(true);
      setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: any) {
      setError(`Cannot access camera: ${err.message || 'Permission denied'}. Please use upload.`);
      soundService.playWarningChime();
    }
  };

  const closeCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const takeSnapshot = () => {
    if (cameraVideoRef.current) {
      const video = cameraVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 400;
      canvas.height = video.videoHeight || 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setProfilePic(dataUrl);
        soundService.playNotificationPing();
      }
    }
    closeCamera();
  };

  // Student Login with OTP dispatch to Parent's Phone
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const students = hostelStore.getStudents();
    const student = students.find(s => s.rollNumber.trim().toUpperCase() === loginRoll.trim().toUpperCase());

    if (!student) {
      setError(`No student found with Roll Number ${loginRoll}. Please check or register.`);
      soundService.playWarningChime();
      return;
    }

    if (student.password && student.password !== loginPassword) {
      setError('Invalid password entered.');
      soundService.playWarningChime();
      return;
    }

    // Verify parent's phone matches student's records
    const cleanInputParentPhone = loginParentPhone.replace(/[\s-]/g, '');
    const cleanStudentParentPhone = student.parentPhone.replace(/[\s-]/g, '');

    if (cleanInputParentPhone !== cleanStudentParentPhone) {
      setError(`Parent phone number does not match registered records (${student.parentPhone}).`);
      soundService.playWarningChime();
      return;
    }

    // Dispatch OTP to parent's SMS
    const msg = `HostelPass OTP: Your child ${student.name} (${student.rollNumber}) is attempting to log in. Verification code sent to your registered mobile.`;
    hostelStore.sendOtp('student', student.parentPhone, msg);

    // Provide pending OTP prompt
    setSuccessMsg(`OTP sent to parent's mobile (${student.parentPhone}). Please verify.`);
  };

  // Handle Registration
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !rollNumber || !email || !password || !parentName || !parentPhone || !parentEmail || !roomNumber) {
      setError('Please fill in all mandatory registration fields.');
      return;
    }

    const res = hostelStore.registerStudent({
      name,
      rollNumber,
      email,
      collegeName,
      password,
      parentName,
      parentPhone,
      parentEmail,
      profilePic,
      dob,
      year,
      course,
      gender,
      hostelBlock,
      roomNumber,
      studentPhone,
    });

    if (!res.success) {
      setError(res.message);
      soundService.playWarningChime();
    } else if (res.student) {
      soundService.playSuccessChime();
      onSuccess(res.student);
    }
  };

  // Quick Demo Autofill for testing
  const handleDemoFill = () => {
    setLoginRoll('2023105084');
    setLoginPassword('password123');
    setLoginParentPhone('+91 98401 23456');
    setError('');
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-slate-900/90 border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="text-center pb-6 border-b border-slate-800">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl mb-3 shadow-inner">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Student Portal</h2>
        <p className="text-xs text-slate-400 mt-1">
          Anna University Hostel Outing & Leave Management System
        </p>

        {/* Tab Switcher */}
        <div className="mt-5 grid grid-cols-2 p-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'login' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Student Login
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'register' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            New Student Register
          </button>
        </div>
      </div>

      {/* Demo Credentials Quick-Chip */}
      {mode === 'login' && (
        <div className="mt-4 p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-center justify-between text-xs">
          <div className="text-slate-300">
            <span className="font-semibold text-indigo-300">Demo Account: </span>
            <span className="font-mono text-slate-200">2023105084</span> / <span className="font-mono text-slate-200">+91 98401 23456</span>
          </div>
          <button
            type="button"
            onClick={handleDemoFill}
            className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 rounded-md font-medium text-xs flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
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
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Anna University Roll Number
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={loginRoll}
                onChange={(e) => setLoginRoll(e.target.value.toUpperCase())}
                placeholder="e.g. 2023105084"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Student Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Parent's Registered Phone Number</span>
              <span className="text-[10px] text-amber-400 font-medium">OTP dispatched to this SMS</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={loginParentPhone}
                onChange={(e) => setLoginParentPhone(e.target.value)}
                placeholder="+91 98401 23456"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              For security, student logins require instant SMS verification sent to parent's phone.
            </p>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 text-sm transition-all"
          >
            <span>Send OTP & Continue to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        /* REGISTRATION FORM */
        <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
          {/* Profile Picture Upload & Camera Capture */}
          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="relative group">
              <img
                src={profilePic}
                alt="Profile Preview"
                className="w-18 h-18 rounded-2xl object-cover border-2 border-indigo-500 shadow-md"
              />
              <button 
                type="button"
                onClick={openCamera}
                className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Take live photo with camera"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Student Profile Photo</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Used for digital gatepass verification by security watchmen.</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openCamera}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Take Photo with Camera
                </button>
                <label className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg cursor-pointer transition-colors border border-slate-700 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Upload File
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {/* Live Camera Snapshot Modal */}
          {isCameraOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
              <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 text-indigo-400" />
                    Take Student Profile Photo
                  </h4>
                  <button onClick={closeCamera} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-inner">
                  <video 
                    ref={cameraVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover" 
                  />
                  {/* Face oval guide */}
                  <div className="absolute inset-6 border-2 border-dashed border-indigo-400/70 rounded-full pointer-events-none" />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeCamera}
                    className="flex-1 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={takeSnapshot}
                    className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Capture Photo
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Student Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Karthik Subramanian"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Anna University Roll No *</label>
              <input
                type="text"
                required
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 2023105084"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">College Official Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="karthik.s@ceg.annauniv.edu"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password Creation *</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create strong password"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">College Name *</label>
              <input
                type="text"
                required
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none"
              />
            </div>

            {/* Academic details */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Course Pursued *</label>
              <input
                type="text"
                required
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. B.E. Computer Science"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Year of Study *</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value as StudyYear)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none"
              >
                {STUDY_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Date of Birth *</label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Gender *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Hostel details */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Hostel Block *</label>
              <select
                value={hostelBlock}
                onChange={(e) => setHostelBlock(e.target.value as HostelBlock)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none"
              >
                {HOSTEL_BLOCKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Room Number *</label>
              <input
                type="text"
                required
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. B-304"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none uppercase font-mono"
              />
            </div>

            {/* Parent Linkage Details */}
            <div className="md:col-span-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                Parent Contact & Linkage Information
              </h4>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Parent's Full Name *</label>
              <input
                type="text"
                required
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="e.g. Senthil Nathan S"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Parent's Mobile Phone *</label>
              <input
                type="text"
                required
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="+91 98401 23456"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Parent's Login Email (Linking Key) *
              </label>
              <input
                type="email"
                required
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="senthil.parent@gmail.com"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none"
              />
              <span className="text-[10px] text-slate-500">Your parent will use this email to create their approval portal.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Student Mobile Phone *</label>
              <input
                type="text"
                required
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                placeholder="+91 91234 56789"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 outline-none font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-sm transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete Student Registration & Enter
          </button>
        </form>
      )}

      {/* Switch role link */}
      <div className="mt-6 pt-4 border-t border-slate-800 text-center">
        <button
          type="button"
          onClick={onSwitchRole}
          className="text-xs text-slate-400 hover:text-indigo-400 transition-colors"
        >
          Not a student? Switch to Parent, Warden, or Watchman Portal
        </button>
      </div>
    </div>
  );
};
