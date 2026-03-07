const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// All notification routes require authentication

// Get my notifications
router.get('/', authenticate, notificationController.getMyNotifications);

// Get unread count
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

// Mark single notification as read
router.patch('/:id/read', authenticate, notificationController.markRead);

// Mark all as read
router.patch('/read-all', authenticate, notificationController.markAllRead);

// Delete notification
router.delete('/:id', authenticate, notificationController.remove);

module.exports = router;
