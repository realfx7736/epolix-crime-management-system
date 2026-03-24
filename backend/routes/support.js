const express = require('express');
const router = express.Namespace ? express.Namespace() : express.Router();
const { supabase } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// POST /api/support - Submit a support message (Public)
router.post('/', async (req, res, next) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !message) {
            throw ApiError.badRequest('Name, email, and message are required.');
        }

        const { data, error } = await supabase
            .from('support_messages')
            .insert([{ name, email, subject, message, status: 'unread' }])
            .select()
            .single();

        if (error) throw ApiError.internal('Failed to send support message.');

        res.status(201).json({ success: true, message: 'Support message received.', data });
    } catch (err) { next(err); }
});

// GET /api/support - Get all support messages (Admin/Staff)
router.get('/', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('support_messages')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw ApiError.internal('Failed to fetch support messages.');
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// PATCH /api/support/:id - Update status (Admin/Staff)
router.patch('/:id', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        const { data, error } = await supabase
            .from('support_messages')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw ApiError.internal('Failed to update support message.');
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

module.exports = router;
