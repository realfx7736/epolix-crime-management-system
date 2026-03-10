import React, { useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import UserDashboard from "./dashboards/UserDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";
import PoliceDashboard from "./dashboards/PoliceDashboard";
import StaffDashboard from "./dashboards/StaffDashboard";
import './index.css';

// ─── JWT token validation (check expiry without library) ─────────────────────
const isTokenExpired = (token) => {
    try {
        const payloadSegment = token.split('.')[1] || '';
        const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        const payload = JSON.parse(atob(padded));
        return payload.exp * 1000 < Date.now();
    } catch {
        return true;
    }
};

// ─── Protected Route with token expiry check ──────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const location = useLocation();

    // No token or user data
    if (!token || !userStr) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Token expired
    if (isTokenExpired(token)) {
        localStorage.clear();
        return <Navigate to="/login?session=expired" replace />;
    }

    let user;
    try {
        user = JSON.parse(userStr);
    } catch {
        localStorage.clear();
        return <Navigate to="/login" replace />;
    }

    // Role mismatch
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to correct dashboard
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

    const logout = useCallback(() => {
        localStorage.clear();
        navigate('/login?session=expired', { replace: true });
    }, [navigate]);

    useEffect(() => {
        // Only activate auto-logout if authenticated
        const token = localStorage.getItem('token');
        if (!token) return;

        let timeout;

        const resetTimer = () => {
            clearTimeout(timeout);
            timeout = setTimeout(logout, INACTIVITY_TIMEOUT_MS);
        };

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, resetTimer));
        resetTimer();

        return () => {
            events.forEach(e => window.removeEventListener(e, resetTimer));
            clearTimeout(timeout);
        };
    }, [logout]);
};

// ─── Inner App (uses hooks that require Router context) ───────────────────────
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
            <AppInner />
        </BrowserRouter>
    );
}
