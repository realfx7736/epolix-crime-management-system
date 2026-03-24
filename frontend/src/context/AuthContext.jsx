import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext(null);

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

// ─── JWT helpers ────────────────────────────────────────────────────────────
export const parseJwt = (token) => {
    try {
        const seg = token.split('.')[1] || '';
        const b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
        return JSON.parse(atob(padded));
    } catch { return null; }
};

export const isTokenExpired = (token) => {
    const payload = parseJwt(token);
    if (!payload?.exp) return true;
    // Consider token expired if it expires within the next 30 seconds
    // (prevents race conditions where the token expires mid-request)
    return payload.exp * 1000 < Date.now() + 30_000;
};

// Returns true if a token is still valid (not expired)
export const isTokenValid = (token) => !!token && !isTokenExpired(token);

// ─── Storage helpers ─────────────────────────────────────────────────────────
const STORAGE_KEYS = {
    accessToken: 'epolix_token',
    refreshToken: 'epolix_refresh',
    user: 'epolix_user',
};

const storage = {
    getToken: () => localStorage.getItem(STORAGE_KEYS.accessToken) || localStorage.getItem('token'),
    getRefresh: () => localStorage.getItem(STORAGE_KEYS.refreshToken),
    getUser: () => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || localStorage.getItem('user'));
        } catch { return null; }
    },
    setSession: (accessToken, refreshToken, user) => {
        // Write to ALL storage keys for full backward-compat coverage
        localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
        localStorage.setItem('token', accessToken);                    // legacy compat
        if (refreshToken) localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
        if (user) {
            const userStr = JSON.stringify(user);
            localStorage.setItem(STORAGE_KEYS.user, userStr);
            localStorage.setItem('user', userStr);                     // legacy compat
        }
    },
    clear: () => {
        Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
        // Also clean old keys for backward compatibility
        ['token', 'user'].forEach(k => localStorage.removeItem(k));
    },
};

