const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { authLimiter, otpLimiter, adminAuthLimiter } = require('../middleware/rateLimiter');
const { validate, citizenLoginSchema, terminalLoginSchema, verifyOtpLoginSchema } = require('../middleware/validator');

const terminalLoginLimiter = (req, res, next) => {
    const role = String(req.body?.role || '').toLowerCase();
    if (role === 'admin') {
        return adminAuthLimiter(req, res, next);
    }
    return authLimiter(req, res, next);
};

// ─── Public Routes ─────────────────────────────────────────────────────────

// Citizen Aadhaar login
router.post('/citizen/login', authLimiter, validate(citizenLoginSchema), authController.citizenLogin);

// Terminal login (Police / Staff / Admin)
router.post('/terminal/login', terminalLoginLimiter, validate(terminalLoginSchema), authController.terminalLogin);

// Admin-specific login (extra strict limiter)
router.post('/admin/login', adminAuthLimiter, validate(terminalLoginSchema), authController.terminalLogin);

// OTP verification (all roles)
router.post('/verify-otp', otpLimiter, validate(verifyOtpLoginSchema), authController.verifyOTP);

// Legacy OTP route for backward compatibility
router.post('/citizen/verify-otp', otpLimiter, validate(verifyOtpLoginSchema), authController.verifyOTP);
router.post('/terminal/verify-otp', otpLimiter, validate(verifyOtpLoginSchema), authController.verifyOTP);

// Seed endpoint (secured in production)
router.post('/seed', authController.seedDatabase);

// ─── Protected Routes ──────────────────────────────────────────────────────

// Get own profile (any authenticated role)
router.get('/profile', authenticate, authController.getProfile);

// Register Police Officer (Admin only)
router.post(
    '/register/police',
    authenticate,
    authorize('admin', 'super_admin'),
    authController.registerPoliceOfficer
);

// Register Staff Member (Admin only)
router.post(
    '/register/staff',
    authenticate,
    authorize('admin', 'super_admin'),
    authController.registerStaff
);

// Register Admin (Super Admin only)
router.post(
    '/register/admin',
    authenticate,
    authorize('super_admin'),
    authController.registerAdmin
);

module.exports = router;
