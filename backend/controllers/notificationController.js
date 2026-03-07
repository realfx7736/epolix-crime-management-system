const notificationService = require('../services/notificationService');

const getMyNotifications = async (req, res, next) => {
    try {
        const result = await notificationService.getByUser(req.user.id, req.query);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const getUnreadCount = async (req, res, next) => {
    try {
        const count = await notificationService.getUnreadCount(req.user.id);
        res.json({ success: true, data: { unreadCount: count } });
    } catch (err) { next(err); }
};

const markRead = async (req, res, next) => {
    try {
        const result = await notificationService.markRead(req.params.id, req.user.id);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

const markAllRead = async (req, res, next) => {
    try {
        const result = await notificationService.markAllRead(req.user.id);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
    try {
        const result = await notificationService.delete(req.params.id, req.user.id);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

module.exports = { getMyNotifications, getUnreadCount, markRead, markAllRead, remove };
