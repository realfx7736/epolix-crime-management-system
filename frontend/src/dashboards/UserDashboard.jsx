import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    Shield, PlusCircle, Search, Bell, User, PhoneCall,
    LayoutDashboard, MapPin, AlertCircle, Clock, CheckCircle2,
    FileText, Upload, Eye, ChevronDown, Menu, X, LogOut,
    Siren, Activity, TrendingUp, TrendingDown, BarChart3,
    Fingerprint, Camera, Send, AlertTriangle, Radio,
    Building2, Navigation, ChevronRight, Star, Lock,
    Edit3, Mail, Phone, Calendar, Hash, UserCircle,
    MessageSquare, ExternalLink, Download, Filter, RefreshCw,
    ShieldAlert, CreditCard
} from "lucide-react";
import { api } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./CitizenDashboard.css";

// ─── UTILS ──────────────────────────────────────────────────────────
const verhoeffTable = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];
const permutationTable = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];
const invTable = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

const validateVerhoeff = (array) => {
    let c = 0;
    const invertedArray = array.split('').map(Number).reverse();
    for (let i = 0; i < invertedArray.length; i++) {
        c = verhoeffTable[c][permutationTable[i % 8][invertedArray[i]]];
    }
    return c === 0;
};

// ─── MOCK DATA ──────────────────────────────────────────────────────
const crimeCategories = ["Theft", "Assault", "Fraud", "Cybercrime", "Vandalism", "Kidnapping", "Robbery", "Domestic Violence", "Drug Offense", "Other"];

const mockComplaints = [
    { caseId: "EPLX1709001", type: "Theft", status: "Pending", date: "2026-03-05", location: "Sector 14, Delhi", officer: "SI Raj Kumar", description: "Mobile phone snatched near metro station." },
    { caseId: "EPLX1709002", type: "Cybercrime", status: "Under Investigation", date: "2026-02-28", location: "Online", officer: "SI Priya Sharma", description: "Phishing attack on bank account." },
    { caseId: "EPLX1709003", type: "Vandalism", status: "Resolved", date: "2026-02-15", location: "Connaught Place", officer: "SI Anil Verma", description: "Shop glass broken during protest." },
    { caseId: "EPLX1709004", type: "Fraud", status: "Under Investigation", date: "2026-03-01", location: "Saket District", officer: "SI Meena Devi", description: "Fake real estate documents used for sale." },
];

const mockNotifications = [
    { id: 1, msg: "Case EPLX1709002: New evidence submitted by forensics", time: "12 min ago", unread: true, type: "update" },
    { id: 2, msg: "Alert: Increased cyber fraud cases in your area", time: "1h ago", unread: true, type: "alert" },
    { id: 3, msg: "Case EPLX1709001 assigned to SI Raj Kumar", time: "3h ago", unread: false, type: "info" },
    { id: 4, msg: "Monthly safety report available for download", time: "Yesterday", unread: false, type: "info" },
    { id: 5, msg: "Case EPLX1709003 has been resolved", time: "2 days ago", unread: false, type: "update" },
];

const mockCrimeAlerts = [
    { area: "Rohini Sector 9", type: "Chain Snatching", severity: "high", time: "30 min ago" },
    { area: "Karol Bagh", type: "Pickpocketing", severity: "medium", time: "2h ago" },
    { area: "Dwarka Sector 12", type: "Vehicle Theft", severity: "high", time: "4h ago" },
    { area: "Lajpat Nagar", type: "Cyber Fraud", severity: "low", time: "6h ago" },
];

const nearbyStations = [
    { name: "Thiruvananthapuram City PS", dist: "2.1 km", status: "Open 24/7", lat: 90, left: 60 },
    { name: "Kollam East PS", dist: "15.4 km", status: "Open 24/7", lat: 82, left: 50 },
    { name: "Pathanamthitta PS", dist: "35.2 km", status: "Open 24/7", lat: 78, left: 65 },
    { name: "Alappuzha South PS", dist: "48.5 km", status: "Open 24/7", lat: 72, left: 45 },
    { name: "Kottayam West PS", dist: "62.1 km", status: "Open 24/7", lat: 68, left: 55 },
    { name: "Idukki Painavu PS", dist: "85.6 km", status: "Open 24/7", lat: 65, left: 80 },
    { name: "Ernakulam Central PS", dist: "110.3 km", status: "Open 24/7", lat: 58, left: 40 },
    { name: "Thrissur Town East PS", dist: "165.2 km", status: "Open 24/7", lat: 50, left: 45 },
    { name: "Palakkad Town PS", dist: "195.4 km", status: "Open 24/7", lat: 45, left: 65 },
    { name: "Malappuram PS", dist: "245.1 km", status: "Open 24/7", lat: 38, left: 40 },
    { name: "Kozhikode Town PS", dist: "285.6 km", status: "Open 24/7", lat: 30, left: 35 },
    { name: "Wayanad Kalpetta PS", dist: "325.2 km", status: "Open 24/7", lat: 25, left: 55 },
    { name: "Kannur Town PS", dist: "385.4 km", status: "Open 24/7", lat: 18, left: 30 },
    { name: "Kasaragod PS", dist: "455.7 km", status: "Open 24/7", lat: 8, left: 25 },
];

const crimeStats = [
    { label: "Jan", value: 42 }, { label: "Feb", value: 38 }, { label: "Mar", value: 55 },
    { label: "Apr", value: 47 }, { label: "May", value: 34 }, { label: "Jun", value: 29 },
];

