import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, Lock, User, Activity, Fingerprint, Clock,
    AlertCircle, ChevronRight, Eye, EyeOff, RefreshCw, CheckCircle2, XCircle,
    Smartphone, Mail, CreditCard, ShieldCheck
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const configuredApi = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const API = configuredApi.endsWith('/api') ? configuredApi.slice(0, -4) : configuredApi;

const safeJson = async (res) => {
    try {
        return await res.json();
    } catch {
        return { success: false, error: 'Network communication failure.' };
    }
};

const CitizenLogin = () => {
    const navigate = useNavigate();
    const auth = useAuth();
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState(1); // 1: Identifier, 2: OTP
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [inputType, setInputType] = useState('unknown'); // mobile | email | citizenId | unknown
    const [showPassword, setShowPassword] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [otpTimer, setOtpTimer] = useState(0);
    const [otpAttempts, setOtpAttempts] = useState(0);
    const [authUserId, setAuthUserId] = useState('');
    const [maskedContact, setMaskedContact] = useState('');
    const [devOtp, setDevOtp] = useState(''); // DEV: OTP returned from backend
    const [pendingRedirect, setPendingRedirect] = useState(null);
    const otpRefs = useRef([]);

    // Redirection is now handled directly in handleVerifyOtp for better reliability
    useEffect(() => {
        if (auth.isAuthenticated) {
            const redirectPath = searchParams.get('from') || '/citizen/home';
            navigate(redirectPath, { replace: true });
        }
    }, [auth.isAuthenticated, navigate, searchParams]);

    // Detect Input Type
    useEffect(() => {
        const val = identifier.trim();
        if (/^\d{10}$/.test(val.replace(/\s|-/g, ''))) setInputType('mobile');
        else if (val.includes('@')) setInputType('email');
        else if (/^CIT-\d{4}-\d{4}$/i.test(val)) setInputType('citizenId');
        else setInputType('unknown');

        setErrorMsg('');
    }, [identifier]);

    // OTP Countdown
    useEffect(() => {
        let interval;
        if (otpTimer > 0) interval = setInterval(() => setOtpTimer(p => p - 1), 1000);
        return () => clearInterval(interval);
    }, [otpTimer]);

    const handleInitialSubmit = async (e) => {
        if (e) e.preventDefault();
        setErrorMsg('');

        if (inputType === 'unknown') {
            setErrorMsg('Please enter a valid Mobile Number (10 digits), Email, or Citizen ID (CIT-YYYY-XXXX).');
            return;
        }

        if ((inputType === 'email' || inputType === 'citizenId') && !password) {
            setErrorMsg('Password is required for this login method.');
            return;
        }

        setLoading(true);
        try {
            // Mobile → dedicated OTP-only endpoint; others require password
            const isMobile = inputType === 'mobile';
            const endpoint = isMobile
                ? `${API}/api/auth/send-otp`
                : `${API}/api/auth/citizen/login`;
            const payload = isMobile
                ? { mobile_number: identifier.trim().replace(/\s|-/g, '') }
                : { identifier, password };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await safeJson(res);

            if (data.success) {
                setAuthUserId(data.userId);
                setMaskedContact(data.maskedContact || '...XXXX');
                setOtpTimer(300);
                setOtpAttempts(0);
                setStep(2);
                // DEV: backend returns OTP when Twilio is not configured
                if (data.otp) setDevOtp(data.otp);
                setSuccessMsg('Identity validated. Security code sent.');
                setTimeout(() => setSuccessMsg(''), 3000);
            } else {
                setErrorMsg(data.error || 'Identity not recognized.');
            }
        } catch {
            setErrorMsg('Authentication server unreachable. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) { setErrorMsg('Verification code must be 6 digits.'); return; }

        setLoading(true);
        setErrorMsg('');
        try {
            // Determine which endpoint to call based on login method
            const isMobile = inputType === 'mobile';
            const endpoint = isMobile
                ? `${API}/api/auth/verify-otp`     // Mobile OTP via /send-otp flow
                : `${API}/api/auth/citizen/verify-otp`; // Email/CitizenID flow

            const payload = isMobile
                ? { mobile_number: identifier.trim().replace(/\s|-/g, ''), otp: otpCode }
                : { userId: authUserId, role: 'citizen', otp: otpCode };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await safeJson(res);

            if (data.success && (data.token || data.accessToken)) {
                const accessToken = data.accessToken || data.token;
                const refreshToken = data.refreshToken || null;
                const userData = { ...(data.user || {}), role: data.user?.role || 'citizen' };

                console.log('[CitizenLogin] OTP verified. Establishing session...');

                // Use AuthContext.login() — updates both React state AND localStorage
                auth.login(accessToken, refreshToken, userData);

                setSuccessMsg('Welcome to E-POLIX Digital Portal.');

                // Navigate immediately. ProtectedRoute will catch the updated state.
                const redirectPath = searchParams.get('from') || '/citizen/home';
                navigate(redirectPath, { replace: true });
            } else {
                setOtpAttempts(p => p + 1);
                setErrorMsg(data.error || 'Invalid or expired code.');
                if (otpAttempts >= 4) setStep(1);
            }
        } catch (err) {
            console.error('[CitizenLogin] Verify error:', err);
            setErrorMsg('Validation system issue. Contact Support.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setOtp(['', '', '', '', '', '']);
        await handleInitialSubmit();
    };

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

    return (
        <div className="min-h-screen bg-[#06090f] flex items-center justify-center p-4 relative overflow-hidden font-['Inter',sans-serif]">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg z-10">

                {/* Brand Logo */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 shadow-xl backdrop-blur-md mb-6">
                        <Shield Check size={22} className="text-blue-500" />
                        <span className="text-lg font-bold tracking-tighter text-white uppercase italic">E-POLIX <span className="text-blue-500">Citizen</span></span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">Digital Identity Access</h1>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">Secure multi-factor authentication for government services and crime reporting.</p>
                </div>

                <div className="bg-[#0c121d]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                    {/* Progress Indicator */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/5">
                        <motion.div animate={{ width: step === 1 ? '50%' : '100%' }} className="h-full bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.8)]" />
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.form key="id" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleInitialSubmit} className="space-y-8">
                                <div className="space-y-6">
                                    <div className="relative">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 block">Primary Identifier</label>
                                        <div className="relative group">
                                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                                                {inputType === 'mobile' ? <Smartphone size={20} /> :
                                                    inputType === 'email' ? <Mail size={20} /> :
                                                        inputType === 'citizenId' ? <CreditCard size={20} /> : <Fingerprint size={20} />}
                                            </div>
                                            <input
                                                type="text"
                                                className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-14 text-white font-medium focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all placeholder:text-slate-700"
                                                placeholder="Mobile / Email / Citizen ID"
                                                value={identifier}
                                                onChange={(e) => setIdentifier(e.target.value)}
                                            />
                                            {inputType !== 'unknown' && (
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                                    <CheckCircle2 size={20} className="text-emerald-500/50" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 flex gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                            <span className={inputType === 'mobile' ? 'text-blue-500' : ''}>Mobile</span>
                                            <span>•</span>
                                            <span className={inputType === 'email' ? 'text-blue-500' : ''}>Email</span>
                                            <span>•</span>
                                            <span className={inputType === 'citizenId' ? 'text-blue-500' : ''}>Citizen ID</span>
                                        </div>
                                    </div>

                                    {(inputType === 'email' || inputType === 'citizenId') && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="relative">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 block">Access Password</label>
                                            <div className="relative group">
                                                <Lock size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-14 text-white font-medium focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
                                                    placeholder="••••••••••••"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                {errorMsg && (
                                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-3">
                                        <AlertCircle size={18} className="shrink-0" />
                                        {errorMsg}
                                    </div>
                                )}

                                <button type="submit" disabled={loading} className="w-full h-16 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-2xl font-bold text-lg shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                                    {loading ? <Activity className="animate-spin" size={24} /> : (
                                        <>Validate Account <ChevronRight size={22} /></>
                                    )}
                                </button>
                            </motion.form>
                        ) : (
                            <motion.div key="otp" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-8">
                                <div className="space-y-4">
                                    <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto text-blue-500">
                                        <ShieldCheck size={40} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Security Check</h3>
                                    <p className="text-slate-400 text-sm">6-digit code sent to <span className="text-blue-400 font-mono tracking-wider">{maskedContact}</span></p>
                                </div>

                                <div className="flex justify-center gap-3">
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={el => otpRefs.current[i] = el}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            className="w-12 h-16 text-center text-3xl font-bold bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500 focus:bg-blue-500/5 transition-all"
                                            value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                        />
                                    ))}
                                </div>

                                <div className="space-y-6">
                                    <div className="flex flex-col items-center gap-2">
                                        {otpTimer > 0 ? (
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                <Clock size={14} /> Resend in <span className="text-blue-500">{Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}</span>
                                            </p>
                                        ) : (
                                            <button onClick={handleResendOtp} className="text-xs font-bold text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors flex items-center gap-2">
                                                <RefreshCw size={14} /> Request New Code
                                            </button>
                                        )}
                                    </div>

                                    {errorMsg && (
                                        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-3 justify-center">
                                            <AlertCircle size={18} /> {errorMsg}
                                        </div>
                                    )}

                                    <div className="flex gap-4">
                                        <button onClick={() => setStep(1)} className="flex-1 h-14 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all">Cancel</button>
                                        <button onClick={handleVerifyOtp} disabled={loading || otp.join('').length < 6} className="flex-[2] h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2">
                                            {loading ? <Activity className="animate-spin" size={20} /> : 'Verify Access'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Secure Footer */}
                <div className="mt-10 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 px-4">
                    <div className="flex items-center gap-2">
                        <Lock size={12} /> Encrypted Session
                    </div>
                    <div>Digital Sign: 2026-EPX-9981</div>
                    <div className="flex items-center gap-2">
                        <Activity size={12} /> System Status: Online
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CitizenLogin;
