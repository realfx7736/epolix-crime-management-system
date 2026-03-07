const { supabase } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const { generateCaseNumber, paginate, paginatedResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

class CaseService {

    // Create a new case (from complaint or standalone)
    async create(caseData, createdBy) {
        const case_number = generateCaseNumber();

        const insertData = {
            case_number,
            complaint_id: caseData.complaint_id || null,
            title: caseData.title,
            description: caseData.description || null,
            category_id: caseData.category_id || null,
            category_name: caseData.category_name || null,
            status: 'open',
            priority: caseData.priority || 'medium',
            assigned_officer_id: caseData.assigned_officer_id || null,
            assigned_by: createdBy,
            location: caseData.location || null,
            district: caseData.district || null,
            state: caseData.state || null
        };

        const { data, error } = await supabase
            .from('cases')
            .insert(insertData)
            .select('*')
            .single();

        if (error) {
            logger.error('Failed to create case', { error: error.message });
            throw ApiError.internal('Failed to create case.');
        }

        // If created from a complaint, update complaint status
        if (caseData.complaint_id) {
            await supabase
                .from('complaints')
                .update({ status: 'investigation', is_fir_filed: true })
                .eq('id', caseData.complaint_id);
        }

        // If officer assigned, create assignment record
        if (caseData.assigned_officer_id) {
            await supabase.from('case_assignments').insert({
                case_id: data.id,
                officer_id: caseData.assigned_officer_id,
                assigned_by: createdBy,
                assignment_notes: 'Initial assignment',
                is_current: true
            });

            // Update case status to assigned
            await supabase
                .from('cases')
                .update({ status: 'assigned' })
                .eq('id', data.id);

            data.status = 'assigned';
        }

        // Log the case creation
        await supabase.from('case_updates').insert({
            case_id: data.id,
            updated_by: createdBy,
            update_type: 'created',
            new_status: data.status,
            title: 'Case Created',
            notes: `Case ${case_number} has been created.`,
            is_public: true
        });

        logger.info(`Case created: ${case_number}`, { createdBy });
        return data;
    }

    // Get all cases with filters and pagination
    async getAll(filters = {}) {
        const { page, limit, offset } = paginate(filters.page, filters.limit);

        let query = supabase
            .from('cases')
            .select(`
                *,
                assigned_officer:users!assigned_officer_id(id, full_name, badge_number, rank),
                complaint:complaints!complaint_id(complaint_number, title, complainant_name)
            `, { count: 'exact' });

        if (filters.status) query = query.eq('status', filters.status);
        if (filters.priority) query = query.eq('priority', filters.priority);
        if (filters.assigned_officer_id) query = query.eq('assigned_officer_id', filters.assigned_officer_id);
        if (filters.district) query = query.ilike('district', `%${filters.district}%`);
        if (filters.search) {
            query = query.or(`title.ilike.%${filters.search}%,case_number.ilike.%${filters.search}%`);
        }

        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) throw ApiError.internal('Failed to fetch cases.');
        return paginatedResponse(data, count, page, limit);
    }

    // Get cases assigned to a specific officer
    async getByOfficer(officerId, filters = {}) {
        const { page, limit, offset } = paginate(filters.page, filters.limit);

        let query = supabase
            .from('cases')
            .select('*, complaint:complaints!complaint_id(complaint_number, title)', { count: 'exact' })
            .eq('assigned_officer_id', officerId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (filters.status) query = query.eq('status', filters.status);

        const { data, error, count } = await query;
        if (error) throw ApiError.internal('Failed to fetch officer cases.');
        return paginatedResponse(data, count, page, limit);
    }

    // Get single case with full details
    async getById(caseId) {
        const { data: caseData, error } = await supabase
            .from('cases')
            .select(`
                *,
                assigned_officer:users!assigned_officer_id(id, full_name, email, badge_number, rank, station),
                complaint:complaints!complaint_id(*)
            `)
            .eq('id', caseId)
            .single();

        if (error || !caseData) throw ApiError.notFound('Case not found.');

        // Get case updates
        const { data: updates } = await supabase
            .from('case_updates')
            .select('*, updated_by_user:users!updated_by(full_name, role)')
            .eq('case_id', caseId)
            .order('created_at', { ascending: false });

        // Get investigation notes
        const { data: notes } = await supabase
            .from('investigation_notes')
            .select('*')
            .eq('case_id', caseId)
            .order('created_at', { ascending: false });

        // Get evidence
        const { data: evidence } = await supabase
            .from('evidence')
            .select('*')
            .eq('case_id', caseId)
            .order('created_at', { ascending: false });

        // Get assignment history
        const { data: assignments } = await supabase
            .from('case_assignments')
            .select('*, officer:users!officer_id(full_name, badge_number, rank)')
            .eq('case_id', caseId)
            .order('assigned_at', { ascending: false });

        return {
            ...caseData,
            updates: updates || [],
            investigation_notes: notes || [],
            evidence: evidence || [],
            assignment_history: assignments || []
        };
    }

    // Get case by case number (for tracking)
    async getByNumber(caseNumber) {
        const { data, error } = await supabase
            .from('cases')
            .select('id, case_number, title, status, priority, category_name, assigned_officer_id, location, district, created_at, updated_at')
            .eq('case_number', caseNumber)
            .single();

        if (error || !data) throw ApiError.notFound('Case not found.');
        return data;
    }

    // Update case details
    async update(caseId, updates, updatedBy) {
        // Get current case for status tracking
        const { data: currentCase } = await supabase
            .from('cases')
            .select('status, case_number')
            .eq('id', caseId)
            .single();

        if (!currentCase) throw ApiError.notFound('Case not found.');

        const oldStatus = currentCase.status;

        // Build update object (only allowed fields)
        const allowedFields = ['status', 'priority', 'investigating_officer', 'court_name', 'court_case_number', 'hearing_date', 'judgment', 'location', 'district'];
        const safeUpdates = {};
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                safeUpdates[field] = updates[field];
            }
        }

        if (safeUpdates.status === 'closed') {
            safeUpdates.closed_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('cases')
            .update(safeUpdates)
            .eq('id', caseId)
            .select('*')
            .single();

        if (error) throw ApiError.internal('Failed to update case.');

        // Log the update
        if (updates.status && updates.status !== oldStatus) {
            await supabase.from('case_updates').insert({
                case_id: caseId,
                updated_by: updatedBy,
                update_type: 'status_change',
                old_status: oldStatus,
                new_status: updates.status,
                title: `Status changed to ${updates.status.replace(/_/g, ' ')}`,
                notes: updates.notes || `Case status updated from ${oldStatus} to ${updates.status}`,
                is_public: true
            });
        }

        logger.info(`Case ${currentCase.case_number} updated`, { updatedBy, changes: Object.keys(safeUpdates) });
        return data;
    }

    // Assign/reassign officer to case
    async assignOfficer(caseId, officerId, assignedBy, notes = '') {
        // Verify officer exists and is police role
        const { data: officer } = await supabase
            .from('users')
            .select('id, full_name, role')
            .eq('id', officerId)
            .single();

        if (!officer || officer.role !== 'police') {
            throw ApiError.badRequest('Invalid officer. Only police officers can be assigned to cases.');
        }

        // Deactivate previous assignment
        await supabase
            .from('case_assignments')
            .update({ is_current: false, relieved_at: new Date().toISOString() })
            .eq('case_id', caseId)
            .eq('is_current', true);

        // Create new assignment
        await supabase.from('case_assignments').insert({
            case_id: caseId,
            officer_id: officerId,
            assigned_by: assignedBy,
            assignment_notes: notes || `Assigned to ${officer.full_name}`,
            is_current: true
        });

        // Update case
        const { data: updatedCase } = await supabase
            .from('cases')
            .update({
                assigned_officer_id: officerId,
                assigned_by: assignedBy,
                status: 'assigned'
            })
            .eq('id', caseId)
            .select('*')
            .single();

        // Log update
        await supabase.from('case_updates').insert({
            case_id: caseId,
            updated_by: assignedBy,
            update_type: 'assignment',
            title: 'Officer Assigned',
            notes: `Case assigned to ${officer.full_name}`,
            is_public: true
        });

        logger.info(`Officer ${officer.full_name} assigned to case ${caseId}`);
        return updatedCase;
    }

    // Add investigation note
    async addNote(caseId, noteData, authorId) {
        // Get author name
        const { data: author } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', authorId)
            .single();

        const { data, error } = await supabase
            .from('investigation_notes')
            .insert({
                case_id: caseId,
                author_id: authorId,
                author_name: author?.full_name || 'Unknown',
                title: noteData.title,
                content: noteData.content,
                is_confidential: noteData.is_confidential || false
            })
            .select('*')
            .single();

        if (error) throw ApiError.internal('Failed to add investigation note.');

        logger.info(`Investigation note added to case ${caseId}`, { authorId });
        return data;
    }

    // Get case timeline / updates
    async getUpdates(caseId, publicOnly = false) {
        let query = supabase
            .from('case_updates')
            .select('*, updated_by_user:users!updated_by(full_name, role)')
            .eq('case_id', caseId)
            .order('created_at', { ascending: false });

        if (publicOnly) {
            query = query.eq('is_public', true);
        }

        const { data, error } = await query;
        if (error) throw ApiError.internal('Failed to fetch case updates.');
        return data || [];
    }

    // Delete case (admin only)
    async delete(caseId) {
        const { data, error } = await supabase
            .from('cases')
            .delete()
            .eq('id', caseId)
            .select('case_number')
            .single();

        if (error || !data) throw ApiError.notFound('Case not found.');
        logger.info(`Case ${data.case_number} deleted`);
        return { message: `Case ${data.case_number} has been deleted.` };
    }
}

module.exports = new CaseService();
