const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All dashboard routes require authentication and staff/police/admin role

// Overview statistics
router.get('/overview', authenticate, authorize('staff', 'police', 'admin'), dashboardController.getOverview);

// Crime trends (monthly)
router.get('/trends', authenticate, authorize('staff', 'police', 'admin'), dashboardController.getCrimeTrends);

// Complaints by category
router.get('/by-category', authenticate, authorize('staff', 'police', 'admin'), dashboardController.getByCategory);

// Complaints by priority
router.get('/by-priority', authenticate, authorize('staff', 'police', 'admin'), dashboardController.getByPriority);

// Complaints by district
router.get('/by-district', authenticate, authorize('staff', 'police', 'admin'), dashboardController.getByDistrict);

// Recent activity
router.get('/recent', authenticate, authorize('staff', 'police', 'admin'), dashboardController.getRecentActivity);

// Officer performance (admin only)
router.get('/officer-performance', authenticate, authorize('admin'), dashboardController.getOfficerPerformance);

module.exports = router;
