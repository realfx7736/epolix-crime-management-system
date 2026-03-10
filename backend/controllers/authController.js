const authService = require('../services/authService');

// ─── Helper ────────────────────────────────────────────────────────────────
const getIp = (req) =>
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

const isProduction = process.env.NODE_ENV === 'production';
const withSafeAuthError = (fallback, actual) => (isProduction ? fallback : actual);

// ─── Citizen: Aadhaar verification → OTP ──────────────────────────────────
const citizenLogin = async (req, res) => {
    try {
        const { aadhaarNumber } = req.body;
        if (!aadhaarNumber) {
            return res.status(400).json({ success: false, error: 'Aadhaar number is required.' });
        }
        const result = await authService.citizenLogin(aadhaarNumber, getIp(req));
        return res.status(200).json(result);
    } catch (err) {
        return res.status(400).json({
            success: false,
            error: withSafeAuthError('Authentication failed. Please try again.', err.message)
        });
    }
};

// ─── Terminal Login (Police / Staff / Admin) ───────────────────────────────
const terminalLogin = async (req, res) => {
    try {
        const { role, identifier, password } = req.body;
        if (!role || !identifier || !password) {
            return res.status(400).json({ success: false, error: 'role, identifier, and password are required.' });
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

module.exports = {
    citizenLogin,
    terminalLogin,
    verifyOTP,
    registerPoliceOfficer,
    registerStaff,
    registerAdmin,
    seedDatabase,
    getProfile,
};
