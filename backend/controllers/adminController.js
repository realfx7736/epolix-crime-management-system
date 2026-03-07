const adminService = require('../services/adminService');

// ---- User Management ----
const getAllUsers = async (req, res, next) => {
    try {
        const result = await adminService.getAllUsers(req.query);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const getUserById = async (req, res, next) => {
    try {
        const user = await adminService.getUserById(req.params.id);
        res.json({ success: true, data: user });
    } catch (err) { next(err); }
};

const createUser = async (req, res, next) => {
    try {
        const user = await adminService.createUser(req.body);
        res.status(201).json({ success: true, message: 'User created.', data: user });
    } catch (err) { next(err); }
};

const updateUser = async (req, res, next) => {
    try {
        const user = await adminService.updateUser(req.params.id, req.body);
        res.json({ success: true, message: 'User updated.', data: user });
    } catch (err) { next(err); }
};

const deactivateUser = async (req, res, next) => {
    try {
        const user = await adminService.deactivateUser(req.params.id);
        res.json({ success: true, message: 'User deactivated.', data: user });
    } catch (err) { next(err); }
};

const activateUser = async (req, res, next) => {
    try {
        const user = await adminService.activateUser(req.params.id);
        res.json({ success: true, message: 'User activated.', data: user });
    } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
    try {
        const result = await adminService.deleteUser(req.params.id);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

// ---- Officer Management ----
const getAllOfficers = async (req, res, next) => {
    try {
        const result = await adminService.getAllOfficers(req.query);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

// ---- System Logs ----
const getLogs = async (req, res, next) => {
    try {
        const result = await adminService.getLogs(req.query);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

// ---- System Stats ----
const getSystemStats = async (req, res, next) => {
    try {
        const stats = await adminService.getSystemStats();
        res.json({ success: true, data: stats });
    } catch (err) { next(err); }
};

module.exports = {
    getAllUsers, getUserById, createUser, updateUser,
    deactivateUser, activateUser, deleteUser,
    getAllOfficers, getLogs, getSystemStats
};
