const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate, caseSchema, caseUpdateSchema, investigationNoteSchema } = require('../middleware/validator');

// ---- All case routes require authentication ----

// Track by case number (any authenticated user)
router.get('/track/:number', authenticate, caseController.track);

// Officer's own cases
router.get('/my', authenticate, authorize('police'), caseController.getMyCases);

// Create case (police, staff, admin)
router.post('/', authenticate, authorize('police', 'staff', 'admin'), validate(caseSchema), caseController.create);

// Get all cases (police, staff, admin)
router.get('/', authenticate, authorize('police', 'staff', 'admin'), caseController.getAll);

// Get single case
router.get('/:id', authenticate, caseController.getById);

// Get case updates/timeline
router.get('/:id/updates', authenticate, caseController.getUpdates);

// Update case (police, admin)
router.put('/:id', authenticate, authorize('police', 'admin'), validate(caseUpdateSchema), caseController.update);

// Assign officer (staff, admin)
router.post('/:id/assign', authenticate, authorize('staff', 'admin'), caseController.assignOfficer);

// Add investigation note (police, admin)
router.post('/:id/notes', authenticate, authorize('police', 'admin'), validate(investigationNoteSchema), caseController.addNote);

// Delete case (admin only)
router.delete('/:id', authenticate, authorize('admin'), caseController.remove);

module.exports = router;
