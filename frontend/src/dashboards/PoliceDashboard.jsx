import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield, Radio, MapPin, FileText, Search, Bell, AlertCircle, Clock, Lock,
    FilePlus, Briefcase, CheckCircle2, Activity, Users, ClipboardList, UserCheck,
    ChevronRight, Crosshair, Menu, X, LogOut, Eye, Upload, Camera, Download,
    TrendingUp, TrendingDown, BarChart3, AlertTriangle, Building2, Hash,
    Fingerprint, Send, Star, ChevronDown, Filter, RefreshCw, Siren, Edit3,
    Phone, Mail, Calendar, User, PlusCircle, Trash2, ExternalLink, Image,
    Video, FileIcon, MessageSquare, Navigation, Target, Zap, Layers
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./PoliceDashboard.css";

// ─── MOCK DATA ──────────────────────────────────────────
const mockCases = [
    { id: "EPLX1709001", title: "Mobile Snatching", type: "Theft", location: "Sector 14, Delhi", priority: "High", status: "Registered", date: "2026-03-05", reportedBy: "Arjun Mehta", description: "Mobile snatched near Saket Metro. Suspect fled on motorcycle.", suspect: "Unknown male, ~25yrs, black helmet", victim: "Arjun Mehta, M/28", evidence: ["photo_scene.jpg", "cctv_clip.mp4"], fir: "FIR-2026/1244" },
    { id: "EPLX1709002", title: "Online Banking Fraud", type: "Cybercrime", location: "Online – IP traced to Dwarka", priority: "Critical", status: "Investigating", date: "2026-02-28", reportedBy: "Priya Singh", description: "Victim lost ₹3.2L via phishing link. Bank account compromised.", suspect: "Unknown, traced IP: 103.xx.xx.45", victim: "Priya Singh, F/34", evidence: ["bank_stmt.pdf", "phishing_email.png", "call_log.xlsx"], fir: "FIR-2026/1238" },
    { id: "EPLX1709003", title: "Shop Vandalism", type: "Vandalism", location: "Connaught Place, Block C", priority: "Medium", status: "Closed", date: "2026-02-15", reportedBy: "Rahul Verma", description: "Glass storefront shattered during late-night protest march.", suspect: "3 identified via CCTV", victim: "Rahul Verma (shop owner)", evidence: ["cctv_footage.mp4", "damage_photo1.jpg", "damage_photo2.jpg"], fir: "FIR-2026/1190" },
    { id: "EPLX1709004", title: "Document Forgery", type: "Fraud", location: "Saket District Court", priority: "High", status: "Investigating", date: "2026-03-01", reportedBy: "Meena Devi", description: "Forged property documents used in an illegal land sale attempt.", suspect: "Suresh K., known history", victim: "Meena Devi, F/55", evidence: ["forged_doc.pdf", "original_doc.pdf"], fir: "FIR-2026/1250" },
    { id: "EPLX1709005", title: "Drug Possession", type: "Narcotics", location: "Nehru Place", priority: "Critical", status: "On-Site", date: "2026-03-06", reportedBy: "Patrol Unit B7", description: "Suspected narcotics found during routine vehicle check.", suspect: "Driver: Rohit M., passenger fled", victim: "N/A", evidence: ["substance_photo.jpg"], fir: "FIR-2026/1261" },
];

const mockNotifications = [
    { id: 1, msg: "CRITICAL: New complaint EPLX1709005 assigned to you", time: "5 min ago", unread: true, type: "critical" },
    { id: 2, msg: "Evidence uploaded for case EPLX1709002 by forensics lab", time: "25 min ago", unread: true, type: "evidence" },
    { id: 3, msg: "FIR-2026/1244 approved by Station Head", time: "1h ago", unread: true, type: "fir" },
    { id: 4, msg: "Case EPLX1709003 marked as Closed", time: "3h ago", unread: false, type: "update" },
    { id: 5, msg: "Monthly performance review available", time: "Yesterday", unread: false, type: "info" },
];

