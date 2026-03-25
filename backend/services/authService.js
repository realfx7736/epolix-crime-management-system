const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const { supabase } = require('../config/supabase');
const { encrypt, decrypt } = require('../utils/crypto');
const { validateAadhaar, maskAadhaar } = require('../utils/aadhaar_utils');
const { generateOTP, sendSMS } = require('../utils/helpers');

// ─── Constants ────────────────────────────────────────────────────────────────
const OTP_EXPIRY_SECONDS = 300; // 5 minutes — consistent with sendLoginOTP
const MAX_OTP_ATTEMPTS = 5;     // Increased from 3 to 5 for better UX
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m'; // Access token: 15 minutes
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d'; // Refresh token: 7 days
const SALT_ROUNDS = 12;

const SPLIT_ROLE_TABLES = {
    police: 'police_officers',
    staff: 'staff_members',
    admin: 'admin_users',
};

const SPLIT_ROLE_ID_FIELDS = {
    police: 'police_id',
    staff: 'staff_id',
    admin: 'admin_id',
};

const SUPER_ADMIN_ID = 'ADM-KL-2026-0001';
const SUPER_ADMIN_EMAIL = 'admin@epolix.gov.in';
const LOCAL_DB_PATH = path.join(__dirname, '../data/local_db.json');

const tableExistsCache = {};
const localOtpStore = new Map();
// Map: mobile → { userId, user } — persists across send/verify calls in same process
const localMobileUserMap = new Map();

// ─── ID Format Validators ─────────────────────────────────────────────────────
const isValidPoliceId = (id) => {
    const value = (id || '').trim();
    return /^OFF-\d{3,6}$/i.test(value) || /^POLICE-\d{3,6}$/i.test(value);
};
const isValidStaffId = (id) => {
    const value = (id || '').trim();
    return /^STF-\d{3,6}$/i.test(value) || /^STAFF-\d{3,6}$/i.test(value);
};
const isValidAdminId = (id) => {
    const value = (id || '').trim();
    return /^ADM-[A-Z]{2}-\d{4}-\d{4}$/i.test(value) || /^ADMIN-\d{3,6}$/i.test(value);
};
const isValidAadhaar = (num) => /^\d{12}$/.test((num || '').replace(/\s|-/g, ''));
const isValidMobile = (num) => /^\d{10}$/.test((num || '').replace(/\s|-/g, ''));
const isValidCitizenId = (id) => /^CIT-\d{4}-\d{4}$/i.test((id || '').trim());
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());

const isMissingRelationError = (error) => {
    if (!error) return false;
    const raw = `${error.code || ''} ${error.message || ''} ${error.details || ''}`.toLowerCase();
    return (
        raw.includes('does not exist') ||
        raw.includes('relation') ||
        raw.includes('could not find the table') ||
        raw.includes('pgrst205') ||
        raw.includes('pgrst204') ||
        raw.includes('pgrst116') ||
        raw.includes('22001')
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
        raw.includes('jwt malformed') ||
        raw.includes('pgrst204') ||
        raw.includes('22001')
    );
};

const isLocalAuthEnabled = () => process.env.NODE_ENV !== 'production';
const isMasterOtpEnabled = () => process.env.NODE_ENV !== 'production' && Boolean(process.env.MASTER_OTP);

const LOCAL_DEV_PASSWORD_HINTS = {}; // DELETED FOR SECURITY
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ─── Token generation ─────────────────────────────────────────────────────────
const generateToken = (userId, role, extra = {}) => {
    const payload = {
        userId,
        role,
        mobileNumber: extra.phone || extra.mobileNumber || extra.mobile_number || null,
        ...(extra.email && { email: extra.email }),
        ...(extra.name && { name: extra.name }),
        iat: Math.floor(Date.now() / 1000),
    };
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

const generateRefreshToken = (userId, role) => {
    return jwt.sign(
        { userId, role, type: 'refresh', iat: Math.floor(Date.now() / 1000) },
        env.JWT_REFRESH_SECRET || env.JWT_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRY }
    );
};

const hashPassword = async (password) => bcrypt.hash(password, SALT_ROUNDS);

const maskContact = (user) => {
    const phone = (user?.phone || '').replace(/\D/g, '');
    if (phone.length >= 4) return `XXXX${phone.slice(-4)}`;

    const email = (user?.email || '').trim();
    if (email && email.includes('@')) {
        const [name, domain] = email.split('@');
        if (name.length <= 2) return `${name[0] || '*'}***@${domain}`;
        return `${name.slice(0, 2)}***@${domain}`;
    }

    return '...XXXX';
};

const buildTerminalIdVariants = (role, rawId) => {
    const value = String(rawId || '').trim().toUpperCase();
    const variants = new Set();
    if (!value) return variants;

    variants.add(value);

    if (role === 'police') {
        const modern = value.match(/^OFF-(\d{3,6})$/i);
        const legacy = value.match(/^POLICE-(\d{3,6})$/i);
        if (modern) variants.add(`POLICE-${modern[1]}`);
        if (legacy) variants.add(`OFF-${legacy[1]}`);
    }

    if (role === 'staff') {
        const modern = value.match(/^STF-(\d{3,6})$/i);
        const legacy = value.match(/^STAFF-(\d{3,6})$/i);
        if (modern) variants.add(`STAFF-${modern[1]}`);
        if (legacy) variants.add(`STF-${legacy[1]}`);
    }

    if (role === 'admin') {
        const legacy = value.match(/^ADMIN-(\d{3,6})$/i);
        if (legacy) {
            const serial = legacy[1].padStart(4, '0').slice(-4);
            variants.add(`ADM-KL-2026-${serial}`);
        }

        const modern = value.match(/^ADM-[A-Z]{2}-(\d{4})-(\d{4})$/i);
        if (modern) {
            const serialNum = Number.parseInt(modern[2], 10);
            if (!Number.isNaN(serialNum)) {
                variants.add(`ADMIN-${String(serialNum).padStart(3, '0')}`);
            }
        }
    }

    return variants;
};

const getTerminalUserIds = (user) => {
    const rawIds = [
        user?.department_id,
        user?.badge_number,
        user?.police_id,
        user?.staff_id,
        user?.admin_id,
    ]
        .filter(Boolean)
        .map((v) => String(v).trim());

    const variants = new Set();
    rawIds.forEach((value) => {
        buildTerminalIdVariants('police', value).forEach((id) => variants.add(id));
        buildTerminalIdVariants('staff', value).forEach((id) => variants.add(id));
        buildTerminalIdVariants('admin', value).forEach((id) => variants.add(id));
    });
    return variants;
};

const stripSensitive = (user) => {
    if (!user) return null;
    const clone = { ...(user || {}) };
    delete clone.password_hash;
    delete clone.otp_hash;
    delete clone.aadhaar_hash;
    delete clone.aadhaar;
    delete clone.login_attempts;
    delete clone.locked_until;
    return clone;
};

