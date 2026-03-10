const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const ApiError = require('../utils/ApiError');
const { supabase } = require('../config/supabase');

// ─── Role-to-table mapping ──────────────────────────────────────────────────
const ROLE_TABLE_MAP = {
    citizen: 'users',
    police: 'police_officers',
    staff: 'staff_members',
    admin: 'admin_users',
    super_admin: 'admin_users',
};

const LOCAL_DB_PATH = path.join(__dirname, '../data/local_db.json');

const isMissingRelationError = (error) => {
    if (!error) return false;
    const raw = `${error.code || ''} ${error.message || ''} ${error.details || ''}`.toLowerCase();
    return (
        raw.includes('does not exist') ||
        raw.includes('relation') ||
        raw.includes('could not find the table') ||
        raw.includes('pgrst205')
    );
};

const isSupabaseUnavailable = (error) => {
    if (!error) return false;
    const raw = `${error.code || ''} ${error.message || ''} ${error.details || ''}`.toLowerCase();
    return (
        raw.includes('fetch failed') ||
        raw.includes('failed to fetch') ||
        raw.includes('network') ||
        raw.includes('econnrefused') ||
        raw.includes('getaddrinfo') ||
        raw.includes('socket') ||
        raw.includes('timeout') ||
        raw.includes('api key') ||
        raw.includes('jwt malformed')
    );
};

const isLocalAuthEnabled = () => process.env.NODE_ENV !== 'production';

const normalizeRoleForLookup = (role) => {
    if (role === 'super_admin') return 'admin';
    return role || 'citizen';
};

const resolveEffectiveRole = (decodedRole, dbUser) => {
    if (decodedRole === 'super_admin') return 'super_admin';
    if ((dbUser?.role || '').toLowerCase() === 'super_admin') return 'super_admin';
    return decodedRole || dbUser?.role || 'citizen';
};

const mapAuthUser = (user, role) => ({
    id: user.id,
    fullName: user.full_name || user.fullName,
    email: user.email,
    phone: user.phone,
    role,
    policeId: user.police_id || user.department_id || user.badge_number,
    staffId: user.staff_id || user.department_id,
    adminId: user.admin_id || user.department_id,
    rank: user.rank,
    station: user.station,
    isVerified: user.is_verified,
    department: user.department || user.department_name || user.station,
});

const loadLocalDb = () => {
    try {
        if (!fs.existsSync(LOCAL_DB_PATH)) return { users: [] };
        const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
        const parsed = JSON.parse(raw || '{}');
        return { users: Array.isArray(parsed.users) ? parsed.users : [] };
    } catch {
        return { users: [] };
    }
};

const mapLocalUser = (localUser) => ({
    id: localUser._id || localUser.id,
    full_name: localUser.name || 'Local User',
    email: localUser.email || null,
    phone: localUser.phone || null,
    role: localUser.role || 'citizen',
    department_id: localUser.deptId || null,
    badge_number: localUser.deptId || null,
    police_id: localUser.role === 'police' ? localUser.deptId || null : null,
    staff_id: localUser.role === 'staff' ? localUser.deptId || null : null,
    admin_id: (localUser.role === 'admin' || localUser.role === 'super_admin') ? localUser.deptId || null : null,
    rank: localUser.rank || null,
    station: localUser.station || null,
    is_verified: localUser.verified !== false,
    is_active: localUser.active !== false,
    is_locked: false,
    locked_until: null,
});

const findLocalUserById = (role, userId) => {
    if (!isLocalAuthEnabled()) return null;
    const normalizedRole = normalizeRoleForLookup(role);
    const db = loadLocalDb();

    const localUser = db.users.find((candidate) => {
        const idMatch = String(candidate._id || candidate.id || '') === String(userId);
        if (!idMatch) return false;

        const candidateRole = (candidate.role || '').toLowerCase();
        if (normalizedRole === 'admin') {
            return candidateRole === 'admin' || candidateRole === 'super_admin';
        }
        return candidateRole === normalizedRole;
    });

    return localUser ? mapLocalUser(localUser) : null;
};

const fetchUserByRole = async (role, userId) => {
    const normalizedRole = normalizeRoleForLookup(role);
    const roleTable = ROLE_TABLE_MAP[role] || ROLE_TABLE_MAP[normalizedRole] || 'users';

    // Citizens are always sourced from users.
    if (normalizedRole === 'citizen') {
        const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
        if (!data && isLocalAuthEnabled() && (!error || isSupabaseUnavailable(error) || isMissingRelationError(error))) {
            const localUser = findLocalUserById(role, userId);
            if (localUser) return { user: localUser, error: null };
        }
        return { user: data, error };
    }

    // Try role-specific table first (legacy split-schema support).
    const roleSpecific = await supabase.from(roleTable).select('*').eq('id', userId).single();
    if (roleSpecific.data) {
        return { user: roleSpecific.data, error: null };
    }

    // If role table is missing or user not found there, fall back to unified users table.
    if (isMissingRelationError(roleSpecific.error) || roleSpecific.error) {
        const unified = await supabase.from('users').select('*').eq('id', userId).single();
        if (!unified.data && isLocalAuthEnabled() && (!unified.error || isSupabaseUnavailable(unified.error) || isMissingRelationError(unified.error))) {
            const localUser = findLocalUserById(role, userId);
            if (localUser) return { user: localUser, error: null };
        }
        return { user: unified.data, error: unified.error || roleSpecific.error };
    }

    if (isLocalAuthEnabled()) {
        const localUser = findLocalUserById(role, userId);
        if (localUser) return { user: localUser, error: null };
    }

    return { user: null, error: roleSpecific.error };
};

// ─── Verify JWT and load fresh user ─────────────────────────────────────────
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw ApiError.unauthorized('Access token required. Please log in.');
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const { user, error } = await fetchUserByRole(decoded.role, decoded.userId);
        if (error || !user) {
            throw ApiError.unauthorized('User not found or token invalid.');
        }

        // Block inactive or locked accounts
        if (user.is_active === false) {
            throw ApiError.forbidden('Account deactivated. Contact administrator.');
        }
        if (user.is_locked === true || (user.locked_until && new Date(user.locked_until) > new Date())) {
            throw ApiError.forbidden('Account temporarily locked due to repeated failed login attempts.');
        }

        req.user = mapAuthUser(user, resolveEffectiveRole(decoded.role, user));
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(ApiError.unauthorized('Session expired. Please log in again.'));
        }
        if (err.name === 'JsonWebTokenError') {
            return next(ApiError.unauthorized('Invalid token. Please log in again.'));
        }
        next(err);
    }
};

// ─── Optional auth (doesn't fail if token absent) ───────────────────────────
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.user = null;
            return next();
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
            id: decoded.userId,
            email: decoded.email || null,
            role: decoded.role || 'citizen'
        };
        next();
    } catch {
        req.user = null;
        next();
    }
};

// ─── Strict ID format validators ────────────────────────────────────────────
const validatePoliceId = (id) => /^OFF-\d{3,6}$/.test(id);
const validateStaffId = (id) => /^STF-\d{3,6}$/.test(id);
const validateAdminId = (id) => /^ADM-[A-Z]{2}-\d{4}-\d{4}$/.test(id);
const validateAadhaar = (num) => /^\d{12}$/.test((num || '').replace(/\s|-/g, ''));

module.exports = {
    authenticate,
    optionalAuth,
    validatePoliceId,
    validateStaffId,
    validateAdminId,
    validateAadhaar,
};
