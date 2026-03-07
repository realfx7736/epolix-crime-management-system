const caseService = require('../services/caseService');

const create = async (req, res, next) => {
    try {
        const newCase = await caseService.create(req.body, req.user.id);
        res.status(201).json({ success: true, message: 'Case created successfully.', data: newCase });
    } catch (err) { next(err); }
};

const getAll = async (req, res, next) => {
    try {
        const result = await caseService.getAll(req.query);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const getMyCases = async (req, res, next) => {
    try {
        const result = await caseService.getByOfficer(req.user.id, req.query);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
    try {
        const caseData = await caseService.getById(req.params.id);
        res.json({ success: true, data: caseData });
    } catch (err) { next(err); }
};

const track = async (req, res, next) => {
    try {
        const caseData = await caseService.getByNumber(req.params.number);
        res.json({ success: true, data: caseData });
    } catch (err) { next(err); }
};

const update = async (req, res, next) => {
    try {
        const updated = await caseService.update(req.params.id, req.body, req.user.id);
        res.json({ success: true, message: 'Case updated.', data: updated });
    } catch (err) { next(err); }
};

const assignOfficer = async (req, res, next) => {
    try {
        const { officer_id, notes } = req.body;
        const result = await caseService.assignOfficer(req.params.id, officer_id, req.user.id, notes);
        res.json({ success: true, message: 'Officer assigned.', data: result });
    } catch (err) { next(err); }
};

const addNote = async (req, res, next) => {
    try {
        const note = await caseService.addNote(req.params.id, req.body, req.user.id);
        res.status(201).json({ success: true, message: 'Investigation note added.', data: note });
    } catch (err) { next(err); }
};

const getUpdates = async (req, res, next) => {
    try {
        const publicOnly = req.user?.role === 'citizen';
        const updates = await caseService.getUpdates(req.params.id, publicOnly);
        res.json({ success: true, data: updates });
    } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
    try {
        const result = await caseService.delete(req.params.id);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

module.exports = { create, getAll, getMyCases, getById, track, update, assignOfficer, addNote, getUpdates, remove };