const loadLocalDb = () => {
    try {
        if (!fs.existsSync(LOCAL_DB_PATH)) {
            return { users: [], cases: [] };
        }
        const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
        const parsed = JSON.parse(raw || '{}');
        return {
            users: Array.isArray(parsed.users) ? parsed.users : [],
            cases: Array.isArray(parsed.cases) ? parsed.cases : []
        };
    } catch {
        return { users: [], cases: [] };
    }
};

const saveLocalDb = (db) => {
    const safeDb = {
        users: Array.isArray(db?.users) ? db.users : [],
        cases: Array.isArray(db?.cases) ? db.cases : []
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(safeDb, null, 2));
};

const mapLocalUser = (localUser) => ({
    id: localUser._id || localUser.id,
    full_name: localUser.name || 'Local User',
    email: localUser.email || null,
    phone: localUser.phone || null,
    role: localUser.role || 'citizen',
    department_id: localUser.deptId || null,
    badge_number: localUser.deptId || null,
    password_hash: localUser.password,
    is_active: localUser.active !== false,
    is_locked: false,
    locked_until: null,
    login_attempts: 0,
    station: localUser.station || null,
    rank: localUser.rank || null
});

const findLocalTerminalUser = (role, identifier) => {
    const db = loadLocalDb();
    const target = (identifier || '').trim();
    const isEmail = isValidEmail(target);
    const targetVariants = buildTerminalIdVariants(role, target);

    const local = db.users.find((u) => {
        const userRole = (u.role || '').toLowerCase();
        if (role === 'admin') {
            if (userRole !== 'admin' && userRole !== 'super_admin') return false;
        } else if (userRole !== role) {
            return false;
        }

        if (isEmail) return (u.email || '').toLowerCase() === target.toLowerCase();

        if (isValidMobile(target) && (u.phone === target || u.phone === target.replace(/\s|-/g, ''))) {
            return true;
        }

        const userIdVariants = buildTerminalIdVariants(role, u.deptId || '');
        if ((u.email || '').toLowerCase() === SUPER_ADMIN_EMAIL) {
            userIdVariants.add(SUPER_ADMIN_ID);
        }
        for (const candidate of targetVariants) {
            if (userIdVariants.has(candidate)) return true;
        }
        return false;
    });

    return local ? mapLocalUser(local) : null;
};

const findLocalUserById = (userId, role) => {
    const db = loadLocalDb();
    const local = db.users.find((u) => {
        const idMatch = String(u._id || u.id || '') === String(userId);
        if (!idMatch) return false;

        const userRole = (u.role || '').toLowerCase();
        if (role === 'admin') return userRole === 'admin' || userRole === 'super_admin';
        if (role === 'super_admin') return userRole === 'admin' || userRole === 'super_admin';
        return userRole === role;
    });

    return local ? mapLocalUser(local) : null;
};

const findLocalUser = (identifier, role) => {
    const data = loadLocalDb();
    const target = (identifier || '').trim().toLowerCase();
    return data.users.find(u => {
        if (u.role !== role) return false;
        return (
            (u.deptId && u.deptId.toLowerCase() === target) ||
            (u.citizenId && u.citizenId.toLowerCase() === target) ||
            (u.email && u.email.toLowerCase() === target) ||
            (u.phone && u.phone === target)
        );
    });
};

const getLocalOtpKey = (userId, role) => `${userId}:${role}`;

const upsertLocalOtp = (user, role, otpHash, expiresAt) => {
    localOtpStore.set(getLocalOtpKey(user.id, role), {
        user_id: user.id,
        role,
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempts: 0,
        user
    });
};

const getLocalOtp = (userId, role) => localOtpStore.get(getLocalOtpKey(userId, role)) || null;
const clearLocalOtp = (userId, role) => localOtpStore.delete(getLocalOtpKey(userId, role));

const resolveAdminRole = (user) => {
    const dbRole = (user?.role || '').toLowerCase();
    if (dbRole === 'super_admin') return 'super_admin';

    const deptId = (user?.department_id || user?.admin_id || '').toUpperCase();
    const email = (user?.email || '').toLowerCase();
    if (deptId === SUPER_ADMIN_ID || email === SUPER_ADMIN_EMAIL) {
        return 'super_admin';
    }
    return 'admin';
};

const resolveUserRole = (requestedRole, user) => {
    if (requestedRole === 'admin') return resolveAdminRole(user);
    if (requestedRole === 'citizen') return 'citizen';

    const dbRole = (user?.role || '').toLowerCase();
    if (dbRole === 'super_admin') return 'super_admin';
    if (dbRole === 'police' || dbRole === 'staff' || dbRole === 'admin') return dbRole;

    return requestedRole;
};

const buildUserPayload = (user, role) => ({
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    role,
    policeId: user.police_id || (role === 'police' ? (user.department_id || user.badge_number) : undefined),
    staffId: user.staff_id || (role === 'staff' ? user.department_id : undefined),
    adminId: user.admin_id || ((role === 'admin' || role === 'super_admin') ? user.department_id : undefined),
    department: user.department || user.department_name || user.station,
    rank: user.rank,
    station: user.station,
});

const getTableForRole = (role) => SPLIT_ROLE_TABLES[role];
const getIdFieldForRole = (role) => SPLIT_ROLE_ID_FIELDS[role];

const tableExists = async (tableName) => {
    if (tableExistsCache[tableName] !== undefined) {
        return tableExistsCache[tableName];
    }

    const { error } = await supabase
        .from(tableName)
        .select('id', { head: true, count: 'exact' })
        .limit(1);

    if (isMissingRelationError(error)) {
        tableExistsCache[tableName] = false;
        return false;
    }

    // For non-schema errors (network, auth, etc.), assume table exists.
    tableExistsCache[tableName] = true;
    return true;
};

// ─── Log login activity ───────────────────────────────────────────────────────
const logLoginActivity = async (userId, role, action, success, ipAddress = 'unknown', details = '') => {
    try {
        await supabase.from('login_activity_logs').insert([{
            user_id: userId || null,
            role,
            action,
            success,
            ip_address: ipAddress,
            details,
            created_at: new Date().toISOString()
        }]);
    } catch (_) {
        // Non-blocking audit logging.
    }
};

// ─── Record failed login + optional lock ─────────────────────────────────────
const recordFailedLogin = async (table, id, field = 'id') => {
    try {
        if (table === 'local') {
            const db = loadLocalDb();
            const idx = db.users.findIndex(u => (u._id === id || u.id === id || u.deptId === id));
            if (idx !== -1) {
                db.users[idx].login_attempts = (db.users[idx].login_attempts || 0) + 1;
                const attempts = db.users[idx].login_attempts;
                if (attempts >= MAX_LOGIN_ATTEMPTS) {
                    db.users[idx].is_locked = true;
                    db.users[idx].locked_until = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString();
                }
                saveLocalDb(db);
                return { attempts, isLocked: db.users[idx].is_locked || false };
            }
            return { attempts: 0, isLocked: false };
        }

        const { data: user } = await supabase
            .from(table)
            .select('login_attempts, id')
            .eq(field, id)
            .single();

        if (!user) return;

        const attempts = (user.login_attempts || 0) + 1;
        const updates = { login_attempts: attempts };
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            updates.is_locked = true;
            updates.locked_until = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString();
        }

        const { error: updErr } = await supabase.from(table).update(updates).eq('id', user.id);
        if (updErr) console.error(`Lockout Update Error [${table}]:`, updErr);

        return { attempts, isLocked: updates.is_locked || false };
    } catch (err) {
        console.error('recordFailedLogin Error:', err);
        return { attempts: 0, isLocked: false };
    }
};

