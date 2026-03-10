const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { supabase } = require('../config/supabase');

// ─── Constants ────────────────────────────────────────────────────────────────
const OTP_EXPIRY_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 3;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '8h';
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
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());

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
const isMasterOtpEnabled = () => process.env.NODE_ENV !== 'production' && Boolean(process.env.MASTER_OTP);

const LOCAL_DEV_PASSWORD_HINTS = {
    admin: 'admin123',
    police: 'police123',
    staff: 'staff123',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateOTP = () => crypto.randomInt(100000, 999999).toString();

const generateToken = (userId, role, extra = {}) => {
    return jwt.sign(
        { userId, role, ...extra, iat: Math.floor(Date.now() / 1000) },
        process.env.JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
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
    const clone = { ...(user || {}) };
    delete clone.password_hash;
    delete clone.aadhaar_hash;
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

        await supabase.from(table).update(updates).eq('id', user.id);
    } catch (_) {
        // Non-blocking update.
    }
};

// ─── Reset failed logins on success ──────────────────────────────────────────
const resetLoginAttempts = async (table, id) => {
    try {
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
const citizenLogin = async (aadhaarNumber, ipAddress) => {
    const cleaned = (aadhaarNumber || '').replace(/\s|-/g, '');

    if (!isValidAadhaar(cleaned)) {
        throw new Error('Invalid Aadhaar number format. Must be 12 digits.');
    }

    // Try primary optimized query first
    const { data: matchedUser, error } = await supabase
        .from('users')
        .select('id, full_name, email, phone, aadhaar, is_active, is_locked, locked_until')
        .eq('aadhaar', cleaned)
        .eq('role', 'citizen')
        .eq('is_active', true)
        .single();

    // Fallback for legacy hashing or local dev
    if (error || !matchedUser) {
        const { data: users, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('is_active', true);

        let loopMatch = null;
        if (!fetchError && users) {
            for (const user of users) {
                if (user.role && user.role !== 'citizen') continue;
                if (user.aadhaar_hash && await bcrypt.compare(cleaned, user.aadhaar_hash)) {
                    loopMatch = user;
                    break;
                }
            }
        }

        if (!loopMatch) {
            await logLoginActivity(null, 'citizen', 'login_attempt', false, ipAddress, 'Invalid Aadhaar');
            throw new Error('Aadhaar number not found in the system. Please verify your number.');
        }
        // Proceed with loopMatch
        return handleSuccessfulCitizenMatch(loopMatch, ipAddress);
    }

    return handleSuccessfulCitizenMatch(matchedUser, ipAddress);
};

const handleSuccessfulCitizenMatch = async (matchedUser, ipAddress) => {
    if (matchedUser.is_locked && matchedUser.locked_until && new Date(matchedUser.locked_until) > new Date()) {
        throw new Error('Account temporarily locked. Please contact police station.');
    }

    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000).toISOString();

    await supabase.from('otp_tokens').upsert([{
        user_id: matchedUser.id,
        role: 'citizen',
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempts: 0,
        created_at: new Date().toISOString()
    }], { onConflict: 'user_id,role' });

    await logLoginActivity(matchedUser.id, 'citizen', 'otp_sent', true, ipAddress);

    return {
        success: true,
        message: 'OTP sent to your registered contact.',
        userId: matchedUser.id,
        name: matchedUser.full_name,
        maskedContact: maskContact(matchedUser),
        otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
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

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
        if (!usingLocalAuth) {
            await recordFailedLogin(table, user.id);
        }
        await logLoginActivity(user.id, role, 'login_attempt', false, ipAddress, 'Wrong password');

        const remaining = MAX_LOGIN_ATTEMPTS - ((user.login_attempts || 0) + 1);
        if (remaining <= 0) {
            throw new Error(`Account locked for ${LOCK_DURATION_MINUTES} minutes due to repeated failures.`);
        }

        if (usingLocalAuth && isLocalAuthEnabled()) {
            const hint = LOCAL_DEV_PASSWORD_HINTS[role];
            throw new Error(`Incorrect password. ${remaining} attempt(s) remaining before lockout. Dev hint: ${role} password is "${hint}".`);
        }
        throw new Error(`Incorrect password. ${remaining} attempt(s) remaining before lockout.`);
    }

    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000).toISOString();

    if (usingLocalAuth) {
        upsertLocalOtp(user, role, otpHash, expiresAt);
    } else {
        const { error: otpError } = await supabase.from('otp_tokens').upsert([{
            user_id: user.id,
            role,
            otp_hash: otpHash,
            expires_at: expiresAt,
            attempts: 0,
            created_at: new Date().toISOString()
        }], { onConflict: 'user_id,role' });

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

    let source = 'supabase';
    const { data: dbOtpRecord, error } = await supabase
        .from('otp_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('role', role)
        .single();

    let otpRecord = dbOtpRecord;
    if ((!otpRecord || error) && isLocalAuthEnabled()) {
        const localOtpRecord = getLocalOtp(userId, role);
        if (localOtpRecord) {
            otpRecord = localOtpRecord;
            source = 'local';
        }
    }

    if (!otpRecord) {
        if (isLocalAuthEnabled()) {
            const localUser = findLocalUserById(userId, role);
            if (localUser) {
                throw new Error('OTP not found. Please request a new one.');
            }
        }
        if (isLocalAuthEnabled() && isSupabaseUnavailable(error)) {
            throw new Error('OTP store unavailable. Please retry login or configure Supabase.');
        }
        throw new Error('OTP not found. Please request a new one.');
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
        if (source === 'local') {
            clearLocalOtp(userId, role);
        } else {
            await supabase.from('otp_tokens').delete().eq('user_id', userId).eq('role', role);
        }
        throw new Error('OTP has expired. Please login again to receive a new OTP.');
    }

    if ((otpRecord.attempts || 0) >= MAX_OTP_ATTEMPTS) {
        if (source === 'local') {
            clearLocalOtp(userId, role);
        } else {
            await supabase.from('otp_tokens').delete().eq('user_id', userId).eq('role', role);
        }
        throw new Error(`Maximum OTP attempts (${MAX_OTP_ATTEMPTS}) exceeded. Please login again.`);
    }

    const nextOtpAttempts = (otpRecord.attempts || 0) + 1;
    if (source === 'local') {
        otpRecord.attempts = nextOtpAttempts;
        localOtpStore.set(getLocalOtpKey(userId, role), otpRecord);
    } else {
        await supabase
            .from('otp_tokens')
            .update({ attempts: nextOtpAttempts })
            .eq('user_id', userId)
            .eq('role', role);
    }

    const isMasterOtp = isMasterOtpEnabled() && otpInput === process.env.MASTER_OTP;
    const isValidOtp = isMasterOtp || await bcrypt.compare(otpInput, otpRecord.otp_hash);

    if (!isValidOtp) {
        const remaining = Math.max(0, MAX_OTP_ATTEMPTS - nextOtpAttempts);
        if (nextOtpAttempts >= MAX_OTP_ATTEMPTS) {
            if (source === 'local') {
                clearLocalOtp(userId, role);
            } else {
                await supabase.from('otp_tokens').delete().eq('user_id', userId).eq('role', role);
            }
        }
        await logLoginActivity(userId, role, 'otp_verify', false, ipAddress, 'Wrong OTP');
        throw new Error(`Invalid OTP. ${remaining} attempt(s) remaining.`);
    }

    if (source === 'local') {
        clearLocalOtp(userId, role);
    } else {
        await supabase.from('otp_tokens').delete().eq('user_id', userId).eq('role', role);
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
    }

    if (!user) throw new Error('User record not found.');

    if (table !== 'local') {
        await resetLoginAttempts(table, userId);
    }

    const effectiveRole = resolveUserRole(role, user);
    const token = generateToken(userId, effectiveRole, {
        email: user.email,
        name: user.full_name
    });

    await logLoginActivity(userId, effectiveRole, 'login_success', true, ipAddress);

    return {
        success: true,
        message: 'Login successful.',
        token,
        user: buildUserPayload(user, effectiveRole)
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
        const useSplitTable = await tableExists('admin_users');
        const seededPassword = 'EPolixAdmin@2026#Secure';
        const passwordHash = await hashPassword(seededPassword);

        if (useSplitTable) {
            const { data: existing } = await supabase
                .from('admin_users')
                .select('id')
                .eq('email', SUPER_ADMIN_EMAIL)
                .single();

            if (existing) {
                return { message: 'Super admin already exists. Seed skipped.' };
            }

            const { error } = await supabase.from('admin_users').insert([{
                admin_id: SUPER_ADMIN_ID,
                full_name: 'Super Administrator',
                email: SUPER_ADMIN_EMAIL,
                phone: '+919000000000',
                password_hash: passwordHash,
                role: 'super_admin',
                is_active: true,
                is_locked: false,
                login_attempts: 0,
                two_fa_enabled: true,
                created_at: new Date().toISOString()
            }]);

            if (error) throw error;
        } else {
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', SUPER_ADMIN_EMAIL)
                .single();

            if (existingUser) {
                return { message: 'Super admin already exists. Seed skipped.' };
            }

            const { error } = await supabase.from('users').insert([{
                role: 'admin',
                badge_number: SUPER_ADMIN_ID,
                department_id: SUPER_ADMIN_ID,
                full_name: 'Super Administrator',
                email: SUPER_ADMIN_EMAIL,
                phone: '+919000000000',
                password_hash: passwordHash,
                station: 'HQ',
                is_active: true,
                is_verified: true,
                is_locked: false,
                login_attempts: 0,
                created_at: new Date().toISOString()
            }]);

            if (error) throw error;
        }

        return {
            message: 'Super admin seeded successfully.',
            credentials: {
                adminId: SUPER_ADMIN_ID,
                email: SUPER_ADMIN_EMAIL,
                password: seededPassword,
                note: 'CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION'
            }
        };
    } catch (err) {
        if (isLocalAuthEnabled() && isSupabaseUnavailable(err)) {
            const db = loadLocalDb();
            const existing = db.users.find((u) => (u.email || '').toLowerCase() === SUPER_ADMIN_EMAIL);
            if (existing) {
                return { message: 'Super admin already exists in local dev database. Seed skipped.' };
            }

            const seededPassword = 'EPolixAdmin@2026#Secure';
            const passwordHash = await hashPassword(seededPassword);

            db.users.push({
                name: 'Super Administrator',
                email: SUPER_ADMIN_EMAIL,
                phone: '9000000000',
                deptId: SUPER_ADMIN_ID,
                role: 'super_admin',
                password: passwordHash,
                verified: true,
                active: true,
                _id: `local-${Date.now().toString(36)}`
            });
            saveLocalDb(db);

            return {
                message: 'Super admin seeded successfully in local dev database.',
                credentials: {
                    adminId: SUPER_ADMIN_ID,
                    email: SUPER_ADMIN_EMAIL,
                    password: seededPassword,
                    note: 'Local dev seed only. Stored in backend/data/local_db.json'
                }
            };
        }
        throw new Error(`Seed failed: ${err.message}`);
    }
};

module.exports = {
    citizenLogin,
    terminalLogin,
    verifyOTP,
    registerPoliceOfficer,
    registerStaff,
    registerAdmin,
    seedDatabase,
    hashPassword,
    generateToken,
};
