const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { supabase } = require('../config/supabase');

// ─── Constants ────────────────────────────────────────────────────────────────
const OTP_EXPIRY_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 3;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '8h';
const SALT_ROUNDS = 12;

// ─── ID Format Validators ─────────────────────────────────────────────────────
const isValidPoliceId = (id) => /^OFF-\d{3,6}$/.test(id?.trim());
const isValidStaffId = (id) => /^STF-\d{3,6}$/.test(id?.trim());
const isValidAdminId = (id) => /^ADM-[A-Z]{2}-\d{4}-\d{4}$/.test(id?.trim());
const isValidAadhaar = (num) => /^\d{12}$/.test((num || '').replace(/\s|-/g, ''));
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ─── Generate OTP ─────────────────────────────────────────────────────────────
const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

// ─── Generate JWT ─────────────────────────────────────────────────────────────
const generateToken = (userId, role, extra = {}) => {
    return jwt.sign(
        { userId, role, ...extra, iat: Math.floor(Date.now() / 1000) },
        process.env.JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
};

// ─── Hash Password ────────────────────────────────────────────────────────────
const hashPassword = async (password) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
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
    } catch (_) { /* non-blocking */ }
};

// ─── Record failed login + optional lock ─────────────────────────────────────
const recordFailedLogin = async (table, id, field = 'id') => {
    const { data: user } = await supabase.from(table).select('login_attempts, id').eq(field, id).single();
    if (!user) return;
    const attempts = (user.login_attempts || 0) + 1;
    const updates = { login_attempts: attempts };
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
        updates.is_locked = true;
        updates.locked_until = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString();
    }
    await supabase.from(table).update(updates).eq('id', user.id);
};

// ─── Reset failed logins on success ──────────────────────────────────────────
const resetLoginAttempts = async (table, id) => {
    await supabase.from(table).update({
        login_attempts: 0,
        is_locked: false,
        locked_until: null,
        last_login: new Date().toISOString()
    }).eq('id', id);
};

// ═══════════════════════════════════════════════════════════════════════════════
// CITIZEN LOGIN via Aadhaar
// ═══════════════════════════════════════════════════════════════════════════════
const citizenLogin = async (aadhaarNumber, ipAddress) => {
    const cleaned = (aadhaarNumber || '').replace(/\s|-/g, '');

    if (!isValidAadhaar(cleaned)) {
        throw new Error('Invalid Aadhaar number format. Must be 12 digits.');
    }

    // Hash the Aadhaar for lookup (stored hashed)
    const { data: users, error } = await supabase
        .from('users')
        .select('id, full_name, email, phone, aadhaar_hash, is_active, is_locked, locked_until')
        .eq('is_active', true);

    if (error) throw new Error('Database error during citizen verification.');

    // Find matching aadhaar by comparing hashes
    let matchedUser = null;
    for (const user of (users || [])) {
        if (user.aadhaar_hash) {
            const match = await bcrypt.compare(cleaned, user.aadhaar_hash);
            if (match) { matchedUser = user; break; }
        }
    }

    if (!matchedUser) {
        await logLoginActivity(null, 'citizen', 'login_attempt', false, ipAddress, 'Invalid Aadhaar');
        throw new Error('Aadhaar number not found in the system. Please verify your number.');
    }

    if (matchedUser.is_locked && matchedUser.locked_until && new Date(matchedUser.locked_until) > new Date()) {
        throw new Error('Account temporarily locked. Please contact police station.');
    }

    // Generate and store OTP
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
        otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
        masterOtp: process.env.MASTER_OTP
    };
};

