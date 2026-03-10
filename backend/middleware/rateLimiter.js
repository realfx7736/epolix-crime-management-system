const rateLimit = require('express-rate-limit');

// ─── General API rate limiter ─────────────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests. Please wait and try again.' },
    skip: (req) => req.path === '/health',
});

// ─── Strict auth rate limiter (login/OTP) ─────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // 10 login attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many login attempts. Account temporarily blocked. Try again in 15 minutes.' },
    skipSuccessfulRequests: true,
});

// ─── OTP-specific stricter limiter ────────────────────────────────────────
const otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,  // 5 minutes
    max: 5,                    // 5 OTP attempts
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many OTP attempts. Try again in 5 minutes.' },
});

// ─── Admin-only limiter (extra strict) ────────────────────────────────────
const adminAuthLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, // 30 minutes
    max: 5,                    // only 5 attempts total
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Admin login attempts exceeded. Account locked for 30 minutes.' },
    skipSuccessfulRequests: true,
});

module.exports = { apiLimiter, authLimiter, otpLimiter, adminAuthLimiter };
