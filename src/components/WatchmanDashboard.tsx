import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
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
  Volume2,
  SwitchCamera,
  Upload,
  Check,
  VideoOff
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface WatchmanDashboardProps {
  watchman: WatchmanProfile;
}

export const WatchmanDashboard: React.FC<WatchmanDashboardProps> = ({ watchman }) => {
  const [scanMode, setScanMode] = useState<'OUT' | 'IN'>('OUT');
  const [scanInput, setScanInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [isScanningActive, setIsScanningActive] = useState(true);
  
  const [gateLogs, setGateLogs] = useState<GateLog[]>([]);
  const [activePasses, setActivePasses] = useState<LeaveRequest[]>([]);
  const [headcount, setHeadcount] = useState(hostelStore.getCampusHeadcount());
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; pass?: LeaveRequest } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Bind video stream whenever camera is activated
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => {
        console.warn('Auto-play issue, retrying with user interaction:', err);
      });
    }
  }, [cameraActive]);

  // Start Camera with resilient fallbacks
  const startCamera = async (targetFacing: 'environment' | 'user' = facingMode) => {
    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    try {
      let stream: MediaStream;
      try {
        // Try requested facingMode with resolution preference
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false
        });
      } catch (firstErr) {
        console.warn('Initial facingMode camera failed, falling back to basic video constraint:', firstErr);
        // Fallback to any default camera available (webcam, laptop camera)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      setCameraActive(true);
      setFeedback(null);
    } catch (err: any) {
      console.error('Camera access completely denied or unsupported:', err);
      setCameraActive(false);
      setFeedback({
        type: 'error',
        message: `Camera could not be started (${err.name || 'Permission Denied'}). Ensure browser camera permissions are allowed, or use the 1-Click Pass Chips or QR Image Upload below.`
      });
      soundService.playWarningChime();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const switchCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (cameraActive) {
      startCamera(nextFacing);
    }
  };

  // Process gate scan with validation
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
      setLastScannedCode(targetCode);
      updateData();
    } else {
      setFeedback({
        type: 'error',
        message: result.message
      });
      soundService.playWarningChime();
    }
  };

  // Continuous Frame Optical QR Decoder Loop using jsQR
  useEffect(() => {
    if (!cameraActive) return;

    let animFrame: number;
    let isProcessingFrame = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scanFrame = () => {
      if (!isScanningActive) {
        animFrame = requestAnimationFrame(scanFrame);
        return;
      }

      if (
        videoRef.current && 
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && 
        ctx
      ) {
        if (!isProcessingFrame) {
          isProcessingFrame = true;
          const video = videoRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (qrCode && qrCode.data) {
              let extractedCode = qrCode.data;
              try {
                const parsed = JSON.parse(qrCode.data);
                if (parsed.passNumber) extractedCode = parsed.passNumber;
                else if (parsed.token) extractedCode = parsed.token;
                else if (parsed.rollNumber) extractedCode = parsed.rollNumber;
              } catch {}

              // Prevent repeated duplicate scans within brief window
              if (extractedCode !== lastScannedCode) {
                soundService.playGateScanBeep();
                handleProcessScan(extractedCode);
                setIsScanningActive(false);
                // Pause for 2 seconds before accepting next scan
                setTimeout(() => {
                  setIsScanningActive(true);
                  setLastScannedCode('');
                }, 2000);
              }
            }
          } catch (e) {
            console.error('Frame decode error:', e);
          } finally {
            isProcessingFrame = false;
          }
        }
      }

      animFrame = requestAnimationFrame(scanFrame);
    };

    animFrame = requestAnimationFrame(scanFrame);

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [cameraActive, scanMode, lastScannedCode, isScanningActive]);

  // Handle QR image file upload/scan
  const handleImageUploadScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          let extracted = code.data;
          try {
            const parsed = JSON.parse(code.data);
            if (parsed.passNumber) extracted = parsed.passNumber;
            else if (parsed.token) extracted = parsed.token;
            else if (parsed.rollNumber) extracted = parsed.rollNumber;
          } catch {}

          soundService.playGateScanBeep();
          handleProcessScan(extracted);
        } else {
          setFeedback({
            type: 'error',
            message: 'No readable QR barcode found in the uploaded image. Please try a clearer picture.'
          });
          soundService.playWarningChime();
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
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
              Campus Gate Optical Scanner Terminal
            </h3>
            <p className="text-xs text-slate-400">
              Live optical QR decoding with camera & balanced gate movement tracking
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
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
            <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Eligible Students Ready to Scan {scanMode} ({eligiblePasses.length}):
                </span>
                <span className="text-[10px] text-slate-500">Tap to auto-scan</span>
              </div>
              {eligiblePasses.length === 0 ? (
                <span className="text-slate-500 italic text-[11px] block py-1">
                  No active passes currently waiting to be scanned {scanMode}.
                </span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {eligiblePasses.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleProcessScan(p.passNumber)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shadow-sm ${
                        scanMode === 'OUT'
                          ? 'bg-amber-950/40 text-amber-200 border-amber-500/40 hover:bg-amber-900/60'
                          : 'bg-emerald-950/40 text-emerald-200 border-emerald-500/40 hover:bg-emerald-900/60'
                      }`}
                    >
                      <span>{p.studentName} ({p.studentRollNumber})</span>
                      <span className="font-mono text-[10px] opacity-75">#{p.passNumber}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* File Upload Alternative for QR Code Image */}
            <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-400">
              <span>Have a saved pass QR screenshot?</span>
              <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors border border-slate-700">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                Upload QR Image to Scan
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handleImageUploadScan} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          {/* Optical Camera Scanner Viewport with Live Scanning Canvas */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-between text-center relative overflow-hidden">
            {cameraActive ? (
              <div className="relative w-full aspect-square max-h-56 bg-black rounded-xl overflow-hidden border-2 border-emerald-500 shadow-inner flex items-center justify-center">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover" 
                />
                
                {/* Viewfinder Reticle Overlay */}
                <div className="absolute inset-4 border-2 border-emerald-400/80 rounded-xl pointer-events-none flex items-center justify-center">
                  <div className="w-full h-0.5 bg-emerald-400/80 shadow-[0_0_8px_#34d399] animate-[bounce_1.5s_infinite]" />
                  <span className="absolute bottom-2 text-[10px] font-mono font-bold bg-black/60 text-emerald-300 px-2 py-0.5 rounded">
                    SCANNING ACTIVE
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center flex-1">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 mb-2">
                  <Camera className="w-8 h-8" />
                </div>
                <span className="text-xs font-bold text-white block">Optical QR Barcode Camera</span>
                <span className="text-[11px] text-slate-500 block max-w-[200px] mt-1">
                  Point device camera at student's digital pass to verify exit/entry
                </span>
              </div>
            )}

            {/* Camera Control Buttons */}
            <div className="mt-3 w-full flex items-center gap-2">
              <button
                type="button"
                onClick={toggleCamera}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  cameraActive 
                    ? 'bg-rose-600/80 hover:bg-rose-600 text-white shadow-md' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25'
                }`}
              >
                {cameraActive ? <VideoOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                <span>{cameraActive ? 'Stop Camera' : 'Start Camera Scanner'}</span>
              </button>

              {cameraActive && (
                <button
                  type="button"
                  onClick={switchCameraFacing}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors border border-slate-700"
                  title="Switch Front/Back Camera"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              )}
            </div>
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
