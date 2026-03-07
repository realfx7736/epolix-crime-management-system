const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All admin routes require authentication + admin role

// ---- System Stats ----
router.get('/stats', authenticate, authorize('admin'), adminController.getSystemStats);

// ---- User Management ----
router.get('/users', authenticate, authorize('admin'), adminController.getAllUsers);
router.get('/users/:id', authenticate, authorize('admin'), adminController.getUserById);
router.post('/users', authenticate, authorize('admin'), adminController.createUser);
router.put('/users/:id', authenticate, authorize('admin'), adminController.updateUser);
router.patch('/users/:id/deactivate', authenticate, authorize('admin'), adminController.deactivateUser);
router.patch('/users/:id/activate', authenticate, authorize('admin'), adminController.activateUser);
router.delete('/users/:id', authenticate, authorize('admin'), adminController.deleteUser);

// ---- Officer Management ----
router.get('/officers', authenticate, authorize('admin', 'staff'), adminController.getAllOfficers);

// ---- System Logs ----
router.get('/logs', authenticate, authorize('admin'), adminController.getLogs);

module.exports = router;
