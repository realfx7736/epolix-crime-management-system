const complaintService = require('../services/complaintService');

const create = async (req, res, next) => {
    try {
        const complaint = await complaintService.create(req.body, req.user?.id);
        res.status(201).json({ success: true, message: 'Complaint submitted successfully.', data: complaint });
    } catch (err) { next(err); }
};

const getAll = async (req, res, next) => {
    try {
        const result = await complaintService.getAll(req.query);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const getMyComplaints = async (req, res, next) => {
    try {
        const result = await complaintService.getByUser(req.user.id, req.query);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
    try {
        const complaint = await complaintService.getById(req.params.id);
        res.json({ success: true, data: complaint });
    } catch (err) { next(err); }
};

const track = async (req, res, next) => {
    try {
        const complaint = await complaintService.getByNumber(req.params.number);
        res.json({ success: true, data: complaint });
    } catch (err) { next(err); }
};

const update = async (req, res, next) => {
    try {
        const updated = await complaintService.update(req.params.id, req.body, req.user.id);
        res.json({ success: true, message: 'Complaint updated.', data: updated });
    } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
    try {
        const result = await complaintService.delete(req.params.id);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const getCategories = async (req, res, next) => {
    try {
        const categories = await complaintService.getCategories();
        res.json({ success: true, data: categories });
    } catch (err) { next(err); }
};

module.exports = { create, getAll, getMyComplaints, getById, track, update, remove, getCategories };