const officerTasks = [
    { id: 1, task: "Visit crime scene – EPLX1709001", due: "Today 2:00 PM", done: false, priority: "high" },
    { id: 2, task: "Collect CCTV from Block C market", due: "Today 4:30 PM", done: false, priority: "medium" },
    { id: 3, task: "Submit forensics report – EPLX1709002", due: "Tomorrow", done: false, priority: "critical" },
    { id: 4, task: "Interview witness – Rajesh K.", due: "Mar 8, 10 AM", done: false, priority: "high" },
    { id: 5, task: "File chargesheet – EPLX1709003", due: "Completed", done: true, priority: "low" },
];

const crimeMapMarkers = [
    { id: "EPLX1709001", label: "Mobile Snatching", top: 30, left: 22, priority: "high" },
    { id: "EPLX1709002", label: "Cyber Fraud", top: 48, left: 68, priority: "critical" },
    { id: "EPLX1709003", label: "Vandalism", top: 62, left: 35, priority: "medium" },
    { id: "EPLX1709004", label: "Forgery", top: 38, left: 52, priority: "high" },
    { id: "EPLX1709005", label: "Drug Arrest", top: 72, left: 78, priority: "critical" },
];

const weeklyStats = [
    { day: "Mon", cases: 8 }, { day: "Tue", cases: 12 }, { day: "Wed", cases: 6 },
    { day: "Thu", cases: 15 }, { day: "Fri", cases: 10 }, { day: "Sat", cases: 4 }, { day: "Sun", cases: 7 },
];

