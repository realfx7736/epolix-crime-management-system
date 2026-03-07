const ApiError = require('../utils/ApiError');

// Role-Based Access Control middleware factory
// Usage: authorize('admin', 'police') — allows only admin and police roles
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(ApiError.unauthorized('Authentication required.'));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(ApiError.forbidden(
                `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
            ));
        }

        next();
    };
};

// Check if user owns the resource or has elevated role
const authorizeOwnerOrRole = (ownerField, ...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(ApiError.unauthorized('Authentication required.'));
        }

        const resourceOwnerId = req.params[ownerField] || req.body[ownerField];

        // Allow if user is the owner
        if (resourceOwnerId && resourceOwnerId === req.user.id) {
            return next();
        }

        // Allow if user has an elevated role
        if (allowedRoles.includes(req.user.role)) {
            return next();
        }

        return next(ApiError.forbidden('You do not have permission to access this resource.'));
    };
};

// Self-access only (user can only access their own data)
const selfOnly = (paramName = 'id') => {
    return (req, res, next) => {
        if (!req.user) {
            return next(ApiError.unauthorized('Authentication required.'));
        }

        if (req.params[paramName] !== req.user.id && req.user.role !== 'admin') {
            return next(ApiError.forbidden('You can only access your own data.'));
        }

        next();
    };
};

module.exports = { authorize, authorizeOwnerOrRole, selfOnly };