// ─── AuthProvider ─────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true); // true until initial hydration done
    const refreshTimerRef = useRef(null);
    const isRefreshingRef = useRef(false);

    // ─── Schedule silent refresh 2 min before token expiry ──────────────────
    const scheduleRefresh = useCallback((accessToken, refreshFn) => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        const payload = parseJwt(accessToken);
        if (!payload?.exp) return;
        const expiresInMs = payload.exp * 1000 - Date.now();
        // Refresh 2 minutes before expiry, minimum 30 seconds from now
        const refreshAt = Math.max(expiresInMs - 2 * 60 * 1000, 30_000);
        refreshTimerRef.current = setTimeout(() => refreshFn && refreshFn(), refreshAt);
        console.log(`[Auth] Token valid for ${Math.round(expiresInMs / 60000)}min. Refresh scheduled in ${Math.round(refreshAt / 60000)}min.`);
    }, []);

    // ─── Logout ──────────────────────────────────────────────────────────────
    const logout = useCallback((reason = 'logout') => {
        console.log(`[Auth] Logging out. Reason: ${reason}`);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        storage.clear();
        setUser(null);
        setToken(null);
        if (reason === 'expired') {
            // Only redirect if NOT already on login page to avoid reload loops
            if (window.location.pathname !== '/login') {
                window.location.replace('/login?session=expired');
            }
        }
    }, []);

    // ─── Refresh access token silently ──────────────────────────────────────
    const silentRefresh = useCallback(async (isHydrating = false) => {
        if (isRefreshingRef.current) return;
        const refreshToken = storage.getRefresh();
        if (!refreshToken) {
            console.warn('[Auth] No refresh token. Cannot silent refresh.');
            if (!isHydrating) logout('expired');
            return;
        }

        isRefreshingRef.current = true;
        console.log('[Auth] Attempting silent token refresh...');
        try {
            const res = await fetch(`${API_BASE}/auth/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });
            const data = await res.json();
            if (data.success && data.accessToken) {
                const currentUser = storage.getUser();
                storage.setSession(data.accessToken, data.refreshToken || refreshToken, currentUser);
                setToken(data.accessToken);
                console.log('[Auth] Silent refresh successful. New token stored.');
                scheduleRefresh(data.accessToken, silentRefresh);
            } else {
                console.warn('[Auth] Refresh failed:', data.error);
                if (isHydrating) {
                    storage.clear(); // Just clear quietly
                    setToken(null);
                    setUser(null);
                } else {
                    logout('expired');
                }
            }
        } catch (err) {
            console.error('[Auth] Refresh network error:', err.message);
            // Network error — keep existing token if still valid
            const existingToken = storage.getToken();
            if (existingToken && !isTokenExpired(existingToken)) {
                console.log('[Auth] Keeping existing valid token despite refresh error.');
                scheduleRefresh(existingToken, silentRefresh);
            } else {
                if (isHydrating) {
                    storage.clear();
                    setToken(null);
                    setUser(null);
                } else {
                    logout('expired');
                }
            }
        } finally {
            isRefreshingRef.current = false;
        }
    }, [logout, scheduleRefresh]); // eslint-disable-line

    // ─── Login — THE SINGLE SOURCE OF TRUTH for establishing a session ───────
    // Called after successful OTP verification from any login page.
    // This MUST be called (not raw localStorage writes) to ensure React state
    // is updated synchronously, preventing ProtectedRoute race conditions.
    const login = useCallback((accessToken, refreshTokenStr, userData) => {
        const payload = parseJwt(accessToken);
        const expiryTime = payload?.exp
            ? new Date(payload.exp * 1000).toLocaleTimeString()
            : 'unknown';
        const expiresInMin = payload?.exp
            ? Math.round((payload.exp * 1000 - Date.now()) / 60000)
            : 0;

        console.log('[Auth] ✅ login() called. Establishing session.', {
            role: userData?.role,
            userId: userData?.id,
            tokenExpiry: expiryTime,
            expiresInMinutes: expiresInMin,
            hasRefreshToken: !!refreshTokenStr,
        });

        if (expiresInMin <= 0) {
            console.error('[Auth] ❌ CRITICAL: Access token is already expired! Check JWT_EXPIRY in backend .env');
        }

        // 1. Persist to storage first (so page reload restores session)
        storage.setSession(accessToken, refreshTokenStr, userData);

        // 2. Update React state synchronously so ProtectedRoute sees isAuthenticated = true
        //    before navigation occurs. React batches these but they're applied before next render.
        setToken(accessToken);
        setUser(userData);

        // 3. Schedule auto-refresh 2 minutes before expiry
        scheduleRefresh(accessToken, silentRefresh);

        console.log('[Auth] Session stored. isAuthenticated will be true on next render.');
    }, [scheduleRefresh, silentRefresh]);

    // ─── Hydrate session on mount ─────────────────────────────────────────────
    useEffect(() => {
        const savedToken = storage.getToken();
        const savedUser = storage.getUser();

        console.log('[Auth] Hydrating session from storage...', {
            hasToken: !!savedToken,
            hasUser: !!savedUser,
        });

        if (savedToken && savedUser) {
            if (!isTokenExpired(savedToken)) {
                console.log('[Auth] Valid token found. Restoring session.');
                setToken(savedToken);
                setUser(savedUser);
                scheduleRefresh(savedToken, silentRefresh);
                setLoading(false);
            } else {
                console.log('[Auth] Stored token is expired. Attempting silent refresh...');
                const refreshToken = storage.getRefresh();
                if (refreshToken) {
                    silentRefresh(true).finally(() => setLoading(false));
                } else {
                    console.warn('[Auth] No refresh token. Clearing session.');
                    storage.clear();
                    setLoading(false);
                }
            }
        } else {
            console.log('[Auth] No saved session found.');
            setLoading(false);
        }

        return () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        };
    }, []); // eslint-disable-line

    // ─── Computed state ───────────────────────────────────────────────────────
    // isAuthenticated uses React state (token), NOT localStorage, to prevent
    // race conditions where localStorage is written but state hasn't updated yet.
    const isAuthenticated = Boolean(token && user && !isTokenExpired(token));

    const value = {
        user,
        token,
        isAuthenticated,
        loading,
        login,
        logout,
        silentRefresh,
        storage, // expose for advanced use
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ─── useAuth hook ─────────────────────────────────────────────────────────────
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
};

export default AuthContext;
