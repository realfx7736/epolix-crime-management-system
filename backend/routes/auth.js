const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, registerSchema, loginSchema, otpVerifySchema } = require('../middleware/validator');
const rateLimit = require('express-rate-limit');

// Rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { success: false, message: 'Too many attempts. Please try again after 15 minutes.' }
});

// ---- Public Routes ----
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/verify-otp', authLimiter, validate(otpVerifySchema), authController.verifyOTP);

// Citizen Specific Aadhaar Auth
router.post('/citizen/aadhaar', authLimiter, authController.citizenAadhaarStep1);
router.post('/citizen/verify-otp', authLimiter, authController.citizenVerifyOTP);

router.post('/refresh-token', authController.refreshToken);

// ---- Protected Routes ----
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);

// ---- Dev/Admin Route ----
router.get('/seed', authController.seedDatabase);

module.exports = router;