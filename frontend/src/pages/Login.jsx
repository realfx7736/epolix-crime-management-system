import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, Lock, User, Activity, ChevronRight,
    Smartphone, Mail, Fingerprint, ShieldCheck, AlertCircle
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OTPAuth from '../components/OTPAuth';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

const Login = () => {
    const navigate = useNavigate();
    const auth = useAuth();
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState(1); // 1: Role, 2: Auth Flow
    const [role, setRole] = useState('citizen');

    const roles = [
        { id: 'citizen', label: 'Citizen', icon: <User size={22} />, color: 'blue', desc: 'Report crimes & track status' },
        { id: 'police', label: 'Police', icon: <Shield size={22} />, color: 'indigo', desc: 'Case management & investigation' },
        { id: 'staff', label: 'Staff', icon: <Activity size={22} />, color: 'emerald', desc: 'Backend operations & registry' },
        { id: 'admin', label: 'Admin', icon: <Lock size={22} />, color: 'rose', desc: 'System governance & logs' },
    ];

    const currentRole = roles.find(r => r.id === role);

    const handleAuthSuccess = (data) => {
        const accessToken = data.accessToken || data.token;
        const refreshToken = data.refreshToken;
        const userData = data.user;

        auth.login(accessToken, refreshToken, userData);

        const routeMap = {
            citizen: '/user',
            police: '/police',
            staff: '/staff',
            admin: '/admin',
            super_admin: '/admin'
        };
        const target = searchParams.get('from') || routeMap[userData.role] || '/';
        navigate(target, { replace: true });
    };

    return (
        <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-6 relative overflow-hidden font-['Inter',sans-serif]">
            {/* Ambient Background */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg z-10">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className={`inline-flex p-4 rounded-2xl mb-6 bg-${currentRole?.color}-500/10 border border-${currentRole?.color}-400/20 text-${currentRole?.color}-400 shadow-xl`}>
                        <ShieldCheck size={32} />
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2 uppercase italic">
                        E-POLIX <span className={`text-${currentRole?.color}-500`}>{currentRole?.label}</span>
                    </h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em]">
                        {step === 1 ? 'Unified Access Portal' : 'Secure Verification'}
                    </p>
                </div>

                <div className="bg-[#0c121d]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                    {/* Animated Progress */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
                        <motion.div
                            initial={{ width: '0%' }}
                            animate={{ width: step === 1 ? '50%' : '100%' }}
                            className={`h-full bg-${currentRole?.color}-500 shadow-[0_0_20px_rgba(37,99,235,0.8)]`}
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    {roles.map((r) => (
                                        <button
                                            key={r.id}
                                            onClick={() => setRole(r.id)}
                                            className={`group relative flex flex-col items-start gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${role === r.id ? `bg-${r.color}-500/10 border-${r.color}-500 shadow-lg scale-105` : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/20'}`}
                                        >
                                            <div className={`p-3 rounded-xl transition-all ${role === r.id ? `bg-${r.color}-500 text-white` : 'bg-white/5 text-slate-500 group-hover:text-slate-300'}`}>
                                                {r.icon}
                                            </div>
                                            <div className="text-left">
                                                <div className={`text-xs font-bold uppercase tracking-widest ${role === r.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'}`}>
                                                    {r.label}
                                                </div>
                                                <p className="text-[10px] text-slate-600 font-medium leading-tight mt-1 line-clamp-1">{r.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setStep(2)}
                                    className={`w-full py-5 rounded-2xl bg-${currentRole?.color}-600 hover:bg-${currentRole?.color}-500 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95`}
                                >
                                    Login as {currentRole?.label} <ChevronRight size={20} />
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <OTPAuth
                                    role={role}
                                    onAuthSuccess={handleAuthSuccess}
                                    onBack={() => setStep(1)}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-8 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-600 px-2 opacity-50">
                    <span className="flex items-center gap-2"><Lock size={12} /> SSL Secured</span>
                    <span>© {new Date().getFullYear()} E-POLIX Digital HQ</span>
                    <span className="flex items-center gap-2"><Activity size={12} /> Server: Active</span>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
