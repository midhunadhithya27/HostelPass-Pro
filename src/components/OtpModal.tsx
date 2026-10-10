import React, { useState, useEffect } from 'react';
import { hostelStore } from '../services/store';
import { OtpSession } from '../types';
import { ShieldCheck, MessageSquare, Copy, Check, AlertCircle, RefreshCw, X } from 'lucide-react';
import { soundService } from '../services/soundService';

interface OtpModalProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const OtpModal: React.FC<OtpModalProps> = ({ onSuccess, onCancel }) => {
  const [activeOtp, setActiveOtp] = useState<OtpSession | null>(hostelStore.getActiveOtp());
  const [primaryInput, setPrimaryInput] = useState('');
  const [secondaryInput, setSecondaryInput] = useState('');
  const [error, setError] = useState('');
  const [copiedPrimary, setCopiedPrimary] = useState(false);
  const [copiedSecondary, setCopiedSecondary] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    const unsub = hostelStore.subscribe(() => {
      setActiveOtp(hostelStore.getActiveOtp());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!activeOtp) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((activeOtp.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeOtp]);

  if (!activeOtp) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (primaryInput.length !== 6) {
      setError('Please enter the 6-digit primary verification code.');
      soundService.playWarningChime();
      return;
    }

    if (activeOtp.secondaryCode && secondaryInput.length !== 6) {
      setError('Please enter the 6-digit secondary verification code.');
      soundService.playWarningChime();
      return;
    }

    const isValid = hostelStore.verifyOtp(primaryInput, activeOtp.secondaryCode ? secondaryInput : undefined);

    if (isValid) {
      soundService.playSuccessChime();
      onSuccess();
    } else {
      setError('Invalid verification code entered. Please check the code and try again.');
      soundService.playWarningChime();
    }
  };

  const handleQuickFill = () => {
    if (activeOtp) {
      setPrimaryInput(activeOtp.code);
      if (activeOtp.secondaryCode) {
        setSecondaryInput(activeOtp.secondaryCode);
      }
      setError('');
      soundService.playNotificationPing();
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Two-Factor OTP Security</h3>
              <p className="text-xs text-slate-400">PSG iTech Hostel Gateway</p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Simulated Carrier SMS Card */}
        <div className="my-5 p-4 bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-xl shadow-inner relative overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg animate-pulse">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Live SMS Dispatch</span>
                <span className="text-[11px] text-slate-400 font-mono">Just Now</span>
              </div>
              <p className="text-xs font-medium text-slate-200 mt-1 line-clamp-2">
                {activeOtp.messagePreview}
              </p>
              
              {/* Primary Code display */}
              <div className="mt-2.5 flex items-center justify-between bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">Sent to: {activeOtp.targetPhone}</span>
                  <span className="text-lg font-mono font-bold tracking-widest text-indigo-300">{activeOtp.code}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(activeOtp.code);
                    setCopiedPrimary(true);
                    setTimeout(() => setCopiedPrimary(false), 2000);
                  }}
                  className="px-2.5 py-1 text-xs font-medium bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 rounded-md transition-colors flex items-center gap-1.5"
                >
                  {copiedPrimary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPrimary ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Secondary Code display if present */}
              {activeOtp.secondaryCode && (
                <div className="mt-2 flex items-center justify-between bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Sent to Student Phone: {activeOtp.secondaryPhone}</span>
                    <span className="text-lg font-mono font-bold tracking-widest text-amber-300">{activeOtp.secondaryCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(activeOtp.secondaryCode!);
                      setCopiedSecondary(true);
                      setTimeout(() => setCopiedSecondary(false), 2000);
                    }}
                    className="px-2.5 py-1 text-xs font-medium bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/30 rounded-md transition-colors flex items-center gap-1.5"
                  >
                    {copiedSecondary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSecondary ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Auto-fill button */}
          <div className="mt-3 pt-2.5 border-t border-indigo-500/20 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Testing shortcut:</span>
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline underline-offset-2"
            >
              ⚡ Auto-fill verification code
            </button>
          </div>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Enter OTP Sent to {activeOtp.targetPhone}
            </label>
            <input
              type="text"
              maxLength={6}
              value={primaryInput}
              onChange={(e) => setPrimaryInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full text-center tracking-[0.5em] font-mono text-xl py-2.5 px-4 bg-slate-950 border border-slate-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-600 outline-none transition-all"
              autoFocus
            />
          </div>

          {activeOtp.secondaryCode && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Enter Secondary OTP Sent to Student ({activeOtp.secondaryPhone})
              </label>
              <input
                type="text"
                maxLength={6}
                value={secondaryInput}
                onChange={(e) => setSecondaryInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full text-center tracking-[0.5em] font-mono text-xl py-2.5 px-4 bg-slate-950 border border-slate-700 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-white placeholder-slate-600 outline-none transition-all"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400 py-1">
            <span>Code expires in: <strong className="text-slate-200 font-mono">{formatSeconds(timeLeft)}</strong></span>
            <button
              type="button"
              onClick={() => {
                hostelStore.sendOtp(
                  activeOtp.targetRole, 
                  activeOtp.targetPhone, 
                  activeOtp.messagePreview, 
                  activeOtp.secondaryPhone
                );
                soundService.playNotificationPing();
              }}
              className="hover:text-indigo-400 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Resend SMS
            </button>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all"
            >
              Verify & Proceed
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
