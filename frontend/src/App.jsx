import React, { useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import UserDashboard from "./dashboards/UserDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";
import PoliceDashboard from "./dashboards/PoliceDashboard";
import StaffDashboard from "./dashboards/StaffDashboard";
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

// ─── Protected Route — uses AuthContext (not raw localStorage) ────────────────
// This prevents the race condition where localStorage is written but React
// state hasn't updated yet, causing an immediate redirect back to login.
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, user, loading } = useAuth();
    const location = useLocation();

    // Wait for session hydration before deciding
    if (loading) {
        return (
            <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Verifying session...</p>
                </div>
            </div>
        );
    }

    // Not authenticated → redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role mismatch → redirect to correct dashboard
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        const roleRoutes = {
            citizen: '/user',
            police: '/police',
            staff: '/staff',
            admin: '/admin',
            super_admin: '/admin',
        };
        const correctRoute = roleRoutes[user.role] || '/';
        return <Navigate to={correctRoute} replace />;
    }

    return children;
};

// ─── Auto Logout on Inactivity ────────────────────────────────────────────────
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const useAutoLogout = () => {
    const navigate = useNavigate();
    const { isAuthenticated, logout } = useAuth();

    const handleLogout = useCallback(() => {
        logout('expired');
    }, [logout]);

    useEffect(() => {
        // Only activate auto-logout if authenticated
        if (!isAuthenticated) return;

        let timeout;

        const resetTimer = () => {
            clearTimeout(timeout);
            timeout = setTimeout(handleLogout, INACTIVITY_TIMEOUT_MS);
        };

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, resetTimer));
        resetTimer();

        return () => {
            events.forEach(e => window.removeEventListener(e, resetTimer));
            clearTimeout(timeout);
        };
    }, [isAuthenticated, handleLogout]);
};

// ─── Inner App (uses hooks that require Router + AuthProvider context) ─────────
const AppInner = () => {
    useAutoLogout();

    return (
        <Routes>
            {/* ── Public Routes ── */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* ── Citizen Dashboard ── */}
            <Route
                path="/user"
                element={
                    <ProtectedRoute allowedRoles={['citizen']}>
                        <UserDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/citizen/home"
                element={
                    <ProtectedRoute allowedRoles={['citizen']}>
                        <UserDashboard />
                    </ProtectedRoute>
                }
            />

            {/* ── Admin Dashboard ── */}
            <Route
                path="/admin"
                element={
                    <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                        <AdminDashboard />
                    </ProtectedRoute>
                }
            />

            {/* ── Police Dashboard ── */}
            <Route
                path="/police"
                element={
                    <ProtectedRoute allowedRoles={['police']}>
                        <PoliceDashboard />
                    </ProtectedRoute>
                }
            />

            {/* ── Staff Dashboard ── */}
            <Route
                path="/staff"
                element={
                    <ProtectedRoute allowedRoles={['staff']}>
                        <StaffDashboard />
                    </ProtectedRoute>
                }
            />

            {/* ── Catch-all → Home ── */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
                <AppInner />
            </AuthProvider>
        </BrowserRouter>
    );
}
