const authService = require('../services/authService');

// ─── Helper ────────────────────────────────────────────────────────────────
const getIp = (req) =>
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

const isProduction = process.env.NODE_ENV === 'production';
const withSafeAuthError = (fallback, actual) => (isProduction ? fallback : actual);

// ─── Citizen: Smart Login (Mobile/Email/CIT-ID) → OTP ────────────────────
const citizenLogin = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier) {
            return res.status(400).json({ success: false, error: 'Identity identifier is required.' });
        }
        const result = await authService.citizenLogin(identifier, password, getIp(req));
        return res.status(200).json(result);
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: withSafeAuthError('Authentication failed. Please try again.', err.message)
        });
    }
};

// ─── Citizen Direct Mobile OTP Flow ───────────────────────────────────────
const sendLoginOTP = async (req, res) => {
    try {
        const { mobile_number, identifier, role } = req.body;
        const mobile = mobile_number || identifier;
        const targetRole = role || 'citizen';
        if (!mobile) {
            return res.status(400).json({ success: false, error: 'Mobile number is required.' });
        }
        const result = await authService.sendLoginOTP(mobile, getIp(req), targetRole);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(400).json({
            success: false,
            error: withSafeAuthError('Failed to send OTP.', err.message)
        });
    }
};

const verifyLoginOTP = async (req, res) => {
    try {
        const { mobile_number, identifier, otp, role } = req.body;
        const mobile = mobile_number || identifier;
        const targetRole = role || 'citizen';
        if (!mobile || !otp) {
            return res.status(400).json({ success: false, error: 'Mobile number and OTP are required.' });
        }
        const result = await authService.verifyLoginOTP(mobile, otp, getIp(req), targetRole);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: withSafeAuthError('OTP Verification Failed.', err.message)
        });
    }
};


// ─── Aadhaar KYC: Flow ────────────────────────────────────────────────────
const sendAadhaarOTP = async (req, res) => {
    try {
        const { aadhaarNumber } = req.body;
        const userId = req.user.id;
        if (!aadhaarNumber) return res.status(400).json({ success: false, error: 'Aadhaar required.' });
        const result = await authService.sendAadhaarOTP(userId, aadhaarNumber);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(400).json({ success: false, error: err.message });
    }
};

const verifyAadhaarOTP = async (req, res) => {
    try {
        const { aadhaarNumber, otp } = req.body;
        const userId = req.user.id;
        if (!aadhaarNumber || !otp) return res.status(400).json({ success: false, error: 'Aadhaar and OTP required.' });
        const result = await authService.verifyAadhaarOTP(userId, aadhaarNumber, otp);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(400).json({ success: false, error: err.message });
    }
};

// ─── Terminal Login (Police / Staff / Admin) ───────────────────────────────
const terminalLogin = async (req, res) => {
    try {
        const { role, identifier, password } = req.body;
        if (!role || !identifier) {
            return res.status(400).json({ success: false, error: 'role and identifier are required.' });
        }
        const result = await authService.terminalLogin(role, identifier, password, getIp(req));
        return res.status(200).json(result);
    } catch (err) {
        return res.status(400).json({
            success: false,
            error: withSafeAuthError('Authentication failed. Please check credentials and try again.', err.message)
        });
    }
};

// ─── Explicit Requested Login / OTP ──────────────────────────────────────────
const policeLoginExplicit = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) return res.status(400).json({ success: false, error: 'identifier and password are required.' });
        const result = await authService.terminalLogin('police', identifier, password, getIp(req));
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ success: false, error: withSafeAuthError('Authentication failed.', err.message) });
    }
};

const staffLoginExplicit = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) return res.status(400).json({ success: false, error: 'identifier and password are required.' });
        const result = await authService.terminalLogin('staff', identifier, password, getIp(req));
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ success: false, error: withSafeAuthError('Authentication failed.', err.message) });
    }
};

const generateOtpExplicit = async (req, res) => {
    try {
        return await sendLoginOTP(req, res);
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Failed to generate OTP' });
    }
};

// ─── Verify OTP (All roles) ───────────────────────────────────────────────
const verifyOTP = async (req, res) => {
    try {
        const { userId, role, otp } = req.body;
        if (!userId || !role || !otp) {
            return res.status(400).json({ success: false, error: 'userId, role, and otp are required.' });
        }
        const result = await authService.verifyOTP(userId, role, otp, getIp(req));
        return res.status(200).json(result);
    } catch (err) {
        return res.status(400).json({
            success: false,
            error: withSafeAuthError('OTP verification failed. Please retry login.', err.message)
        });
    }
};

// ─── Register Police Officer (Admin only) ─────────────────────────────────
const registerPoliceOfficer = async (req, res) => {
    try {
        const result = await authService.registerPoliceOfficer(req.body);
        return res.status(201).json(result);
    } catch (err) {
        return res.status(400).json({ success: false, error: err.message });
    }
};

// ─── Register Staff Member (Admin only) ───────────────────────────────────
const registerStaff = async (req, res) => {
    try {
        const result = await authService.registerStaff(req.body);
        return res.status(201).json(result);
    } catch (err) {
        return res.status(400).json({ success: false, error: err.message });
    }
};

// ─── Register Admin (Super Admin only) ────────────────────────────────────
const registerAdmin = async (req, res) => {
    try {
        const result = await authService.registerAdmin(req.body);
        return res.status(201).json(result);
    } catch (err) {
        return res.status(400).json({ success: false, error: err.message });
    }
};

// ─── Seed Database ────────────────────────────────────────────────────────
const seedDatabase = async (req, res) => {
    try {
        if (isProduction) {
            return res.status(403).json({ success: false, error: 'Seed endpoint is disabled in production.' });
        }
        const result = await authService.seedDatabase();
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        console.error('Seed Error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

// ─── Get own profile ──────────────────────────────────────────────────────
const getProfile = async (req, res) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ success: false, error: 'Not authenticated.' });
        return res.status(200).json({ success: true, user });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: refreshTokenStr } = req.body;
        if (!refreshTokenStr) {
            return res.status(400).json({ success: false, error: 'Refresh token required.' });
        }
        const result = await authService.refreshAccessToken(refreshTokenStr);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(401).json({ success: false, error: err.message });
    }
};

module.exports = {
    citizenLogin,
    terminalLogin,
    verifyOTP,
    refreshToken,
    registerPoliceOfficer,
    registerStaff,
    registerAdmin,
    seedDatabase,
    getProfile,
    sendAadhaarOTP,
    verifyAadhaarOTP,
    sendLoginOTP,
    verifyLoginOTP,
    policeLoginExplicit,
    staffLoginExplicit,
    generateOtpExplicit
};