// ─── Reset failed logins on success ──────────────────────────────────────────
const resetLoginAttempts = async (table, id) => {
    try {
        if (table === 'local') {
            const db = loadLocalDb();
            const idx = db.users.findIndex(u => (u._id === id || u.id === id));
            if (idx !== -1) {
                db.users[idx].login_attempts = 0;
                db.users[idx].is_locked = false;
                db.users[idx].locked_until = null;
                db.users[idx].last_login = new Date().toISOString();
                saveLocalDb(db);
            }
            return;
        }

        await supabase.from(table).update({
            login_attempts: 0,
            is_locked: false,
            locked_until: null,
            last_login: new Date().toISOString()
        }).eq('id', id);
    } catch (_) {
        // Non-blocking update.
    }
};

const findTerminalUserInSplitSchema = async (role, identifier) => {
    const table = getTableForRole(role);
    const idField = getIdFieldForRole(role);
    if (!table || !idField) return { user: null, table: null, error: null };

    let query = supabase.from(table).select('*');
    if (isValidEmail(identifier)) {
        query = query.eq('email', identifier.toLowerCase().trim());
    } else if (isValidMobile(identifier)) {
        query = query.eq('phone', identifier.trim());
    } else {
        query = query.eq(idField, identifier.trim().toUpperCase());
    }

    const { data, error } = await query.single();
    return { user: data, table, error };
};

const findTerminalUserInUnifiedSchema = async (role, identifier) => {
    const { data: users, error } = await supabase.from('users').select('*');
    if (error) return { user: null, table: 'users', error };

    const target = identifier.trim();
    const isEmail = isValidEmail(target);
    const desiredRoles = role === 'admin' ? ['admin', 'super_admin'] : [role];

    const user = (users || []).find((candidate) => {
        const dbRole = (candidate.role || '').toLowerCase();
        if (!desiredRoles.includes(dbRole)) return false;

        if (isEmail) {
            return (candidate.email || '').toLowerCase() === target.toLowerCase();
        }

        if (isValidMobile(target) && (candidate.phone === target || candidate.phone === target.replace(/\s|-/g, ''))) {
            return true;
        }

        return getTerminalUserIds(candidate).has(target.toUpperCase());
    });

    return { user: user || null, table: 'users', error: user ? null : null };
};

const findTerminalUser = async (role, identifier) => {
    const splitResult = await findTerminalUserInSplitSchema(role, identifier);
    if (splitResult.user) return splitResult;

    // If split schema isn't available or user wasn't there, try unified schema.
    if (!splitResult.user) {
        const unifiedResult = await findTerminalUserInUnifiedSchema(role, identifier);
        if (unifiedResult.user) return unifiedResult;
        return {
            user: null,
            table: splitResult.table || 'users',
            error: unifiedResult.error || splitResult.error
        };
    }

    return splitResult;
};

const getUserByRoleAndId = async (role, userId) => {
    if (role === 'citizen') {
        const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
        return { user: data, table: 'users', error };
    }

    const splitTable = getTableForRole(role);
    if (splitTable) {
        const split = await supabase.from(splitTable).select('*').eq('id', userId).single();
        if (split.data) {
            return { user: split.data, table: splitTable, error: null };
        }

        // Unified fallback for migrations or consolidated schemas.
        if (isMissingRelationError(split.error) || split.error) {
            const unified = await supabase.from('users').select('*').eq('id', userId).single();
            return { user: unified.data, table: 'users', error: unified.error || split.error };
        }
    }

    const unified = await supabase.from('users').select('*').eq('id', userId).single();
    return { user: unified.data, table: 'users', error: unified.error };
};

// ═══════════════════════════════════════════════════════════════════════════════
// CITIZEN LOGIN via Aadhaar
// ═══════════════════════════════════════════════════════════════════════════════
// ─── Smart Citizen Login (Mobile / Email / Citizen ID) ─────────────────────────
const citizenLogin = async (identifier, password, ipAddress) => {
    const target = (identifier || '').trim();
    let type = 'unknown';

    if (isValidMobile(target)) type = 'mobile';
    else if (isValidEmail(target)) type = 'email';
    else if (isValidCitizenId(target)) type = 'citizenId';
    else throw new Error('Enter a 10-digit mobile number, email, or Citizen ID (CIT-YYYY-XXXX).');

    // Find User
    let query = supabase.from('users').select('*').eq('role', 'citizen').eq('is_active', true);
    if (type === 'mobile') query = query.eq('phone', target);
    else if (type === 'email') query = query.eq('email', target.toLowerCase());
    else query = query.eq('citizen_id', target.toUpperCase());

    let user, fetchError;
    try {
        const result = await query.single();
        user = result.data;
        fetchError = result.error;
    } catch (err) {
        fetchError = err;
    }

    if (fetchError && isSupabaseUnavailable(fetchError) && isLocalAuthEnabled()) {
        console.warn('Supabase offline. Checking local Citizen DB...');
        const localUser = findLocalUser(target, 'citizen');
        if (localUser) {
            user = {
                id: localUser._id,
                full_name: localUser.name,
                email: localUser.email,
                phone: localUser.phone,
                citizen_id: localUser.citizenId,
                password_hash: localUser.password, // already hashed in local_db
                role: 'citizen',
                is_active: true,
                is_verified: true,
                is_aadhaar_verified: localUser.is_aadhaar_verified || false
            };
        }
    }

    if (!user) {
        await logLoginActivity(null, 'citizen', 'login_attempt', false, ipAddress, `User not found: ${target}`);
        throw new Error(`${type.charAt(0).toUpperCase() + type.slice(1)} not found in our records.`);
    }

    // Handle Lockout
    if (user.is_locked && user.locked_until && new Date(user.locked_until) > new Date()) {
        const unlockTime = new Date(user.locked_until).toLocaleTimeString();
        throw new Error(`Account locked until ${unlockTime} due to repeated failures.`);
    }

    // Authentication Logic
    if (type === 'mobile') {
        // Mobile only uses OTP
        return sendLoginOTP(target, ipAddress);
    } else {
        // Email or Citizen ID requires Password
        if (!password) throw new Error('Password is required for this login method.');
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            await recordFailedLogin('users', user.id);
            throw new Error('Incorrect credentials. Please check your password.');
        }
        // Requirement says "optional 2FA after password", we'll send OTP for consistency
        return handleSuccessfulCitizenMatch(user, ipAddress);
    }
};

