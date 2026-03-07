// ============================================================
// E-POLIX Crime Record Management System — Backend Server
// Version 2.0 — Supabase + PostgreSQL
// ============================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Initialize Express
const app = express();

// ============================================================
// SECURITY & MIDDLEWARE
// ============================================================

// Helmet — security headers
app.use(helmet());

// CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(morgan('dev'));

// Global rate limiting
const globalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
    message: { success: false, message: 'Too many requests. Please slow down.' }
});
app.use('/api/', globalLimiter);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================================
// API ROUTES
// ============================================================

app.use('/api/auth', require('./routes/auth'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/cases', require('./routes/cases'));
app.use('/api/evidence', require('./routes/evidence'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'operational',
        service: 'E-POLIX Backend API v2.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        modules: [
            'Authentication',
            'Complaint Management',
            'Case Management',
            'Evidence Upload',
            'Crime Dashboard',
            'Notifications',
            'Admin Management'
        ]
    });
});

// API documentation summary
app.get('/api', (req, res) => {
    res.json({
        success: true,
        service: 'E-POLIX Crime Record Management API',
        version: '2.0.0',
        endpoints: {
            auth: {
                'POST /api/auth/register': 'Register a new user',
                'POST /api/auth/login': 'Login (Stage 1: identity + password)',
                'POST /api/auth/verify-otp': 'Login (Stage 2: OTP verification)',
                'POST /api/auth/refresh-token': 'Refresh access token',
                'GET  /api/auth/profile': 'Get user profile',
                'PUT  /api/auth/profile': 'Update user profile',
                'GET  /api/auth/seed': 'Seed default users (dev)'
            },
            complaints: {
                'POST /api/complaints': 'Submit a complaint',
                'GET  /api/complaints': 'List all complaints (staff/police/admin)',
                'GET  /api/complaints/my': 'List my complaints',
                'GET  /api/complaints/categories': 'Get crime categories',
                'GET  /api/complaints/track/:number': 'Track complaint by number',
                'GET  /api/complaints/:id': 'Get complaint details',
                'PUT  /api/complaints/:id': 'Update complaint (staff/police/admin)',
                'DELETE /api/complaints/:id': 'Delete complaint (admin)'
            },
            cases: {
                'POST /api/cases': 'Create a case (police/staff/admin)',
                'GET  /api/cases': 'List all cases',
                'GET  /api/cases/my': 'My assigned cases (police)',
                'GET  /api/cases/track/:number': 'Track case by number',
                'GET  /api/cases/:id': 'Get case details',
                'GET  /api/cases/:id/updates': 'Get case timeline',
                'PUT  /api/cases/:id': 'Update case (police/admin)',
                'POST /api/cases/:id/assign': 'Assign officer (staff/admin)',
                'POST /api/cases/:id/notes': 'Add investigation note',
                'DELETE /api/cases/:id': 'Delete case (admin)'
            },
            evidence: {
                'POST /api/evidence/upload': 'Upload single evidence file',
                'POST /api/evidence/upload-multiple': 'Upload multiple files',
                'GET  /api/evidence/case/:caseId': 'Get evidence by case',
                'GET  /api/evidence/complaint/:complaintId': 'Get evidence by complaint',
                'GET  /api/evidence/:id': 'Get evidence details',
                'PATCH /api/evidence/:id/verify': 'Verify evidence (police/admin)',
                'DELETE /api/evidence/:id': 'Delete evidence (police/admin)'
            },
            dashboard: {
                'GET /api/dashboard/overview': 'Overall statistics',
                'GET /api/dashboard/trends': 'Crime trends (monthly)',
                'GET /api/dashboard/by-category': 'Complaints by category',
                'GET /api/dashboard/by-priority': 'Complaints by priority',
                'GET /api/dashboard/by-district': 'Complaints by district',
                'GET /api/dashboard/recent': 'Recent activity feed',
                'GET /api/dashboard/officer-performance': 'Officer metrics (admin)'
            },
            notifications: {
                'GET   /api/notifications': 'My notifications',
                'GET   /api/notifications/unread-count': 'Unread count',
                'PATCH /api/notifications/:id/read': 'Mark as read',
                'PATCH /api/notifications/read-all': 'Mark all as read',
                'DELETE /api/notifications/:id': 'Delete notification'
            },
            admin: {
                'GET    /api/admin/stats': 'System statistics',
                'GET    /api/admin/users': 'List all users',
                'GET    /api/admin/users/:id': 'Get user details',
                'POST   /api/admin/users': 'Create user',
                'PUT    /api/admin/users/:id': 'Update user',
                'PATCH  /api/admin/users/:id/activate': 'Activate user',
                'PATCH  /api/admin/users/:id/deactivate': 'Deactivate user',
                'DELETE /api/admin/users/:id': 'Delete user',
                'GET    /api/admin/officers': 'List all officers',
                'GET    /api/admin/logs': 'System audit logs'
            }
        }
    });
});

// ============================================================
// ERROR HANDLING
// ============================================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║                                                      ║');
    console.log('║   🛡️  E-POLIX Crime Record Management System        ║');
    console.log('║   📡 Backend API v2.0 — Supabase + PostgreSQL       ║');
    console.log('║                                                      ║');
    console.log(`║   🚀 Server running on port ${PORT}                     ║`);
    console.log(`║   🌐 Health: http://localhost:${PORT}/api/health         ║`);
    console.log(`║   📋 API Docs: http://localhost:${PORT}/api              ║`);
    console.log('║                                                      ║');
    console.log('║   Modules:                                           ║');
    console.log('║   ✅ Authentication (JWT + OTP)                      ║');
    console.log('║   ✅ Complaint Management                           ║');
    console.log('║   ✅ Case Management                                ║');
    console.log('║   ✅ Evidence Upload (Supabase Storage)             ║');
    console.log('║   ✅ Crime Dashboard & Analytics                    ║');
    console.log('║   ✅ Notification System                            ║');
    console.log('║   ✅ Admin Management & Audit Logs                  ║');
    console.log('║                                                      ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');

    logger.info(`E-POLIX Backend started on port ${PORT}`);
});

module.exports = app;