// ─── MAIN DASHBOARD COMPONENT ──────────────────────────────────────
const UserDashboard = () => {
    const navigate = useNavigate();
    const auth = useAuth();
    const [activeSection, setActiveSection] = useState("dashboard");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showEmergency, setShowEmergency] = useState(false);
    const [showNotif, setShowNotif] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showEvidenceModal, setShowEvidenceModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showAadhaarModal, setShowAadhaarModal] = useState(false);
    const [notifications, setNotifications] = useState(mockNotifications);

    // Aadhaar KYC State
    const [aadhaarNumber, setAadhaarNumber] = useState("");
    const [aadhaarOtp, setAadhaarOtp] = useState(["", "", "", "", "", ""]);
    const [aadhaarStep, setAadhaarStep] = useState(1); // 1: Aadhaar, 2: OTP
    const [aadhaarLoading, setAadhaarLoading] = useState(false);
    const [aadhaarError, setAadhaarError] = useState("");
    const [isAadhaarVerified, setIsAadhaarVerified] = useState(false);
    const aadhaarOtpRefs = useRef([]);

    // Case tracking
    const [trackingId, setTrackingId] = useState("");
    const [foundCase, setFoundCase] = useState(null);
    const [trackLoading, setTrackLoading] = useState(false);
    const [trackError, setTrackError] = useState(null);

    // Report form
    const [reportForm, setReportForm] = useState({ crimeType: "", location: "", date: "", description: "", evidence: null });
    const [reportSubmitted, setReportSubmitted] = useState(false);

    // Profile
    const [profile, setProfile] = useState({ name: "Citizen", email: "", phone: "", address: "", aadhar: "" });

    const [dbComplaints, setDbComplaints] = useState([]);
    const [liveCount, setLiveCount] = useState({ active: 127, resolved: 843, officers: 56 });
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    const fetchUserData = async () => {
        setIsLoading(true);
        setErrorMsg("");
        try {
            // Fetch User's Complaints
            const res = await api.get('/complaints/my').catch(err => ({ success: false, error: err }));
            if (res.success && res.data) {
                setDbComplaints(Array.isArray(res.data) ? res.data : []);
                setLiveCount(prev => ({
                    ...prev,
                    active: Array.isArray(res.data) ? res.data.filter(c => !['resolved', 'closed', 'rejected'].includes(c.status)).length : 0
                }));
            }

            // Fetch Notifications
            const notifsRes = await api.get('/notifications').catch(err => ({ success: false, error: err }));
            if (notifsRes.success && notifsRes.data) {
                const normalized = (Array.isArray(notifsRes.data) ? notifsRes.data : []).map((n) => ({
                    ...n,
                    msg: n.msg || n.message,
                    time: n.time || (n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now'),
                    unread: n.unread ?? n.is_read === false
                }));
                setNotifications(normalized);
            }

        } catch (err) {
            console.warn("User Dashboard Refresh Warning:", err.message);
            setErrorMsg("Terminal Uplink Interrupted. Please check local connectivity.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const u = JSON.parse(storedUser);
            setProfile({
                name: u.fullName || u.full_name || "Citizen",
                email: u.email || "N/A",
                phone: u.phone || "N/A",
                address: u.address || "N/A",
                aadhar: u.aadhaar_masked || u.aadhaar || "Not Linked"
            });
            setIsAadhaarVerified(!!u.is_aadhaar_verified);
        }
        fetchUserData();
    }, []);

    // ─── Aadhaar KYC Flow ──────────────────────────────────
    const handleSendAadhaarOTP = async (e) => {
        e.preventDefault();
        if (!/^\d{12}$/.test(aadhaarNumber)) {
            setAadhaarError("Please enter a valid 12-digit Aadhaar number.");
            return;
        }
        if (!validateVerhoeff(aadhaarNumber)) {
            setAadhaarError("Invalid Aadhaar checksum (Verhoeff validation failed).");
            return;
        }
        setAadhaarLoading(true); setAadhaarError("");
        try {
            const res = await api.post('/auth/aadhaar/send-otp', { aadhaarNumber });
            if (res.success) {
                setAadhaarStep(2);
            } else {
                setAadhaarError(res.error || "Aadhaar validation failed.");
            }
        } catch (err) {
            setAadhaarError("KYC service temporarily unavailable.");
        } finally {
            setAadhaarLoading(false);
        }
    };

    const handleVerifyAadhaarOTP = async () => {
        const otpCode = aadhaarOtp.join("");
        if (otpCode.length !== 6) return;
        setAadhaarLoading(true); setAadhaarError("");
        try {
            const res = await api.post('/auth/aadhaar/verify-otp', { aadhaarNumber, otp: otpCode });
            if (res.success) {
                setIsAadhaarVerified(true);
                setProfile(prev => ({ ...prev, aadhar: res.aadhaar_masked }));
                // Update local storage
                const u = JSON.parse(localStorage.getItem('user') || '{}');
                u.is_aadhaar_verified = true;
                u.aadhaar_masked = res.aadhaar_masked;
                localStorage.setItem('user', JSON.stringify(u));

                setTimeout(() => setShowAadhaarModal(false), 2000);
            } else {
                setAadhaarError(res.error || "Invalid OTP.");
            }
        } catch (err) {
            setAadhaarError("Verification failed. Please retry.");
        } finally {
            setAadhaarLoading(false);
        }
    };

    const handleTrackCase = async (e, caseNumber = trackingId) => {
        e?.preventDefault?.();
        const targetCaseId = (caseNumber || '').trim();
        if (!targetCaseId) return;
        setTrackLoading(true); setTrackError(null); setFoundCase(null);
        try {
            const res = await api.get(`/cases/track/${targetCaseId}`);
            if (res.success) {
                setFoundCase({
                    caseId: res.data.case_number,
                    status: mapStatus(res.data.status),
                    description: res.data.title
                });
            }
        } catch (err) {
            setTrackError(err.message || "Case not found. Verify your ID.");
        } finally {
            setTrackLoading(false);
        }
    };

    const mapStatus = (s) => {
        const normalized = (s || '').toString().toLowerCase();
        const map = {
            'submitted': 'Under Review',
            'under_review': 'Under Review',
            'verified': 'Verified',
            'investigation': 'Under Investigation',
            'resolved': 'Resolved',
            'closed': 'Closed',
            'rejected': 'Rejected',
            'escalated': 'Escalated',
            // Legacy/Case mappings
            'open': 'Investigation',
            'assigned': 'Investigation',
            'under_investigation': 'Under Investigation',
            'evidence_collection': 'Evidence Collection'
        };
        return map[normalized] || s || 'Pending';
    };

    const handleReportSubmit = async (e) => {
        e.preventDefault();
        setReportSubmitted(true);
        try {
            const complaintData = {
                title: reportForm.crimeType + " - " + reportForm.location,
                description: reportForm.description,
                category_name: reportForm.crimeType,
                location: reportForm.location,
                incident_date: reportForm.date
            };
            await api.post('/complaints', complaintData);
            setTimeout(() => {
                setReportSubmitted(false);
                setShowReportModal(false);
                setReportForm({ crimeType: "", location: "", date: "", description: "", evidence: null });
                fetchUserData();
            }, 2500);
        } catch (err) {
            alert(err.message);
            setReportSubmitted(false);
        }
    };

    const handleEmergency = () => {
        setShowEmergency(true);
        window.location.href = 'tel:112';
        setTimeout(() => setShowEmergency(false), 5000);
    };

    const unreadCount = notifications.filter(n => n.unread || n.is_read === false).length;

    const navItems = [
        { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
        { id: "report", label: "Report Crime", icon: <PlusCircle size={18} /> },
        { id: "track", label: "Track Status", icon: <Search size={18} /> },
        { id: "history", label: "Case History", icon: <FileText size={18} /> },
        { id: "evidence", label: "Upload Evidence", icon: <Upload size={18} /> },
        { id: "stations", label: "Police Stations", icon: <Building2 size={18} /> },
        { id: "alerts", label: "Crime Alerts", icon: <AlertTriangle size={18} /> },
        { id: "profile", label: "My Profile", icon: <UserCircle size={18} /> },
    ];

    const statusColor = (s) => {
        const status = (s || '').toString().toLowerCase();
        if (['pending', 'under review', 'submitted'].includes(status)) return "status-pending";
        if (['verified', 'under investigation', 'investigation', 'investigating'].includes(status)) return "status-investigating";
        if (['resolved', 'closed'].includes(status)) return "status-resolved";
        if (['rejected'].includes(status)) return "status-rejected text-red-400 border-red-400/20 bg-red-400/10";
        if (['escalated'].includes(status)) return "status-escalated text-amber-400 border-amber-400/20 bg-amber-400/10";
        return "status-pending";
    };

    const severityColor = (s) => {
        if (s === "high") return "text-red-400";
        if (s === "medium") return "text-amber-400";
        return "text-green-400";
    };

    const pendingComplaints = dbComplaints.filter(c => {
        const status = (c.status || '').toString().toLowerCase();
        return status === 'submitted' || status === 'under_review' || status === 'pending' || status === 'under investigation';
    });

    // ─── RENDER SECTIONS ──────────────────────────────────
    const renderDashboard = () => (
        <div className="space-y-6">
            {/* Stat Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Active Cases", value: liveCount.active, icon: <Activity size={20} />, color: "#00d4ff", trend: "+3 today" },
                    { label: "Cases Resolved", value: liveCount.resolved, icon: <CheckCircle2 size={20} />, color: "#00ff88", trend: "+12 this week" },
                    { label: "Officers on Duty", value: liveCount.officers, icon: <Shield size={20} />, color: "#ffaa00", trend: "3 shifts" },
                    { label: "My Complaints", value: dbComplaints.length > 0 ? dbComplaints.length : mockComplaints.length, icon: <FileText size={20} />, color: "#ff3366", trend: "1 pending" },
                ].map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        className="glass-card cd-stat-widget p-5"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{stat.label}</span>
                            <div style={{ color: stat.color }}>{stat.icon}</div>
                        </div>
                        <div className="text-3xl font-bold mb-1" style={{ color: stat.color }}>{stat.value}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                            <TrendingUp size={12} /> {stat.trend}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Verification Banner */}
            {!isAadhaarVerified && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-400/30 flex flex-col sm:flex-row items-center gap-5 shadow-2xl backdrop-blur-md"
                >
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 border border-blue-400/20">
                        <ShieldAlert size={24} className="animate-pulse" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <h4 className="font-bold text-white mb-1">Identity Verification Required</h4>
                        <p className="text-sm text-slate-400">Complete your Aadhaar KYC to unlock full police assistance features and secure document access.</p>
                    </div>
                    <button onClick={() => setShowAadhaarModal(true)} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-lg shadow-blue-600/30 whitespace-nowrap">
                        Verify Identity Now
                    </button>
                </motion.div>
            )}

            {/* Quick Summary Alert if any pending cases */}
            {pendingComplaints.length > 0 && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-4 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-400 text-xs flex items-center gap-3">
                    <AlertCircle size={16} />
                    <span>You have {pendingComplaints.length} complaints pending review.</span>
                    <button onClick={() => setActiveSection("history")} className="ml-auto font-bold underline">View Status</button>
                </motion.div>
            )}

            {/* Crime Trend Chart + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                    className="glass-card p-6 lg:col-span-2"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                            <BarChart3 size={16} className="text-cyan-400" /> Crime Trend Analytics
                        </h3>
                        <span className="text-[10px] font-mono text-slate-500">LIVE DATA · 2026</span>
                    </div>
                    <div className="flex items-end gap-3 h-40">
                        {crimeStats.map((bar, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <motion.div initial={{ height: 0 }} animate={{ height: `${(bar.value / 60) * 100}%` }}
                                    transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                                    className="cd-bar w-full"
                                    style={{ background: `linear-gradient(180deg, ${i === 2 ? '#ff3366' : '#00d4ff'}, ${i === 2 ? 'rgba(255,51,102,0.2)' : 'rgba(0,212,255,0.2)'})` }}
                                />
                                <span className="text-[10px] font-mono text-slate-500">{bar.label}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="space-y-4">
                    <button onClick={() => { setActiveSection("report"); setShowReportModal(true); }}
                        className="glass-card p-4 w-full text-left flex items-center gap-3 group hover:border-cyan-400/30 transition-all"
                    >
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                            <PlusCircle size={20} />
                        </div>
                        <div>
                            <div className="font-semibold text-sm text-slate-200">Report Crime</div>
                            <div className="text-[11px] text-slate-500">File a new complaint</div>
                        </div>
                        <ChevronRight size={16} className="ml-auto text-slate-600" />
                    </button>

                    <button onClick={() => setActiveSection("track")}
                        className="glass-card p-4 w-full text-left flex items-center gap-3 group hover:border-cyan-400/30 transition-all"
                    >
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                            <Search size={20} />
                        </div>
                        <div>
                            <div className="font-semibold text-sm text-slate-200">Track Status</div>
                            <div className="text-[11px] text-slate-500">Check case progress</div>
                        </div>
                        <ChevronRight size={16} className="ml-auto text-slate-600" />
                    </button>

                    <button onClick={() => setShowEvidenceModal(true)}
                        className="glass-card p-4 w-full text-left flex items-center gap-3 group hover:border-cyan-400/30 transition-all"
                    >
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                            <Camera size={20} />
                        </div>
                        <div>
                            <div className="font-semibold text-sm text-slate-200">Upload Evidence</div>
                            <div className="text-[11px] text-slate-500">Add files to a case</div>
                        </div>
                        <ChevronRight size={16} className="ml-auto text-slate-600" />
                    </button>

                    <button onClick={handleEmergency} className="cd-emergency-btn w-full justify-center">
                        <Siren size={20} className="animate-pulse" /> Emergency SOS — 112
                    </button>
                </motion.div>
            </div>

            {/* Recent Cases + Crime Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass-card p-6">
                    <h3 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FileText size={16} className="text-cyan-400" /> Recent Complaints
                    </h3>
                    <div className="space-y-3">
                        {dbComplaints.length > 0 ? dbComplaints.slice(0, 3).map((c, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-black/20 border border-white/5 hover:border-cyan-400/20 transition-all cursor-pointer group"
                                onClick={() => { setTrackingId(c.complaint_number); setActiveSection("track"); handleTrackCase(null, c.complaint_number); }}>
                                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center font-mono text-cyan-400 text-xs font-bold">
                                    #{i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm text-slate-200 truncate">{c.title}</div>
                                    <div className="text-[11px] text-slate-500 font-mono">{c.complaint_number} · {new Date(c.created_at).toLocaleDateString()}</div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${statusColor(mapStatus(c.status))}`}>
                                    {mapStatus(c.status)}
                                </span>
                            </div>
                        )) : <p className="text-xs text-slate-500 text-center py-4">No complaints filed yet.</p>}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="glass-card p-6">
                    <h3 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Radio size={16} className="text-red-400" /> Community Crime Alerts
                        <span className="ml-auto shimmer-bar px-2 py-0.5 rounded text-[9px] font-bold uppercase text-red-400 bg-red-400/10 border border-red-400/20">LIVE</span>
                    </h3>
                    <div className="space-y-3">
                        {mockCrimeAlerts.map((alert, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
                                <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${severityColor(alert.severity)}`} />
                                <div className="flex-1">
                                    <div className="font-semibold text-sm text-slate-200">{alert.type}</div>
                                    <div className="text-[11px] text-slate-500">{alert.area} · {alert.time}</div>
                                </div>
                                <span className={`text-[10px] font-bold uppercase ${severityColor(alert.severity)}`}>{alert.severity}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );

    const renderTrackStatus = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8">
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2 neon-text-blue">
                <Fingerprint size={22} /> Track Complaint Status
            </h2>
            <p className="text-slate-500 text-sm mb-6">Enter your Case ID to view real-time investigation progress.</p>
            <form onSubmit={handleTrackCase} className="flex gap-3 mb-6">
                <input type="text" value={trackingId} onChange={e => setTrackingId(e.target.value)}
                    className="cd-input flex-1 font-mono text-lg" placeholder="Enter Case ID (e.g. EPLX1709001)" />
                <button type="submit" disabled={trackLoading} className="cd-btn-primary whitespace-nowrap">
                    {trackLoading ? <RefreshCw size={16} className="animate-spin" /> : "Track"}
                </button>
            </form>
            <AnimatePresence>
                {trackError && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="p-4 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 flex items-center gap-2 text-sm mb-4">
                        <AlertCircle size={16} /> {trackError}
                    </motion.div>
                )}
            </AnimatePresence>
            {foundCase && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                    <div className="flex items-start justify-between flex-wrap gap-4 p-5 rounded-xl bg-black/20 border border-cyan-400/20">
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-1">Case Reference</div>
                            <div className="text-2xl font-mono font-bold text-white">{foundCase.caseId}</div>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase ${statusColor(foundCase.status)}`}>
                            {foundCase.status}
                        </span>
                    </div>
                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-slate-400 text-sm italic">
                        "{foundCase.complaint || foundCase.description}"
                    </div>
                    <StatusPipeline status={foundCase.status} />
                </motion.div>
            )}
        </motion.div>
    );

    const renderHistory = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 neon-text-blue">
                <FileText size={22} /> Complaint History
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10 text-left">
                            <th className="pb-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Case ID</th>
                            <th className="pb-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Type</th>
                            <th className="pb-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Date</th>
                            <th className="pb-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Location</th>
                            <th className="pb-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Officer</th>
                            <th className="pb-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(dbComplaints.length > 0 ? dbComplaints : mockComplaints).map((c, i) => (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                                onClick={() => { setTrackingId(c.complaint_number || c.caseId); setActiveSection("track"); }}>
                                <td className="py-3 font-mono text-cyan-400 font-semibold">{c.complaint_number || c.caseId}</td>
                                <td className="py-3 text-slate-300">{c.category_name || c.type}</td>
                                <td className="py-3 text-slate-400 font-mono text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString() : c.date}</td>
                                <td className="py-3 text-slate-400">{c.location}</td>
                                <td className="py-3 text-slate-300">{c.officer || "Pending"}</td>
                                <td className="py-3"><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${statusColor(mapStatus(c.status))}`}>{mapStatus(c.status)}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );

    const renderStations = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 neon-text-blue">
                <Building2 size={22} /> Nearby Police Stations
            </h2>
            <div className="cd-map-container mb-6">
                <div className="cd-map-grid" />
                {nearbyStations.map((s, i) => (
                    <div key={i} className="cd-map-dot" style={{ top: `${s.lat}%`, left: `${s.left}%` }}>
                        <div className="absolute top-5 left-4 whitespace-nowrap bg-black/80 px-2 py-1 rounded text-[10px] font-semibold text-cyan-400 border border-cyan-400/20">
                            {s.name}
                        </div>
                    </div>
                ))}
                <div className="cd-map-dot red" style={{ top: "55%", left: "42%" }}>
                    <div className="absolute top-5 left-4 whitespace-nowrap bg-black/80 px-2 py-1 rounded text-[10px] font-semibold text-red-400 border border-red-400/20 z-10">
                        📍 Your Location
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {nearbyStations.map((s, i) => (
                    <div key={i} className="glass-card p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                            <Building2 size={18} />
                        </div>
                        <div>
                            <div className="font-semibold text-sm text-slate-200">{s.name}</div>
                            <div className="text-[11px] text-slate-500">{s.dist} · {s.status}</div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );

    const renderAlerts = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 neon-text-red">
                <Radio size={22} /> Community Crime Alerts
                <span className="ml-2 shimmer-bar px-2 py-0.5 rounded text-[9px] font-bold uppercase text-red-400 bg-red-400/10 border border-red-400/20">LIVE FEED</span>
            </h2>
            <div className="space-y-4">
                {mockCrimeAlerts.map((alert, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-4 p-5 rounded-xl bg-black/20 border border-white/5 hover:border-red-400/20 transition-all"
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${alert.severity === 'high' ? 'bg-red-500/10 text-red-400' : alert.severity === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-green-500/10 text-green-400'}`}>
                            <AlertTriangle size={18} />
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-slate-200">{alert.type}</div>
                            <div className="text-sm text-slate-500 mt-1">{alert.area}</div>
                        </div>
                        <div className="text-right">
                            <span className={`text-xs font-bold uppercase ${severityColor(alert.severity)}`}>{alert.severity}</span>
                            <div className="text-[11px] text-slate-500 mt-1">{alert.time}</div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );

    const renderProfile = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8 max-w-2xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 neon-text-blue">
                <UserCircle size={22} /> Citizen Profile
            </h2>
            <div className="flex items-center gap-6 mb-8 p-5 rounded-xl bg-black/20 border border-cyan-400/10">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 border border-cyan-400/20">
                    <User size={36} />
                </div>
                <div>
                    <div className="text-xl font-bold text-white flex items-center gap-2">
                        {profile.name}
                        {isAadhaarVerified ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-amber-400" />}
                    </div>
                    <div className="text-sm text-slate-400">Citizen · {isAadhaarVerified ? 'Verified KYC ✓' : 'KYC Pending ⚠'}</div>
                    <div className="text-xs text-slate-500 font-mono mt-1">Aadhar: {profile.aadhar}</div>
                    {!isAadhaarVerified && (
                        <button onClick={() => setShowAadhaarModal(true)} className="mt-3 text-[10px] font-bold uppercase tracking-wider text-blue-400 hover:underline">Link Aadhaar →</button>
                    )}
                </div>
            </div>
            <div className="space-y-4">
                {[
                    { icon: <Mail size={16} />, label: "Email", value: profile.email },
                    { icon: <Phone size={16} />, label: "Phone", value: profile.phone },
                    { icon: <MapPin size={16} />, label: "Address", value: profile.address },
                    { icon: <Lock size={16} />, label: "Aadhar", value: profile.aadhar },
                ].map((field, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-black/20 border border-white/5">
                        <div className="text-cyan-400">{field.icon}</div>
                        <div className="flex-1">
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{field.label}</div>
                            <div className="text-sm text-slate-200">{field.value}</div>
                        </div>
                        <button className="text-slate-500 hover:text-cyan-400 transition-colors"><Edit3 size={14} /></button>
                    </div>
                ))}
            </div>
        </motion.div>
    );

    const renderContent = () => {
        switch (activeSection) {
            case "dashboard": return renderDashboard();
            case "report": return renderDashboard();
            case "track": return renderTrackStatus();
            case "history": return renderHistory();
            case "evidence": return renderDashboard();
            case "stations": return renderStations();
            case "alerts": return renderAlerts();
            case "profile": return renderProfile();
            default: return renderDashboard();
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="relative">
                        <div className="w-14 h-14 border-2 border-cyan-500/10 border-t-cyan-400 rounded-full animate-spin" />
                        <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400/30" size={20} />
                    </div>
                    <p className="text-cyan-400 text-[10px] uppercase tracking-[0.3em] font-black">Syncing Citizen Records</p>
                </div>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-6">
                <div className="glass-card p-10 max-w-lg w-full text-center border-cyan-500/10 shadow-[0_0_40px_rgba(0,212,255,0.05)]">
                    <div className="w-20 h-20 rounded-2xl bg-cyan-500/5 flex items-center justify-center text-cyan-400 mx-auto mb-8 border border-cyan-400/10">
                        <ShieldAlert size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-3">TERMINAL OFFLINE</h2>
                    <p className="text-slate-400 text-sm mb-8">{errorMsg}</p>
                    <button onClick={fetchUserData} className="w-full py-3.5 rounded-xl font-bold text-sm text-[#070b14] bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_20px_rgba(0,212,255,0.3)] transition-all flex items-center justify-center gap-2">
                        <RefreshCw size={18} /> Retry Connection
                    </button>
                    <button onClick={() => navigate('/')} className="mt-6 text-[10px] uppercase font-bold text-slate-600 hover:text-slate-400 tracking-widest text-center block w-full">
                        Back to Portal
                    </button>
                </div>
            </div>
        );
    }

    // ─── MAIN RENDER ──────────────────────────────────────
    return (
        <div className="min-h-screen grid-bg" style={{ background: "var(--dark-bg)" }}>
            {/* SIDEBAR */}
            <aside className={`cd-sidebar ${sidebarOpen ? "open" : ""}`}>
                <div className="cd-sidebar-logo">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center neon-blue-glow">
                        <Shield size={18} className="text-white" />
                    </div>
                    <div>
                        <div className="text-lg font-bold text-white tracking-tight">E‑POLIX</div>
                        <div className="text-[9px] uppercase tracking-widest text-cyan-400">Citizen Portal</div>
                    </div>
                </div>

                <nav className="cd-sidebar-nav">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => { setActiveSection(item.id); setSidebarOpen(false); if (item.id === "report") setShowReportModal(true); if (item.id === "evidence") setShowEvidenceModal(true); }}
                            className={`cd-nav-item ${activeSection === item.id ? "active" : ""}`}
                        >
                            {item.icon} {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-3 border-t border-white/5">
                    <button onClick={() => { auth.logout(); navigate("/"); }} className="cd-nav-item w-full text-red-400 hover:bg-red-500/10 hover:text-red-400">
                        <LogOut size={18} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* MAIN AREA */}
            <div className="cd-main">
                {/* TOP BAR */}
                <div className="cd-topbar">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-slate-400 hover:text-white">
                            <Menu size={22} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-white">Welcome, <span className="neon-text-blue">{profile.name}</span></h1>
                            <p className="text-[11px] text-slate-500">Citizen Dashboard · Secure Session Active <Lock size={10} className="inline ml-1" /></p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Emergency mini */}
                        <button onClick={handleEmergency} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all">
                            <Siren size={14} className="animate-pulse" /> SOS
                        </button>
                        {/* Notifications */}
                        <div className="relative">
                            <button onClick={() => setShowNotif(!showNotif)} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all relative">
                                <Bell size={18} />
                                {unreadCount > 0 && <span className="cd-notif-badge">{unreadCount}</span>}
                            </button>
                            <AnimatePresence>
                                {showNotif && (
                                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 top-12 w-80 glass-card p-4 z-50 border border-cyan-400/20"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-bold text-sm text-white">Notifications</h4>
                                            <span className="text-[10px] text-cyan-400 font-mono">{unreadCount} new</span>
                                        </div>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {notifications.map(n => (
                                                <div key={n.id} className={`p-3 rounded-lg text-xs ${n.unread ? 'bg-cyan-400/5 border border-cyan-400/10' : 'bg-black/20 border border-white/5'}`}>
                                                    <p className={`${n.unread ? 'text-slate-200' : 'text-slate-400'}`}>{n.msg}</p>
                                                    <span className="text-[10px] text-slate-500 mt-1 block">{n.time}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <button onClick={() => { setActiveSection("profile"); }} className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 border border-cyan-400/20">
                            <User size={16} />
                        </button>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="p-4 sm:p-6">
                    <AnimatePresence mode="wait">
                        <motion.div key={activeSection} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* ═══ EMERGENCY OVERLAY ═══ */}
            <AnimatePresence>
                {showEmergency && (
                    <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-2xl flex items-center gap-4 neon-red-glow"
                        style={{ background: "linear-gradient(135deg, #ff3366, #cc0033)", border: "1px solid rgba(255,255,255,0.2)" }}
                    >
                        <PhoneCall className="animate-bounce text-white" size={24} />
                        <div>
                            <p className="font-bold text-white text-sm">EMERGENCY PROTOCOL ACTIVATED</p>
                            <p className="text-xs text-white/70">Connecting to nearest dispatcher (112)...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ REPORT CRIME MODAL ═══ */}
            <AnimatePresence>
                {showReportModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="cd-modal-overlay" onClick={() => setShowReportModal(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="cd-modal p-8" onClick={e => e.stopPropagation()}>
                            {reportSubmitted ? (
                                <div className="text-center py-12">
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4 border border-green-400/30">
                                        <CheckCircle2 size={40} className="text-green-400" />
                                    </motion.div>
                                    <h3 className="text-xl font-bold text-white mb-2">Report Filed Successfully!</h3>
                                    <p className="text-slate-400 text-sm">Your complaint has been registered. You will receive a Case ID shortly.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2"><PlusCircle size={20} className="text-cyan-400" /> Report Crime</h2>
                                        <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                                    </div>
                                    <form onSubmit={handleReportSubmit} className="space-y-4">
                                        <div>
                                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Crime Type</label>
                                            <select value={reportForm.crimeType} onChange={e => setReportForm({ ...reportForm, crimeType: e.target.value })}
                                                className="cd-input cd-select" required>
                                                <option value="">Select crime category</option>
                                                {crimeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Location</label>
                                                <input type="text" value={reportForm.location} onChange={e => setReportForm({ ...reportForm, location: e.target.value })}
                                                    className="cd-input" placeholder="Crime location" required />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Date of Incident</label>
                                                <input type="date" value={reportForm.date} onChange={e => setReportForm({ ...reportForm, date: e.target.value })}
                                                    className="cd-input" required />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Description</label>
                                            <textarea rows={4} value={reportForm.description} onChange={e => setReportForm({ ...reportForm, description: e.target.value })}
                                                className="cd-input resize-none" placeholder="Describe the incident in detail..." required />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Evidence (Optional)</label>
                                            <div className="cd-file-drop" onClick={() => document.getElementById('report-evidence-input').click()} style={{ cursor: 'pointer' }}>
                                                <Upload size={24} className="mx-auto text-slate-500 mb-2" />
                                                <p className="text-sm text-slate-400">{reportForm.evidence ? reportForm.evidence.name : <span>Drag & drop files or <span className="text-cyan-400">browse</span></span>}</p>
                                                <p className="text-[10px] text-slate-500 mt-1">Images, videos, documents (max 10MB)</p>
                                                <input id="report-evidence-input" type="file" className="hidden" onChange={e => setReportForm({ ...reportForm, evidence: e.target.files[0] })} />
                                            </div>
                                        </div>
                                        <button type="submit" className="cd-btn-primary w-full py-3 flex items-center justify-center gap-2">
                                            <Send size={16} /> Submit Report
                                        </button>
                                    </form>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* ═══ AADHAAR KYC MODAL ═══ */}
            <AnimatePresence>
                {showAadhaarModal && (
                    <AadhaarModal
                        isOpen={showAadhaarModal}
                        onClose={() => setShowAadhaarModal(false)}
                        step={aadhaarStep}
                        setStep={setAadhaarStep}
                        aadhaar={aadhaarNumber}
                        setAadhaar={setAadhaarNumber}
                        otp={aadhaarOtp}
                        setOtp={setAadhaarOtp}
                        loading={aadhaarLoading}
                        error={aadhaarError}
                        onSend={handleSendAadhaarOTP}
                        onVerify={handleVerifyAadhaarOTP}
                        isVerified={isAadhaarVerified}
                        otpRefs={aadhaarOtpRefs}
                    />
                )}
            </AnimatePresence>

            {/* ═══ UPLOAD EVIDENCE MODAL ═══ */}
            <AnimatePresence>
                {showEvidenceModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="cd-modal-overlay" onClick={() => setShowEvidenceModal(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="cd-modal p-8" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2"><Upload size={20} className="text-purple-400" /> Upload Additional Evidence</h2>
                                <button onClick={() => setShowEvidenceModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Case ID</label>
                                    <input type="text" className="cd-input font-mono" placeholder="Enter your Case ID" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Evidence Files</label>
                                    <div className="cd-file-drop" onClick={() => document.getElementById('evidence-upload-input').click()} style={{ cursor: 'pointer' }}>
                                        <Camera size={32} className="mx-auto text-purple-400 mb-3" />
                                        <p className="text-sm text-slate-300">Click to browse evidence files</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Photos, videos, audio recordings, documents</p>
                                        <input id="evidence-upload-input" type="file" className="hidden" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Notes</label>
                                    <textarea rows={3} className="cd-input resize-none" placeholder="Additional context about the evidence..." />
                                </div>
                                <button className="cd-btn-primary w-full py-3 flex items-center justify-center gap-2">
                                    <Upload size={16} /> Upload Evidence
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── AADHAAR KYC MODAL ───
const AadhaarModal = ({ isOpen, onClose, step, setStep, aadhaar, setAadhaar, otp, setOtp, loading, error, onSend, onVerify, isVerified, otpRefs }) => {
    if (!isOpen) return null;

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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="cd-modal-overlay" onClick={onClose} style={{ zIndex: 300 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="cd-modal p-0 overflow-hidden max-w-md w-full" onClick={e => e.stopPropagation()}>

                <div className="h-1.5 bg-blue-600/20 w-full relative">
                    <motion.div animate={{ width: step === 1 ? '50%' : '100%' }} className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                </div>

                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-400/20">
                                <Fingerprint size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-extrabold text-white tracking-tight">Identity Verification</h2>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">UIDAI Secondary Authentication</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                    </div>

                    {isVerified ? (
                        <div className="text-center py-6">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={40} className="text-emerald-400" />
                            </motion.div>
                            <h3 className="text-xl font-bold text-white mb-2">KYC Completed!</h3>
                            <p className="text-slate-400 text-sm">Your identity has been successfully verified with E-POLIX Central Database.</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-400/10 text-[11px] text-blue-400/80 leading-relaxed italic">
                                        Note: Your Aadhaar is only used for one-time verification. E-POLIX does not store your full Aadhaar number in plain text.
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Aadhaar Number (12 Digits)</label>
                                        <div className="relative group">
                                            <input
                                                className="cd-input pl-12 tracking-[0.3em] font-mono text-lg h-14"
                                                placeholder="0000 0000 0000"
                                                value={aadhaar}
                                                maxLength={12}
                                                onChange={e => setAadhaar(e.target.value.replace(/\D/g, ''))}
                                            />
                                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                                        </div>
                                    </div>
                                    {aadhaar.length === 12 && !validateVerhoeff(aadhaar) && (
                                        <p className="text-rose-400 text-[10px] font-bold flex items-center gap-1.5 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                                            <AlertCircle size={12} /> Aadhaar checksum mismatch. Check number.
                                        </p>
                                    )}
                                    {error && <p className="text-rose-400 text-xs font-bold flex items-center gap-2"><AlertCircle size={14} /> {error}</p>}
                                    <button onClick={onSend} disabled={loading || aadhaar.length !== 12 || !validateVerhoeff(aadhaar)}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                                        {loading ? <RefreshCw className="animate-spin" size={18} /> : <span>Request OTP <ChevronRight size={18} /></span>}
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-white mb-2 tracking-tighter">Security Check</div>
                                        <p className="text-slate-500 text-xs leading-relaxed">
                                            A 6-digit verification code has been sent to your <span className="text-blue-400 font-bold">UIDAI registered mobile number</span>.
                                        </p>
                                        <div className="mt-4 p-3 bg-blue-500/5 border border-blue-400/10 rounded-xl flex items-center justify-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Verifying Aadhaar Linkage...</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-center gap-2">
                                        {otp.map((d, i) => (
                                            <input
                                                key={i}
                                                ref={el => otpRefs.current[i] = el}
                                                className="w-10 h-14 bg-white/5 border border-white/10 rounded-xl text-center text-xl font-bold text-white focus:outline-none focus:border-blue-500 transition-all"
                                                value={d}
                                                maxLength={1}
                                                onChange={e => handleOtpChange(i, e.target.value)}
                                                onKeyDown={e => handleOtpKeyDown(i, e)}
                                            />
                                        ))}
                                    </div>

                                    {error && <p className="text-rose-400 text-xs font-bold">{error}</p>}

                                    <div className="flex gap-4">
                                        <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl bg-white/5 text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">Back</button>
                                        <button onClick={onVerify} disabled={loading || otp.join('').length < 6}
                                            className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                                            {loading ? <RefreshCw className="animate-spin" size={18} /> : "Verify Identity"}
                                        </button>
                                    </div>
                                    <button onClick={onSend} className="text-[10px] uppercase font-bold text-slate-500 hover:text-blue-400 transition-colors">Resend Verification Code</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

// ─── STATUS PIPELINE COMPONENT ──────────────────────────────────────
const StatusPipeline = ({ status }) => {
    const stages = ["Registered", "Under Investigation", "Evidence Collected", "ChargeSheet Filed", "Resolved"];
    const idx = stages.indexOf(status);

    return (
        <div className="pt-4">
            <h4 className="text-center font-bold text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-8">Investigation Pipeline</h4>
            <div className="flex items-center justify-between relative">
                <div className="absolute left-0 right-0 top-5 h-[2px] bg-white/5 mx-8" />
                <motion.div initial={{ width: 0 }} animate={{ width: `${(idx / (stages.length - 1)) * 100}%` }}
                    className="absolute left-0 top-5 h-[2px] mx-8"
                    style={{ background: "linear-gradient(90deg, #00d4ff, #00ff88)", boxShadow: "0 0 10px rgba(0,212,255,0.5)" }}
                />
                {stages.map((stage, i) => (
                    <div key={stage} className="flex flex-col items-center relative z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${i <= idx ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400' : 'bg-black/30 border-white/10 text-slate-600'}`}
                            style={i <= idx ? { boxShadow: '0 0 15px rgba(0,212,255,0.3)' } : {}}>
                            {i < idx ? <CheckCircle2 size={18} /> : i === idx ? <Clock size={18} className="animate-spin" /> : <span className="text-xs">{i + 1}</span>}
                        </div>
                        <span className={`text-[9px] mt-2 font-bold uppercase tracking-tight text-center max-w-[65px] ${i <= idx ? 'text-cyan-400' : 'text-slate-600'}`}>
                            {stage}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UserDashboard;
