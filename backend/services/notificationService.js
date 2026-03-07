const { supabase } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const { paginate, paginatedResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

class NotificationService {

    // Create a notification
    async create(notificationData) {
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id: notificationData.user_id,
                title: notificationData.title,
                message: notificationData.message,
                type: notificationData.type || 'info',
                reference_id: notificationData.reference_id || null,
                reference_type: notificationData.reference_type || null,
                is_read: false
            })
            .select('*')
            .single();

        if (error) {
            logger.error('Failed to create notification', { error: error.message });
            // Don't throw — notifications should not break main flow
            return null;
        }

        return data;
    }

    // Create notification for multiple users
    async createBulk(userIds, notificationData) {
        const notifications = userIds.map(userId => ({
            user_id: userId,
            title: notificationData.title,
            message: notificationData.message,
            type: notificationData.type || 'info',
            reference_id: notificationData.reference_id || null,
            reference_type: notificationData.reference_type || null,
            is_read: false
        }));

        const { data, error } = await supabase
            .from('notifications')
            .insert(notifications)
            .select('*');

        if (error) {
            logger.error('Failed to create bulk notifications', { error: error.message });
            return [];
        }

        return data;
    }

    // Notify on complaint status change
    async notifyComplaintUpdate(complaint, newStatus) {
        if (!complaint.complainant_id) return;

        const statusMessages = {
            under_review: 'Your complaint is now under review by our team.',
            verified: 'Your complaint has been verified and accepted.',
            investigation: 'An investigation has been initiated for your complaint.',
            resolved: 'Your complaint has been resolved.',
            closed: 'Your complaint case has been closed.',
            rejected: 'Your complaint has been reviewed and could not be processed.',
            escalated: 'Your complaint has been escalated to higher authorities.'
        };

        return this.create({
            user_id: complaint.complainant_id,
            title: `Complaint ${complaint.complaint_number} Update`,
            message: statusMessages[newStatus] || `Your complaint status has been updated to: ${newStatus}`,
            type: 'complaint_update',
            reference_id: complaint.id,
            reference_type: 'complaint'
        });
    }

    // Notify on case assignment
    async notifyCaseAssignment(caseData, officerId) {
        return this.create({
            user_id: officerId,
            title: `New Case Assigned: ${caseData.case_number}`,
            message: `You have been assigned to case "${caseData.title}". Priority: ${caseData.priority}.`,
            type: 'assignment',
            reference_id: caseData.id,
            reference_type: 'case'
        });
    }

    // Notify on case status change
    async notifyCaseUpdate(caseData, newStatus) {
        // Notify assigned officer
        if (caseData.assigned_officer_id) {
            await this.create({
                user_id: caseData.assigned_officer_id,
                title: `Case ${caseData.case_number} Status Updated`,
                message: `Case status changed to: ${newStatus.replace(/_/g, ' ')}`,
                type: 'case_update',
                reference_id: caseData.id,
                reference_type: 'case'
            });
        }

        // Notify complainant if linked
        if (caseData.complaint_id) {
            const { data: complaint } = await supabase
                .from('complaints')
                .select('complainant_id')
                .eq('id', caseData.complaint_id)
                .single();

            if (complaint?.complainant_id) {
                await this.create({
                    user_id: complaint.complainant_id,
                    title: `Case Update for Your Complaint`,
                    message: `The case related to your complaint has been updated. New status: ${newStatus.replace(/_/g, ' ')}`,
                    type: 'case_update',
                    reference_id: caseData.id,
                    reference_type: 'case'
                });
            }
        }
    }

    // Get notifications for a user
    async getByUser(userId, filters = {}) {
        const { page, limit, offset } = paginate(filters.page, filters.limit);

        let query = supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (filters.unread_only === 'true') {
            query = query.eq('is_read', false);
        }

        if (filters.type) {
            query = query.eq('type', filters.type);
        }

        const { data, error, count } = await query;
        if (error) throw ApiError.internal('Failed to fetch notifications.');
        return paginatedResponse(data, count, page, limit);
    }

    // Get unread count
    async getUnreadCount(userId) {
        const { count, error } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) return 0;
        return count || 0;
    }

    // Mark notification as read
    async markRead(notificationId, userId) {
        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId)
            .eq('user_id', userId)
            .select('*')
            .single();

        if (error || !data) throw ApiError.notFound('Notification not found.');
        return data;
    }

    // Mark all notifications as read
    async markAllRead(userId) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw ApiError.internal('Failed to mark notifications as read.');
        return { message: 'All notifications marked as read.' };
    }

    // Delete notification
    async delete(notificationId, userId) {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .eq('user_id', userId);

        if (error) throw ApiError.internal('Failed to delete notification.');
        return { message: 'Notification deleted.' };
    }
}

module.exports = new NotificationService();
