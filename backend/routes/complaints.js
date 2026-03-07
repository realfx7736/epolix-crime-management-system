const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate, complaintSchema, complaintUpdateSchema } = require('../middleware/validator');

// ---- Public Routes ----
router.get('/categories', complaintController.getCategories);
router.get('/track/:number', complaintController.track);

// ---- Protected: Any authenticated user can file a complaint ----
router.post('/', authenticate, validate(complaintSchema), complaintController.create);
router.get('/my', authenticate, complaintController.getMyComplaints);

// ---- Protected: Staff, Police, Admin can view & manage all ----
router.get('/', authenticate, authorize('staff', 'police', 'admin'), complaintController.getAll);
router.get('/:id', authenticate, complaintController.getById);
router.put('/:id', authenticate, authorize('staff', 'police', 'admin'), validate(complaintUpdateSchema), complaintController.update);
router.delete('/:id', authenticate, authorize('admin'), complaintController.remove);

module.exports = router;
