import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield, ClipboardList, Database, Search, Bell, ChevronRight, Clock, FileText,
    Activity, Lock, LogOut, Menu, X, User, Upload, Camera, Download, CheckCircle2,
    Edit3, Trash2, Eye, Send, AlertCircle, AlertTriangle, TrendingUp, BarChart3,
    Briefcase, Layers, Hash, Filter, RefreshCw, PlusCircle, Printer, History,
    Image as ImageIcon, Video, FileIcon, MapPin, ChevronDown, Star, Zap,
    UserCheck, Building2, Mail, Phone, Fingerprint
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./StaffDashboard.css";

const complaints = [
    { id: "EPLX1709001", title: "Mobile Snatching", type: "Theft", status: "Pending Verification", date: "2026-03-05", citizen: "Arjun Mehta", location: "Sector 14", desc: "Phone snatched near metro station", verified: false },
    { id: "EPLX1709002", title: "Online Banking Fraud", type: "Cybercrime", status: "Verified", date: "2026-02-28", citizen: "Priya Singh", location: "Online", desc: "₹3.2L lost via phishing", verified: true },
    { id: "EPLX1709003", title: "Shop Vandalism", type: "Vandalism", status: "FIR Filed", date: "2026-02-15", citizen: "Rahul Verma", location: "CP Block C", desc: "Glass shattered during protest", verified: true },
    { id: "EPLX1709004", title: "Document Forgery", type: "Fraud", status: "Pending Verification", date: "2026-03-01", citizen: "Meena Devi", location: "Saket Court", desc: "Forged property documents", verified: false },
    { id: "EPLX1709005", title: "Drug Possession", type: "Narcotics", status: "Case Filed", date: "2026-03-06", citizen: "Patrol B7", location: "Nehru Place", desc: "Narcotics found during vehicle check", verified: true },
];

const caseFiles = [
    { id: "CF-2026-001", caseId: "EPLX1709001", fir: "FIR-2026/1244", status: "Active", officer: "SI Vikram R.", docs: 3, evidence: 2, lastUpdated: "2026-03-06" },
    { id: "CF-2026-002", caseId: "EPLX1709002", fir: "FIR-2026/1238", status: "Active", officer: "SI Priya S.", docs: 5, evidence: 4, lastUpdated: "2026-03-05" },
    { id: "CF-2026-003", caseId: "EPLX1709003", fir: "FIR-2026/1190", status: "Closed", officer: "SI Anil V.", docs: 4, evidence: 3, lastUpdated: "2026-02-28" },
];

const storedDocs = [
    { name: "FIR_1244_Signed.pdf", case: "EPLX1709001", type: "FIR", size: "1.2MB", date: "2026-03-05", access: "Restricted" },
    { name: "Witness_Statement_01.pdf", case: "EPLX1709002", type: "Statement", size: "450KB", date: "2026-03-03", access: "Classified" },
    { name: "CCTV_Evidence_CP.mp4", case: "EPLX1709003", type: "Evidence", size: "84MB", date: "2026-02-20", access: "Restricted" },
    { name: "Forensic_Report.pdf", case: "EPLX1709002", type: "Report", size: "2.8MB", date: "2026-03-04", access: "Top Secret" },
    { name: "Property_Docs_Fake.pdf", case: "EPLX1709004", type: "Evidence", size: "3.1MB", date: "2026-03-02", access: "Restricted" },
];

const notifs = [
    { id: 1, msg: "New complaint EPLX1709004 awaiting verification", time: "8 min ago", unread: true },
    { id: 2, msg: "FIR-2026/1244 approved and signed", time: "30 min ago", unread: true },
    { id: 3, msg: "Citizen Arjun Mehta notified about case update", time: "2h ago", unread: false },
    { id: 4, msg: "Evidence upload completed for CF-2026-002", time: "4h ago", unread: false },
];

