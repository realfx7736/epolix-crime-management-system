import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, Lock, User, Activity, Fingerprint, Clock,
    AlertCircle, ChevronRight, Eye, EyeOff, RefreshCw, CheckCircle2, XCircle
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API = 'https://epolix-api.onrender.com';

// ─── ID Format Validators (mirror of backend) ────────────────────────────────
const validators = {
    police: (v) => /^OFF-\d{3,6}$/i.test(v.trim()),
    staff: (v) => /^STF-\d{3,6}$/i.test(v.trim()),
    admin: (v) => /^ADM-[A-Z]{2}-\d{4}-\d{4}$/i.test(v.trim()) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
};
const idPlaceholders = {
    police: 'OFF-001 or OFF-110',
    staff: 'STF-001 or STF-901',
    admin: 'ADM-KL-2026-0001 or admin@epolix.gov.in',
};
const idHints = {
    police: 'Format: OFF-XXX (e.g. OFF-110)',
    staff: 'Format: STF-XXX (e.g. STF-901)',
    admin: 'Format: ADM-KL-YYYY-XXXX or official email',
};

const Login = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState(1);
    const [role, setRole] = useState('citizen');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [otpTimer, setOtpTimer] = useState(0);
    const [otpAttempts, setOtpAttempts] = useState(0);
    const [authUserId, setAuthUserId] = useState('');
    const [maskedContact, setMaskedContact] = useState('');
    const [captcha, setCaptcha] = useState({ q: '', a: 0 });
    const [userCaptcha, setUserCaptcha] = useState('');
    const [idValid, setIdValid] = useState(null); // null | true | false
    const otpRefs = useRef([]);

    // Session expired notice
    const sessionExpired = searchParams.get('session') === 'expired';

    // OTP countdown
    useEffect(() => {
        let interval;
        if (otpTimer > 0) interval = setInterval(() => setOtpTimer(p => p - 1), 1000);
        return () => clearInterval(interval);
    }, [otpTimer]);

    // CAPTCHA for admin
    useEffect(() => {
        if (role === 'admin' && step === 2) {
            const n1 = Math.floor(Math.random() * 9) + 1;
            const n2 = Math.floor(Math.random() * 9) + 1;
            setCaptcha({ q: `${n1} + ${n2}`, a: n1 + n2 });
            setUserCaptcha('');
        }
    }, [role, step]);

    // Validate ID format in real-time
    useEffect(() => {
        if (!identifier || role === 'citizen') { setIdValid(null); return; }
        setIdValid(validators[role]?.(identifier) ?? null);
    }, [identifier, role]);

    const roles = [
        { id: 'citizen', label: 'Citizen', icon: <User size={22} />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-400/20', btn: 'bg-blue-600' },
        { id: 'police', label: 'Police', icon: <Shield size={22} />, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-400/20', btn: 'bg-indigo-600' },
        { id: 'staff', label: 'Staff', icon: <Activity size={22} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-400/20', btn: 'bg-emerald-600' },
        { id: 'admin', label: 'Admin', icon: <Lock size={22} />, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-400/20', btn: 'bg-rose-600' },
    ];
    const currentRole = roles.find(r => r.id === role);

    // ─── Step 2: Submit credentials ────────────────────────────────────────
    const handleCredentialSubmit = async () => {
        setErrorMsg('');

        if (role === 'citizen') {
            const cleaned = identifier.replace(/\s|-/g, '');
            if (cleaned.length !== 12 || !/^\d{12}$/.test(cleaned)) {
                setErrorMsg('Aadhaar number must be exactly 12 digits.');
                return;
            }
            setLoading(true);
            try {
                const res = await fetch(`${API}/api/auth/citizen/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ aadhaarNumber: cleaned })
                });
                const data = await res.json();
                if (data.success) {
                    setAuthUserId(data.userId);
                    setMaskedContact(data.maskedContact || '...XXXX');
                    setOtpTimer(60);
                    setOtpAttempts(0);
                    setStep(3);
                } else {
                    setErrorMsg(data.error || 'Aadhaar verification failed.');
                }
            } catch { setErrorMsg('Authentication service unavailable. Try again.'); }
            finally { setLoading(false); }

        } else {
            // Terminal login
            if (!identifier.trim()) { setErrorMsg('ID or email is required.'); return; }
            if (!password) { setErrorMsg('Password is required.'); return; }
            if (idValid === false) { setErrorMsg(idHints[role] || 'Invalid ID format.'); return; }
            if (role === 'admin' && parseInt(userCaptcha) !== captcha.a) {
                setErrorMsg('Security challenge failed. Please solve the CAPTCHA correctly.');
                return;
            }

            setLoading(true);
            try {
                const res = await fetch(`${API}/api/auth/terminal/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role, identifier: identifier.trim(), password })
                });
                const data = await res.json();
                if (data.success) {
                    setAuthUserId(data.userId);
                    setMaskedContact(data.maskedContact || '...XXXX');
                    setOtpTimer(60);
                    setOtpAttempts(0);
                    setStep(3);
                } else {
                    setErrorMsg(data.error || 'Authentication denied. Check your credentials.');
                }
            } catch { setErrorMsg('Terminal offline. Contact Technical HQ.'); }
            finally { setLoading(false); }
        }
    };

    // ─── Step 3: Verify OTP ───────────────────────────────────────────────
    const handleVerifyOtp = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) { setErrorMsg('Enter all 6 digits of your OTP.'); return; }
        if (otpAttempts >= 3) { setErrorMsg('Too many OTP attempts. Please start the login process again.'); return; }

        setLoading(true);
        setErrorMsg('');
        try {
            const res = await fetch(`${API}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: authUserId, role: role === 'citizen' ? 'citizen' : role, otp: otpCode })
            });
            const data = await res.json();

            if (data.success && data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setSuccessMsg('Access granted! Redirecting...');
                const routeMap = { citizen: '/user', police: '/police', staff: '/staff', admin: '/admin', super_admin: '/admin' };
                setTimeout(() => navigate(routeMap[data.user?.role] || '/'), 800);
            } else {
                setOtpAttempts(p => p + 1);
                setErrorMsg(data.error || 'Invalid OTP. Check the code and try again.');
            }
        } catch { setErrorMsg('Verification system offline.'); }
        finally { setLoading(false); }
    };

    // ─── Resend OTP ────────────────────────────────────────────────────────
    const handleResendOtp = async () => {
        setOtp(['', '', '', '', '', '']);
        setErrorMsg('');
        setLoading(true);
        try {
            const endpoint = role === 'citizen' ? '/api/auth/citizen/login' : '/api/auth/terminal/login';
            await fetch(`${API}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(role === 'citizen'
                    ? { aadhaarNumber: identifier.replace(/\s|-/g, '') }
                    : { role, identifier, password })
            });
            setOtpTimer(60);
            setOtpAttempts(0);
        } catch { setErrorMsg('Could not resend OTP.'); }
        finally { setLoading(false); }
    };

    // ─── OTP input handler ─────────────────────────────────────────────────
    const handleOtpChange = (index, value) => {
        if (!/^\d?$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    };
    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
    };

    const progressWidth = step === 1 ? '33%' : step === 2 ? '66%' : '100%';

    return (
        <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-6 relative overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {/* Background glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/8 blur-[140px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/8 blur-[140px] rounded-full pointer-events-none" />

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg z-10">

                {/* Session expired banner */}
                {sessionExpired && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-amber-400 flex items-center gap-2 text-sm font-semibold">
                        <Clock size={16} /> Session expired due to inactivity. Please log in again.
                    </motion.div>
                )}

                {/* Header */}
                <div className="text-center mb-8">
                    <motion.div whileHover={{ scale: 1.05 }}
                        className={`inline-flex p-5 rounded-[2rem] mb-5 border border-white/10 cursor-pointer shadow-2xl ${currentRole?.bg} ${currentRole?.color}`}>
                        {currentRole?.icon}
                    </motion.div>
                    <h1 className="text-3xl font-extrabold mb-2 tracking-tight text-white">
                        {step === 1 ? 'E-POLIX Secure Login' : step === 2 ? 'Identity Verification' : '2-Factor Authentication'}
                    </h1>
                    <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">
                        {step === 1 ? 'Select your access portal' : step === 2 ? `${role.charAt(0).toUpperCase() + role.slice(1)} Terminal Access` : 'OTP Verification Required'}
                    </p>
                </div>

                <div className="rounded-[2rem] p-8 border border-white/10 relative overflow-hidden shadow-2xl"
                    style={{ background: 'rgba(15, 22, 41, 0.85)', backdropFilter: 'blur(20px)' }}>
                    {/* Progress bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
                        <motion.div animate={{ width: progressWidth }} transition={{ duration: 0.4 }}
                            className="h-full" style={{ background: `linear-gradient(90deg, ${currentRole?.btn?.replace('bg-', '').includes('rose') ? '#e11d48' : currentRole?.btn?.includes('indigo') ? '#4f46e5' : currentRole?.btn?.includes('emerald') ? '#10b981' : '#2563eb'}, transparent)` }} />
                    </div>

                    <AnimatePresence mode="wait">
                        {/* ── STEP 1: Role Selection ── */}
                        {step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <div className="grid grid-cols-2 gap-3">
                                    {roles.map((r) => (
                                        <button key={r.id} onClick={() => { setRole(r.id); setIdentifier(''); setPassword(''); setErrorMsg(''); }}
                                            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${role === r.id ? `${r.bg} ${r.border} scale-105 shadow-lg` : 'bg-white/5 border-transparent hover:bg-white/8 text-slate-500'}`}>
                                            <div className={role === r.id ? r.color : ''}>{r.icon}</div>
                                            <span className={`text-[11px] font-bold uppercase tracking-wider ${role === r.id ? 'text-white' : ''}`}>{r.label}</span>
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => setStep(2)}
                                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg ${currentRole?.btn}`}>
                                    Continue <ChevronRight size={18} />
                                </button>
                            </motion.div>
                        )}

                        {/* ── STEP 2: Credentials ── */}
                        {step === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                                {/* Identifier Field */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                                        {role === 'citizen' ? 'Aadhaar Number (12 digits)' : role === 'police' ? 'Police ID' : role === 'staff' ? 'Staff ID' : 'Admin ID or Email'}
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                            {role === 'citizen' ? <Fingerprint size={18} /> : <User size={18} />}
                                        </div>
                                        <input
                                            type="text"
                                            autoComplete="off"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-11 pr-11 text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-700 font-mono text-sm"
                                            placeholder={role === 'citizen' ? '123456789012' : idPlaceholders[role]}
                                            value={identifier}
                                            maxLength={role === 'citizen' ? 12 : 60}
                                            onChange={(e) => setIdentifier(
                                                role === 'citizen'
                                                    ? e.target.value.replace(/\D/g, '').slice(0, 12)
                                                    : e.target.value
                                            )}
                                        />
                                        {/* ID validation indicator */}
                                        {role !== 'citizen' && identifier && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                {idValid === true ? <CheckCircle2 size={16} className="text-emerald-400" /> :
                                                    idValid === false ? <XCircle size={16} className="text-rose-400" /> : null}
                                            </div>
                                        )}
                                    </div>
                                    {role !== 'citizen' && identifier && idValid === false && (
                                        <p className="text-rose-400 text-[10px] mt-1 ml-1">{idHints[role]}</p>
                                    )}
                                    {role !== 'citizen' && identifier && idValid === true && (
                                        <p className="text-emerald-400 text-[10px] mt-1 ml-1">✓ Valid ID format</p>
                                    )}
                                </div>

                                {/* Password Field */}
                                {role !== 'citizen' && (
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Password</label>
                                        <div className="relative">
                                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                onPaste={(e) => e.preventDefault()}
                                                onCopy={(e) => e.preventDefault()}
                                                autoComplete="current-password"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-11 pr-11 text-white focus:outline-none focus:border-blue-500 transition-all text-sm"
                                                placeholder="••••••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCredentialSubmit()}
                                            />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* CAPTCHA for Admin */}
                                {role === 'admin' && (
                                    <div className="p-4 bg-rose-500/5 border border-rose-400/15 rounded-2xl flex items-center justify-between gap-4">
                                        <div>
                                            <div className="text-[9px] font-bold uppercase tracking-widest text-rose-400 mb-0.5">Security Challenge</div>
                                            <div className="font-mono font-bold text-white">{captcha.q} = ?</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="number" className="w-16 bg-black/30 border border-white/10 rounded-xl py-2 text-center text-white font-bold font-mono"
                                                value={userCaptcha} onChange={(e) => setUserCaptcha(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCredentialSubmit()} />
                                            <button onClick={() => {
                                                const n1 = Math.floor(Math.random() * 9) + 1;
                                                const n2 = Math.floor(Math.random() * 9) + 1;
                                                setCaptcha({ q: `${n1} + ${n2}`, a: n1 + n2 });
                                                setUserCaptcha('');
                                            }} className="text-slate-500 hover:text-white">
                                                <RefreshCw size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Error */}
                                {errorMsg && (
                                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                                        className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
                                        <AlertCircle size={14} className="shrink-0" /> {errorMsg}
                                    </motion.div>
                                )}

                                <div className="flex gap-3 pt-1">
                                    <button onClick={() => { setStep(1); setErrorMsg(''); setIdentifier(''); setPassword(''); }}
                                        className="flex-1 py-4 rounded-2xl font-bold bg-white/5 text-slate-400 uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all">
                                        Back
                                    </button>
                                    <button onClick={handleCredentialSubmit} disabled={loading}
                                        className={`flex-[2] py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 ${currentRole?.btn}`}>
                                        {loading ? <Activity className="animate-spin" size={18} /> : 'Verify Identity →'}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── STEP 3: OTP ── */}
                        {step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
                                <div className={`p-6 rounded-full w-20 h-20 mx-auto flex items-center justify-center border ${currentRole?.bg} ${currentRole?.border}`}>
                                    <Shield className={currentRole?.color} size={34} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">Two-Factor Verification</h3>
                                    <p className="text-slate-400 text-sm">6-digit OTP sent to registered contact</p>
                                    {maskedContact && <p className="text-slate-500 text-xs mt-1 font-mono">...{maskedContact}</p>}
                                    <p className="text-slate-600 text-[10px] mt-2">Attempt {otpAttempts + 1} / 3</p>
                                </div>

                                {/* OTP inputs */}
                                <div className="flex justify-center gap-2.5">
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i}
                                            id={`otp-${i}`}
                                            ref={el => otpRefs.current[i] = el}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            className={`w-12 h-14 text-center text-2xl font-extrabold rounded-xl text-white focus:outline-none transition-all border-2 ${digit ? 'bg-blue-500/10 border-blue-400/40' : 'bg-white/5 border-white/10 focus:border-blue-500'}`}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                        />
                                    ))}
                                </div>

                                {/* Timer / Resend */}
                                <div>
                                    {otpTimer > 0 ? (
                                        <p className="text-slate-500 text-xs font-bold flex items-center justify-center gap-1">
                                            <Clock size={12} /> Resend in <span className={currentRole?.color}>{otpTimer}s</span>
                                        </p>
                                    ) : (
                                        <button onClick={handleResendOtp} disabled={loading}
                                            className={`text-xs font-bold flex items-center gap-1 mx-auto ${currentRole?.color} hover:opacity-80`}>
                                            <RefreshCw size={12} /> Resend OTP
                                        </button>
                                    )}
                                </div>

                                {/* Error / Success */}
                                {errorMsg && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
                                        <AlertCircle size={14} /> {errorMsg}
                                    </motion.div>
                                )}
                                {successMsg && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                                        <CheckCircle2 size={14} /> {successMsg}
                                    </motion.div>
                                )}

                                <div className="flex gap-3">
                                    <button onClick={() => { setStep(2); setOtp(['', '', '', '', '', '']); setErrorMsg(''); }}
                                        className="flex-1 py-4 rounded-2xl font-bold bg-white/5 text-slate-400 uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all">
                                        Back
                                    </button>
                                    <button onClick={handleVerifyOtp}
                                        disabled={loading || otp.join('').length < 6 || otpAttempts >= 3}
                                        className={`flex-[2] py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 ${currentRole?.btn}`}>
                                        {loading ? <Activity className="animate-spin" size={18} /> : 'Authorize Access →'}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <p className="text-center text-slate-600 text-[10px] mt-6 uppercase tracking-widest">
                    E-POLIX · Secure Encrypted Channel · {new Date().getFullYear()}
                </p>
            </motion.div>
        </div>
    );
};

export default Login;