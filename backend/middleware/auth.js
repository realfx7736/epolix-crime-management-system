const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { supabase } = require('../config/supabase');

// ─── Role-to-table mapping ──────────────────────────────────────────────────
const ROLE_TABLE_MAP = {
    citizen: 'users',
    police: 'police_officers',
    staff: 'staff_members',
    admin: 'admin_users',
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

        const role = decoded.role || 'citizen';
        const table = ROLE_TABLE_MAP[role] || 'users';

        // Fetch fresh user from correct table
        const { data: user, error } = await supabase
            .from(table)
            .select('*')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            throw ApiError.unauthorized('User not found or token invalid.');
        }

        // Block inactive or locked accounts
        if (user.is_active === false) {
            throw ApiError.forbidden('Account deactivated. Contact administrator.');
        }
        if (user.is_locked === true || user.locked_until && new Date(user.locked_until) > new Date()) {
            throw ApiError.forbidden('Account temporarily locked due to repeated failed login attempts.');
        }

        req.user = {
            id: user.id,
            fullName: user.full_name || user.fullName,
            email: user.email,
            phone: user.phone,
            role: role,
            policeId: user.police_id,
            staffId: user.staff_id,
            adminId: user.admin_id,
            rank: user.rank,
            station: user.station,
            isVerified: user.is_verified,
            department: user.department,
        };

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
        const role = decoded.role || 'citizen';
        const table = ROLE_TABLE_MAP[role] || 'users';

        const { data: user } = await supabase
            .from(table)
            .select('id, email, role: ${ role }')
            .eq('id', decoded.userId)
            .single();

        req.user = user ? { id: user.id, email: user.email, role } : null;
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
const validateAadhaar = (num) => /^\d{12}$/.test(num.replace(/\s|-/g, ''));

module.exports = {
    authenticate,
    optionalAuth,
    validatePoliceId,
    validateStaffId,
    validateAdminId,
    validateAadhaar,
};
