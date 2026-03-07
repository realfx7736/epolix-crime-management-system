const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

// Global error handling middleware
const errorHandler = (err, req, res, next) => {
    // Log the error
    logger.error(err.message, {
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id
    });

    // Handle known API errors
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            details: err.details || null
        });
    }

    // Handle Joi validation errors
    if (err.isJoi) {
        const details = err.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
        }));
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            details
        });
    }

    // Handle multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            message: 'File too large. Maximum size is 50MB.'
        });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            message: 'Unexpected file field.'
        });
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid authentication token.'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Authentication token has expired.'
        });
    }

    // Default 500 server error
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred.'
        : err.message || 'Internal server error';

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

// 404 handler
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found.`
    });
};

module.exports = { errorHandler, notFoundHandler };
