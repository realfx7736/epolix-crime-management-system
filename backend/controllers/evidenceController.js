const evidenceService = require('../services/evidenceService');

const upload = async (req, res, next) => {
    try {
        const metadata = {
            case_id: req.body.case_id || null,
            complaint_id: req.body.complaint_id || null,
            description: req.body.description || null
        };
        const evidence = await evidenceService.upload(req.file, metadata, req.user.id);
        res.status(201).json({ success: true, message: 'Evidence uploaded successfully.', data: evidence });
    } catch (err) { next(err); }
};

const uploadMultiple = async (req, res, next) => {
    try {
        const metadata = {
            case_id: req.body.case_id || null,
            complaint_id: req.body.complaint_id || null,
            description: req.body.description || null
        };
        const result = await evidenceService.uploadMultiple(req.files, metadata, req.user.id);
        res.status(201).json({ success: true, message: `${result.successful}/${result.total} files uploaded.`, data: result });
    } catch (err) { next(err); }
};

const getByCase = async (req, res, next) => {
    try {
        const evidence = await evidenceService.getByCase(req.params.caseId);
        res.json({ success: true, data: evidence });
    } catch (err) { next(err); }
};

const getByComplaint = async (req, res, next) => {
    try {
        const evidence = await evidenceService.getByComplaint(req.params.complaintId);
        res.json({ success: true, data: evidence });
    } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
    try {
        const evidence = await evidenceService.getById(req.params.id);
        res.json({ success: true, data: evidence });
    } catch (err) { next(err); }
};

const verify = async (req, res, next) => {
    try {
        const evidence = await evidenceService.verify(req.params.id, req.user.id);
        res.json({ success: true, message: 'Evidence verified.', data: evidence });
    } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
    try {
        const result = await evidenceService.delete(req.params.id);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const getAll = async (req, res, next) => {
    try {
        const evidence = await evidenceService.getAll();
        res.json({ success: true, data: evidence });
    } catch (err) { next(err); }
};

module.exports = { getAll, upload, uploadMultiple, getByCase, getByComplaint, getById, verify, remove };
