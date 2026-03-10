import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield, LayoutDashboard, Users, AlertTriangle, FileText, Activity, Settings,
    Search, ChevronRight, Clock, MapPin, CheckCircle2, Edit3, Trash2, Upload,
    Mail, Bell, Lock, LogOut, Menu, X, User, PlusCircle, Eye, Briefcase,
    TrendingUp, BarChart3, Camera, Download, Filter, RefreshCw, Building2,
    Target, Zap, Layers, Send, Hash, Phone, Fingerprint, AlertCircle,
    UserPlus, UserCheck, Database, Globe, Key,
    Image as ImageIcon, Video, FileIcon, ChevronDown, Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { api } from "../utils/api";
import "./AdminDashboard.css";

const mockUsers = [
    { id: "CIT-001", name: "Arjun Mehta", role: "Citizen", email: "arjun@email.com", status: "Active", joined: "2026-01-15" },
    { id: "CIT-002", name: "Priya Singh", role: "Citizen", email: "priya@email.com", status: "Active", joined: "2026-02-01" },
    { id: "CIT-003", name: "Rahul Verma", role: "Citizen", email: "rahul@email.com", status: "Suspended", joined: "2025-11-20" },
    { id: "OFF-110", name: "SI Vikram Rathore", role: "Police", email: "vikram@epolix.gov", status: "Active", joined: "2024-06-10" },
    { id: "OFF-111", name: "SI Priya Sharma", role: "Police", email: "priya.s@epolix.gov", status: "Active", joined: "2024-08-22" },
    { id: "OFF-112", name: "Det. Anil Kumar", role: "Police", email: "anil@epolix.gov", status: "On Leave", joined: "2023-03-15" },
    { id: "STF-901", name: "Sita Rajlaxmi", role: "Staff", email: "sita@epolix.gov", status: "Active", joined: "2025-01-10" },
];

const mockOfficers = [
    { id: "OFF-110", name: "SI Vikram Rathore", division: "Saket", activeCases: 4, status: "On Duty", rating: 4.8 },
    { id: "OFF-111", name: "SI Priya Sharma", division: "Cyber Cell", activeCases: 6, status: "On Duty", rating: 4.9 },
    { id: "OFF-112", name: "Det. Anil Kumar", division: "Crime Branch", activeCases: 0, status: "On Leave", rating: 4.5 },
    { id: "OFF-113", name: "ASI Meena Devi", division: "Saket", activeCases: 3, status: "On Duty", rating: 4.6 },
    { id: "OFF-114", name: "SI Rohit Kapoor", division: "Narcotics", activeCases: 2, status: "Field Ops", rating: 4.7 },
];

const mockStations = [
    { id: "PS-01", name: "Saket Police Station", officers: 12, cases: 34, head: "ACP R. Mishra", status: "Operational" },
    { id: "PS-02", name: "Hauz Khas PS", officers: 8, cases: 21, head: "ACP S. Nair", status: "Operational" },
    { id: "PS-03", name: "Dwarka PS", officers: 15, cases: 45, head: "ACP P. Gupta", status: "High Alert" },
    { id: "PS-04", name: "Cyber Crime Cell", officers: 6, cases: 67, head: "SP T. Reddy", status: "Operational" },
];

const crimeByType = [
    { type: "Theft", count: 142, pct: 28, color: "#00d4ff" },
    { type: "Cyber", count: 98, pct: 19, color: "#a855f7" },
    { type: "Fraud", count: 76, pct: 15, color: "#ff3366" },
    { type: "Assault", count: 64, pct: 13, color: "#ff6432" },
    { type: "Vandalism", count: 52, pct: 10, color: "#ffaa00" },
    { type: "Other", count: 75, pct: 15, color: "#00ff88" },
];

const monthlyData = [
    { m: "Sep", v: 68 }, { m: "Oct", v: 82 }, { m: "Nov", v: 57 }, { m: "Dec", v: 94 },
    { m: "Jan", v: 73 }, { m: "Feb", v: 88 }, { m: "Mar", v: 45 },
];

const mapPins = [
    { top: 20, left: 18, color: "#ff3366", label: "Dwarka - 45 cases" },
    { top: 35, left: 45, color: "#ffaa00", label: "Saket - 34 cases" },
    { top: 55, left: 65, color: "#00d4ff", label: "Cyber Cell - 67 cases" },
    { top: 68, left: 30, color: "#00ff88", label: "Hauz Khas - 21 cases" },
    { top: 42, left: 80, color: "#a855f7", label: "Nehru Place - 29 cases" },
];