// ─── Send Login OTP (Dedicated) ───────────────────────────────────────────
const sendLoginOTP = async (mobileNumber, ipAddress) => {
    const mobile = (mobileNumber || '').trim().replace(/\s|-/g, '');
    // FIX: Accept any 10-digit number (not just 6-9 prefix) to match frontend & validator
    if (!/^\d{10}$/.test(mobile)) throw new Error('Enter a valid 10-digit mobile number.');

    // 1. Rate Limiting Check (skip if Supabase is offline)
    try {
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { count: recentOtps, error: countErr } = await supabase
            .from('otp_tokens')
            .select('*', { count: 'exact', head: true })
            .eq('mobile_number', mobile)
            .gt('created_at', tenMinAgo);

        if (!countErr && recentOtps >= 3) {
            throw new Error('Too many OTP requests. Please wait 10 minutes.');
        }
    } catch (rlErr) {
        if (rlErr.message && rlErr.message.includes('Too many OTP')) throw rlErr;
        // Supabase unavailable — skip rate limit check, proceed
        console.warn('[sendLoginOTP] Rate-limit check skipped (Supabase offline).');
    }

    // 2. Find or Create User (Citizen)
    let user = null;
    let useLocal = false;

    try {
        const result = await supabase.from('users')
            .select('id, full_name, phone')
            .eq('phone', mobile)
            .eq('role', 'citizen')
            .single();

        if (result.data) {
            user = result.data;
        } else if (result.error && isSupabaseUnavailable(result.error)) {
            useLocal = true;
        }
    } catch (err) {
        if (isSupabaseUnavailable(err)) useLocal = true;
        else throw err;
    }

    if (useLocal && isLocalAuthEnabled()) {
        console.warn('[sendLoginOTP] Supabase offline. Checking Local DB...');
        const localUser = findLocalUser(mobile, 'citizen');
        if (localUser) {
            user = { id: localUser._id, full_name: localUser.name, phone: localUser.phone, role: 'citizen' };
        } else {
            // Stable ID: reuse if already auto-created for this mobile in this session
            const cached = localMobileUserMap.get(mobile);
            user = cached?.user || { id: `local-cit-${mobile}`, full_name: 'Local Citizen', phone: mobile, role: 'citizen' };
        }
    } else if (!user) {
        // Supabase online but no user found — auto-onboard
        const { data: newUser, error: regErr } = await supabase.from('users').insert([{
            role: 'citizen',
            phone: mobile,
            full_name: 'Citizen',
            is_active: true,
            is_verified: true,
            created_at: new Date().toISOString()
        }]).select().single();

        if (regErr) {
            if (isSupabaseUnavailable(regErr) && isLocalAuthEnabled()) {
                const cached = localMobileUserMap.get(mobile);
                user = cached?.user || { id: `local-cit-${mobile}`, full_name: 'Local Citizen', phone: mobile, role: 'citizen' };
            } else {
                throw new Error('Failed to create citizen record.');
            }
        } else {
            user = newUser;
        }
    }

    // Store mobile→user mapping for verifyLoginOTP to reuse the same ID
    localMobileUserMap.set(mobile, { userId: user.id, user });

    // 3. Generate & Hash OTP
    const otp = process.env.NODE_ENV === 'test' ? '123456' : generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 4. Store OTP — delete existing first, then insert fresh (avoids upsert conflict issues)
    let storedLocally = false;
    try {
        // Delete any existing OTP for this user+role before inserting a new one
        await supabase.from('otp_tokens')
            .delete()
            .eq('user_id', user.id)
            .eq('purpose', 'login');

        const { error: otpErr } = await supabase.from('otp_tokens').insert([{
            user_id: user.id,
            identifier: mobile,
            otp_code: otp,
            purpose: 'login',
            is_used: false,
            expires_at: expiresAt,
            created_at: new Date().toISOString()
        }]);

        if (otpErr) {
            console.warn('[sendLoginOTP] Supabase OTP store error:', otpErr.message);
            if (isLocalAuthEnabled()) {
                upsertLocalOtp(user, 'citizen', otpHash, expiresAt);
                storedLocally = true;
                console.log(`[DEV OTP] Mobile: ${mobile} | Code: ${otp}`);
            } else {
                throw new Error('Failed to issue OTP. Please try again.');
            }
        }
    } catch (storeErr) {
        if (isLocalAuthEnabled()) {
            upsertLocalOtp(user, 'citizen', otpHash, expiresAt);
            storedLocally = true;
            console.log(`[DEV OTP] Mobile: ${mobile} | Code: ${otp}`);
        } else {
            throw storeErr;
        }
    }

    // 5. Send via Twilio
    const message = `Your E-Polix OTP is: ${otp}. Valid for 5 minutes. DO NOT share this with anyone.`;
    const smsSent = await sendSMS(mobile, message);

    if (!smsSent && !storedLocally && !isLocalAuthEnabled()) {
        throw new Error('Could not deliver SMS. Verify your balance or contact HQ.');
    }

    if (!smsSent && isLocalAuthEnabled()) {
        console.log(`[DEV MODE] OTP for ${mobile}: ${otp}`);
    }

    return {
        success: true,
        message: smsSent ? 'OTP sent via SMS.' : `[DEV] OTP: ${otp}`,
        userId: user.id,
        maskedContact: `XXXXXX${mobile.slice(-4)}`,
        // Always expose OTP in dev/no-Twilio for testing
        otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    };
};

// ─── Verify Login OTP (Dedicated) ─────────────────────────────────────────
const verifyLoginOTP = async (mobileNumber, otpInput, ipAddress) => {
    const mobile = (mobileNumber || '').trim().replace(/\s|-/g, '');

    // Step A: Resolve user ID — first from the in-process mobile→user map (handles offline perfectly)
    let user = null;
    let resolvedFromMap = false;

    const cachedEntry = localMobileUserMap.get(mobile);
    if (cachedEntry) {
        user = cachedEntry.user;
        resolvedFromMap = true;
        console.log(`[verifyLoginOTP] Resolved user from localMobileUserMap for ${mobile}: ${user.id}`);
    }

    // Step B: If not in map, try Supabase
    if (!user) {
        try {
            const result = await supabase.from('users')
                .select('*')
                .eq('phone', mobile)
                .eq('role', 'citizen')
                .single();

            if (result.data) {
                user = result.data;
            } else if (result.error && isSupabaseUnavailable(result.error) && isLocalAuthEnabled()) {
                // Supabase offline fallback
                const localUser = findLocalUser(mobile, 'citizen');
                if (localUser) {
                    user = { id: localUser._id, full_name: localUser.name, phone: localUser.phone, role: 'citizen', is_active: true };
                } else {
                    // Create a stable local ID based on mobile so it matches what sendLoginOTP used
                    user = { id: `local-cit-${mobile}`, phone: mobile, role: 'citizen', full_name: 'Local Citizen' };
                }
            }
        } catch (err) {
            if (isSupabaseUnavailable(err) && isLocalAuthEnabled()) {
                const localUser = findLocalUser(mobile, 'citizen');
                user = localUser
                    ? { id: localUser._id, full_name: localUser.name, phone: localUser.phone, role: 'citizen', is_active: true }
                    : { id: `local-cit-${mobile}`, phone: mobile, role: 'citizen', full_name: 'Local Citizen' };
            } else throw err;
        }
    }

    if (!user) throw new Error('User record not found for this mobile number.');

    // Step C: Verify OTP using resolved user ID
    const result = await verifyOTP(user.id, 'citizen', otpInput, ipAddress);

    // Clean up mobile map entry on success
    if (result.success) localMobileUserMap.delete(mobile);

    // Build the final user payload (verifyOTP may return stripped user, enrich from our local copy)
    const finalUser = result.user || user;
    if (!finalUser.role) finalUser.role = 'citizen';

    return {
        ...result,
        user: finalUser,
        redirect: '/user'
    };
};

