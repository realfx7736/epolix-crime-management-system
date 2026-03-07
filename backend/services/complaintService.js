const { supabase } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const { generateComplaintNumber, paginate, paginatedResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

class ComplaintService {

    // Create a new complaint
    async create(complaintData, userId) {
        const complaint_number = generateComplaintNumber();

        const insertData = {
            complaint_number,
            complainant_id: userId || null,
            complainant_name: complaintData.complainant_name || null,
            complainant_phone: complaintData.complainant_phone || null,
            complainant_email: complaintData.complainant_email || null,
            complainant_address: complaintData.complainant_address || null,
            title: complaintData.title,
            description: complaintData.description,
            category_id: complaintData.category_id || null,
            category_name: complaintData.category_name || null,
            subcategory: complaintData.subcategory || null,
            incident_date: complaintData.incident_date || null,
            incident_time: complaintData.incident_time || null,
            location: complaintData.location || null,
            landmark: complaintData.landmark || null,
            district: complaintData.district || null,
            state: complaintData.state || 'Maharashtra',
            latitude: complaintData.latitude || null,
            longitude: complaintData.longitude || null,
            priority: complaintData.priority || 'medium',
            is_anonymous: complaintData.is_anonymous || false,
            status: 'submitted'
        };

        const { data, error } = await supabase
            .from('complaints')
            .insert(insertData)
            .select('*')
            .single();

        if (error) {
            logger.error('Failed to create complaint', { error: error.message });
            throw ApiError.internal('Failed to submit complaint. Please try again.');
        }

        logger.info(`Complaint created: ${complaint_number}`, { userId });
        return data;
    }

    // Get all complaints with pagination & filters
    async getAll(filters = {}) {
        const { page, limit, offset } = paginate(filters.page, filters.limit);

        let query = supabase
            .from('complaints')
            .select('*, complainant:users!complainant_id(full_name, email, phone)', { count: 'exact' });

        // Apply filters
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.priority) query = query.eq('priority', filters.priority);
        if (filters.category_id) query = query.eq('category_id', filters.category_id);
        if (filters.district) query = query.ilike('district', `%${filters.district}%`);
        if (filters.search) {
            query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,complaint_number.ilike.%${filters.search}%`);
        }
        if (filters.from_date) query = query.gte('created_at', filters.from_date);
        if (filters.to_date) query = query.lte('created_at', filters.to_date);

        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            logger.error('Failed to fetch complaints', { error: error.message });
            throw ApiError.internal('Failed to retrieve complaints.');
        }

        return paginatedResponse(data, count, page, limit);
    }

    // Get complaints by user (citizen view)
    async getByUser(userId, filters = {}) {
        const { page, limit, offset } = paginate(filters.page, filters.limit);

        let query = supabase
            .from('complaints')
            .select('*', { count: 'exact' })
            .eq('complainant_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (filters.status) query = query.eq('status', filters.status);

        const { data, error, count } = await query;

        if (error) throw ApiError.internal('Failed to fetch your complaints.');
        return paginatedResponse(data, count, page, limit);
    }

    // Get single complaint by ID
    async getById(complaintId) {
        const { data, error } = await supabase
            .from('complaints')
            .select('*, complainant:users!complainant_id(full_name, email, phone, aadhaar)')
            .eq('id', complaintId)
            .single();

        if (error || !data) throw ApiError.notFound('Complaint not found.');
        return data;
    }

    // Get complaint by complaint number (for tracking)
    async getByNumber(complaintNumber) {
        const { data, error } = await supabase
            .from('complaints')
            .select('id, complaint_number, title, status, priority, category_name, location, district, created_at, updated_at, is_fir_filed, fir_number')
            .eq('complaint_number', complaintNumber)
            .single();

        if (error || !data) throw ApiError.notFound('Complaint not found. Please check the complaint number.');
        return data;
    }

    // Update complaint (staff/police/admin)
    async update(complaintId, updates, updatedBy) {
        // Add reviewer info
        if (updates.status) {
            updates.reviewed_by = updatedBy;
        }

        const { data, error } = await supabase
            .from('complaints')
            .update(updates)
            .eq('id', complaintId)
            .select('*')
            .single();

        if (error) {
            logger.error('Failed to update complaint', { error: error.message, complaintId });
            throw ApiError.internal('Failed to update complaint.');
        }

        if (!data) throw ApiError.notFound('Complaint not found.');

        logger.info(`Complaint ${data.complaint_number} updated`, { updatedBy, changes: Object.keys(updates) });
        return data;
    }

    // Delete complaint (admin only)
    async delete(complaintId) {
        const { data, error } = await supabase
            .from('complaints')
            .delete()
            .eq('id', complaintId)
            .select('complaint_number')
            .single();

        if (error || !data) throw ApiError.notFound('Complaint not found.');

        logger.info(`Complaint ${data.complaint_number} deleted`);
        return { message: `Complaint ${data.complaint_number} has been deleted.` };
    }

    // Get crime categories
    async getCategories() {
        const { data, error } = await supabase
            .from('crime_categories')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw ApiError.internal('Failed to fetch categories.');
        return data;
    }
}

module.exports = new ComplaintService();