const notifs = [
    { id: 1, msg: "New citizen registration: Meena Devi", time: "3 min ago", unread: true },
    { id: 2, msg: "Case EPLX1709005 escalated to Critical", time: "15 min ago", unread: true },
    { id: 3, msg: "Officer OFF-112 marked On Leave", time: "1h ago", unread: true },
    { id: 4, msg: "Monthly crime report generated", time: "3h ago", unread: false },
    { id: 5, msg: "System backup completed successfully", time: "Yesterday", unread: false },
];

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState("overview");
    const [sideOpen, setSideOpen] = useState(false);
    const [showNotif, setShowNotif] = useState(false);
    const [showModal, setShowModal] = useState(null); // 'addUser','addOfficer','assign','settings','export'
    const [userFilter, setUserFilter] = useState("all");
    const [searchQ, setSearchQ] = useState("");

    const [realCases, setRealCases] = useState([]);
    const [realMessages, setRealMessages] = useState([]);
    const [stats, setStats] = useState({ total: 507, resolved: 312, active: 142, pending: 53, officers: 28, stations: 4 });

    const [admin, setAdmin] = useState({ fullName: "Super Admin", adminId: "ADM-HQ-001", email: "admin@epolix.gov" });

    const [backendStats, setBackendStats] = useState(null);
    const [dbUsers, setDbUsers] = useState([]);
    const [dbOfficers, setDbOfficers] = useState([]);

    const fetchBackendData = async () => {
        try {
            // Fetch Dashboard Overview
            const overview = await api.get('/dashboard/overview');
            if (overview.success) setBackendStats(overview.data);

            // Fetch Recent Activity
            const recent = await api.get('/dashboard/recent');
            if (recent.success) {
                setRealCases(complaintMapping(recent.data.recentComplaints));
            }

            // Fetch Support Messages (can still use supabase or backend if route exists)
            const { data: messages } = await supabase
                .from('support_messages')
                .select('*')
                .order('created_at', { ascending: false });
            if (messages) setRealMessages(messages);

            // Fetch Real Users & Officers
            const usersRes = await api.get('/admin/users');
            if (usersRes.success) setDbUsers(Array.isArray(usersRes.data) ? usersRes.data : []);

            const officersRes = await api.get('/admin/officers');
            if (officersRes.success) setDbOfficers(Array.isArray(officersRes.data) ? officersRes.data : []);

        } catch (err) {
            console.error("Backend Refresh Error", err);
        }
    };

    // Helper to map DB row to Dashboard object
    const complaintMapping = (list) => {
        return (list || []).map(c => ({
            caseId: c.complaint_number || (c.id ? `EPX-${c.id.toString().slice(-6).toUpperCase()}` : 'N/A'),
            complaint: c.title || c.description || 'N/A',
            description: c.description || 'N/A',
            category: c.category_name || c.crime_type || 'General',
            status: c.status || 'Pending',
            reportedBy: c.complainant_name || (c.is_anonymous ? 'Anonymous' : 'Citizen'),
            timestamp: c.created_at
        }));
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setAdmin(JSON.parse(storedUser));
        fetchBackendData();
    }, []);

    useEffect(() => {
        const iv = setInterval(() => setStats(p => ({ ...p, total: p.total + (Math.random() > 0.7 ? 1 : 0), resolved: p.resolved + (Math.random() > 0.8 ? 1 : 0) })), 8000);
        return () => clearInterval(iv);
    }, []);

    const handleDeleteUser = async (id) => {
        if (!window.confirm("Are you sure you want to PERMANENTLY delete this user? This cannot be undone.")) return;
        try {
            const res = await api.delete(`/admin/users/${id}`);
            if (res.success) {
                alert(res.message);
                fetchBackendData();
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const handleToggleUserStatus = async (user) => {
        try {
            const currentlyActive = user.is_active !== undefined
                ? user.is_active
                : (user.status || '').toLowerCase() === 'active';
            const action = currentlyActive ? 'deactivate' : 'activate';
            const res = await api.patch(`/admin/users/${user.id}/${action}`);
            if (res.success) {
                fetchBackendData();
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData.entries());
        try {
            const res = await api.post('/admin/users', userData);
            if (res.success) {
                setShowModal(null);
                fetchBackendData();
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const unread = notifs.filter(n => n.unread).length;
    const displayUsers = dbUsers.length > 0 ? dbUsers : mockUsers;
    const displayOfficers = dbOfficers.length > 0
        ? dbOfficers.map((o) => ({
            id: o.badge_number || o.department_id || o.id,
            name: o.full_name || o.name || 'N/A',
            division: o.station || o.district || o.division || 'General',
            activeCases: o.active_cases ?? o.activeCases ?? 0,
            status: o.is_active === false ? 'Inactive' : (o.status || 'On Duty'),
            rating: o.rating ?? '-'
        }))
        : mockOfficers;
    const filteredUsers = displayUsers.filter(u => {
        const role = u.role || 'Citizen';
        if (userFilter !== "all" && role.toLowerCase() !== userFilter) return false;
        const name = u.full_name || u.name || '';
        const id = u.department_id || u.badge_number || u.id || '';
        if (searchQ && !name.toLowerCase().includes(searchQ.toLowerCase()) && !id.toLowerCase().includes(searchQ.toLowerCase())) return false;
        return true;
    });

    const navItems = [
        { t: "label", l: "COMMAND" },
        { id: "overview", l: "System Overview", ic: <LayoutDashboard size={16} /> },
        { id: "analytics", l: "Crime Analytics", ic: <BarChart3 size={16} /> },
        { t: "label", l: "MANAGEMENT" },
        { id: "users", l: "User Management", ic: <Users size={16} />, b: displayUsers.length },
        { id: "officers", l: "Officer Control", ic: <UserCheck size={16} /> },
        { id: "complaints", l: "All Complaints", ic: <AlertCircle size={16} />, b: realCases.length || 0 },
        { id: "evidence", l: "Evidence Database", ic: <Camera size={16} /> },
        { t: "label", l: "INFRASTRUCTURE" },
        { id: "stations", l: "Police Stations", ic: <Building2 size={16} /> },
        { id: "map", l: "Crime Map", ic: <Target size={16} /> },
        { t: "label", l: "SYSTEM" },
        { id: "alerts", l: "Alerts & Logs", ic: <Bell size={16} /> },
        { id: "reports", l: "Reports & Export", ic: <BarChart3 size={16} /> },
        { id: "settings", l: "Settings", ic: <Settings size={16} /> },
    ];

    // ── SECTION RENDERERS ──
    const R = {};

    R.overview = () => {
        const o = backendStats?.overview || {};
        return (
            <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    {[
                        { l: "Total Complaints", v: o.totalComplaints || stats.total, ic: <FileText size={18} />, c: "red", t: "+3 today" },
                        { l: "Resolved Cases", v: o.resolvedCases || stats.resolved, ic: <CheckCircle2 size={18} />, c: "green", t: "62% rate" },
                        { l: "Active Investigation", v: o.activeCases || stats.active, ic: <Search size={18} />, c: "blue", t: "28 critical" },
                        { l: "Pending Review", v: o.pendingComplaints || stats.pending, ic: <Clock size={18} />, c: "amber", t: "Action needed" },
                        { l: "Officers Active", v: stats.officers, ic: <Shield size={18} />, c: "purple", t: "4 on leave" },
                        { l: "Police Stations", v: stats.stations, ic: <Building2 size={18} />, c: "blue", t: "All online" },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                            className={`glass-card ad-stat ${s.c} p-4`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{s.l}</span>
                                <span className="text-slate-600">{s.ic}</span>
                            </div>
                            <div className="text-2xl font-bold text-white">{s.v}</div>
                            <div className="text-[10px] text-slate-600 flex items-center gap-1 mt-1"><TrendingUp size={10} /> {s.t}</div>
                        </motion.div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-5 lg:col-span-2">
                        <h3 className="font-bold text-xs uppercase tracking-wider mb-4 flex items-center gap-2 text-slate-300"><BarChart3 size={14} className="text-red-400" /> Monthly Crime Trends</h3>
                        <div className="flex items-end gap-3 h-36">
                            {monthlyData.map((b, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-[9px] font-mono text-slate-600">{b.v}</span>
                                    <motion.div initial={{ height: 0 }} animate={{ height: `${(b.v / 100) * 100}%` }}
                                        transition={{ delay: 0.4 + i * 0.07, duration: 0.5 }}
                                        className="ad-chart-bar w-full" style={{ background: `linear-gradient(180deg, ${b.v > 80 ? '#ff3366' : '#00d4ff'}, ${b.v > 80 ? 'rgba(255,51,102,0.15)' : 'rgba(0,212,255,0.15)'})` }} />
                                    <span className="text-[9px] font-mono text-slate-600">{b.m}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-5">
                        <h3 className="font-bold text-xs uppercase tracking-wider mb-4 text-slate-300">Crime by Category</h3>
                        <div className="space-y-2.5">
                            {crimeByType.map((c, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                                    <span className="text-xs text-slate-400 flex-1">{c.type}</span>
                                    <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ delay: 0.5 + i * 0.08 }}
                                            className="h-full rounded-full" style={{ background: c.color }} />
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-500 w-8 text-right">{c.count}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="glass-card p-5">
                        <h3 className="font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2 text-slate-300"><AlertTriangle size={14} className="text-red-400" /> Recent Complaints</h3>
                        {realCases.length > 0 ? realCases.slice(0, 4).map((c, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-black/15 border border-white/5 mb-2 hover:border-red-400/15 transition-all cursor-pointer">
                                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold text-slate-200 truncate">{c.complaint || c.description}</div>
                                    <div className="text-[9px] text-slate-600 font-mono">{c.caseId} · {c.status} · {c.reportedBy}</div>
                                </div>
                            </div>
                        )) : <p className="text-xs text-slate-600 text-center py-6">No cases in database yet</p>}
                    </div>
                    <div className="glass-card p-5">
                        <h3 className="font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2 text-slate-300"><Target size={14} className="text-cyan-400" /> Station Overview</h3>
                        {mockStations.map((s, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-black/15 border border-white/5 mb-2">
                                <Building2 size={14} className="text-cyan-400 shrink-0" />
                                <div className="flex-1"><div className="text-xs font-semibold text-slate-300">{s.name}</div><div className="text-[9px] text-slate-600">{s.officers} officers · {s.cases} cases</div></div>
                                <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${s.status === 'High Alert' ? 'bg-red-500/15 text-red-400 border border-red-400/20' : 'bg-green-500/15 text-green-400 border border-green-400/20'}`}>{s.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    R.users = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#ff3366' }}><Users size={20} /> User Management</h2>
                <div className="flex gap-2 items-center">
                    <div className="relative"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-700" /><input value={searchQ} onChange={e => setSearchQ(e.target.value)} className="ad-input pl-7 py-1.5 w-40 text-xs" placeholder="Search..." /></div>
                    {["all", "citizen", "police", "staff"].map(f => <button key={f} onClick={() => setUserFilter(f)} className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${userFilter === f ? 'bg-red-500/15 text-red-400 border border-red-400/20' : 'bg-white/5 text-slate-600 border border-white/5'}`}>{f}</button>)}
                    <button onClick={() => setShowModal('addUser')} className="ad-btn text-xs flex items-center gap-1"><UserPlus size={13} /> Add User</button>
                </div>
            </div>
            <div className="glass-card overflow-hidden">
                <table className="ad-table">
                    <thead><tr>{["ID", "Name", "Role", "Email", "Status", "Joined", "Actions"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>{filteredUsers.map((u, i) => (
                        <tr key={i} className="cursor-pointer">
                            <td className="font-mono text-cyan-400 text-xs font-semibold">{u.department_id || u.badge_number || u.id}</td>
                            <td className="text-slate-300 font-semibold">{u.full_name || u.name}</td>
                            <td><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${((u.role || '').toLowerCase()) === 'police' ? 'bg-blue-500/15 text-blue-400 border border-blue-400/20' : ((u.role || '').toLowerCase()) === 'staff' ? 'bg-purple-500/15 text-purple-400 border border-purple-400/20' : 'bg-slate-500/15 text-slate-400 border border-slate-400/20'}`}>{u.role}</span></td>
                            <td className="text-slate-500 text-xs">{u.email}</td>
                            <td><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${(u.is_active !== undefined ? u.is_active : (u.status || '').toLowerCase() === 'active') ? 'bg-green-500/15 text-green-400 border border-green-400/20' : 'bg-red-500/15 text-red-400 border border-red-400/20'}`}>{u.is_active !== undefined ? (u.is_active ? 'Active' : 'Suspended') : u.status}</span></td>
                            <td className="text-slate-600 font-mono text-[10px]">{u.joined || (u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A')}</td>
                            <td><div className="flex gap-1">
                                <button onClick={() => handleToggleUserStatus(u)} className={`p-1.5 rounded ${(u.is_active !== undefined ? u.is_active : (u.status || '').toLowerCase() === 'active') ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'} hover:bg-opacity-20`}>
                                    {(u.is_active !== undefined ? u.is_active : (u.status || '').toLowerCase() === 'active') ? <X size={12} /> : <UserCheck size={12} />}
                                </button>
                                <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white"><Trash2 size={12} /></button>
                            </div></td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </motion.div>
    );

    R.officers = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#ff3366' }}><UserCheck size={20} /> Officer Management</h2>
                <button onClick={() => setShowModal('assign')} className="ad-btn text-xs flex items-center gap-1"><Briefcase size={13} /> Assign Case</button></div>
            <div className="glass-card overflow-hidden">
                <table className="ad-table">
                    <thead><tr>{["Badge", "Name", "Division", "Active Cases", "Status", "Rating", "Actions"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>{displayOfficers.map((o, i) => (
                        <tr key={i}>
                            <td className="font-mono text-cyan-400 text-xs font-bold">{o.id}</td>
                            <td className="text-slate-300 font-semibold">{o.name}</td>
                            <td className="text-slate-500 text-xs">{o.division}</td>
                            <td><span className="text-sm font-bold text-white">{o.activeCases}</span></td>
                            <td><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${o.status === 'On Duty' ? 'bg-green-500/15 text-green-400 border border-green-400/20' : o.status === 'On Leave' || o.status === 'Inactive' ? 'bg-amber-500/15 text-amber-400 border border-amber-400/20' : 'bg-blue-500/15 text-blue-400 border border-blue-400/20'}`}>{o.status}</span></td>
                            <td className="text-amber-400 text-xs font-bold flex items-center gap-1"><Star size={11} className="fill-amber-400" /> {o.rating}</td>
                            <td><div className="flex gap-1"><button className="p-1.5 rounded bg-white/5 text-slate-500 hover:text-white text-[9px] font-bold"><Edit3 size={12} /></button><button className="p-1.5 rounded bg-cyan-500/10 text-cyan-400 text-[9px] font-bold flex items-center gap-1" onClick={() => setShowModal('assign')}><Briefcase size={11} /></button></div></td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </motion.div>
    );

    R.complaints = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#ff3366' }}><AlertCircle size={20} /> All Complaints</h2>
                <button onClick={fetchBackendData} className="ad-btn secondary text-xs flex items-center gap-1"><RefreshCw size={13} /> Refresh</button></div>
            <div className="glass-card overflow-hidden">
                <table className="ad-table">
                    <thead><tr>{["Case ID", "Description", "Category", "Status", "Reported By", "Date"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>{realCases.length > 0 ? realCases.map((c, i) => (
                        <tr key={i}>
                            <td className="font-mono text-cyan-400 text-xs font-bold">{c.caseId}</td>
                            <td className="text-slate-300 text-xs max-w-[200px] truncate">{c.complaint || c.description}</td>
                            <td className="text-slate-500 text-xs">{c.category || 'General'}</td>
                            <td><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${c.status === 'Registered' ? 'status-pending' : c.status === 'Closed' ? 'status-resolved' : 'status-investigating'}`}>{c.status}</span></td>
                            <td className="text-slate-400 text-xs">{c.reportedBy}</td>
                            <td className="text-slate-600 font-mono text-[10px]">{c.timestamp ? new Date(c.timestamp).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                    )) : <tr><td colSpan={6} className="text-center py-8 text-slate-600">No complaints in database</td></tr>}</tbody>
                </table>
            </div>
        </motion.div>
    );

    R.analytics = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#ff3366' }}><BarChart3 size={20} /> Crime Analytics Dashboard</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Monthly Trend (7 months)</h3>
                    <div className="flex items-end gap-2 h-44">{monthlyData.map((b, i) => (<div key={i} className="flex-1 flex flex-col items-center gap-1"><span className="text-[9px] font-mono text-slate-600">{b.v}</span><motion.div initial={{ height: 0 }} animate={{ height: `${(b.v / 100) * 100}%` }} transition={{ delay: 0.2 + i * 0.08, duration: 0.5 }} className="ad-chart-bar w-full" style={{ background: `linear-gradient(180deg,${b.v > 80 ? '#ff3366' : '#00d4ff'},${b.v > 80 ? 'rgba(255,51,102,0.1)' : 'rgba(0,212,255,0.1)'})` }} /><span className="text-[9px] font-mono text-slate-600">{b.m}</span></div>))}</div>
                </div>
                <div className="glass-card p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Crime Distribution</h3>
                    <div className="space-y-3">{crimeByType.map((c, i) => (<div key={i}><div className="flex justify-between mb-1"><span className="text-xs text-slate-300">{c.type}</span><span className="text-[10px] font-mono text-slate-500">{c.count} ({c.pct}%)</span></div><div className="h-2 rounded-full bg-white/5 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${c.pct * 3}%` }} transition={{ delay: 0.3 + i * 0.1 }} className="h-full rounded-full" style={{ background: c.color }} /></div></div>))}</div>
                </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[{ l: "Avg Resolution", v: "4.2 days", c: "#00d4ff" }, { l: "Detection Rate", v: "78%", c: "#00ff88" }, { l: "Recidivism", v: "12%", c: "#ff3366" }, { l: "Response Time", v: "8 min", c: "#ffaa00" }].map((s, i) => (
                    <div key={i} className="glass-card p-4 text-center"><div className="text-2xl font-bold mb-1" style={{ color: s.c }}>{s.v}</div><div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{s.l}</div></div>
                ))}
            </div>
        </motion.div>
    );

    R.evidence = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#ff3366' }}><Camera size={20} /> Evidence Database</h2>
                <button className="ad-btn text-xs flex items-center gap-1"><Upload size={13} /> Upload</button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {["EPLX1709001", "EPLX1709002", "EPLX1709004"].map((id, i) => (
                    <div key={i} className="glass-card p-5">
                        <div className="flex items-center gap-2 mb-3"><span className="font-mono text-cyan-400 text-xs font-bold">{id}</span></div>
                        <div className="grid grid-cols-3 gap-2">{[1, 2, 3].map(j => (
                            <div key={j} className="aspect-square rounded-lg bg-black/20 border border-white/5 flex items-center justify-center hover:border-cyan-400/20 cursor-pointer transition-all">
                                {j === 1 ? <ImageIcon size={18} className="text-cyan-400" /> : j === 2 ? <Video size={18} className="text-purple-400" /> : <FileIcon size={18} className="text-amber-400" />}
                            </div>
                        ))}</div>
                        <div className="text-[9px] text-slate-600 mt-2">{2 + i} files · Chain of custody verified</div>
                    </div>
                ))}
            </div>
        </motion.div>
    );

    R.stations = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#ff3366' }}><Building2 size={20} /> Police Station Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{mockStations.map((s, i) => (
                <div key={i} className="glass-card p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-slate-200 text-sm">{s.name}</h3>
                        <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${s.status === 'High Alert' ? 'bg-red-500/15 text-red-400 border border-red-400/20' : 'bg-green-500/15 text-green-400 border border-green-400/20'}`}>{s.status}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3">{[{ l: "Officers", v: s.officers, c: "#00d4ff" }, { l: "Active Cases", v: s.cases, c: "#ff3366" }, { l: "Head", v: s.head, c: "#ffaa00" }].map((d, j) => (<div key={j} className="p-2 rounded-lg bg-black/15 text-center"><div className="text-sm font-bold" style={{ color: d.c }}>{d.v}</div><div className="text-[8px] text-slate-600 uppercase">{d.l}</div></div>))}</div>
                    <div className="text-[9px] text-slate-600 font-mono">ID: {s.id} · Last audit: 2026-03-01</div>
                </div>
            ))}</div>
        </motion.div>
    );

    R.map = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#ff3366' }}><Target size={20} /> Interactive Crime Map</h2>
                <span className="shimmer-bar px-2 py-0.5 rounded text-[8px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 uppercase">Live</span></div>
            <div className="glass-card p-5"><div className="ad-map" style={{ height: 380 }}><div className="ad-map-grid" />
                {mapPins.map((p, i) => (<div key={i} className="ad-map-pin" style={{ top: `${p.top}%`, left: `${p.left}%`, background: p.color, color: p.color, boxShadow: `0 0 12px ${p.color}` }}><div className="absolute top-4 left-4 whitespace-nowrap bg-black/85 px-2 py-1 rounded text-[8px] font-semibold border" style={{ color: p.color, borderColor: p.color, opacity: 0.8 }}>{p.label}</div></div>))}
            </div></div>
        </motion.div>
    );

    R.alerts = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#ff3366' }}><Bell size={20} /> System Alerts & Logs</h2>
            <div className="glass-card p-5 space-y-2">{notifs.map(n => (
                <div key={n.id} className={`p-3 rounded-lg text-sm flex items-start gap-3 ${n.unread ? 'bg-red-500/5 border border-red-400/10' : 'bg-black/15 border border-white/5'}`}>
                    <AlertTriangle size={14} className={`shrink-0 mt-0.5 ${n.unread ? 'text-red-400' : 'text-slate-600'}`} />
                    <div className="flex-1"><p className={n.unread ? 'text-slate-200 text-xs' : 'text-slate-500 text-xs'}>{n.msg}</p><span className="text-[9px] text-slate-600">{n.time}</span></div>
                </div>
            ))}</div>
            <div className="glass-card p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Support Messages</h3>
                {realMessages.length > 0 ? realMessages.slice(0, 3).map((m, i) => (
                    <div key={i} className="p-3 rounded-lg bg-black/15 border border-white/5 mb-2">
                        <div className="flex items-center gap-2 mb-1"><Mail size={12} className="text-red-400" /><span className="text-xs font-bold text-slate-300">{m.subject || 'Support'}</span><span className="text-[9px] text-slate-600 ml-auto">{m.name}</span></div>
                        <p className="text-xs text-slate-500 italic">"{m.message}"</p>
                    </div>
                )) : <p className="text-xs text-slate-600 text-center py-4">No support messages</p>}
            </div>
        </motion.div>
    );

    R.reports = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#ff3366' }}><BarChart3 size={20} /> Report Generation & Export</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[
                { t: "Monthly Crime Report", d: "Complete crime statistics for March 2026", f: "PDF" },
                { t: "Case Resolution Summary", d: "Resolved vs pending case analysis", f: "XLSX" },
                { t: "Officer Performance", d: "Individual officer metrics and ratings", f: "PDF" },
                { t: "Evidence Audit Trail", d: "Chain of custody verification logs", f: "CSV" },
                { t: "Station Comparison", d: "Cross-station performance benchmarks", f: "PDF" },
                { t: "Citizen Complaint Analysis", d: "Trend analysis of citizen reports", f: "XLSX" },
            ].map((r, i) => (
                <div key={i} className="glass-card p-5 flex flex-col">
                    <h3 className="font-bold text-sm text-slate-200 mb-1">{r.t}</h3>
                    <p className="text-[10px] text-slate-500 mb-4 flex-1">{r.d}</p>
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-slate-600 uppercase">{r.f}</span>
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold border border-red-400/20 hover:bg-red-500/20 transition-all"><Download size={12} /> Export</button>
                    </div>
                </div>
            ))}</div>
        </motion.div>
    );

    R.settings = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#ff3366' }}><Settings size={20} /> System Settings & Security</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2"><Lock size={13} /> Security Controls</h3>
                    {[{ l: "Two-Factor Authentication", v: true }, { l: "Session Timeout (30 min)", v: true }, { l: "IP Whitelisting", v: false }, { l: "Audit Logging", v: true }, { l: "Data Encryption (AES-256)", v: true }].map((s, i) => (
                        <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/5">
                            <span className="text-sm text-slate-300">{s.l}</span>
                            <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-all ${s.v ? 'bg-green-500/30' : 'bg-white/10'}`}><div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${s.v ? 'right-0.5 bg-green-400' : 'left-0.5 bg-slate-600'}`} /></div>
                        </div>
                    ))}
                </div>
                <div className="glass-card p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2"><Settings size={13} /> System Info</h3>
                    {[{ l: "Platform", v: "E-POLIX v2.4.1" }, { l: "Server", v: "Node.js + MongoDB" }, { l: "Uptime", v: "99.97% (30 days)" }, { l: "Last Backup", v: "2026-03-07 06:00 IST" }, { l: "API Status", v: "All endpoints healthy" }, { l: "SSL Certificate", v: "Valid until 2027-01-15" }].map((s, i) => (
                        <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/5">
                            <span className="text-xs text-slate-500">{s.l}</span>
                            <span className="text-xs text-slate-300 font-mono">{s.v}</span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );

    const renderContent = () => (R[tab] ? R[tab]() : R.overview());

    return (
        <div className="min-h-screen grid-bg" style={{ background: "var(--dark-bg)" }}>
            {/* SIDEBAR */}
            <aside className={`ad-sidebar ${sideOpen ? "open" : ""}`}>
                <div className="ad-sidebar-header">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center" style={{ boxShadow: '0 0 15px rgba(255,51,102,0.3)' }}>
                        <Shield size={16} className="text-white" />
                    </div>
                    <div><div className="text-sm font-bold text-white tracking-tight">E‑POLIX</div><div className="text-[7px] uppercase tracking-[0.2em] text-red-400 font-bold">Admin Control</div></div>
                </div>
                <nav className="ad-sidebar-nav">
                    {navItems.map((n, i) => n.t === "label" ? (
                        <div key={i} className="ad-nav-label">{n.l}</div>
                    ) : (
                        <button key={i} onClick={() => { setTab(n.id); setSideOpen(false); }}
                            className={`ad-nav-btn ${tab === n.id ? "active" : ""}`}>
                            {n.ic} <span>{n.l}</span>
                            {n.b > 0 && <span className="ad-badge bg-red-500/20 text-red-400 border border-red-400/30">{n.b}</span>}
                        </button>
                    ))}
                </nav>
                <div className="p-2.5 border-t border-white/5">
                    <div className="flex items-center gap-2.5 px-2.5 py-2 mb-1.5">
                        <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center text-red-400 border border-red-400/15"><User size={13} /></div>
                        <div><div className="text-[11px] font-bold text-slate-300">{admin.fullName}</div><div className="text-[8px] text-slate-600">{admin.adminId || admin.email}</div></div>
                    </div>
                    <button onClick={() => { localStorage.clear(); navigate("/"); }} className="ad-nav-btn text-red-400 hover:bg-red-500/10 w-full"><LogOut size={15} /> Sign Out</button>
                </div>
            </aside>

            {/* MAIN */}
            <div className="ad-main">
                <div className="ad-topbar">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSideOpen(!sideOpen)} className="lg:hidden text-slate-400"><Menu size={20} /></button>
                        <div><h1 className="text-sm font-bold text-white">Administrative Control Center</h1><p className="text-[9px] text-slate-600">E-POLIX System Administrator · <Lock size={8} className="inline" /> Classified Access</p></div>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-500 font-mono text-xs"><Clock size={12} className="text-red-400 animate-pulse" />{new Date().toLocaleTimeString()}</div>
                        <div className="relative">
                            <button onClick={() => setShowNotif(!showNotif)} className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white relative"><Bell size={16} />
                                {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[8px] text-white flex items-center justify-center font-bold" style={{ boxShadow: '0 0 8px rgba(255,51,102,0.5)' }}>{unread}</span>}
                            </button>
                            <AnimatePresence>{showNotif && (
                                <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} className="absolute right-0 top-11 w-72 glass-card p-3 z-50 border border-red-400/15">
                                    <h4 className="font-bold text-xs text-white mb-2">System Notifications</h4>
                                    <div className="space-y-1.5 max-h-52 overflow-y-auto">{notifs.map(n => (
                                        <div key={n.id} className={`p-2 rounded text-[11px] ${n.unread ? 'bg-red-500/5 border border-red-400/10' : 'bg-black/15 border border-white/5'}`}>
                                            <p className={n.unread ? 'text-slate-200' : 'text-slate-500'}>{n.msg}</p><span className="text-[9px] text-slate-600">{n.time}</span>
                                        </div>
                                    ))}</div>
                                </motion.div>
                            )}</AnimatePresence>
                        </div>
                    </div>
                </div>
                <div className="p-4 sm:p-5">
                    <AnimatePresence mode="wait">
                        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {showModal === 'addUser' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ad-modal-overlay" onClick={() => setShowModal(null)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="ad-modal" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5"><h2 className="font-bold text-white flex items-center gap-2"><UserPlus size={18} className="text-red-400" /> Add New User</h2><button onClick={() => setShowModal(null)} className="text-slate-500 hover:text-white"><X size={18} /></button></div>
                            <form onSubmit={handleCreateUser} className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Full Name</label><input name="full_name" required className="ad-input" /></div>
                                    <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Aadhaar (Citizen Only)</label><input name="aadhaar" className="ad-input" maxLength={12} /></div>
                                </div>
                                <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Email</label><input name="email" required className="ad-input" type="email" /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Role</label>
                                        <select name="role" className="ad-input">
                                            <option value="citizen">Citizen</option>
                                            <option value="police">Police Officer</option>
                                            <option value="staff">Staff</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Phone</label><input name="phone" required className="ad-input" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Badge Number (Police)</label><input name="badge_number" className="ad-input" /></div>
                                    <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Department ID</label><input name="department_id" className="ad-input" /></div>
                                </div>
                                <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Temporary Password</label><input name="password" required className="ad-input" type="password" /></div>
                                <button type="submit" className="ad-btn w-full mt-2 flex items-center justify-center gap-2"><Send size={14} /> Create User</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
                {showModal === 'assign' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ad-modal-overlay" onClick={() => setShowModal(null)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="ad-modal" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5"><h2 className="font-bold text-white flex items-center gap-2"><Briefcase size={18} className="text-cyan-400" /> Assign Case to Officer</h2><button onClick={() => setShowModal(null)} className="text-slate-500 hover:text-white"><X size={18} /></button></div>
                            <div className="space-y-3">
                                <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Case ID</label><input className="ad-input font-mono" placeholder="EPLX..." /></div>
                                <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Assign to Officer</label><select className="ad-input">{mockOfficers.filter(o => o.status !== 'On Leave').map(o => <option key={o.id}>{o.name} ({o.id}) – {o.activeCases} cases</option>)}</select></div>
                                <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Priority</label><select className="ad-input"><option>Medium</option><option>High</option><option>Critical</option><option>Low</option></select></div>
                                <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Notes</label><textarea rows={2} className="ad-input resize-none" placeholder="Assignment instructions..." /></div>
                                <button className="ad-btn w-full flex items-center justify-center gap-2"><Send size={14} /> Assign Case</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
