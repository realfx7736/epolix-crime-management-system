const dashboardService = require('../services/dashboardService');

const getOverview = async (req, res, next) => {
    try {
        const stats = await dashboardService.getOverviewStats();
        res.json({ success: true, data: stats });
    } catch (err) { next(err); }
};

const getCrimeTrends = async (req, res, next) => {
    try {
        const months = parseInt(req.query.months) || 12;
        const trends = await dashboardService.getCrimeTrends(months);
        res.json({ success: true, data: trends });
    } catch (err) { next(err); }
};

const getByCategory = async (req, res, next) => {
    try {
        const data = await dashboardService.getByCategory();
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

const getByPriority = async (req, res, next) => {
    try {
        const data = await dashboardService.getByPriority();
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

const getByDistrict = async (req, res, next) => {
    try {
        const data = await dashboardService.getByDistrict();
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

const getRecentActivity = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const data = await dashboardService.getRecentActivity(limit);
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

const getOfficerPerformance = async (req, res, next) => {
    try {
        const data = await dashboardService.getOfficerPerformance();
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

module.exports = { getOverview, getCrimeTrends, getByCategory, getByPriority, getByDistrict, getRecentActivity, getOfficerPerformance };