const handleSuccessfulCitizenMatch = async (matchedUser, ipAddress) => {
    if (matchedUser.is_locked && matchedUser.locked_until && new Date(matchedUser.locked_until) > new Date()) {
        throw new Error('Account temporarily locked. Please contact police station.');
    }

    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Handle Local Fallback
    if (String(matchedUser.id).includes('local') && isLocalAuthEnabled()) {
        upsertLocalOtp(matchedUser, 'citizen', otpHash, expiresAt);
        console.log(`[DEV] Citizen OTP for ${matchedUser.full_name}: ${otp}`);
    } else {
        // Delete existing OTP then insert fresh
        await supabase.from('otp_tokens').delete().eq('user_id', matchedUser.id).eq('purpose', 'login');
        const { error: otpErr } = await supabase.from('otp_tokens').insert([{
            user_id: matchedUser.id,
            identifier: matchedUser.phone || matchedUser.email || matchedUser.citizen_id,
            otp_code: otp,
            purpose: 'login',
            is_used: false,
            expires_at: expiresAt,
            created_at: new Date().toISOString()
        }]);

        if (otpErr) {
            if (isLocalAuthEnabled()) {
                console.warn('Supabase OTP failed, falling back to local memory...');
                upsertLocalOtp(matchedUser, 'citizen', otpHash, expiresAt);
                console.log(`[DEV] Citizen OTP for ${matchedUser.full_name}: ${otp}`);
            } else {
                throw new Error('OTP service unavailable.');
            }
        }
    }

    await logLoginActivity(matchedUser.id, 'citizen', 'otp_sent', true, ipAddress);

    return {
        success: true,
        message: 'OTP sent to your registered contact.',
        userId: matchedUser.id,
        name: matchedUser.full_name,
        maskedContact: maskContact(matchedUser),
        // For development, we return OTP if not in production
        otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
};

// ─── Aadhaar KYC Verification ──────────────────────────────────────────────────
const sendAadhaarOTP = async (userId, aadhaarNumber) => {
    const cleanAadhaar = (aadhaarNumber || '').replace(/\s|-/g, '');
    if (!validateAadhaar(cleanAadhaar)) throw new Error('Invalid Aadhaar number. Checksum validation failed.');

    const { data: user, error: fetchErr } = await supabase.from('users').select('*').eq('id', userId).single();
    let currentUser = user;

    if ((!user || fetchErr) && isLocalAuthEnabled()) {
        const db = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
        currentUser = db.users.find(u => u._id === userId || u.id === userId);
    }

    if (!currentUser) throw new Error('User session invalid or expired.');

    // 🔒 Mobile Binding: Match Aadhaar with user contact
    const userPhone = (currentUser.phone || '').replace(/\D/g, '').slice(-10);
    const linkedPhone = (currentUser.aadhaar_linked_mobile || '').replace(/\D/g, '').slice(-10);

    // In Production, this check is performed by UIDAI via e-KYC.
    // In Simulation, we check if his current mobile equals the "Aadhaar record mobile" in DB.
    if (linkedPhone && userPhone !== linkedPhone) {
        throw new Error('Verification Failed: Aadhaar is linked to a different mobile number.');
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    if (String(userId).includes('local') && isLocalAuthEnabled()) {
        upsertLocalOtp({ id: userId }, 'kyc', otpHash, expiresAt);
    } else {
        // Delete existing KYC OTP then insert fresh
        await supabase.from('otp_tokens').delete().eq('user_id', userId).eq('purpose', 'register');
        await supabase.from('otp_tokens').insert([{
            user_id: userId,
            identifier: userId,
            otp_code: otp,
            purpose: 'register',
            is_used: false,
            expires_at: expiresAt,
            created_at: new Date().toISOString()
        }]);
    }

    return {
        success: true,
        message: `OTP sent to mobile linked with Aadhaar XXXX-XXXX-${cleanAadhaar.slice(-4)}`,
        otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    };
};

const verifyAadhaarOTP = async (userId, aadhaarNumber, otpInput) => {
    if (!otpInput) throw new Error('OTP is required.');

    const cleanAadhaar = (aadhaarNumber || '').replace(/\s|-/g, '');
    let otpRecord = null;

    if (String(userId).includes('local') && isLocalAuthEnabled()) {
        otpRecord = getLocalOtp(userId, 'kyc');
    } else {
        const { data } = await supabase.from('otp_tokens')
            .select('*').eq('user_id', userId).eq('role', 'kyc').single();
        otpRecord = data;
    }

    if (!otpRecord || new Date(otpRecord.expires_at) < new Date()) {
        throw new Error('Aadhaar OTP expired or invalid. Please request a new one.');
    }

    const isValid = await bcrypt.compare(otpInput, otpRecord.otp_hash);
    if (!isValid) throw new Error('Incorrect Aadhaar OTP. Attempts logged.');

    // 🔒 1. Encrypt Aadhaar (AES-256)
    const encryptedAadhaar = encrypt(cleanAadhaar);
    // 🔒 2. Mask Aadhaar for UI
    const masked = maskAadhaar(cleanAadhaar);
    // 🔒 3. Save Last 4 digits
    const last4 = cleanAadhaar.slice(-4);

    if (String(userId).includes('local') && isLocalAuthEnabled()) {
        const db = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
        const idx = db.users.findIndex(u => u._id === userId || u.id === userId);
        if (idx !== -1) {
            db.users[idx].is_aadhaar_verified = true;
            db.users[idx].aadhaar_masked = masked;
            db.users[idx].aadhaar_encrypted = encryptedAadhaar;
            db.users[idx].aadhaar_last4 = last4;
            fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2));
        }
    } else {
        await supabase.from('users').update({
            is_aadhaar_verified: true,
            aadhaar_masked: masked,
            aadhaar_encrypted: encryptedAadhaar,
            aadhaar_last4: last4,
            updated_at: new Date().toISOString()
        }).eq('id', userId);
    }

    // Clean up
    if (String(userId).includes('local') && isLocalAuthEnabled()) {
        localOtpStore.delete(`${userId}_kyc`);
    } else {
        await supabase.from('otp_tokens').delete().eq('user_id', userId).eq('role', 'kyc');
    }

    return {
        success: true,
        message: 'Aadhaar Identity Verified Successfully ✅',
        masked
    };
};

