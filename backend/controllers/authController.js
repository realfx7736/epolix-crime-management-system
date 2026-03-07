const authService = require('../services/authService');

const register = async (req, res, next) => {
    try {
        const user = await authService.register(req.body);
        res.status(201).json({ success: true, message: 'Registration successful.', data: user });
    } catch (err) { next(err); }
};

const login = async (req, res, next) => {
    try {
        const { identifier, password, role } = req.body;
        const result = await authService.login(identifier, password, role);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const verifyOTP = async (req, res, next) => {
    try {
        const { identifier, otp, role } = req.body;
        const result = await authService.verifyOTP(identifier, otp, role);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token is required.' });
        const result = await authService.refreshToken(refreshToken);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const getProfile = async (req, res, next) => {
    try {
        const profile = await authService.getProfile(req.user.id);
        res.json({ success: true, data: profile });
    } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
    try {
        const updated = await authService.updateProfile(req.user.id, req.body);
        res.json({ success: true, message: 'Profile updated.', data: updated });
    } catch (err) { next(err); }
};

const seedDatabase = async (req, res, next) => {
    try {
        const result = await authService.seedUsers();
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

module.exports = { register, login, verifyOTP, refreshToken, getProfile, updateProfile, seedDatabase };
