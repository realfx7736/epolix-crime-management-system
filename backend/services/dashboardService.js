const { supabase } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

class DashboardService {

    // Get overall crime statistics
    async getOverviewStats() {
        // Total complaints
        const { count: totalComplaints } = await supabase
            .from('complaints')
            .select('id', { count: 'exact', head: true });

        // Complaints by status
        const { data: complaintsByStatus } = await supabase
            .rpc('get_complaint_status_counts')
            .catch(() => ({ data: null }));

        // Total cases
        const { count: totalCases } = await supabase
            .from('cases')
            .select('id', { count: 'exact', head: true });

        // Active cases (not closed/convicted/acquitted)
        const { count: activeCases } = await supabase
            .from('cases')
            .select('id', { count: 'exact', head: true })
            .not('status', 'in', '("closed","convicted","acquitted")');

        // Total users by role
        const { data: usersByRole } = await supabase
            .rpc('get_user_role_counts')
            .catch(() => ({ data: null }));

        // Pending complaints
        const { count: pendingComplaints } = await supabase
            .from('complaints')
            .select('id', { count: 'exact', head: true })
            .in('status', ['submitted', 'under_review']);

        // Resolved cases
        const { count: resolvedCases } = await supabase
            .from('cases')
            .select('id', { count: 'exact', head: true })
            .in('status', ['closed', 'convicted']);

        // Total evidence files
        const { count: totalEvidence } = await supabase
            .from('evidence')
            .select('id', { count: 'exact', head: true });

        // If RPC functions don't exist, do manual counting
        let statusBreakdown = complaintsByStatus;
        if (!statusBreakdown) {
            statusBreakdown = await this._getComplaintStatusCounts();
        }

        let roleBreakdown = usersByRole;
        if (!roleBreakdown) {
            roleBreakdown = await this._getUserRoleCounts();
        }

        return {
            overview: {
                totalComplaints: totalComplaints || 0,
                totalCases: totalCases || 0,
                activeCases: activeCases || 0,
                pendingComplaints: pendingComplaints || 0,
                resolvedCases: resolvedCases || 0,
                totalEvidence: totalEvidence || 0
            },
            complaintsByStatus: statusBreakdown,
            usersByRole: roleBreakdown
        };
    }

    // Manual complaint status counting (fallback)
    async _getComplaintStatusCounts() {
        const statuses = ['submitted', 'under_review', 'verified', 'investigation', 'resolved', 'closed', 'rejected', 'escalated'];
        const counts = {};

        for (const status of statuses) {
            const { count } = await supabase
                .from('complaints')
                .select('id', { count: 'exact', head: true })
                .eq('status', status);
            counts[status] = count || 0;
        }

        return counts;
    }

    // Manual user role counting (fallback)
    async _getUserRoleCounts() {
        const roles = ['citizen', 'police', 'staff', 'admin'];
        const counts = {};

        for (const role of roles) {
            const { count } = await supabase
                .from('users')
                .select('id', { count: 'exact', head: true })
                .eq('role', role);
            counts[role] = count || 0;
        }

        return counts;
    }

    // Get crime trends (complaints per month)
    async getCrimeTrends(months = 12) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const { data: complaints } = await supabase
            .from('complaints')
            .select('created_at, category_name, priority')
            .gte('created_at', startDate.toISOString())
            .order('created_at');

        // Group by month
        const monthlyData = {};
        (complaints || []).forEach(c => {
            const date = new Date(c.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[key]) {
                monthlyData[key] = { month: key, count: 0, categories: {} };
            }
            monthlyData[key].count++;
            const cat = c.category_name || 'Uncategorized';
            monthlyData[key].categories[cat] = (monthlyData[key].categories[cat] || 0) + 1;
        });

        return Object.values(monthlyData);
    }

    // Get complaints by category
    async getByCategory() {
        const { data: complaints } = await supabase
            .from('complaints')
            .select('category_name');

        const categoryMap = {};
        (complaints || []).forEach(c => {
            const cat = c.category_name || 'Uncategorized';
            categoryMap[cat] = (categoryMap[cat] || 0) + 1;
        });

        return Object.entries(categoryMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }

    // Get complaints by priority
    async getByPriority() {
        const priorities = ['low', 'medium', 'high', 'critical'];
        const result = [];

        for (const priority of priorities) {
            const { count } = await supabase
                .from('complaints')
                .select('id', { count: 'exact', head: true })
                .eq('priority', priority);
            result.push({ priority, count: count || 0 });
        }

        return result;
    }

    // Get district-wise crime data
    async getByDistrict() {
        const { data: complaints } = await supabase
            .from('complaints')
            .select('district');

        const districtMap = {};
        (complaints || []).forEach(c => {
            const dist = c.district || 'Unknown';
            districtMap[dist] = (districtMap[dist] || 0) + 1;
        });

        return Object.entries(districtMap)
            .map(([district, count]) => ({ district, count }))
            .sort((a, b) => b.count - a.count);
    }

    // Get recent activity
    async getRecentActivity(limit = 20) {
        const { data: recentComplaints } = await supabase
            .from('complaints')
            .select('id, complaint_number, title, status, priority, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);

        const { data: recentCases } = await supabase
            .from('cases')
            .select('id, case_number, title, status, priority, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);

        const { data: recentUpdates } = await supabase
            .from('case_updates')
            .select('id, title, notes, update_type, created_at, updated_by_user:users!updated_by(full_name)')
            .order('created_at', { ascending: false })
            .limit(limit);

        return {
            recentComplaints: recentComplaints || [],
            recentCases: recentCases || [],
            recentUpdates: recentUpdates || []
        };
    }

    // Get officer performance metrics
    async getOfficerPerformance() {
        const { data: officers } = await supabase
            .from('users')
            .select('id, full_name, badge_number, rank')
            .eq('role', 'police')
            .eq('is_active', true);

        const performance = [];

        for (const officer of (officers || [])) {
            const { count: totalCases } = await supabase
                .from('cases')
                .select('id', { count: 'exact', head: true })
                .eq('assigned_officer_id', officer.id);

            const { count: closedCases } = await supabase
                .from('cases')
                .select('id', { count: 'exact', head: true })
                .eq('assigned_officer_id', officer.id)
                .in('status', ['closed', 'convicted']);

            const { count: activeCases } = await supabase
                .from('cases')
                .select('id', { count: 'exact', head: true })
                .eq('assigned_officer_id', officer.id)
                .not('status', 'in', '("closed","convicted","acquitted")');

            performance.push({
                officer: {
                    id: officer.id,
                    name: officer.full_name,
                    badge: officer.badge_number,
                    rank: officer.rank
                },
                totalCases: totalCases || 0,
                closedCases: closedCases || 0,
                activeCases: activeCases || 0,
                resolutionRate: totalCases > 0 ? Math.round((closedCases / totalCases) * 100) : 0
            });
        }

        return performance.sort((a, b) => b.totalCases - a.totalCases);
    }
}

module.exports = new DashboardService();
