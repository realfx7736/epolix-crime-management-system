import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield,
    Lock,
    Fingerprint,
    Search,
    Menu,
    X,
    ChevronRight,
    Activity,
    ShieldAlert,
    Cpu,
    Globe,
    Zap,
    Send,
    ShieldCheck,
    MessageSquare,
    CheckCircle2,
    AlertTriangle,
    MapPin,
    FileText,
    RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";


const CrimeSceneBackground = () => {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute inset-0 bg-[#020617]" />
            <div className="absolute inset-0 opacity-5"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #3b82f6 1.5px, transparent 0)', backgroundSize: '32px 32px' }} />
            <motion.div
                animate={{
                    x: [0, 400, 200, 600, 0],
                    y: [0, 200, 600, 300, 0],
                    rotate: [0, 45, 90, 135, 180],
                    opacity: [0.1, 0.3, 0.1, 0.2, 0.1]
                }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-500/10 blur-[100px] rounded-full"
            />
            <motion.div
                animate={{
                    x: [800, 400, 600, 200, 800],
                    y: [600, 300, 0, 400, 600],
                    rotate: [180, 135, 90, 45, 0],
                    opacity: [0.1, 0.2, 0.1, 0.3, 0.1]
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-indigo-500/10 blur-[100px] rounded-full"
            />
            <motion.div
                animate={{ translateY: ['-100%', '100%'] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-30 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
            />
        </div>
    );
};

export default function Home() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

    const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [isSending, setIsSending] = useState(false);
    const [sentStatus, setSentStatus] = useState(null);

    // Anonymous Tip State
    const [showTipModal, setShowTipModal] = useState(false);
    const [tipForm, setTipForm] = useState({ category: 'Other', location: '', description: '' });
    const [isTipSending, setIsTipSending] = useState(false);
    const [tipSuccess, setTipSuccess] = useState(false);

    const handleTipSubmit = async (e) => {
        e.preventDefault();
        setIsTipSending(true);
        try {
            // Save to Supabase (using the complaints table for now as an anonymous entry)
            const { error } = await supabase.from('complaints').insert([{
                title: `Anonymous Tip: ${tipForm.category}`,
                description: tipForm.description,
                crime_type: tipForm.category,
                location: tipForm.location || 'Unknown',
                status: 'Pending',
                is_anonymous: true
            }]);

            if (!error) {
                setTipSuccess(true);
                setTimeout(() => {
                    setTipSuccess(false);
                    setShowTipModal(false);
                    setTipForm({ category: 'Other', location: '', description: '' });
                }, 3000);
            }
        } catch (err) {
            console.error("Tip Submission Failed", err);
        } finally {
            setIsTipSending(false);
        }
    };

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        setIsSending(true);
        try {
            const res = await fetch('https://epolix-api.onrender.com/api/support/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contactForm)
            });
            if (res.ok) {
                setSentStatus('Tactical Transmission Received. Support Team has been alerted.');
                setContactForm({ name: '', email: '', subject: '', message: '' });
                setTimeout(() => setSentStatus(null), 5000);
            }
        } catch (err) {
            console.error("Transmission Interrupted");
        } finally {
            setIsSending(false);
        }
    };

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 100; // Account for navbar
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
        setIsMenuOpen(false);
    };


    return (
        <div className="relative min-h-screen font-['Outfit'] text-slate-100 overflow-x-hidden bg-[#020617]">
            <CrimeSceneBackground />


            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 glass border-b border-white/10 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                                <Shield className="text-white" size={28} />
                            </div>
                            <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                E-POLIX
                            </span>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-8">
                            <button onClick={() => scrollToSection('features')} className="nav-item text-slate-400 hover:text-white transition-colors font-medium">Features</button>
                            <button onClick={() => scrollToSection('about')} className="nav-item text-slate-400 hover:text-white transition-colors font-medium">About Us</button>
                            <button onClick={() => scrollToSection('stats')} className="nav-item text-slate-400 hover:text-white transition-colors font-medium">System Stats</button>
                            <button onClick={() => scrollToSection('emergency')} className="nav-item text-rose-500 hover:text-rose-400 transition-colors font-bold px-4 py-2 bg-rose-500/10 rounded-xl border border-rose-500/20">Emergency</button>
                            <div className="nav-item">
                                <button
                                    onClick={() => navigate('/login')}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-full font-semibold transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95"
                                >
                                    Access Portal
                                </button>
                            </div>
                        </div>


                        {/* Mobile Menu Toggle */}
                        <div className="md:hidden">
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-400 hover:text-white">
                                {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden bg-[#020617] border-b border-white/10 overflow-hidden"
                        >
                            <div className="px-4 pt-2 pb-6 space-y-4">
                                <button onClick={() => scrollToSection('features')} className="block w-full text-left text-lg text-slate-400 hover:text-white px-3 py-2">Features</button>
                                <button onClick={() => scrollToSection('stats')} className="block w-full text-left text-lg text-slate-400 hover:text-white px-3 py-2">System Stats</button>
                                <button onClick={() => scrollToSection('emergency')} className="block w-full text-left text-lg text-rose-500 font-bold px-3 py-2">Emergency</button>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-bold"
                                >
                                    Access Portal
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            <main className="relative z-10 hero-content">
                {/* Hero Section */}
                <section className="pt-40 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
                    <div
                        className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full text-blue-400 text-sm font-medium mb-8"
                    >
                        <Activity size={16} className="animate-pulse" />
                        <span>AI-Driven Investigative Intelligence</span>
                    </div>

                    <h1
                        className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6"
                    >
                        Securing the Future with <br />
                        <span className="text-blue-500">Digital Justice</span>
                    </h1>

                    <p
                        className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12"
                    >
                        The next generation of Crime Record Management. Real-time forensics,
                        AI-powered case analysis, and secure citizen reporting.
                    </p>

                    <div
                        className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto"
                    >
                        <button
                            onClick={() => scrollToSection('emergency')}
                            className="group bg-white text-slate-950 px-12 py-5 rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-slate-200 transition-all"
                        >
                            Report Incident
                            <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={() => scrollToSection('features')}
                            className="bg-white/5 backdrop-blur-md px-12 py-5 rounded-xl font-bold text-lg flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all"
                        >
                            System Network
                        </button>
                    </div>
                </section>

                {/* About Us Section */}
                <section id="about" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full text-blue-400 text-sm font-bold mb-6">
                                <ShieldCheck size={16} />
                                <span>Official System Overview</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
                                Empowering Law Enforcement <br />
                                <span className="text-blue-500">at the Speed of Thought.</span>
                            </h2>
                            <p className="text-lg text-slate-400 leading-relaxed mb-8">
                                E-POLIX is a high-security, web-based Crime Record Management System (CRMS) engineered to revolutionize how modern police departments handle sensitive investigative data.
                            </p>
                            <div className="space-y-4">
                                {[
                                    "Centralized Digital Evidence Vault",
                                    "Real-time Cross-District Intelligence",
                                    "Quantum-Level Data Encryption",
                                    "Automated Forensic Analysis Tools"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 text-slate-200 font-medium">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="relative"
                        >
                            <div className="glass p-10 rounded-[3rem] border border-white/10 relative z-10">
                                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                                    <Globe size={24} className="text-blue-500" />
                                    Our Mission
                                </h3>
                                <p className="text-slate-400 leading-relaxed">
                                    To provide law enforcement officers with a robust, intuitive, and future-proof digital platform that streamlines bureaucracy, secures evidence, and enables faster case resolutions through cutting-edge investigative technology.
                                </p>
                                <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-4">
                                    <div className="h-12 w-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
                                        <Lock className="text-blue-600" size={24} />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">Authorized Access Only</p>
                                        <p className="text-slate-500 text-xs uppercase tracking-widest font-black">Secure Core v4.2</p>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 blur-[80px] rounded-full" />
                            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 blur-[80px] rounded-full" />
                        </motion.div>
                    </div>
                </section>
                <section id="contact" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="glass p-8 md:p-12 rounded-[32px] border border-white/10 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <MessageSquare size={120} className="text-blue-500" />
                            </div>

                            <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                                <Send className="text-blue-500" />
                                Contact & Support
                            </h2>
                            <p className="text-slate-400 mb-8">Have a question? Send us a message and our team will respond within 24 hours.</p>

                            <form onSubmit={handleContactSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-400 ml-1">Your Name</label>
                                        <input
                                            required
                                            type="text"
                                            value={contactForm.name}
                                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-400 ml-1">Email Address</label>
                                        <input
                                            required
                                            type="email"
                                            value={contactForm.email}
                                            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-400 ml-1">Subject</label>
                                    <input
                                        required
                                        type="text"
                                        value={contactForm.subject}
                                        onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                                        placeholder="How can we help you?"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-400 ml-1">Message Space</label>
                                    <textarea
                                        required
                                        rows="4"
                                        value={contactForm.message}
                                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500/50 transition-all resize-none font-medium"
                                        placeholder="Type your message here..."
                                    />
                                </div>

                                <button
                                    disabled={isSending}
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-900/20"
                                >
                                    {isSending ? 'Transmitting Data...' : 'Send Message'}
                                    <Send size={20} />
                                </button>

                                {sentStatus && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium flex items-center gap-2">
                                        <ShieldCheck size={18} /> {sentStatus}
                                    </motion.div>
                                )}
                            </form>
                        </motion.div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Core Infrastructure</h2>
                        <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Fingerprint className="text-blue-500" size={32} />,
                                title: "Advanced Biometrics",
                                desc: "Secure multi-layer authentication and identity verification for all responders."
                            },
                            {
                                icon: <Search className="text-blue-500" size={32} />,
                                title: "AI Forensics",
                                desc: "Machine learning algorithms that identify patterns and predict crime hotspots."
                            },
                            {
                                icon: <Lock className="text-blue-500" size={32} />,
                                title: "Encrypted Data",
                                desc: "Military-grade encryption ensuring sensitive crime records remain classified."
                            },
                            {
                                icon: <Globe className="text-blue-500" size={32} />,
                                title: "Regional Mesh",
                                desc: "Distributed network of district nodes ensuring zero downtime for critical data."
                            },
                            {
                                icon: <Cpu className="text-blue-500" size={32} />,
                                title: "Neural Processing",
                                desc: "Automated entry categorization and risk assessment using deep learning."
                            },
                            {
                                icon: <Zap className="text-blue-500" size={32} />,
                                title: "Real-time Dispatch",
                                desc: "Instant synchronization between field officers and command centers."
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="glass p-8 rounded-3xl border border-white/10 hover:border-blue-500/30 transition-all group"
                            >
                                <div className="mb-6 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                                    {feature.icon}
                                </div>
                                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                                <p className="text-slate-400 leading-relaxed">
                                    {feature.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Stats Section */}
                <section id="stats" className="py-24 bg-blue-600/5 transition-colors">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                                <p className="text-5xl font-bold text-blue-500 mb-2">1,200+</p>
                                <p className="text-slate-400 uppercase tracking-widest font-bold text-sm">Active Personnel</p>
                            </motion.div>
                            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                                <p className="text-5xl font-bold text-blue-500 mb-2">99.9%</p>
                                <p className="text-slate-400 uppercase tracking-widest font-bold text-sm">System Uptime</p>
                            </motion.div>
                            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}>
                                <p className="text-5xl font-bold text-blue-500 mb-2">24/7</p>
                                <p className="text-slate-400 uppercase tracking-widest font-bold text-sm">Live Monitoring</p>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Emergency Section */}
                <section id="emergency" className="py-24 max-w-4xl mx-auto px-4 text-center">
                    <div className="glass border-rose-500/20 p-12 rounded-[3rem] bg-rose-500/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <ShieldAlert size={120} className="text-rose-500" />
                        </div>
                        <h2 className="text-4xl font-bold text-rose-500 mb-6">Emergency Assistance</h2>
                        <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
                            If you are in immediate danger or need to report a critical crime in progress,
                            use our prioritized emergency response protocols.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6 justify-center">
                            <button
                                onClick={() => window.location.href = 'tel:112'}
                                className="bg-rose-600 hover:bg-rose-700 text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-xl shadow-rose-900/40 transition-all transform hover:scale-105"
                            >
                                Dial 112 Now
                            </button>
                            <button
                                onClick={() => setShowTipModal(true)}
                                className="glass bg-white/5 px-10 py-5 rounded-2xl font-bold text-xl hover:bg-white/10 transition-all"
                            >
                                Anonymous Tip
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="relative border-t border-white/10 bg-[#020617] pb-12 pt-12 z-10">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Shield className="text-blue-600" size={20} />
                        <span className="font-bold">E‑POLIX</span>
                    </div>
                    <p className="text-slate-500 text-sm">
                        © 2026 E‑POLIX Digital Policing System. All rights reserved. <br />
                        Authorized Police Use Only.
                    </p>
                </div>
            </footer>

            {/* Anonymous Tip Modal */}
            <AnimatePresence>
                {showTipModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowTipModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg glass border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500/20">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 0.5 }}
                                    className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                                />
                            </div>

                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-2xl font-bold flex items-center gap-3">
                                        <div className="p-3 bg-rose-500/10 rounded-xl">
                                            <ShieldAlert className="text-rose-500" size={24} />
                                        </div>
                                        Submit Anonymous Tip
                                    </h3>
                                    <p className="text-slate-400 mt-2 text-sm uppercase tracking-widest font-black">Encrypted & Secure</p>
                                </div>
                                <button onClick={() => setShowTipModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {tipSuccess ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="py-12 text-center"
                                >
                                    <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle2 className="text-emerald-500" size={40} />
                                    </div>
                                    <h4 className="text-xl font-bold text-emerald-400 mb-2">Tip Transmitted!</h4>
                                    <p className="text-slate-400">Thank you for your civic contribution. The info has been securely routed.</p>
                                </motion.div>
                            ) : (
                                <form onSubmit={handleTipSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-2">
                                            <AlertTriangle size={14} className="text-amber-500" /> Crime Category
                                        </label>
                                        <select
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-rose-500 transition-all"
                                            value={tipForm.category}
                                            onChange={(e) => setTipForm({ ...tipForm, category: e.target.value })}
                                        >
                                            <option value="Other">Select Category</option>
                                            <option value="Drug Offense">Drug Offense</option>
                                            <option value="Assault">Assault / Violence</option>
                                            <option value="Theft">Theft / Robbery</option>
                                            <option value="Cybercrime">Cybercrime</option>
                                            <option value="Corruption">Corruption / Bribery</option>
                                            <option value="Missing Person">Information on Missing Person</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-2">
                                            <MapPin size={14} /> Probable Location
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Area, Landmark or Address..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-rose-500 transition-all"
                                            value={tipForm.location}
                                            onChange={(e) => setTipForm({ ...tipForm, location: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-2">
                                            <FileText size={14} /> Detailed Information
                                        </label>
                                        <textarea
                                            required
                                            rows="4"
                                            placeholder="Provide as much detail as possible. Your identity remains 100% hidden..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-rose-500 transition-all resize-none"
                                            value={tipForm.description}
                                            onChange={(e) => setTipForm({ ...tipForm, description: e.target.value })}
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isTipSending}
                                        className="w-full bg-rose-600 hover:bg-rose-700 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] shadow-xl shadow-rose-900/20 disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        {isTipSending ? <RefreshCw className="animate-spin" size={20} /> : (
                                            <>
                                                <Send size={18} />
                                                Submit Truly Anonymous Tip
                                            </>
                                        )}
                                    </button>

                                    <p className="text-[10px] text-center text-slate-500 uppercase tracking-tight leading-relaxed">
                                        Note: This data is end-to-end encrypted. We do not store your IP address or browser fingerprint during anonymous submissions.
                                    </p>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}