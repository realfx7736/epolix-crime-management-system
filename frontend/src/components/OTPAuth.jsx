import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Smartphone, Shield, Clock, RefreshCw,
    ArrowRight, CheckCircle2, AlertCircle, Loader2,
    User, Lock, Eye, EyeOff, Activity
} from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

const OTPAuth = ({ role, onAuthSuccess, onBack }) => {
    const [step, setStep] = useState(1); // 1: Credentials, 2: OTP
    const [mobile, setMobile] = useState('');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [timer, setTimer] = useState(0);
    const [userId, setUserId] = useState('');
    const [maskedMobile, setMaskedMobile] = useState('');
    const otpRefs = useRef([]);

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    useEffect(() => {
        if (step === 2 && otpRefs.current[0]) {
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        }
    }, [step]);

    const handleSendOTP = async (e) => {
        if (e) e.preventDefault();
        setError('');

        if (role === 'citizen' && !/^\d{10}$/.test(mobile.replace(/\s|-/g, ''))) {
            setError('Please enter a valid 10-digit mobile number.');
            return;
        }
        if (role !== 'citizen' && (!identifier || !password)) {
            setError('Please enter both ID and Password.');
            return;
        }

        setLoading(true);
        try {
            const isCitizen = role === 'citizen';
            const endpoint = isCitizen ? `${API_URL}/auth/send-otp` : `${API_URL}/auth/terminal/login`;
            const payload = isCitizen
                ? { mobile_number: mobile.replace(/\s|-/g, ''), role }
                : { role, identifier, password };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                setUserId(data.userId || data.user?.id || '');
                setMaskedMobile(data.maskedContact || '...XXXX');
                setStep(2);
                setTimer(60);
                if (data.otp) console.log(`[DEV MODE] OTP: ${data.otp}`);
            } else {
                setError(data.error || 'Authentication failed.');
            }
        } catch (err) {
            setError('Service unavailable. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (manualCode) => {
        const code = manualCode || otp.join('');
        if (code.length !== 6) return;

        setLoading(true);
        setError('');
        try {
            const isCitizen = role === 'citizen';
            const endpoint = isCitizen ? `${API_URL}/auth/verify-otp` : `${API_URL}/auth/terminal/verify-otp`;
            const payload = isCitizen
                ? { mobile_number: mobile.replace(/\s|-/g, ''), otp: code, role }
                : { userId, role, otp: code };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                onAuthSuccess(data);
            } else {
                setError(data.error || 'Invalid security code.');
                setOtp(['', '', '', '', '', '']);
                otpRefs.current[0]?.focus();
            }
        } catch (err) {
            setError('Verification system issue.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, val) => {
        if (!/^\d?$/.test(val)) return;
        const newOtp = [...otp];
        newOtp[index] = val;
        setOtp(newOtp);

        if (val && index < 5) otpRefs.current[index + 1]?.focus();
        if (index === 5 && val) handleVerifyOTP(newOtp.join(''));
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        } else if (e.key === 'Enter') {
            handleVerifyOTP();
        }
    };

    const roleColors = { citizen: 'blue', police: 'indigo', staff: 'emerald', admin: 'rose' };
    const theme = roleColors[role] || 'blue';

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">
                {step === 1 ? (
                    <motion.div
                        key="credentials"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        {role === 'citizen' ? (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
                                    Registered Mobile Number
                                </label>
                                <div className="relative group">
                                    <Smartphone className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${mobile ? `text-${theme}-500` : 'text-slate-500'}`} size={20} />
                                    <input
                                        type="text"
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                                        placeholder="Enter 10-digit mobile"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500/50 transition-all text-sm font-mono tracking-widest"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
                                        {role === 'police' ? 'Police ID' : role === 'staff' ? 'Staff ID' : 'Admin ID'}
                                    </label>
                                    <div className="relative group">
                                        <User className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${identifier ? `text-${theme}-500` : 'text-slate-500'}`} size={20} />
                                        <input
                                            type="text"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                                            placeholder={`Enter organizational ID`}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500/50 transition-all text-sm font-mono tracking-widest uppercase"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
                                        Password
                                    </label>
                                    <div className="relative group">
                                        <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${password ? `text-${theme}-500` : 'text-slate-500'}`} size={20} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                                            placeholder="••••••••"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white focus:outline-none focus:border-blue-500/50 transition-all text-sm font-mono tracking-widest"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {error && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
                                <AlertCircle size={16} /> {error}
                            </motion.div>
                        )}

                        <div className="flex gap-3">
                            {onBack && (
                                <button onClick={onBack} className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all">
                                    Back
                                </button>
                            )}
                            <button
                                onClick={handleSendOTP}
                                disabled={loading || (role === 'citizen' ? mobile.length < 10 : !identifier || !password)}
                                className={`flex-[2] py-4 rounded-2xl bg-${theme}-600 hover:bg-${theme}-500 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50`}
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <>{role === 'citizen' ? 'Generate OTP' : 'Login & Verify'} <ArrowRight size={18} /></>}
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="otp"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-8 text-center"
                    >
                        <div className="space-y-2">
                            <div className={`w-16 h-16 bg-${theme}-500/10 border border-${theme}-500/20 rounded-full flex items-center justify-center mx-auto text-${theme}-500 mb-4`}>
                                <Shield size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Security Code Verification</h3>
                            <p className="text-slate-400 text-sm">We've sent a 6-digit code to <span className={`text-${theme}-400 font-mono tracking-widest`}>{maskedMobile}</span></p>
                        </div>

                        <div className="flex justify-center gap-2">
                            {otp.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={el => otpRefs.current[i] = el}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(i, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(i, e)}
                                    className={`w-11 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all ${digit ? `bg-${theme}-500/10 border-${theme}-500/40 text-${theme}-400` : 'bg-white/5 border-white/10 text-white focus:border-blue-500'}`}
                                />
                            ))}
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            {timer > 0 ? (
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={14} /> Resend available in <span className={`text-${theme}-500`}>{timer}s</span>
                                </p>
                            ) : (
                                <button onClick={handleSendOTP} className={`text-[10px] font-bold text-${theme}-500 uppercase tracking-widest hover:text-${theme}-400 flex items-center gap-2 transition-colors`}>
                                    <RefreshCw size={14} /> Request New Code
                                </button>
                            )}

                            {error && (
                                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold w-full">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3 w-full">
                                <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-xl bg-white/5 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all">
                                    Go Back
                                </button>
                                <button
                                    onClick={() => handleVerifyOTP()}
                                    disabled={loading || otp.join('').length < 6}
                                    className={`flex-[2] py-4 rounded-xl bg-${theme}-600 hover:bg-${theme}-500 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-${theme}-600/20 active:scale-95 disabled:opacity-50`}
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <>Verify & Access <CheckCircle2 size={18} /></>}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OTPAuth;
