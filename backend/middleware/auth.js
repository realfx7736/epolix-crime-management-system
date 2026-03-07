const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { supabase } = require('../config/supabase');

// Verify JWT token and attach user to request
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw ApiError.unauthorized('Access token is required. Please log in.');
        }

        const token = authHeader.split(' ')[1];

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch fresh user data from database
        const { data: user, error } = await supabase
            .from('users')
            .select('id, full_name, email, phone, role, department_id, badge_number, rank, station, is_active, is_verified')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            throw ApiError.unauthorized('User not found or token is invalid.');
        }

        if (!user.is_active) {
            throw ApiError.forbidden('Your account has been deactivated. Contact administrator.');
        }

        // Attach user to request
        req.user = {
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            departmentId: user.department_id,
            badgeNumber: user.badge_number,
            rank: user.rank,
            station: user.station,
            isVerified: user.is_verified
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(ApiError.unauthorized('Token has expired. Please log in again.'));
        }
        if (err.name === 'JsonWebTokenError') {
            return next(ApiError.unauthorized('Invalid token. Please log in again.'));
        }
        next(err);
    }
};

// Optional authentication — doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.user = null;
            return next();
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const { data: user } = await supabase
            .from('users')
            .select('id, full_name, email, role, is_active')
            .eq('id', decoded.userId)
            .single();

        req.user = user ? {
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            role: user.role
        } : null;

        next();
    } catch {
        req.user = null;
        next();
    }
};

module.exports = { authenticate, optionalAuth };