// ─── MAIN COMPONENT ────────────────────────────────────
const PoliceDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("overview");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showNotif, setShowNotif] = useState(false);
    const [selectedCase, setSelectedCase] = useState(null);
    const [showFIRModal, setShowFIRModal] = useState(false);
    const [showEvidenceModal, setShowEvidenceModal] = useState(false);
    const [notifications, setNotifications] = useState(mockNotifications);
    const [cases, setCases] = useState(mockCases);
    const [tasks, setTasks] = useState(officerTasks);
    const [caseFilter, setCaseFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Live counters
    const [liveStats, setLiveStats] = useState({ pending: 14, investigating: 23, onsite: 5, closed: 187 });
    // Officer Info
    const [officer, setOfficer] = useState({ fullName: "SI Vikram Rathore", policeId: "OFF-110", station: "Saket Division", rank: "SI" });

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setOfficer(JSON.parse(storedUser));

        const iv = setInterval(() => {
            setLiveStats(p => ({
                pending: p.pending + (Math.random() > 0.7 ? 1 : 0),
                investigating: p.investigating + (Math.random() > 0.8 ? 1 : 0),
                onsite: p.onsite + (Math.random() > 0.9 ? 1 : -0),
                closed: p.closed + (Math.random() > 0.6 ? 1 : 0),
            }));
        }, 6000);
        return () => clearInterval(iv);
    }, []);

    const unreadCount = notifications.filter(n => n.unread).length;
    const filteredCases = cases.filter(c => {
        if (caseFilter !== "all" && c.status.toLowerCase().replace("-", "") !== caseFilter.replace("-", "")) return false;
        if (searchQuery && !c.title.toLowerCase().includes(searchQuery.toLowerCase()) && !c.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const toggleTask = (id) => setTasks(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));

    const priorityClass = (p) => `pd-priority-${p.toLowerCase()}`;
    const statusClass = (s) => {
        const map = { "Registered": "pd-status-registered", "Investigating": "pd-status-investigating", "On-Site": "pd-status-onsite", "Closed": "pd-status-closed" };
        return map[s] || "pd-status-registered";
    };

    const navItems = [
        { type: "section", label: "COMMAND CENTER" },
        { id: "overview", label: "Overview", icon: <Layers size={17} />, badge: null },
        { id: "complaints", label: "New Complaints", icon: <AlertCircle size={17} />, badge: liveStats.pending },
        { type: "section", label: "INVESTIGATION" },
        { id: "cases", label: "Case Management", icon: <Briefcase size={17} />, badge: null },
        { id: "evidence", label: "Evidence Vault", icon: <Camera size={17} />, badge: null },
        { id: "suspects", label: "Suspects & Victims", icon: <Fingerprint size={17} />, badge: null },
        { id: "fir", label: "FIR System", icon: <FileText size={17} />, badge: null },
        { type: "section", label: "OPERATIONS" },
        { id: "map", label: "Crime Map", icon: <Target size={17} />, badge: null },
        { id: "tasks", label: "Task List", icon: <ClipboardList size={17} />, badge: tasks.filter(t => !t.done).length },
        { id: "history", label: "Case History", icon: <Layers size={17} />, badge: null },
    ];

    // ─── SECTION RENDERS ─────────────────────────────────

    const renderOverview = () => (
        <div className="space-y-5">
            {/* Stat Widgets */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Pending Cases", val: liveStats.pending, icon: <Clock size={20} />, cls: "blue", trend: "+2 today" },
                    { label: "Under Investigation", val: liveStats.investigating, icon: <Search size={20} />, cls: "amber", trend: "3 critical" },
                    { label: "Officers On-Site", val: liveStats.onsite, icon: <Navigation size={20} />, cls: "red", trend: "Active now" },
                    { label: "Cases Closed", val: liveStats.closed, icon: <CheckCircle2 size={20} />, cls: "green", trend: "+8 this week" },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                        className={`glass-card pd-stat-card ${s.cls} p-5`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</span>
                            <span className="text-slate-600">{s.icon}</span>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">{s.val}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1"><TrendingUp size={11} /> {s.trend}</div>
                    </motion.div>
                ))}
            </div>

            {/* Weekly Chart + Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-5 lg:col-span-2">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-300">
                            <BarChart3 size={15} className="text-cyan-400" /> Weekly Case Load
                        </h3>
                        <span className="text-[9px] font-mono text-slate-600">LIVE · {new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-end gap-3 h-36">
                        {weeklyStats.map((b, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <span className="text-[10px] font-mono text-slate-500">{b.cases}</span>
                                <motion.div initial={{ height: 0 }} animate={{ height: `${(b.cases / 18) * 100}%` }}
                                    transition={{ delay: 0.4 + i * 0.07, duration: 0.5 }}
                                    className="w-full rounded-t"
                                    style={{ background: `linear-gradient(180deg, ${b.cases > 12 ? '#ff3366' : '#00d4ff'}, ${b.cases > 12 ? 'rgba(255,51,102,0.15)' : 'rgba(0,212,255,0.15)'})` }}
                                />
                                <span className="text-[10px] font-mono text-slate-600">{b.day}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-5">
                    <h3 className="font-bold text-xs uppercase tracking-wider mb-4 flex items-center gap-2 text-slate-300">
                        <ClipboardList size={15} className="text-amber-400" /> My Tasks
                    </h3>
                    <div className="space-y-2">
                        {tasks.filter(t => !t.done).slice(0, 4).map(t => (
                            <div key={t.id} className="pd-task-item" onClick={() => toggleTask(t.id)}>
                                <div className={`pd-task-check ${t.done ? 'done' : ''}`}>
                                    {t.done && <CheckCircle2 size={12} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold text-slate-300 truncate">{t.task}</div>
                                    <div className="text-[10px] text-slate-600">{t.due}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setActiveTab("tasks")} className="mt-3 text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1">
                        View All <ChevronRight size={12} />
                    </button>
                </motion.div>
            </div>

            {/* Recent Cases + Crime Map mini */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-300">
                            <AlertCircle size={15} className="text-red-400" /> Priority Cases
                        </h3>
                        <button onClick={() => setActiveTab("cases")} className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1 hover:text-cyan-300">
                            All <ChevronRight size={12} />
                        </button>
                    </div>
                    <div className="space-y-2">
                        {cases.filter(c => c.priority === "Critical" || c.priority === "High").slice(0, 4).map((c, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-black/15 border border-white/5 hover:border-cyan-500/15 transition-all cursor-pointer"
                                onClick={() => setSelectedCase(c)}>
                                <div className={`w-2 h-2 rounded-full shrink-0 ${c.priority === 'Critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(255,51,102,0.6)]' : 'bg-orange-500'}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-slate-200 truncate">{c.title}</div>
                                    <div className="text-[10px] text-slate-600 font-mono">{c.id} · {c.location}</div>
                                </div>
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${priorityClass(c.priority)}`}>{c.priority}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-300">
                            <Target size={15} className="text-cyan-400" /> Crime Map
                        </h3>
                        <span className="shimmer-bar px-2 py-0.5 rounded text-[8px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 uppercase">Live</span>
                    </div>
                    <div className="pd-map" style={{ height: 200 }}>
                        <div className="pd-map-grid" />
                        {crimeMapMarkers.map((m, i) => (
                            <div key={i} className={`pd-map-marker ${m.priority}`} style={{ top: `${m.top}%`, left: `${m.left}%` }}
                                title={`${m.label} (${m.id})`} />
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );

    const renderComplaints = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-bold flex items-center gap-2 neon-text-blue"><AlertCircle size={20} /> New Complaints</h2>
                <div className="flex gap-2">
                    {["all", "Registered"].map(f => (
                        <button key={f} onClick={() => setCaseFilter(f)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${caseFilter === f ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-400/20' : 'bg-white/5 text-slate-500 border border-white/5'}`}>
                            {f === "all" ? "All" : f}
                        </button>
                    ))}
                </div>
            </div>
            {cases.filter(c => c.status === "Registered").map((c, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    className="glass-card p-5 flex items-center gap-5 cursor-pointer group hover:border-cyan-400/20 transition-all"
                    onClick={() => setSelectedCase(c)}>
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 shrink-0 group-hover:scale-110 transition-transform">
                        <Siren size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-200">{c.title}</span>
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${priorityClass(c.priority)}`}>{c.priority}</span>
                        </div>
                        <div className="text-xs text-slate-500">{c.description}</div>
                        <div className="text-[10px] text-slate-600 font-mono mt-1">{c.id} · {c.date} · Reported by: {c.reportedBy}</div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-400/20 hover:bg-cyan-500/20 transition-all"
                            onClick={(e) => { e.stopPropagation(); setCases(prev => prev.map(x => x.id === c.id ? { ...x, status: "Investigating" } : x)); }}>
                            Accept
                        </button>
                    </div>
                </motion.div>
            ))}
            {cases.filter(c => c.status === "Registered").length === 0 && (
                <div className="text-center py-16 text-slate-600">
                    <CheckCircle2 size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-semibold">No pending complaints</p>
                </div>
            )}
        </motion.div>
    );

    const renderCaseManagement = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-bold flex items-center gap-2 neon-text-blue"><Briefcase size={20} /> Case Investigation</h2>
                <div className="flex gap-2 items-center">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="pd-input pl-8 py-1.5 w-48 text-xs" placeholder="Search cases..." />
                    </div>
                    <div className="flex gap-1">
                        {["all", "Registered", "Investigating", "On-Site", "Closed"].map(f => (
                            <button key={f} onClick={() => setCaseFilter(f)}
                                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${caseFilter === f ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-400/20' : 'bg-white/5 text-slate-600 border border-white/5 hover:text-slate-400'}`}>
                                {f === "all" ? "All" : f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/5">
                            {["Case ID", "Title", "Type", "Priority", "Status", "Date", "Action"].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-600">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCases.map((c, i) => (
                            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedCase(c)}>
                                <td className="px-4 py-3 font-mono text-cyan-400 text-xs font-semibold">{c.id}</td>
                                <td className="px-4 py-3 text-slate-300 font-semibold text-xs">{c.title}</td>
                                <td className="px-4 py-3 text-slate-500 text-xs">{c.type}</td>
                                <td className="px-4 py-3"><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${priorityClass(c.priority)}`}>{c.priority}</span></td>
                                <td className="px-4 py-3"><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${statusClass(c.status)}`}>{c.status}</span></td>
                                <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{c.date}</td>
                                <td className="px-4 py-3">
                                    <select className="bg-transparent border border-white/10 rounded-lg px-2 py-1 text-[10px] text-slate-400 outline-none cursor-pointer"
                                        value={c.status} onClick={e => e.stopPropagation()}
                                        onChange={e => { e.stopPropagation(); setCases(prev => prev.map(x => x.id === c.id ? { ...x, status: e.target.value } : x)); }}>
                                        {["Registered", "Investigating", "On-Site", "Closed"].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );

    const renderEvidence = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2 neon-text-blue"><Camera size={20} /> Evidence Vault</h2>
                <button onClick={() => setShowEvidenceModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-400/20 hover:bg-cyan-500/20 transition-all">
                    <Upload size={14} /> Upload Evidence
                </button>
            </div>
            {cases.filter(c => c.evidence && c.evidence.length > 0).map((c, i) => (
                <div key={i} className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="font-mono text-cyan-400 text-xs font-bold">{c.id}</span>
                        <span className="text-sm font-semibold text-slate-300">{c.title}</span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${statusClass(c.status)}`}>{c.status}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                        {c.evidence.map((e, j) => (
                            <div key={j} className="pd-evidence-thumb group">
                                {e.endsWith('.mp4') ? <Video size={24} className="text-purple-400" /> :
                                    e.endsWith('.pdf') || e.endsWith('.xlsx') ? <FileIcon size={24} className="text-amber-400" /> :
                                        <Image size={24} className="text-cyan-400" />}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-2 py-1.5 text-[9px] text-slate-400 truncate font-mono">
                                    {e}
                                </div>
                                <div className="absolute inset-0 bg-cyan-400/5 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                    <Eye size={18} className="text-cyan-400" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </motion.div>
    );

    const renderSuspectsVictims = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 neon-text-blue"><Fingerprint size={20} /> Suspect & Victim Records</h2>
            {cases.map((c, i) => (
                <div key={i} className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="font-mono text-cyan-400 text-xs font-bold">{c.id}</span>
                        <span className="text-sm font-semibold text-slate-200">{c.title}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-400/10">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-red-400 mb-2 flex items-center gap-1"><AlertTriangle size={11} /> Suspect</div>
                            <p className="text-sm text-slate-300">{c.suspect}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-400/10">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1"><User size={11} /> Victim</div>
                            <p className="text-sm text-slate-300">{c.victim}</p>
                        </div>
                    </div>
                </div>
            ))}
        </motion.div>
    );

    const renderFIR = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2 neon-text-blue"><FileText size={20} /> FIR Management</h2>
                <button onClick={() => setShowFIRModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-400/20 hover:bg-cyan-500/20 transition-all">
                    <FilePlus size={14} /> New FIR
                </button>
            </div>
            <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/5">
                        {["FIR No.", "Case ID", "Title", "Date", "Status", "Filed By"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-600">{h}</th>
                        ))}
                    </tr></thead>
                    <tbody>
                        {cases.filter(c => c.fir).map((c, i) => (
                            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-3 font-mono text-amber-400 text-xs font-semibold">{c.fir}</td>
                                <td className="px-4 py-3 font-mono text-cyan-400 text-xs">{c.id}</td>
                                <td className="px-4 py-3 text-slate-300 text-xs font-semibold">{c.title}</td>
                                <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{c.date}</td>
                                <td className="px-4 py-3"><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${statusClass(c.status)}`}>{c.status}</span></td>
                                <td className="px-4 py-3 text-slate-400 text-xs">{c.reportedBy}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );

    const renderCrimeMap = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2 neon-text-blue"><Target size={20} /> Crime Location Map</h2>
                <span className="shimmer-bar px-3 py-1 rounded text-[9px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 uppercase">Live Markers</span>
            </div>
            <div className="glass-card p-5">
                <div className="pd-map" style={{ height: 380 }}>
                    <div className="pd-map-grid" />
                    {crimeMapMarkers.map((m, i) => (
                        <div key={i} className={`pd-map-marker ${m.priority}`} style={{ top: `${m.top}%`, left: `${m.left}%` }}>
                            <div className="absolute top-5 left-4 whitespace-nowrap bg-black/85 px-2 py-1 rounded text-[9px] font-semibold border" style={{ color: 'inherit', borderColor: 'currentColor', opacity: 0.7 }}>
                                {m.label} ({m.id})
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex gap-6 mt-4 justify-center">
                    {[{ l: "Critical", c: "#ff3366" }, { l: "High", c: "#ff6432" }, { l: "Medium", c: "#ffaa00" }, { l: "Low", c: "#00ff88" }].map(x => (
                        <div key={x.l} className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: x.c, boxShadow: `0 0 6px ${x.c}` }} /> {x.l}
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );

    const renderTasks = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 neon-text-blue"><ClipboardList size={20} /> Task List & Assignments</h2>
            <div className="glass-card p-5 space-y-2">
                {tasks.map(t => (
                    <div key={t.id} className="pd-task-item" onClick={() => toggleTask(t.id)}>
                        <div className={`pd-task-check ${t.done ? 'done' : ''}`}>
                            {t.done && <CheckCircle2 size={12} />}
                        </div>
                        <div className="flex-1">
                            <div className={`text-sm font-semibold ${t.done ? 'text-slate-600 line-through' : 'text-slate-300'}`}>{t.task}</div>
                            <div className="text-[10px] text-slate-600">{t.due}</div>
                        </div>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${priorityClass(t.priority)}`}>{t.priority}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );

    const renderHistory = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 neon-text-blue"><Layers size={20} /> Case History Database</h2>
            <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/5">
                        {["Case ID", "Title", "Type", "Location", "Priority", "Status", "FIR", "Date"].map(h => (
                            <th key={h} className="px-3 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-600">{h}</th>
                        ))}
                    </tr></thead>
                    <tbody>
                        {cases.map((c, i) => (
                            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer" onClick={() => setSelectedCase(c)}>
                                <td className="px-3 py-3 font-mono text-cyan-400 text-xs font-semibold">{c.id}</td>
                                <td className="px-3 py-3 text-slate-300 text-xs font-semibold">{c.title}</td>
                                <td className="px-3 py-3 text-slate-500 text-xs">{c.type}</td>
                                <td className="px-3 py-3 text-slate-500 text-xs">{c.location}</td>
                                <td className="px-3 py-3"><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${priorityClass(c.priority)}`}>{c.priority}</span></td>
                                <td className="px-3 py-3"><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${statusClass(c.status)}`}>{c.status}</span></td>
                                <td className="px-3 py-3 font-mono text-amber-400 text-[10px]">{c.fir}</td>
                                <td className="px-3 py-3 text-slate-600 font-mono text-[10px]">{c.date}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case "overview": return renderOverview();
            case "complaints": return renderComplaints();
            case "cases": return renderCaseManagement();
            case "evidence": return renderEvidence();
            case "suspects": return renderSuspectsVictims();
            case "fir": return renderFIR();
            case "map": return renderCrimeMap();
            case "tasks": return renderTasks();
            case "history": return renderHistory();
            default: return renderOverview();
        }
    };

    // ─── MAIN RENDER ──────────────────────────────────────
    return (
        <div className="min-h-screen grid-bg" style={{ background: "var(--dark-bg)" }}>
            {/* SIDEBAR */}
            <aside className={`pd-sidebar ${sidebarOpen ? "open" : ""}`}>
                <div className="pd-sidebar-header">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center neon-blue-glow">
                        <Shield size={18} className="text-white" />
                    </div>
                    <div>
                        <div className="text-base font-bold text-white tracking-tight">E‑POLIX</div>
                        <div className="text-[8px] uppercase tracking-[0.2em] text-cyan-400 font-bold">Officer Terminal</div>
                    </div>
                </div>

                <nav className="pd-sidebar-nav">
                    {navItems.map((item, i) =>
                        item.type === "section" ? (
                            <div key={i} className="pd-nav-section">{item.label}</div>
                        ) : (
                            <button key={i} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                                className={`pd-nav-btn ${activeTab === item.id ? "active" : ""}`}>
                                {item.icon}
                                <span>{item.label}</span>
                                {item.badge > 0 && (
                                    <span className="pd-badge bg-red-500/20 text-red-400 border border-red-400/30">{item.badge}</span>
                                )}
                            </button>
                        )
                    )}
                </nav>

                <div className="p-3 border-t border-white/5">
                    <div className="flex items-center gap-3 px-3 py-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-400 border border-cyan-400/15">
                            <User size={14} />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-300">{officer.fullName}</div>
                            <div className="text-[9px] text-slate-600">ID: {officer.policeId}</div>
                        </div>
                    </div>
                    <button onClick={() => { localStorage.clear(); navigate("/"); }} className="pd-nav-btn text-red-400 hover:bg-red-500/10 w-full">
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* MAIN */}
            <div className="pd-main">
                <div className="pd-topbar">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-slate-400"><Menu size={20} /></button>
                        <div>
                            <h1 className="text-base font-bold text-white">Officer Command Center</h1>
                            <p className="text-[10px] text-slate-600">{officer.fullName} · {officer.station} · <Lock size={9} className="inline" /> Terminal Online</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-500 font-mono text-xs">
                            <Clock size={13} className="text-cyan-400 animate-pulse" />
                            <span>{new Date().toLocaleTimeString()}</span>
                        </div>
                        <div className="relative">
                            <button onClick={() => setShowNotif(!showNotif)} className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all relative">
                                <Bell size={17} />
                                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center font-bold shadow-[0_0_8px_rgba(255,51,102,0.5)]">{unreadCount}</span>}
                            </button>
                            <AnimatePresence>
                                {showNotif && (
                                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                        className="absolute right-0 top-11 w-80 glass-card p-4 z-50 border border-cyan-400/15">
                                        <h4 className="font-bold text-xs text-white mb-3">Alerts & Notifications</h4>
                                        <div className="space-y-2 max-h-56 overflow-y-auto">
                                            {notifications.map(n => (
                                                <div key={n.id} className={`p-2.5 rounded-lg text-xs ${n.unread ? 'bg-cyan-500/5 border border-cyan-400/10' : 'bg-black/15 border border-white/5'}`}>
                                                    <p className={n.unread ? 'text-slate-200' : 'text-slate-500'}>{n.msg}</p>
                                                    <span className="text-[9px] text-slate-600 mt-1 block">{n.time}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="p-4 sm:p-5">
                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* ═══ CASE DETAIL SLIDE-IN ═══ */}
            <AnimatePresence>
                {selectedCase && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-50" onClick={() => setSelectedCase(null)} />
                        <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="pd-case-detail">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-sm text-white flex items-center gap-2"><Crosshair size={16} className="text-cyan-400" /> Case Detail</h3>
                                <button onClick={() => setSelectedCase(null)} className="text-slate-500 hover:text-white"><X size={18} /></button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-cyan-400 text-sm font-bold">{selectedCase.id}</span>
                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${priorityClass(selectedCase.priority)}`}>{selectedCase.priority}</span>
                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${statusClass(selectedCase.status)}`}>{selectedCase.status}</span>
                                </div>

                                <h2 className="text-xl font-bold text-white">{selectedCase.title}</h2>

                                <div className="p-3 rounded-lg bg-black/20 border border-white/5 text-sm text-slate-400 italic">
                                    "{selectedCase.description}"
                                </div>

                                {[
                                    { icon: <MapPin size={13} />, label: "Location", value: selectedCase.location },
                                    { icon: <Calendar size={13} />, label: "Date", value: selectedCase.date },
                                    { icon: <User size={13} />, label: "Reported By", value: selectedCase.reportedBy },
                                    { icon: <FileText size={13} />, label: "FIR", value: selectedCase.fir },
                                ].map((f, i) => (
                                    <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5">
                                        <span className="text-cyan-400">{f.icon}</span>
                                        <span className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold w-20">{f.label}</span>
                                        <span className="text-sm text-slate-300">{f.value}</span>
                                    </div>
                                ))}

                                <div className="pt-2">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-2 flex items-center gap-1"><AlertTriangle size={11} /> Suspect Info</div>
                                    <p className="text-sm text-slate-400 p-3 rounded-lg bg-red-500/5 border border-red-400/10">{selectedCase.suspect}</p>
                                </div>

                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1"><User size={11} /> Victim Info</div>
                                    <p className="text-sm text-slate-400 p-3 rounded-lg bg-blue-500/5 border border-blue-400/10">{selectedCase.victim}</p>
                                </div>

                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Update Status</div>
                                    <select className="pd-input w-full" value={selectedCase.status}
                                        onChange={e => { setCases(prev => prev.map(x => x.id === selectedCase.id ? { ...x, status: e.target.value } : x)); setSelectedCase({ ...selectedCase, status: e.target.value }); }}>
                                        {["Registered", "Investigating", "On-Site", "Closed"].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Evidence ({selectedCase.evidence?.length || 0})</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {selectedCase.evidence?.map((e, j) => (
                                            <div key={j} className="pd-evidence-thumb text-[9px] text-slate-500 font-mono p-2 text-center">
                                                {e.endsWith('.mp4') ? <Video size={18} className="text-purple-400 mx-auto mb-1" /> : e.endsWith('.pdf') || e.endsWith('.xlsx') ? <FileIcon size={18} className="text-amber-400 mx-auto mb-1" /> : <Image size={18} className="text-cyan-400 mx-auto mb-1" />}
                                                <span className="truncate block">{e}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ═══ FIR MODAL ═══ */}
            <AnimatePresence>
                {showFIRModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={() => setShowFIRModal(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#0f1629] border border-cyan-400/15 rounded-2xl p-7 w-[90%] max-w-lg" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="font-bold text-white flex items-center gap-2"><FilePlus size={18} className="text-cyan-400" /> Register New FIR</h2>
                                <button onClick={() => setShowFIRModal(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
                            </div>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Complainant</label><input className="pd-input" placeholder="Full Name" /></div>
                                    <div><label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Contact</label><input className="pd-input" placeholder="Phone" /></div>
                                </div>
                                <div><label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Crime Type</label>
                                    <select className="pd-input"><option>Select Type</option>{["Theft", "Assault", "Fraud", "Cybercrime", "Vandalism", "Narcotics", "Robbery", "Other"].map(c => <option key={c}>{c}</option>)}</select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Location</label><input className="pd-input" placeholder="Location" /></div>
                                    <div><label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Date & Time</label><input type="datetime-local" className="pd-input" /></div>
                                </div>
                                <div><label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Incident Details</label><textarea rows={3} className="pd-input resize-none" placeholder="Detailed description..." /></div>
                                <div><label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Suspect Description</label><input className="pd-input" placeholder="Physical description, known identity..." /></div>
                                <button className="w-full mt-2 py-2.5 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #0066ff, #00d4ff)" }}>
                                    <Send size={14} /> File FIR
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ EVIDENCE UPLOAD MODAL ═══ */}
            <AnimatePresence>
                {showEvidenceModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={() => setShowEvidenceModal(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#0f1629] border border-cyan-400/15 rounded-2xl p-7 w-[90%] max-w-lg" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="font-bold text-white flex items-center gap-2"><Upload size={18} className="text-purple-400" /> Upload Evidence</h2>
                                <button onClick={() => setShowEvidenceModal(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
                            </div>
                            <div className="space-y-3">
                                <div><label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Case ID</label><input className="pd-input font-mono" placeholder="EPLX..." /></div>
                                <div className="border-2 border-dashed border-cyan-400/15 rounded-xl p-8 text-center hover:border-cyan-400/30 transition-all cursor-pointer" onClick={() => document.getElementById('police-evidence-input').click()}>
                                    <Camera size={32} className="mx-auto text-purple-400 mb-3" />
                                    <p className="text-sm text-slate-300">Click to browse evidence files</p>
                                    <p className="text-[10px] text-slate-600 mt-1">Images, videos, PDFs, audio (max 25MB)</p>
                                    <input id="police-evidence-input" type="file" className="hidden" />
                                </div>
                                <div><label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Chain of Custody Notes</label><textarea rows={2} className="pd-input resize-none" placeholder="Evidence collection details..." /></div>
                                <button className="w-full py-2.5 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                                    <Upload size={14} /> Submit Evidence
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PoliceDashboard;
