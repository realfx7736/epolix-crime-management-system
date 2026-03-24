const express = require('express');
const router = express.Router();
const evidenceController = require('../controllers/evidenceController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');

// All evidence routes require authentication

// Upload multiple files
router.post('/upload-multiple', authenticate, uploadMultiple, evidenceController.uploadMultiple);

// Get all evidence (admin only)
router.get('/', authenticate, authorize('admin', 'super_admin'), evidenceController.getAll);

// Get evidence by case
router.get('/case/:caseId', authenticate, evidenceController.getByCase);

// Get evidence by complaint
router.get('/complaint/:complaintId', authenticate, evidenceController.getByComplaint);

// Get single evidence
router.get('/:id', authenticate, evidenceController.getById);

// Verify evidence (police, admin)
router.patch('/:id/verify', authenticate, authorize('police', 'admin'), evidenceController.verify);

// Delete evidence (police, admin)
router.delete('/:id', authenticate, authorize('police', 'admin'), evidenceController.remove);

module.exports = router;
