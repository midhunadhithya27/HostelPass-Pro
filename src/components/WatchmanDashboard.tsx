import React, { useState, useEffect, useRef } from 'react';
import { hostelStore } from '../services/store';
import { WatchmanProfile, LeaveRequest, GateLog } from '../types';
import { 
  ShieldAlert, 
  QrCode, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Camera, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Users, 
  Building, 
  History,
  Sparkles,
  FileText,
  Volume2
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface WatchmanDashboardProps {
  watchman: WatchmanProfile;
}

export const WatchmanDashboard: React.FC<WatchmanDashboardProps> = ({ watchman }) => {
  const [scanMode, setScanMode] = useState<'OUT' | 'IN'>('OUT');
  const [scanInput, setScanInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [gateLogs, setGateLogs] = useState<GateLog[]>([]);
  const [activePasses, setActivePasses] = useState<LeaveRequest[]>([]);
  const [headcount, setHeadcount] = useState(hostelStore.getCampusHeadcount());
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; pass?: LeaveRequest } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const updateData = () => {
    setGateLogs(hostelStore.getGateLogs());
    setActivePasses(hostelStore.getRequests().filter(r => 
      ['APPROVED_PASS_GENERATED', 'STUDENT_EXITED_CAMPUS'].includes(r.status)
    ));
    setHeadcount(hostelStore.getCampusHeadcount());
  };

  useEffect(() => {
    updateData();
    const unsub = hostelStore.subscribe(updateData);
    return unsub;
  }, []);

  // Handle camera start/stop
  const toggleCamera = async () => {
    if (cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      setCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      } catch (err) {
        console.warn('Camera access unavailable or simulated:', err);
        setCameraActive(false);
        setFeedback({
          type: 'error',
          message: 'Camera device not accessible in this environment. Use the 1-Click Pass Chip or manual pass code input below.'
        });
      }
    }
  };

  const handleProcessScan = (codeToScan?: string) => {
    const targetCode = codeToScan || scanInput;
    if (!targetCode.trim()) {
      setFeedback({ type: 'error', message: 'Please enter or scan a gatepass QR code or Roll Number.' });
      soundService.playWarningChime();
      return;
    }

    const result = hostelStore.processGateScan(
      targetCode,
      scanMode,
      watchman.name,
      watchman.gatePost
    );

    if (result.success) {
      setFeedback({
        type: 'success',
        message: result.message,
        pass: result.request
      });
      setScanInput('');
      updateData();
    } else {
      setFeedback({
        type: 'error',
        message: result.message
      });
      soundService.playWarningChime();
    }
  };

  // Passes eligible for current mode
  const eligiblePasses = activePasses.filter(p => 
    scanMode === 'OUT' ? p.status === 'APPROVED_PASS_GENERATED' : p.status === 'STUDENT_EXITED_CAMPUS'
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Watchman Identity & Headcount Balancer */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-3xl shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-2xl shadow-inner shrink-0">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">{watchman.name}</h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                Gate Sentinel Officer
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Station: <strong className="text-slate-200">{watchman.gatePost}</strong> • Phone: <span className="font-mono text-slate-200">{watchman.phone}</span>
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Working Proof: <span className="text-slate-300 font-mono text-[11px]">{watchman.collegeProofId}</span></span>
            </div>
          </div>
        </div>

        {/* Live Headcount Balancer Counter */}
        <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl min-w-[140px] text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
              Students Inside Campus
            </span>
            <span className="text-2xl font-mono font-black text-white mt-1 block">
              {headcount.totalStudentsCurrentlyIn}
            </span>
            <span className="text-[10px] text-slate-500 block">Hostel Headcount</span>
          </div>

          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl min-w-[140px] text-center">
            <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
              Officially Out of Campus
            </span>
            <span className="text-2xl font-mono font-black text-amber-300 mt-1 block animate-pulse">
              {headcount.totalStudentsCurrentlyOut}
            </span>
            <span className="text-[10px] text-slate-500 block">Active Outpasses</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            )}
            <div>
              <span className="font-semibold block">{feedback.message}</span>
              {feedback.pass && (
                <span className="text-[11px] text-slate-300">
                  Pass: {feedback.pass.passNumber} • Student: {feedback.pass.studentName} ({feedback.pass.studentRollNumber}) • {feedback.pass.hostelBlock}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* DUAL MODE QR SCANNER TERMINAL */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-400" />
              Campus Gate Scanner Terminal
            </h3>
            <p className="text-xs text-slate-400">
              Select movement direction (EXIT vs ENTRY) to maintain balanced campus headcount
            </p>
          </div>

          {/* Mode Selector Toggle */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => { setScanMode('OUT'); setFeedback(null); }}
              className={`py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                scanMode === 'OUT' 
                  ? 'bg-amber-500 text-slate-950 shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>SCAN OUT (Exit)</span>
            </button>
            <button
              onClick={() => { setScanMode('IN'); setFeedback(null); }}
              className={`py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                scanMode === 'IN' 
                  ? 'bg-emerald-500 text-slate-950 shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>SCAN IN (Return)</span>
            </button>
          </div>
        </div>

        {/* Input Bar & Camera Launcher */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <form onSubmit={(e) => { e.preventDefault(); handleProcessScan(); }} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value.toUpperCase())}
                  placeholder="Enter QR token, Pass # (e.g. HP-2026-8942) or Roll No"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-emerald-500 outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                className={`px-5 py-2.5 rounded-xl font-bold text-xs text-slate-950 flex items-center gap-1.5 shadow-lg transition-all ${
                  scanMode === 'OUT' ? 'bg-amber-400 hover:bg-amber-300' : 'bg-emerald-400 hover:bg-emerald-300'
                }`}
              >
                <span>Verify & Record {scanMode}</span>
              </button>
            </form>

            {/* Quick-Scan Testing Chips (For easy instant evaluation) */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                ⚡ 1-Click Fast Verification ({eligiblePasses.length} available to scan {scanMode}):
              </span>
              {eligiblePasses.length === 0 ? (
                <span className="text-slate-500 italic text-[11px]">
                  No active passes currently waiting to be scanned {scanMode}.
                </span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {eligiblePasses.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleProcessScan(p.passNumber)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                        scanMode === 'OUT'
                          ? 'bg-amber-950/40 text-amber-200 border-amber-500/40 hover:bg-amber-900/60'
                          : 'bg-emerald-950/40 text-emerald-200 border-emerald-500/40 hover:bg-emerald-900/60'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{p.studentName} ({p.studentRollNumber})</span>
                      <span className="font-mono text-[10px] opacity-75">#{p.passNumber}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Camera Scanner Viewport */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
            {cameraActive ? (
              <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-emerald-500/50">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 border-2 border-emerald-400 border-dashed rounded-lg pointer-events-none animate-pulse" />
              </div>
            ) : (
              <div className="py-4">
                <Camera className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-300 block">Optical QR Barcode Camera</span>
                <span className="text-[11px] text-slate-500 block">Scan student phone display</span>
              </div>
            )}
            <button
              onClick={toggleCamera}
              className="mt-3 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors"
            >
              {cameraActive ? 'Stop Optical Camera' : 'Launch Scanner Camera'}
            </button>
          </div>
        </div>
      </div>

      {/* GATE MOVEMENT AUDIT LOG */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            Gate Movement Audit Log ({gateLogs.length})
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Anna University Security Division
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="pb-3 font-semibold">Movement</th>
                <th className="pb-3 font-semibold">Time</th>
                <th className="pb-3 font-semibold">Student Name & Roll</th>
                <th className="pb-3 font-semibold">Hostel Block</th>
                <th className="pb-3 font-semibold">Pass Number</th>
                <th className="pb-3 font-semibold">Security Officer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {gateLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No gate movements logged yet.
                  </td>
                </tr>
              ) : (
                gateLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        log.scanType === 'OUT' 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {log.scanType === 'OUT' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                        {log.scanType === 'OUT' ? 'EXIT (OUT)' : 'ENTRY (IN)'}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-300">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3">
                      <strong className="text-white block">{log.studentName}</strong>
                      <span className="text-[11px] font-mono text-indigo-400">{log.studentRollNumber}</span>
                    </td>
                    <td className="py-3 text-slate-300">
                      {log.hostelBlock} ({log.roomNumber})
                    </td>
                    <td className="py-3 font-mono text-slate-400">
                      {log.passNumber}
                    </td>
                    <td className="py-3 text-slate-400">
                      {log.watchmanName}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