const StaffDashboard = () => {
    const navigate = useNavigate();
    const auth = useAuth();
    const [tab, setTab] = useState("overview");
    const [sideOpen, setSideOpen] = useState(false);
    const [showNotif, setShowNotif] = useState(false);
    const [showModal, setShowModal] = useState(null);
    const [searchQ, setSearchQ] = useState("");
    const [compList, setCompList] = useState(complaints);
    const [stats, setStats] = useState({ total: 48, pending: 12, verified: 28, fir: 8, filed: 36 });
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    // Staff Info
    const [staff, setStaff] = useState({ fullName: "Staff Sita R.", staffId: "STF-901", department: "Data Entry & Case Processing", role: "Clerk" });

    const [dbComplaints, setDbComplaints] = useState([]);
    const [dbCaseFiles, setDbCaseFiles] = useState([]);
    const [dbNotifications, setDbNotifications] = useState([]);

    const fetchStaffData = async () => {
        setIsLoading(true);
        setErrorMsg("");
        try {
            // Fetch All Complaints
            const compRes = await api.get('/complaints').catch(err => ({ success: false, error: err }));
            if (compRes.success && compRes.data) {
                const complaintsList = Array.isArray(compRes.data) ? compRes.data : [];
                setDbComplaints(mapComplaints(complaintsList));
                setStats(prev => ({
                    ...prev,
                    total: compRes.pagination?.total || complaintsList.length,
                    pending: complaintsList.filter(c => c.status === 'submitted').length,
                    verified: complaintsList.filter(c => c.status === 'verified').length
                }));
            }

            // Fetch Case Files
            const casesRes = await api.get('/cases').catch(err => ({ success: false, error: err }));
            if (casesRes.success && casesRes.data) {
                const caseList = Array.isArray(casesRes.data) ? casesRes.data : [];
                setDbCaseFiles(mapCaseFiles(caseList));
                setStats(prev => ({
                    ...prev,
                    filed: casesRes.pagination?.total || caseList.length
                }));
            }

            // Fetch Notifications
            const notifsRes = await api.get('/notifications').catch(err => ({ success: false, error: err }));
            if (notifsRes.success && notifsRes.data) {
                setDbNotifications(Array.isArray(notifsRes.data) ? notifsRes.data : []);
            }

        } catch (err) {
            console.error("Staff Dashboard Refresh Error", err);
            setErrorMsg("Terminal synchronization failed. Check local network.");
        } finally {
            setIsLoading(false);
        }
    };

    const mapComplaints = (list) => {
        return (list || []).map(c => ({
            id: c.complaint_number,
            realId: c.id,
            title: c.title,
            type: c.category_name || 'General',
            status: mapStatus(c.status),
            date: new Date(c.created_at).toLocaleDateString(),
            citizen: c.complainant?.full_name || 'Citizen',
            location: c.location || 'Unknown',
            desc: c.description,
            verified: c.status !== 'submitted'
        }));
    };

    const mapCaseFiles = (list) => {
        return (list || []).map(c => ({
            id: `CF-${c.case_number?.split('-').pop()}`,
            caseId: c.case_number,
            fir: c.fir_number || 'Pending',
            status: c.status === 'open' ? 'Active' : c.status === 'closed' ? 'Closed' : 'Active',
            officer: c.officer?.full_name || c.assigned_officer?.full_name || 'Unassigned',
            docs: 0,
            evidence: 0,
            lastUpdated: new Date(c.updated_at).toLocaleDateString()
        }));
    };

    const mapStatus = (s) => {
        const normalized = (s || '').toString().toLowerCase();
        const map = {
            'submitted': 'Pending Verification',
            'under_review': 'Under Review',
            'verified': 'Verified',
            'investigation': 'Investigation',
            'resolved': 'Resolved',
            'closed': 'Closed',
            'rejected': 'Rejected',
            'escalated': 'Escalated'
        };
        return map[normalized] || s || 'Pending Verification';
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setStaff(JSON.parse(storedUser));
        fetchStaffData();

        const iv = setInterval(fetchStaffData, 30000);
        return () => clearInterval(iv);
    }, []);

    const unread = (dbNotifications.length > 0 ? dbNotifications : notifs).filter(n => n.unread || n.is_read === false).length;
    const statusBadge = (s) => {
        const status = (s || '').toString().toLowerCase();
        if (status.includes("pending") || status === 'submitted' || status === 'under review') return "bg-amber-500/15 text-amber-400 border border-amber-400/20";
        if (status === "verified") return "bg-cyan-500/15 text-cyan-400 border border-cyan-400/20";
        if (status === "investigation" || status === "under investigation") return "bg-blue-500/15 text-blue-400 border border-blue-400/20";
        if (status === "resolved" || status === "closed") return "bg-green-500/15 text-green-400 border border-green-400/20";
        if (status === "rejected") return "bg-red-500/15 text-red-400 border border-red-400/20";
        if (status === "active") return "bg-cyan-500/15 text-cyan-400 border border-cyan-400/20";
        return "bg-slate-500/15 text-slate-400 border border-slate-400/20";
    };
    const accessBadge = (a) => {
        if (a === "Top Secret") return "bg-red-500/15 text-red-400 border border-red-400/20";
        if (a === "Classified") return "bg-purple-500/15 text-purple-400 border border-purple-400/20";
        return "bg-amber-500/15 text-amber-400 border border-amber-400/20";
    };

    const navItems = [
        { t: "label", l: "WORKSPACE" },
        { id: "overview", l: "Dashboard", ic: <Activity size={16} /> },
        { id: "entry", l: "Complaint Entry", ic: <PlusCircle size={16} />, b: stats.pending },
        { id: "verify", l: "Verification", ic: <CheckCircle2 size={16} /> },
        { t: "label", l: "CASE MANAGEMENT" },
        { id: "cases", l: "Case Files", ic: <Briefcase size={16} /> },
        { id: "fir", l: "FIR Documentation", ic: <FileText size={16} /> },
        { id: "evidence", l: "Evidence Upload", ic: <Camera size={16} /> },
        { id: "status", l: "Status Updates", ic: <RefreshCw size={16} /> },
        { t: "label", l: "COMMUNICATIONS" },
        { id: "notify", l: "Citizen Notifications", ic: <Bell size={16} /> },
        { id: "search", l: "Record Search", ic: <Search size={16} /> },
        { t: "label", l: "RECORDS" },
        { id: "reports", l: "Report Generation", ic: <BarChart3 size={16} /> },
        { id: "storage", l: "Secure Storage", ic: <Lock size={16} /> },
    ];

    // ── RENDERERS ──
    const R = {};

    R.overview = () => (
        <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                    { l: "Total Complaints", v: stats.total, c: "emerald", ic: <FileText size={17} /> },
                    { l: "Pending Verify", v: stats.pending, c: "amber", ic: <Clock size={17} /> },
                    { l: "Verified", v: stats.verified, c: "blue", ic: <CheckCircle2 size={17} /> },
                    { l: "FIRs Drafted", v: stats.fir, c: "red", ic: <Briefcase size={17} /> },
                    { l: "Cases Filed", v: stats.filed, c: "emerald", ic: <Layers size={17} /> },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className={`glass-card sd-stat ${s.c} p-4`}>
                        <div className="flex items-center justify-between mb-2"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{s.l}</span><span className="text-slate-600">{s.ic}</span></div>
                        <div className="text-2xl font-bold text-white">{s.v}</div>
                    </motion.div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                    <h3 className="font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2 text-slate-300"><AlertCircle size={14} className="text-amber-400" /> Pending Verification</h3>
                    {dbComplaints.filter(c => !c.verified).map((c, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-black/15 border border-white/5 mb-2 hover:border-emerald-400/15 transition-all">
                            <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                            <div className="flex-1 min-w-0"><div className="text-xs font-semibold text-slate-200 truncate">{c.title} — {c.citizen}</div><div className="text-[9px] text-slate-600 font-mono">{c.id} · {c.date}</div></div>
                            <button onClick={async () => {
                                try {
                                    await api.patch(`/complaints/${c.realId}`, { status: 'verified' });
                                    fetchStaffData();
                                } catch (err) { alert(err.message); }
                            }} className="px-2 py-1 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-500/20">Verify</button>
                        </div>
                    ))}
                    {dbComplaints.filter(c => !c.verified).length === 0 && <p className="text-xs text-slate-600 text-center py-4">All complaints verified ✓</p>}
                </div>
                <div className="glass-card p-5">
                    <h3 className="font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2 text-slate-300"><Briefcase size={14} className="text-cyan-400" /> Active Case Files</h3>
                    {(dbCaseFiles.length > 0 ? dbCaseFiles : caseFiles).filter(c => c.status === "Active").map((c, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-black/15 border border-white/5 mb-2">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                            <div className="flex-1 min-w-0"><div className="text-xs font-semibold text-slate-200">{c.id} · {c.caseId}</div><div className="text-[9px] text-slate-600">Officer: {c.officer} · {c.docs} docs · {c.evidence} evidence</div></div>
                            <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${statusBadge(c.status)}`}>{c.status}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="glass-card p-5 mt-4">
                <h3 className="font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2 text-slate-300"><Bell size={14} className="text-red-400" /> Recent Activity</h3>
                <div className="space-y-2">{(dbNotifications.length > 0 ? dbNotifications : notifs).map(n => (
                    <div key={n.id} className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${n.is_read === false || n.unread ? 'bg-emerald-500/5 border border-emerald-400/10' : 'bg-black/15 border border-white/5'}`}>
                        <Activity size={12} className={`shrink-0 mt-0.5 ${n.is_read === false || n.unread ? 'text-emerald-400' : 'text-slate-600'}`} />
                        <div className="flex-1"><p className={n.is_read === false || n.unread ? 'text-slate-200' : 'text-slate-500'}>{n.message || n.msg}</p><span className="text-[9px] text-slate-600">{n.time || new Date(n.created_at).toLocaleTimeString()}</span></div>
                    </div>
                ))}</div>
            </div>
        </div>
    );

    R.entry = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold flex items-center gap-2 text-emerald-400"><PlusCircle size={20} /> Complaint Entry</h2>
                <button onClick={() => setShowModal('newComplaint')} className="sd-btn text-xs flex items-center gap-1"><PlusCircle size={13} /> New Entry</button></div>
            <div className="glass-card overflow-hidden">
                <table className="sd-table"><thead><tr>{["ID", "Title", "Type", "Citizen", "Location", "Date", "Status", "Action"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>{(dbComplaints.length > 0 ? dbComplaints : compList).map((c, i) => (
                        <tr key={i}>
                            <td className="font-mono text-cyan-400 text-xs font-bold">{c.id}</td>
                            <td className="text-slate-300 font-semibold">{c.title}</td>
                            <td className="text-slate-500">{c.type}</td>
                            <td className="text-slate-400">{c.citizen}</td>
                            <td className="text-slate-500">{c.location}</td>
                            <td className="text-slate-600 font-mono text-[10px]">{c.date}</td>
                            <td><span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${statusBadge(c.status)}`}>{c.status}</span></td>
                            <td><div className="flex gap-1">
                                <button className="p-1.5 rounded bg-white/5 text-slate-500 hover:text-white" onClick={() => setShowModal({ type: 'editComplaint', data: c })}><Edit3 size={11} /></button>
                                <button className="p-1.5 rounded bg-white/5 text-slate-500 hover:text-white"><Eye size={11} /></button>
                            </div></td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </motion.div>
    );

    R.verify = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-400"><CheckCircle2 size={20} /> Complaint Verification</h2>
            {(dbComplaints.length > 0 ? dbComplaints : compList).map((c, i) => (
                <div key={i} className="glass-card p-5 flex items-start gap-4">
                    <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${c.verified ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap"><span className="font-mono text-cyan-400 text-xs font-bold">{c.id}</span><span className="font-semibold text-sm text-slate-200">{c.title}</span><span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${statusBadge(c.status)}`}>{c.status}</span></div>
                        <p className="text-xs text-slate-500 mb-2">"{c.desc}" — {c.citizen}, {c.location}, {c.date}</p>
                        <div className="flex gap-2">
                            {!c.verified && <button onClick={async () => {
                                try {
                                    await api.patch(`/complaints/${c.realId}`, { status: 'verified' });
                                    fetchStaffData();
                                } catch (err) { alert(err.message); }
                            }} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-500/20 flex items-center gap-1"><CheckCircle2 size={12} /> Verify</button>}
                            {!c.verified && <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-400/20 hover:bg-red-500/20 flex items-center gap-1"><X size={12} /> Reject</button>}
                            {c.verified && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> Verified</span>}
                        </div>
                    </div>
                </div>
            ))}
        </motion.div>
    );

    R.cases = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-400"><Briefcase size={20} /> Case File Management</h2>
            <div className="glass-card overflow-hidden">
                <table className="sd-table"><thead><tr>{["File ID", "Case ID", "FIR", "Officer", "Status", "Docs", "Evidence", "Updated"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>{(dbCaseFiles.length > 0 ? dbCaseFiles : caseFiles).map((c, i) => (
                        <tr key={i} className="cursor-pointer">
                            <td className="font-mono text-emerald-400 text-xs font-bold">{c.id}</td>
                            <td className="font-mono text-cyan-400 text-xs">{c.caseId}</td>
                            <td className="font-mono text-amber-400 text-[10px]">{c.fir}</td>
                            <td className="text-slate-300">{c.officer}</td>
                            <td><span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${statusBadge(c.status)}`}>{c.status}</span></td>
                            <td className="text-slate-400 text-center">{c.docs}</td>
                            <td className="text-slate-400 text-center">{c.evidence}</td>
                            <td className="text-slate-600 font-mono text-[10px]">{c.lastUpdated}</td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </motion.div>
    );

    R.fir = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold flex items-center gap-2 text-emerald-400"><FileText size={20} /> FIR Documentation</h2>
                <button onClick={() => setShowModal('newFIR')} className="sd-btn text-xs flex items-center gap-1"><PlusCircle size={13} /> Draft FIR</button></div>
            <div className="glass-card overflow-hidden">
                <table className="sd-table"><thead><tr>{["FIR No.", "Case ID", "Type", "Complainant", "Date", "Status"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>{compList.filter(c => c.verified).map((c, i) => (
                        <tr key={i}>
                            <td className="font-mono text-amber-400 text-xs font-bold">FIR-2026/{1190 + i * 6}</td>
                            <td className="font-mono text-cyan-400 text-xs">{c.id}</td>
                            <td className="text-slate-400">{c.type}</td>
                            <td className="text-slate-300">{c.citizen}</td>
                            <td className="text-slate-600 font-mono text-[10px]">{c.date}</td>
                            <td><span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-400/20">Filed</span></td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </motion.div>
    );

    R.evidence = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold flex items-center gap-2 text-emerald-400"><Camera size={20} /> Evidence Upload</h2>
                <button onClick={() => setShowModal('uploadEvidence')} className="sd-btn text-xs flex items-center gap-1"><Upload size={13} /> Upload</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(dbCaseFiles.length > 0 ? dbCaseFiles : caseFiles).map((c, i) => (
                    <div key={i} className="glass-card p-5">
                        <div className="flex items-center gap-2 mb-3"><span className="font-mono text-cyan-400 text-xs font-bold">{c.caseId}</span><span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${statusBadge(c.status)}`}>{c.status}</span></div>
                        <div className="grid grid-cols-3 gap-2 mb-2">{[ImageIcon, Video, FileIcon].map((Ic, j) => (<div key={j} className="aspect-square rounded-lg bg-black/20 border border-white/5 flex items-center justify-center hover:border-emerald-400/20 cursor-pointer transition-all"><Ic size={18} className={j === 0 ? 'text-cyan-400' : j === 1 ? 'text-purple-400' : 'text-amber-400'} /></div>))}</div>
                        <div className="text-[9px] text-slate-600">{c.evidence} evidence files · {c.docs} documents</div>
                    </div>
                ))}
            </div>
        </motion.div>
    );

    R.status = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-400"><RefreshCw size={20} /> Case Status Updates</h2>
            {compList.map((c, i) => (
                <div key={i} className="glass-card p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-cyan-400 text-xs font-bold">{c.id}</span><span className="text-sm font-semibold text-slate-200">{c.title}</span></div>
                        <div className="text-[10px] text-slate-600 mt-0.5">{c.citizen} · {c.location}</div>
                    </div>
                    <select className="sd-input w-44" value={c.status} onChange={e => setCompList(prev => prev.map(x => x.id === c.id ? { ...x, status: e.target.value } : x))}>
                        {["Pending Verification", "Verified", "FIR Filed", "Case Filed", "Under Investigation", "Resolved"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            ))}
        </motion.div>
    );

    R.notify = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-400"><Mail size={20} /> Citizen Notification Panel</h2>
            <div className="glass-card p-5">
                <div className="space-y-3">
                    <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Citizen / Case ID</label><input className="sd-input" placeholder="Search citizen or case..." /></div>
                    <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Notification Type</label><select className="sd-input"><option>Case Status Update</option><option>FIR Filed Confirmation</option><option>Evidence Received</option><option>Case Resolved</option><option>General Alert</option></select></div>
                    <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Message</label><textarea rows={3} className="sd-input resize-none" placeholder="Type notification message..." /></div>
                    <button className="sd-btn flex items-center gap-2"><Send size={14} /> Send Notification</button>
                </div>
            </div>
            <div className="glass-card p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Sent Notifications</h3>
                {[{ to: "Arjun Mehta", msg: "Your case EPLX1709001 has been assigned to SI Vikram", time: "2h ago" }, { to: "Priya Singh", msg: "New evidence has been added to your case", time: "4h ago" }, { to: "Rahul Verma", msg: "Case EPLX1709003 has been resolved", time: "Yesterday" }].map((n, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-black/15 border border-white/5 mb-2 flex items-start gap-2">
                        <Send size={11} className="text-emerald-400 mt-0.5 shrink-0" />
                        <div><span className="text-xs font-semibold text-slate-200">{n.to}</span><p className="text-[10px] text-slate-500">{n.msg}</p><span className="text-[9px] text-slate-600">{n.time}</span></div>
                    </div>
                ))}
            </div>
        </motion.div>
    );

    R.search = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-400"><Search size={20} /> Crime Record Search</h2>
            <div className="glass-card p-5">
                <div className="flex gap-3 mb-4">
                    <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" /><input value={searchQ} onChange={e => setSearchQ(e.target.value)} className="sd-input pl-8" placeholder="Search by case ID, name, type, location..." /></div>
                    <button className="sd-btn flex items-center gap-1"><Search size={14} /> Search</button>
                </div>
                {searchQ && <div>
                    <div className="text-[10px] text-slate-500 mb-2">{compList.filter(c => c.id.toLowerCase().includes(searchQ.toLowerCase()) || c.title.toLowerCase().includes(searchQ.toLowerCase()) || c.citizen.toLowerCase().includes(searchQ.toLowerCase())).length} results found</div>
                    {compList.filter(c => c.id.toLowerCase().includes(searchQ.toLowerCase()) || c.title.toLowerCase().includes(searchQ.toLowerCase()) || c.citizen.toLowerCase().includes(searchQ.toLowerCase())).map((c, i) => (
                        <div key={i} className="p-3 rounded-lg bg-black/15 border border-white/5 mb-2 flex items-center gap-3">
                            <div className="flex-1"><div className="text-xs font-semibold text-slate-200">{c.title}</div><div className="text-[9px] text-slate-600 font-mono">{c.id} · {c.type} · {c.citizen} · {c.location}</div></div>
                            <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${statusBadge(c.status)}`}>{c.status}</span>
                        </div>
                    ))}
                </div>}
            </div>
        </motion.div>
    );

    R.reports = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-400"><BarChart3 size={20} /> Report Generation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[
                { t: "Daily Complaint Summary", d: "All complaints received today", f: "PDF" }, { t: "Verification Report", d: "Pending vs verified complaints", f: "XLSX" },
                { t: "FIR Status Report", d: "Filed FIRs and their progress", f: "PDF" }, { t: "Evidence Audit Log", d: "Chain of custody records", f: "CSV" },
                { t: "Case Resolution Stats", d: "Monthly resolution metrics", f: "PDF" }, { t: "Staff Activity Report", d: "Individual staff performance", f: "XLSX" },
            ].map((r, i) => (
                <div key={i} className="glass-card p-5 flex flex-col">
                    <h3 className="font-bold text-sm text-slate-200 mb-1">{r.t}</h3>
                    <p className="text-[10px] text-slate-500 mb-3 flex-1">{r.d}</p>
                    <div className="flex items-center justify-between"><span className="text-[9px] font-mono text-slate-600 uppercase">{r.f}</span>
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-400/20 hover:bg-emerald-500/20"><Download size={12} /> Generate</button>
                    </div>
                </div>
            ))}</div>
        </motion.div>
    );

    R.storage = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-400"><Lock size={20} /> Secure Document Storage</h2>
            <div className="glass-card overflow-hidden">
                <table className="sd-table"><thead><tr>{["Document", "Case", "Type", "Size", "Date", "Access Level", "Actions"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>{storedDocs.map((d, i) => (
                        <tr key={i}>
                            <td className="text-slate-300 font-semibold flex items-center gap-2">{d.name.endsWith('.mp4') ? <Video size={13} className="text-purple-400" /> : d.name.endsWith('.pdf') ? <FileText size={13} className="text-red-400" /> : <FileIcon size={13} className="text-cyan-400" />} {d.name}</td>
                            <td className="font-mono text-cyan-400 text-xs">{d.case}</td>
                            <td className="text-slate-500">{d.type}</td>
                            <td className="text-slate-600 font-mono text-[10px]">{d.size}</td>
                            <td className="text-slate-600 font-mono text-[10px]">{d.date}</td>
                            <td><span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${accessBadge(d.access)}`}>{d.access}</span></td>
                            <td><div className="flex gap-1"><button className="p-1.5 rounded bg-white/5 text-slate-500 hover:text-white"><Eye size={11} /></button><button className="p-1.5 rounded bg-white/5 text-slate-500 hover:text-white"><Download size={11} /></button></div></td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </motion.div>
    );

    const renderContent = () => (R[tab] ? R[tab]() : R.overview());

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="sd-loader-circle w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                    <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold animate-pulse">Syncing Staff Records...</p>
                </div>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-6">
                <div className="glass-card p-8 max-w-md w-full text-center border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto mb-6 border border-emerald-500/20">
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Terminal Offline</h2>
                    <p className="text-slate-400 text-sm mb-6">{errorMsg}</p>
                    <button onClick={fetchStaffData} className="sd-btn bg-emerald-600 hover:bg-emerald-500 w-full py-3 flex items-center justify-center gap-2">
                        <RefreshCw size={16} /> Retry Uplink
                    </button>
                    <button onClick={() => navigate('/')} className="mt-4 text-[10px] uppercase tracking-widest font-bold text-slate-600 hover:text-slate-400">
                        Exit to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen grid-bg" style={{ background: "var(--dark-bg)" }}>
            <aside className={`sd-sidebar ${sideOpen ? "open" : ""}`}>
                <div className="sd-sidebar-header">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center" style={{ boxShadow: '0 0 15px rgba(16,185,129,0.3)' }}><Shield size={16} className="text-white" /></div>
                    <div><div className="text-sm font-bold text-white tracking-tight">E‑POLIX</div><div className="text-[7px] uppercase tracking-[0.2em] text-emerald-400 font-bold">Staff Terminal</div></div>
                </div>
                <nav className="sd-sidebar-nav">
                    {navItems.map((n, i) => n.t === "label" ? (<div key={i} className="sd-nav-label">{n.l}</div>) : (
                        <button key={i} onClick={() => { setTab(n.id); setSideOpen(false) }} className={`sd-nav-btn ${tab === n.id ? "active" : ""}`}>
                            {n.ic} <span>{n.l}</span>
                            {n.b > 0 && <span className="sd-badge bg-amber-500/20 text-amber-400 border border-amber-400/30">{n.b}</span>}
                        </button>
                    ))}
                </nav>
                <div className="p-2.5 border-t border-white/5">
                    <div className="flex items-center gap-2.5 px-2.5 py-2 mb-1.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 border border-emerald-400/15"><User size={13} /></div>
                        <div><div className="text-[11px] font-bold text-slate-300">{staff.fullName}</div><div className="text-[8px] text-slate-600">ID: {staff.staffId}</div></div>
                    </div>
                </div>
                <div className="p-3 border-t border-white/5">
                    <button onClick={() => { auth.logout(); navigate("/"); }} className="sd-nav-item w-full text-red-400 hover:bg-red-500/10 hover:text-red-400">
                        <LogOut size={18} /> Sign Out
                    </button>
                </div>
            </aside>

            <div className="sd-main">
                <div className="sd-topbar">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSideOpen(!sideOpen)} className="lg:hidden text-slate-400"><Menu size={20} /></button>
                        <div><h1 className="text-sm font-bold text-white">Staff Workspace</h1><p className="text-[9px] text-slate-600">{staff.department} · {staff.role} · <Lock size={8} className="inline" /> Terminal Online</p></div>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-500 font-mono text-xs"><Clock size={12} className="text-emerald-400 animate-pulse" />{new Date().toLocaleTimeString()}</div>
                        <div className="relative">
                            <button onClick={() => setShowNotif(!showNotif)} className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white relative"><Bell size={16} />
                                {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-[8px] text-white flex items-center justify-center font-bold" style={{ boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}>{unread}</span>}
                            </button>
                            <AnimatePresence>{showNotif && (
                                <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} className="absolute right-0 top-11 w-72 glass-card p-3 z-50 border border-emerald-400/15">
                                    <h4 className="font-bold text-xs text-white mb-2">Notifications</h4>
                                    <div className="space-y-1.5 max-h-52 overflow-y-auto">{notifs.map(n => (
                                        <div key={n.id} className={`p-2 rounded text-[11px] ${n.unread ? 'bg-emerald-500/5 border border-emerald-400/10' : 'bg-black/15 border border-white/5'}`}>
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
                {showModal === 'newComplaint' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sd-modal-overlay" onClick={() => setShowModal(null)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="sd-modal" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5"><h2 className="font-bold text-white flex items-center gap-2"><PlusCircle size={18} className="text-emerald-400" /> New Complaint Entry</h2><button onClick={() => setShowModal(null)} className="text-slate-500 hover:text-white"><X size={18} /></button></div>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Citizen Name</label><input className="sd-input" /></div><div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Contact</label><input className="sd-input" /></div></div>
                                <div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Crime Type</label><select className="sd-input"><option>Theft</option><option>Assault</option><option>Fraud</option><option>Cybercrime</option><option>Vandalism</option><option>Narcotics</option><option>Other</option></select></div><div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Location</label><input className="sd-input" /></div></div>
                                <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Description</label><textarea rows={3} className="sd-input resize-none" /></div>
                                <button className="sd-btn w-full flex items-center justify-center gap-2"><Send size={14} /> Submit Complaint</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
                {showModal === 'newFIR' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sd-modal-overlay" onClick={() => setShowModal(null)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="sd-modal" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5"><h2 className="font-bold text-white flex items-center gap-2"><FileText size={18} className="text-amber-400" /> Draft New FIR</h2><button onClick={() => setShowModal(null)} className="text-slate-500 hover:text-white"><X size={18} /></button></div>
                            <div className="space-y-3">
                                <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Case ID</label><input className="sd-input font-mono" placeholder="EPLX..." /></div>
                                <div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Complainant</label><input className="sd-input" /></div><div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Date & Time</label><input type="datetime-local" className="sd-input" /></div></div>
                                <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Incident Details</label><textarea rows={3} className="sd-input resize-none" /></div>
                                <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Sections Applied</label><input className="sd-input" placeholder="IPC Sections..." /></div>
                                <button className="sd-btn w-full flex items-center justify-center gap-2"><Send size={14} /> File FIR</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
                {showModal === 'uploadEvidence' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sd-modal-overlay" onClick={() => setShowModal(null)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="sd-modal" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5"><h2 className="font-bold text-white flex items-center gap-2"><Upload size={18} className="text-purple-400" /> Upload Evidence</h2><button onClick={() => setShowModal(null)} className="text-slate-500 hover:text-white"><X size={18} /></button></div>
                            <div className="space-y-3">
                                <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Case ID</label><input className="sd-input font-mono" placeholder="EPLX..." /></div>
                                <div className="border-2 border-dashed border-emerald-400/15 rounded-xl p-6 text-center hover:border-emerald-400/30 transition-all cursor-pointer" onClick={() => document.getElementById('staff-evidence-input').click()}>
                                    <Camera size={28} className="mx-auto text-purple-400 mb-2" /><p className="text-sm text-slate-300">Click to browse evidence files</p><p className="text-[9px] text-slate-600">Images, videos, PDFs, audio</p>
                                    <input id="staff-evidence-input" type="file" className="hidden" />
                                </div>
                                <div><label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Chain of Custody Notes</label><textarea rows={2} className="sd-input resize-none" /></div>
                                <button className="sd-btn w-full flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}><Upload size={14} /> Submit Evidence</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StaffDashboard;