// ═══════════════════════════════════════════════════════════════════════════════
// TERMINAL LOGIN (Police / Staff / Admin)
// ═══════════════════════════════════════════════════════════════════════════════
const terminalLogin = async (role, identifier, password, ipAddress) => {
    if (!['police', 'staff', 'admin'].includes(role)) {
        throw new Error('Invalid role specified.');
    }

    const tableMap = { police: 'police_officers', staff: 'staff_members', admin: 'admin_users' };
    const idFieldMap = { police: 'police_id', staff: 'staff_id', admin: 'admin_id' };
    const table = tableMap[role];
    const idField = idFieldMap[role];

    // Validate ID format
    if (role === 'police' && !isValidPoliceId(identifier)) {
        await logLoginActivity(null, role, 'login_attempt', false, ipAddress, `Invalid police ID format: ${identifier}`);
        throw new Error('Invalid Police ID format. Expected format: OFF-XXXXXX');
    }
    if (role === 'staff' && !isValidStaffId(identifier)) {
        await logLoginActivity(null, role, 'login_attempt', false, ipAddress, `Invalid staff ID format: ${identifier}`);
        throw new Error('Invalid Staff ID format. Expected format: STF-XXXXXX');
    }
    if (role === 'admin') {
        const isValidId = isValidAdminId(identifier);
        const isValidMail = isValidEmail(identifier);
        if (!isValidId && !isValidMail) {
            await logLoginActivity(null, role, 'login_attempt', false, ipAddress, `Invalid admin ID/email: ${identifier}`);
            throw new Error('Invalid Admin ID format (ADM-KL-2026-XXXX) or email address.');
        }
    }

    // Query by ID or email
    let query = supabase.from(table).select('*');
    if (isValidEmail(identifier)) {
        query = query.eq('email', identifier.toLowerCase().trim());
    } else {
        query = query.eq(idField, identifier.trim().toUpperCase());
    }
    const { data: user, error } = await query.single();

    if (error || !user) {
        await logLoginActivity(null, role, 'login_attempt', false, ipAddress, `User not found: ${identifier}`);
        throw new Error(`${role.charAt(0).toUpperCase() + role.slice(1)} ID not found in the system.`);
    }

    // Check account status
    if (user.is_active === false) {
        throw new Error('Your account has been deactivated. Contact the administrator.');
    }
    if (user.is_locked === true || (user.locked_until && new Date(user.locked_until) > new Date())) {
        const unlockTime = user.locked_until ? new Date(user.locked_until).toLocaleTimeString() : 'soon';
        throw new Error(`Account locked until ${unlockTime}. Too many failed attempts.`);
    }

    // Verify password
    if (!user.password_hash) {
        throw new Error('Account not properly configured. Contact administrator.');
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
        await recordFailedLogin(table, user.id);
        await logLoginActivity(user.id, role, 'login_attempt', false, ipAddress, 'Wrong password');
        const remaining = MAX_LOGIN_ATTEMPTS - ((user.login_attempts || 0) + 1);
        if (remaining <= 0) {
            throw new Error(`Account locked for ${LOCK_DURATION_MINUTES} minutes due to repeated failures.`);
        }
        throw new Error(`Incorrect password. ${remaining} attempt(s) remaining before lockout.`);
    }

    // Generate OTP
    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000).toISOString();

    await supabase.from('otp_tokens').upsert([{
        user_id: user.id,
        role,
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempts: 0,
        created_at: new Date().toISOString()
    }], { onConflict: 'user_id,role' });

    await logLoginActivity(user.id, role, 'otp_sent', true, ipAddress);

    return {
        success: true,
        message: 'Credentials verified. OTP sent to registered contact.',
        userId: user.id,
        name: user.full_name,
        role,
        otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
        masterOtp: process.env.MASTER_OTP
    };
};

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFY OTP (All Roles)
// ═══════════════════════════════════════════════════════════════════════════════
const verifyOTP = async (userId, role, otpInput, ipAddress) => {
    if (!userId || !role || !otpInput) {
        throw new Error('Missing required fields: userId, role, otp.');
    }

    const tableMap = { citizen: 'users', police: 'police_officers', staff: 'staff_members', admin: 'admin_users' };
    const table = tableMap[role];

    // Get OTP record
    const { data: otpRecord, error } = await supabase
        .from('otp_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('role', role)
        .single();

    if (error || !otpRecord) {
        throw new Error('OTP not found. Please request a new one.');
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
        await supabase.from('otp_tokens').delete().eq('user_id', userId).eq('role', role);
        throw new Error('OTP has expired. Please login again to receive a new OTP.');
    }

    // Check attempt count
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
        await supabase.from('otp_tokens').delete().eq('user_id', userId).eq('role', role);
        throw new Error(`Maximum OTP attempts (${MAX_OTP_ATTEMPTS}) exceeded. Please login again.`);
    }

    // Increment attempt count
    await supabase.from('otp_tokens').update({ attempts: otpRecord.attempts + 1 }).eq('user_id', userId).eq('role', role);

    // Check master OTP (development bypass)
    const isMasterOtp = process.env.MASTER_OTP && otpInput === process.env.MASTER_OTP;
    const isValidOtp = isMasterOtp || await bcrypt.compare(otpInput, otpRecord.otp_hash);

    if (!isValidOtp) {
        const remaining = MAX_OTP_ATTEMPTS - (otpRecord.attempts + 1);
        await logLoginActivity(userId, role, 'otp_verify', false, ipAddress, 'Wrong OTP');
        throw new Error(`Invalid OTP. ${remaining} attempt(s) remaining.`);
    }

    // OTP verified — clean up and reset login attempts
    await supabase.from('otp_tokens').delete().eq('user_id', userId).eq('role', role);
    await resetLoginAttempts(table, userId);

    // Fetch full user
    const { data: user } = await supabase.from(table).select('*').eq('id', userId).single();
    if (!user) throw new Error('User record not found.');

    const token = generateToken(userId, role, {
        email: user.email,
        name: user.full_name
    });

    await logLoginActivity(userId, role, 'login_success', true, ipAddress);

    return {
        success: true,
        message: 'Login successful.',
        token,
        user: {
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            phone: user.phone,
            role,
            policeId: user.police_id,
            staffId: user.staff_id,
            adminId: user.admin_id,
            department: user.department,
            rank: user.rank,
            station: user.station,
        }
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
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');

    // Check duplicate email
    const { data: existing } = await supabase.from('police_officers').select('id').eq('email', email.toLowerCase()).single();
    if (existing) throw new Error('An officer with this email already exists.');

    // Auto-generate police ID
    const { count } = await supabase.from('police_officers').select('id', { count: 'exact', head: true });
    const policeId = `OFF-${String((count || 0) + 1).padStart(3, '0')}`;

    const passwordHash = await hashPassword(password);

    const { data: officer, error } = await supabase.from('police_officers').insert([{
        police_id: policeId,
        full_name: fullName.trim(),
        email: email.toLowerCase().trim(),
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
    return { success: true, policeId, officer: { ...officer, password_hash: undefined } };
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

    const { data: existing } = await supabase.from('staff_members').select('id').eq('email', email.toLowerCase()).single();
    if (existing) throw new Error('A staff member with this email already exists.');

    const { count } = await supabase.from('staff_members').select('id', { count: 'exact', head: true });
    const staffId = `STF-${String((count || 0) + 1).padStart(3, '0')}`;
    const passwordHash = await hashPassword(password);

    const { data: staff, error } = await supabase.from('staff_members').insert([{
        staff_id: staffId,
        full_name: fullName.trim(),
        email: email.toLowerCase().trim(),
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
    return { success: true, staffId, staff: { ...staff, password_hash: undefined } };
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
    if (password.length < 14) throw new Error('Admin password must be at least 14 characters.');
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(password)) {
        throw new Error('Admin password must include uppercase, lowercase, numbers, and special characters.');
    }

    const { data: existing } = await supabase.from('admin_users').select('id').eq('email', email.toLowerCase()).single();
    if (existing) throw new Error('An admin with this email already exists.');

    const year = new Date().getFullYear();
    const { count } = await supabase.from('admin_users').select('id', { count: 'exact', head: true });
    const adminId = `ADM-KL-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
    const passwordHash = await hashPassword(password);

    const { data: admin, error } = await supabase.from('admin_users').insert([{
        admin_id: adminId,
        full_name: fullName.trim(),
        email: email.toLowerCase().trim(),
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
    return { success: true, adminId, admin: { ...admin, password_hash: undefined } };
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEED DATABASE (Super Admin bootstrap)
// ═══════════════════════════════════════════════════════════════════════════════
const seedDatabase = async () => {
    try {
        const { data: existing } = await supabase
            .from('admin_users')
            .select('id')
            .eq('email', 'admin@epolix.gov.in')
            .single();

        if (existing) {
            return { message: 'Super admin already exists. Seed skipped.' };
        }

        const passwordHash = await hashPassword('EPolixAdmin@2026#Secure');
        const { error } = await supabase.from('admin_users').insert([{
            admin_id: 'ADM-KL-2026-0001',
            full_name: 'Super Administrator',
            email: 'admin@epolix.gov.in',
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
        return {
            message: 'Super admin seeded successfully.',
            credentials: {
                adminId: 'ADM-KL-2026-0001',
                email: 'admin@epolix.gov.in',
                password: 'EPolixAdmin@2026#Secure',
                note: 'CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION'
            }
        };
    } catch (err) {
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
