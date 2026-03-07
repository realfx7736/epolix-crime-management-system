import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, User, Lock, Mail, ChevronRight, Briefcase, Settings, Fingerprint, Activity, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const [role, setRole] = useState("user");
    const [step, setStep] = useState(1);
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const roles = [
        { id: "user", label: "Citizen", color: "blue", icon: <User size={20} /> },
        { id: "police", label: "Police", color: "indigo", icon: <Shield size={20} /> },
        { id: "staff", label: "Staff", color: "emerald", icon: <Briefcase size={20} /> },
        { id: "admin", label: "Administrator", color: "rose", icon: <Settings size={20} /> },
    ];

    const currentRole = roles.find(r => r.id === role);

    const handleNextStep = () => {
        if (step === 1) {
            setStep(2);
        } else if (step === 2) {
            // In a real app, you'd verify identifier/password here
            setLoading(true);
            setTimeout(() => {
                setStep(3);
                setLoading(false);
            }, 1000);
        }
    };

    const handleVerifyOtp = async () => {
        setLoading(true);
        const otpValue = otp.join("");
        // Simulation of login
        setTimeout(() => {
            navigate(`/${role}`);
            setLoading(false);
        }, 1500);
    };

    const otpInputHandler = (e, index) => {
        const value = e.target.value;
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`).focus();
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 font-['Outfit'] overflow-hidden">
            {/* Dynamic Background Glow */}
            <div className={`fixed inset-0 transition-all duration-1000 ${role === 'admin' ? 'bg-rose-950/20' :
                role === 'police' ? 'bg-indigo-950/20' :
                    role === 'staff' ? 'bg-emerald-950/20' :
                        'bg-blue-950/20'
                }`} />

            <div className="fixed inset-0 pointer-events-none">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className={`absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full blur-[120px] ${role === 'admin' ? 'bg-rose-600' : role === 'police' ? 'bg-indigo-600' : 'bg-blue-600'
                        }`}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl z-20"
            >
                {/* Back to Home Action */}
                <button
                    onClick={() => navigate("/")}
                    className="group flex items-center gap-3 text-slate-500 hover:text-white transition-all mb-8 font-black uppercase text-[10px] tracking-[0.3em]"
                >
                    <div className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/30 group-hover:bg-white/5 transition-all">
                        <ChevronRight className="rotate-180" size={14} />
                    </div>
                    Back to Official Site
                </button>

                <div className="text-center mb-12">
                    <motion.div
                        key={role}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={() => navigate("/")}
                        className={`inline-flex p-6 rounded-[2rem] mb-6 glass border border-white/10 cursor-pointer hover:scale-105 transition-transform shadow-2xl ${role === 'admin' ? 'text-rose-500 shadow-rose-900/20' :
                            role === 'police' ? 'text-indigo-400' :
                                role === 'staff' ? 'text-emerald-400' :
                                    'text-blue-500'
                            }`}
                    >
                        {currentRole?.icon}
                    </motion.div>
                    <h1 className="text-4xl font-extrabold mb-3 tracking-tight">
                        {step === 1 ? 'Portal Selection' : step === 2 ? 'Authentication' : 'Verification'}
                    </h1>
                    <p className="text-slate-400 text-lg">
                        {role === 'user' ? 'Public Citizen Access' : `Authorized ${currentRole?.label} Terminal`}
                    </p>
                </div>

                <div className="glass rounded-[2.5rem] p-10 border border-white/10 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/5">
                        <motion.div
                            initial={{ width: "33%" }}
                            animate={{ width: step === 1 ? "33%" : step === 2 ? "66%" : "100%" }}
                            className={`h-full transition-all duration-500 ${role === 'admin' ? 'bg-rose-500' :
                                role === 'police' ? 'bg-indigo-500' :
                                    'bg-blue-500'
                                }`}
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    {roles.map((r) => (
                                        <button
                                            key={r.id}
                                            onClick={() => setRole(r.id)}
                                            className={`flex flex-col items-center gap-4 p-6 rounded-3xl border transition-all ${role === r.id
                                                ? 'bg-white/10 border-white/20 shadow-xl scale-105'
                                                : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/5 text-slate-500'
                                                }`}
                                        >
                                            <div className={role === r.id ? 'text-white' : ''}>{r.icon}</div>
                                            <span className={`text-sm font-bold ${role === r.id ? 'text-white' : ''}`}>{r.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={handleNextStep}
                                    className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 text-white ${role === 'admin' ? 'bg-rose-600' :
                                        role === 'police' ? 'bg-indigo-600' :
                                            'bg-blue-600'
                                        } shadow-lg`}
                                >
                                    Continue to Login
                                    <ChevronRight size={20} />
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <div className="relative group">
                                        {role === 'user' ? <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} /> : <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />}
                                        <input
                                            type="text"
                                            placeholder={
                                                role === 'admin' ? "Admin ID / Email" :
                                                    role === 'police' ? "Police ID / Badge No" :
                                                        role === 'staff' ? "Staff ID / Personnel No" :
                                                            "Aadhaar Card No (12-digit)"
                                            }
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-all text-lg placeholder:text-slate-600"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                        />
                                    </div>

                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                        <input
                                            type="password"
                                            placeholder={role === 'user' ? "Guardian Phone Number" : "Secure Password"}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-all text-lg placeholder:text-slate-600"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button onClick={() => setStep(1)} className="flex-1 py-5 rounded-2xl font-bold bg-white/5 text-slate-400 hover:bg-white/10 transition-all">Back</button>
                                    <button
                                        onClick={handleNextStep}
                                        disabled={loading}
                                        className={`flex-[2] py-5 rounded-2xl font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 ${role === 'admin' ? 'bg-rose-600' : role === 'police' ? 'bg-indigo-600' : 'bg-blue-600'
                                            }`}
                                    >
                                        {loading ? <Activity className="animate-spin" size={20} /> : "Authenticate Identity"}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-8"
                            >
                                <div className="p-8 bg-blue-500/10 rounded-full w-24 h-24 mx-auto flex items-center justify-center border border-blue-500/20">
                                    <Lock className="text-blue-500" size={40} />
                                </div>

                                <div>
                                    <h3 className="text-2xl font-bold mb-2">Multifactor Challenge</h3>
                                    <p className="text-slate-400">Enter code sent to registered device for {identifier}</p>
                                </div>

                                <div className="flex justify-center gap-3">
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i}
                                            id={`otp-${i}`}
                                            type="text"
                                            maxLength="1"
                                            className="w-12 h-16 bg-white/5 border border-white/10 rounded-xl text-center text-2xl font-bold focus:border-blue-500 focus:outline-none"
                                            value={digit}
                                            onChange={(e) => otpInputHandler(e, i)}
                                        />
                                    ))}
                                </div>

                                <button
                                    onClick={handleVerifyOtp}
                                    disabled={loading}
                                    className={`w-full py-5 rounded-2xl font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 ${role === 'admin' ? 'bg-rose-600' : role === 'police' ? 'bg-indigo-600' : 'bg-blue-600'
                                        }`}
                                >
                                    {loading ? <Activity className="animate-spin" size={20} /> : "Confirm & Enter System"}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Legal Declaration */}
                    <div className="mt-8 p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl">
                        <div className="flex items-center gap-3 text-rose-500 mb-2">
                            <Shield size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest">Legal Notice - Kerala Police</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed uppercase">
                            Warning: Filing a fake complaint is a punishable offense under IPC Section 182 and 211.
                            Immediate action will be taken by the Kerala Police Cyber Cell and local authorities.
                            Your IP address and device credentials are currently being logged for security auditing.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}