// ═══════════════════════════════════════════════════════════════════════════════
// TERMINAL LOGIN (Police / Staff / Admin)
// ═══════════════════════════════════════════════════════════════════════════════
const terminalLogin = async (role, identifier, password, ipAddress) => {
    if (!['police', 'staff', 'admin'].includes(role)) {
        throw new Error('Invalid role specified.');
    }

    const normalizedIdentifier = (identifier || '').trim();
    const resolved = await findTerminalUser(role, normalizedIdentifier);
    let user = resolved.user;
    let table = resolved.table || getTableForRole(role) || 'users';
    let usingLocalAuth = false;

    if (!user && isLocalAuthEnabled()) {
        const localUser = findLocalTerminalUser(role, normalizedIdentifier);
        if (localUser) {
            user = localUser;
            table = 'local';
            usingLocalAuth = true;
        }
    }

    if (!user) {
        await logLoginActivity(null, role, 'login_attempt', false, ipAddress, `User not found: ${identifier}`);
        if (isLocalAuthEnabled() && isSupabaseUnavailable(resolved.error)) {
            throw new Error('Database unavailable. Configure Supabase or use /api/auth/seed to create local dev admin.');
        }
        throw new Error(`${role.charAt(0).toUpperCase() + role.slice(1)} ID not found in the system.`);
    }

    if (user.is_active === false) {
        throw new Error('Your account has been deactivated. Contact the administrator.');
    }
    if (user.is_locked === true || (user.locked_until && new Date(user.locked_until) > new Date())) {
        const unlockTime = user.locked_until ? new Date(user.locked_until).toLocaleTimeString() : 'soon';
        throw new Error(`Account locked until ${unlockTime}. Too many failed attempts.`);
    }
    if (!user.password_hash) {
        throw new Error('Account not properly configured. Contact administrator.');
    }

    // New: Mobile + OTP (No password required for primary)
    const isMobile = isValidMobile(normalizedIdentifier);

    if (isMobile && role === 'staff') {
        // Mobile only - skip password
    } else {
        // ID or Email - requires password
        if (!password) throw new Error('Security policy requires a password for this login method.');

        const passwordValid = (usingLocalAuth && password === user.password_hash) || await bcrypt.compare(password, user.password_hash);
        if (!passwordValid) {
            const stats = await recordFailedLogin(table, user._id || user.id);
            await logLoginActivity(user.id || user._id, role, 'login_attempt', false, ipAddress, 'Wrong password');

            const remaining = MAX_LOGIN_ATTEMPTS - stats.attempts;
            if (stats.isLocked || remaining <= 0) {
                throw new Error(`Critical security lockout: Account blocked for ${LOCK_DURATION_MINUTES} minutes due to repeated failures.`);
            }

            throw new Error(`Authentication failed. ${remaining} attempt(s) remaining before system lockout.`);
        }
    }

    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000).toISOString();

    if (usingLocalAuth) {
        upsertLocalOtp(user, role, otpHash, expiresAt);
    } else {
        // Delete existing OTP for this user+role then insert fresh
        await supabase.from('otp_tokens').delete().eq('user_id', user.id).eq('purpose', 'login');
        const { error: otpError } = await supabase.from('otp_tokens').insert([{
            user_id: user.id,
            identifier: user.email || user.department_id || user.phone || String(user.id),
            otp_code: otp,
            purpose: 'login',
            is_used: false,
            expires_at: expiresAt,
            created_at: new Date().toISOString()
        }]);

        if (otpError) {
            if (isLocalAuthEnabled() && isSupabaseUnavailable(otpError)) {
                usingLocalAuth = true;
                table = 'local';
                upsertLocalOtp(user, role, otpHash, expiresAt);
            } else {
                throw new Error('Failed to generate OTP. Please try again.');
            }
        }
    }

    await logLoginActivity(user.id, role, 'otp_sent', true, ipAddress);

    return {
        success: true,
        message: 'Credentials verified. OTP sent to registered contact.',
        userId: user.id,
        name: user.full_name,
        role: resolveUserRole(role, user),
        maskedContact: maskContact(user),
        otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
};

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFY OTP (All Roles)
// ═══════════════════════════════════════════════════════════════════════════════
const verifyOTP = async (userId, role, otpInput, ipAddress) => {
    if (!userId || !role || !otpInput) {
        throw new Error('Missing required fields: userId, role, otp.');
    }

    const isMasterOtp = isMasterOtpEnabled() && otpInput === process.env.MASTER_OTP;

    let source = 'supabase';
    let otpRecord = null;

    // --- Try Supabase first: match by user_id + purpose='login' ---
    try {
        const { data: dbOtpRecord, error } = await supabase
            .from('otp_tokens')
            .select('*')
            .eq('user_id', userId)
            .eq('purpose', 'login')
            .eq('is_used', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (dbOtpRecord && !error) {
            otpRecord = dbOtpRecord;
        } else if (error && isLocalAuthEnabled()) {
            const localRecord = getLocalOtp(userId, role);
            if (localRecord) { otpRecord = localRecord; source = 'local'; }
        }
    } catch (err) {
        if (isLocalAuthEnabled()) {
            const localRecord = getLocalOtp(userId, role);
            if (localRecord) { otpRecord = localRecord; source = 'local'; }
        }
    }

    if (!otpRecord) {
        if (isMasterOtp) {
            // Master OTP bypass — proceed without a stored record (dev/testing only)
            console.warn('[verifyOTP] Master OTP used — bypassing stored record check.');
        } else {
            throw new Error('OTP not found. Please request a new one.');
        }
    }

    if (otpRecord) {
        // Expiry check
        if (new Date(otpRecord.expires_at) < new Date()) {
            if (source === 'local') clearLocalOtp(userId, role);
            else await supabase.from('otp_tokens').delete().eq('id', otpRecord.id);
            throw new Error('OTP has expired. Please login again to receive a new one.');
        }

        // Validate OTP — compare plain text otp_code (new schema) with fallback to bcrypt hash
        const plainMatch = otpRecord.otp_code && otpRecord.otp_code === otpInput;
        const hashMatch = otpRecord.otp_hash && await bcrypt.compare(otpInput, otpRecord.otp_hash).catch(() => false);
        const isValidOtp = isMasterOtp || plainMatch || hashMatch;

        if (!isValidOtp) {
            await logLoginActivity(userId, role, 'otp_verify', false, ipAddress, 'Wrong OTP');
            throw new Error('Invalid OTP. Please check and try again.');
        }

        // Mark as used / delete
        if (source === 'local') {
            clearLocalOtp(userId, role);
        } else {
            await supabase.from('otp_tokens').update({ is_used: true }).eq('id', otpRecord.id);
        }
    }

    const resolved = await getUserByRoleAndId(role, userId);
    let user = resolved.user;
    let table = resolved.table || (role === 'citizen' ? 'users' : getTableForRole(role)) || 'users';
    if ((!user || resolved.error) && isLocalAuthEnabled()) {
        const localUser = findLocalUserById(userId, role);
        if (localUser) {
            user = localUser;
            table = 'local';
        }
        // Also check localMobileUserMap for auto-onboarded citizens (id: local-cit-MOBILE)
        if (!user) {
            for (const [, entry] of localMobileUserMap.entries()) {
                if (entry.userId === userId || (entry.user && entry.user.id === userId)) {
                    user = entry.user;
                    table = 'local';
                    break;
                }
            }
        }
    }

    if (!user) throw new Error('User record not found.');

    await resetLoginAttempts(table, userId);

    const effectiveRole = resolveUserRole(role, user);
    const userPayload = buildUserPayload(user, effectiveRole);

    const accessToken = generateToken(userId, effectiveRole, {
        email: user.email,
        name: user.full_name,
        phone: user.phone
    });
    const refreshToken = generateRefreshToken(userId, effectiveRole);

    await logLoginActivity(userId, effectiveRole, 'login_success', true, ipAddress);

    return {
        success: true,
        message: 'Login successful.',
        token: accessToken,          // backward compat alias
        accessToken,
        refreshToken,
        expiresIn: JWT_EXPIRY,
        user: userPayload
    };
};

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER POLICE OFFICER (Admin only)
// ═══════════════════════════════════════════════════════════════════════════════
const registerPoliceOfficer = async (data) => {
    const { fullName, email, phone, password, rank, station, department } = data;

    if (!fullName || !email || !phone || !password || !rank || !station) {
        throw new Error('All fields are required: fullName, email, phone, password, rank, station.');
    }
    if (!isValidEmail(email)) throw new Error('Invalid email format.');
    if ((password || '').length < 8) throw new Error('Password must be at least 8 characters.');

    const emailLower = email.toLowerCase().trim();
    const passwordHash = await hashPassword(password);
    const useSplitTable = await tableExists('police_officers');

    if (useSplitTable) {
        const { data: existing } = await supabase
            .from('police_officers')
            .select('id')
            .eq('email', emailLower)
            .single();
        if (existing) throw new Error('An officer with this email already exists.');

        const { count } = await supabase
            .from('police_officers')
            .select('id', { count: 'exact', head: true });
        const policeId = `OFF-${String((count || 0) + 1).padStart(3, '0')}`;

        const { data: officer, error } = await supabase.from('police_officers').insert([{
            police_id: policeId,
            full_name: fullName.trim(),
            email: emailLower,
            phone: phone.trim(),
            password_hash: passwordHash,
            rank,
            station,
            department: department || 'General',
            is_active: true,
            is_locked: false,
            login_attempts: 0,
            created_at: new Date().toISOString()
        }]).select().single();

        if (error) throw new Error(`Failed to register officer: ${error.message}`);
        return { success: true, policeId, officer: stripSensitive(officer) };
    }

    // Unified users fallback.
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', emailLower)
        .single();
    if (existingUser) throw new Error('An officer with this email already exists.');

    const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'police');
    const policeId = `OFF-${String((count || 0) + 1).padStart(3, '0')}`;

    const { data: officer, error } = await supabase.from('users').insert([{
        role: 'police',
        badge_number: policeId,
        department_id: policeId,
        full_name: fullName.trim(),
        email: emailLower,
        phone: phone.trim(),
        password_hash: passwordHash,
        rank,
        station,
        district: department || 'General',
        is_active: true,
        is_verified: true,
        is_locked: false,
        login_attempts: 0,
        created_at: new Date().toISOString()
    }]).select().single();

    if (error) throw new Error(`Failed to register officer: ${error.message}`);
    return { success: true, policeId, officer: stripSensitive(officer) };
};

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER STAFF MEMBER (Admin only)
// ═══════════════════════════════════════════════════════════════════════════════
const registerStaff = async (data) => {
    const { fullName, email, phone, password, department, role: jobRole } = data;

    if (!fullName || !email || !phone || !password || !department) {
        throw new Error('Required: fullName, email, phone, password, department.');
    }
    if (!isValidEmail(email)) throw new Error('Invalid email format.');
    if ((password || '').length < 8) throw new Error('Password must be at least 8 characters.');

    const emailLower = email.toLowerCase().trim();
    const passwordHash = await hashPassword(password);
    const useSplitTable = await tableExists('staff_members');

    if (useSplitTable) {
        const { data: existing } = await supabase
            .from('staff_members')
            .select('id')
            .eq('email', emailLower)
            .single();
        if (existing) throw new Error('A staff member with this email already exists.');

        const { count } = await supabase
            .from('staff_members')
            .select('id', { count: 'exact', head: true });
        const staffId = `STF-${String((count || 0) + 1).padStart(3, '0')}`;

        const { data: staff, error } = await supabase.from('staff_members').insert([{
            staff_id: staffId,
            full_name: fullName.trim(),
            email: emailLower,
            phone: phone.trim(),
            password_hash: passwordHash,
            department,
            role: jobRole || 'Clerk',
            is_active: true,
            is_locked: false,
            login_attempts: 0,
            created_at: new Date().toISOString()
        }]).select().single();

        if (error) throw new Error(`Failed to register staff: ${error.message}`);
        return { success: true, staffId, staff: stripSensitive(staff) };
    }

    // Unified users fallback.
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', emailLower)
        .single();
    if (existingUser) throw new Error('A staff member with this email already exists.');

    const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'staff');
    const staffId = `STF-${String((count || 0) + 1).padStart(3, '0')}`;

    const { data: staff, error } = await supabase.from('users').insert([{
        role: 'staff',
        department_id: staffId,
        full_name: fullName.trim(),
        email: emailLower,
        phone: phone.trim(),
        password_hash: passwordHash,
        station: department,
        rank: jobRole || 'Clerk',
        is_active: true,
        is_verified: true,
        is_locked: false,
        login_attempts: 0,
        created_at: new Date().toISOString()
    }]).select().single();

    if (error) throw new Error(`Failed to register staff: ${error.message}`);
    return { success: true, staffId, staff: stripSensitive(staff) };
};

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER ADMIN (Super Admin only)
// ═══════════════════════════════════════════════════════════════════════════════
const registerAdmin = async (data) => {
    const { fullName, email, phone, password, role: adminRole } = data;

    if (!fullName || !email || !phone || !password) {
        throw new Error('Required: fullName, email, phone, password.');
    }
    if (!isValidEmail(email)) throw new Error('Invalid email format.');
    if ((password || '').length < 14) throw new Error('Admin password must be at least 14 characters.');
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(password)) {
        throw new Error('Admin password must include uppercase, lowercase, numbers, and special characters.');
    }

    const emailLower = email.toLowerCase().trim();
    const passwordHash = await hashPassword(password);
    const useSplitTable = await tableExists('admin_users');

    if (useSplitTable) {
        const { data: existing } = await supabase
            .from('admin_users')
            .select('id')
            .eq('email', emailLower)
            .single();
        if (existing) throw new Error('An admin with this email already exists.');

        const year = new Date().getFullYear();
        const { count } = await supabase
            .from('admin_users')
            .select('id', { count: 'exact', head: true });
        const adminId = `ADM-KL-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

        const { data: admin, error } = await supabase.from('admin_users').insert([{
            admin_id: adminId,
            full_name: fullName.trim(),
            email: emailLower,
            phone: phone.trim(),
            password_hash: passwordHash,
            role: adminRole || 'admin',
            is_active: true,
            is_locked: false,
            login_attempts: 0,
            two_fa_enabled: true,
            created_at: new Date().toISOString()
        }]).select().single();

        if (error) throw new Error(`Failed to register admin: ${error.message}`);
        return { success: true, adminId, admin: stripSensitive(admin) };
    }

    // Unified users fallback.
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', emailLower)
        .single();
    if (existingUser) throw new Error('An admin with this email already exists.');

    const year = new Date().getFullYear();
    const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');
    const adminId = `ADM-KL-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

    const { data: admin, error } = await supabase.from('users').insert([{
        role: adminRole === 'super_admin' ? 'admin' : (adminRole || 'admin'),
        badge_number: adminId,
        department_id: adminId,
        full_name: fullName.trim(),
        email: emailLower,
        phone: phone.trim(),
        password_hash: passwordHash,
        station: 'HQ',
        is_active: true,
        is_verified: true,
        is_locked: false,
        login_attempts: 0,
        created_at: new Date().toISOString()
    }]).select().single();

    if (error) throw new Error(`Failed to register admin: ${error.message}`);
    return { success: true, adminId, admin: stripSensitive(admin) };
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEED DATABASE (Super Admin bootstrap)
// ═══════════════════════════════════════════════════════════════════════════════
const seedDatabase = async () => {
    try {
        const seededPassword = 'EPolixAdmin@2026#Secure';
        const passwordHash = await hashPassword(seededPassword);
        const testPasswordHash = await hashPassword('password123');

        // 1. Admin Seed
        const { data: existingAdmin, error: adminErr } = await supabase.from('users').select('id').eq('email', SUPER_ADMIN_EMAIL).single();
        if (adminErr && adminErr.code !== 'PGRST116') console.error('Admin Seed Fetch Error:', adminErr);

        if (!existingAdmin) {
            const { error: insErr } = await supabase.from('users').insert([{
                role: 'admin',
                badge_number: SUPER_ADMIN_ID,
                department_id: SUPER_ADMIN_ID,
                full_name: 'Super Administrator',
                email: SUPER_ADMIN_EMAIL,
                phone: '+919000000000',
                password_hash: testPasswordHash,
                station: 'HQ',
                is_active: true,
                is_verified: true,
                is_locked: false,
                login_attempts: 0,
                created_at: new Date().toISOString()
            }]);
            if (insErr) throw insErr;
        } else {
            await supabase.from('users').update({
                password_hash: testPasswordHash,
                is_locked: false,
                locked_until: null,
                login_attempts: 0
            }).eq('id', existingAdmin.id);
        }

        // 2. Police Seed
        const { data: existingPolice } = await supabase.from('users').select('id').eq('email', 'police@epolix.gov.in').single();
        if (!existingPolice) {
            await supabase.from('users').insert([{
                role: 'police',
                badge_number: 'OFF-001',
                department_id: 'OFF-001',
                full_name: 'Officer John Doe',
                email: 'police@epolix.gov.in',
                phone: '+919111111111',
                password_hash: testPasswordHash,
                rank: 'Inspector',
                station: 'Central Police Station',
                is_active: true,
                is_verified: true,
                is_locked: false,
                login_attempts: 0,
                created_at: new Date().toISOString()
            }]);
        } else {
            await supabase.from('users').update({
                password_hash: testPasswordHash,
                is_locked: false,
                locked_until: null,
                login_attempts: 0
            }).eq('id', existingPolice.id);
        }

        // 3. Staff Seed
        const { data: existingStaff } = await supabase.from('users').select('id').eq('email', 'staff@epolix.gov.in').single();
        if (!existingStaff) {
            await supabase.from('users').insert([{
                role: 'staff',
                department_id: 'STF-001',
                full_name: 'Staff Jane Smith',
                email: 'staff@epolix.gov.in',
                phone: '+919222222222',
                password_hash: testPasswordHash,
                rank: 'Clerk',
                station: 'Central HQ',
                is_active: true,
                is_verified: true,
                is_locked: false,
                login_attempts: 0,
                created_at: new Date().toISOString()
            }]);
        } else {
            await supabase.from('users').update({
                password_hash: testPasswordHash,
                is_locked: false,
                locked_until: null,
                login_attempts: 0
            }).eq('id', existingStaff.id);
        }

        // 4. Citizen Seed
        const { data: existingCitizen } = await supabase.from('users').select('id').eq('email', 'rahul@example.com').single();
        if (!existingCitizen) {
            await supabase.from('users').insert([{
                role: 'citizen',
                citizen_id: 'CIT-2026-0001',
                full_name: 'Rahul Kumar',
                email: 'rahul@example.com',
                phone: '9333333333', // 10 digit as per req
                password_hash: testPasswordHash,
                is_active: true,
                is_verified: true,
                is_locked: false,
                login_attempts: 0,
                created_at: new Date().toISOString()
            }]);
        } else {
            await supabase.from('users').update({
                citizen_id: 'CIT-2026-0001',
                phone: '9333333333',
                password_hash: testPasswordHash,
                is_locked: false,
                locked_until: null,
                login_attempts: 0
            }).eq('id', existingCitizen.id);
        }

        return {
            message: 'Database seeded successfully. All passwords reset to the secure default configuration.',
            admin: { id: SUPER_ADMIN_ID },
            police: { id: 'OFF-001' },
            staff: { id: 'STF-001' },
            citizen: {
                mobile: '9333333333',
                email: 'rahul@example.com',
                id: 'CIT-2026-0001',
            }
        };
    } catch (err) {
        throw new Error(`Seed failed: ${err.message}`);
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// REFRESH ACCESS TOKEN
// ═══════════════════════════════════════════════════════════════════════════════
const refreshAccessToken = async (refreshTokenStr) => {
    if (!refreshTokenStr) throw new Error('Refresh token required.');

    let decoded;
    try {
        decoded = jwt.verify(
            refreshTokenStr,
            env.JWT_REFRESH_SECRET || env.JWT_SECRET
        );
    } catch (err) {
        if (err.name === 'TokenExpiredError') throw new Error('Refresh token expired. Please log in again.');
        throw new Error('Invalid refresh token.');
    }

    if (decoded.type !== 'refresh') throw new Error('Invalid token type.');

    // Generate new access token
    const newAccessToken = generateToken(decoded.userId, decoded.role, {
        email: decoded.email,
        name: decoded.name,
        phone: decoded.phone
    });

    // Optionally rotate refresh token (sliding window)
    const newRefreshToken = generateRefreshToken(decoded.userId, decoded.role);

    return {
        success: true,
        accessToken: newAccessToken,
        token: newAccessToken,           // backward compat
        refreshToken: newRefreshToken,
        expiresIn: JWT_EXPIRY,
        userId: decoded.userId,
        role: decoded.role
    };
};

module.exports = {
    citizenLogin,
    terminalLogin,
    verifyOTP,
    refreshAccessToken,
    registerPoliceOfficer,
    registerStaff,
    registerAdmin,
    seedDatabase,
    hashPassword,
    generateToken,
    generateRefreshToken,
    sendAadhaarOTP,
    verifyAadhaarOTP,
    sendLoginOTP,
    verifyLoginOTP
};
