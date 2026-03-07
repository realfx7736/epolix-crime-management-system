const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const { paginate, paginatedResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

const SALT_ROUNDS = 12;

class AdminService {

    // ========================
    // USER MANAGEMENT
    // ========================

    // Get all users with filters
    async getAllUsers(filters = {}) {
        const { page, limit, offset } = paginate(filters.page, filters.limit);

        let query = supabase
            .from('users')
            .select('id, full_name, email, phone, aadhaar, role, department_id, badge_number, rank, station, district, is_active, is_verified, last_login, created_at', { count: 'exact' });

        if (filters.role) query = query.eq('role', filters.role);
        if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active === 'true');
        if (filters.search) {
            query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,department_id.ilike.%${filters.search}%`);
        }

        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw ApiError.internal('Failed to fetch users.');
        return paginatedResponse(data, count, page, limit);
    }

    // Get single user by ID
    async getUserById(userId) {
        const { data, error } = await supabase
            .from('users')
            .select('id, full_name, email, phone, aadhaar, role, department_id, badge_number, rank, station, district, state, is_active, is_verified, last_login, created_at, updated_at')
            .eq('id', userId)
            .single();

        if (error || !data) throw ApiError.notFound('User not found.');
        return data;
    }

    // Create a new user (admin-created)
    async createUser(userData) {
        // Check for duplicate email
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', userData.email)
            .single();

        if (existing) throw ApiError.conflict('Email already exists.');

        const password_hash = await bcrypt.hash(userData.password || 'default123', SALT_ROUNDS);

        const { data, error } = await supabase
            .from('users')
            .insert({
                full_name: userData.full_name,
                email: userData.email,
                phone: userData.phone,
                aadhaar: userData.aadhaar || null,
                password_hash,
                role: userData.role || 'citizen',
                department_id: userData.department_id || null,
                badge_number: userData.badge_number || null,
                rank: userData.rank || null,
                station: userData.station || null,
                district: userData.district || null,
                state: userData.state || null,
                is_active: true,
                is_verified: true
            })
            .select('id, full_name, email, role, department_id, created_at')
            .single();

        if (error) {
            logger.error('Admin: Failed to create user', { error: error.message });
            throw ApiError.internal('Failed to create user.');
        }

        logger.info(`Admin created user: ${userData.email} (${userData.role})`);
        return data;
    }

    // Update user (admin)
    async updateUser(userId, updates) {
        const allowedFields = ['full_name', 'phone', 'role', 'department_id', 'badge_number', 'rank', 'station', 'district', 'state', 'is_active', 'is_verified'];
        const safeUpdates = {};

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                safeUpdates[field] = updates[field];
            }
        }

        // If password is being changed
        if (updates.password) {
            safeUpdates.password_hash = await bcrypt.hash(updates.password, SALT_ROUNDS);
        }

        const { data, error } = await supabase
            .from('users')
            .update(safeUpdates)
            .eq('id', userId)
            .select('id, full_name, email, role, is_active, updated_at')
            .single();

        if (error || !data) throw ApiError.internal('Failed to update user.');

        logger.info(`Admin updated user: ${userId}`, { changes: Object.keys(safeUpdates) });
        return data;
    }

    // Deactivate user
    async deactivateUser(userId) {
        const { data, error } = await supabase
            .from('users')
            .update({ is_active: false })
            .eq('id', userId)
            .select('id, full_name, email, is_active')
            .single();

        if (error || !data) throw ApiError.notFound('User not found.');
        logger.info(`User deactivated: ${data.email}`);
        return data;
    }

    // Activate user
    async activateUser(userId) {
        const { data, error } = await supabase
            .from('users')
            .update({ is_active: true })
            .eq('id', userId)
            .select('id, full_name, email, is_active')
            .single();

        if (error || !data) throw ApiError.notFound('User not found.');
        logger.info(`User activated: ${data.email}`);
        return data;
    }

    // Delete user (permanent)
    async deleteUser(userId) {
        const { data, error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId)
            .select('email')
            .single();

        if (error || !data) throw ApiError.notFound('User not found.');
        logger.info(`User deleted permanently: ${data.email}`);
        return { message: `User ${data.email} has been permanently deleted.` };
    }

    // ========================
    // OFFICER MANAGEMENT
    // ========================

    // Get all officers
    async getAllOfficers(filters = {}) {
        const { page, limit, offset } = paginate(filters.page, filters.limit);

        let query = supabase
            .from('users')
            .select('id, full_name, email, phone, department_id, badge_number, rank, station, district, is_active, last_login, created_at', { count: 'exact' })
            .eq('role', 'police');

        if (filters.station) query = query.ilike('station', `%${filters.station}%`);
        if (filters.rank) query = query.eq('rank', filters.rank);
        if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active === 'true');
        if (filters.search) {
            query = query.or(`full_name.ilike.%${filters.search}%,badge_number.ilike.%${filters.search}%,department_id.ilike.%${filters.search}%`);
        }

        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw ApiError.internal('Failed to fetch officers.');
        return paginatedResponse(data, count, page, limit);
    }

    // ========================
    // SYSTEM LOGS
    // ========================

    // Create system log
    async createLog(logData) {
        const { error } = await supabase
            .from('system_logs')
            .insert({
                user_id: logData.user_id || null,
                user_email: logData.user_email || null,
                action: logData.action,
                entity_type: logData.entity_type || null,
                entity_id: logData.entity_id || null,
                details: logData.details || null,
                ip_address: logData.ip_address || null,
                user_agent: logData.user_agent || null
            });

        if (error) {
            logger.error('Failed to create system log', { error: error.message });
        }
    }

    // Get system logs with filters
    async getLogs(filters = {}) {
        const { page, limit, offset } = paginate(filters.page, filters.limit);

        let query = supabase
            .from('system_logs')
            .select('*, user:users!user_id(full_name, email, role)', { count: 'exact' });

        if (filters.action) query = query.eq('action', filters.action);
        if (filters.entity_type) query = query.eq('entity_type', filters.entity_type);
        if (filters.user_id) query = query.eq('user_id', filters.user_id);
        if (filters.from_date) query = query.gte('created_at', filters.from_date);
        if (filters.to_date) query = query.lte('created_at', filters.to_date);

        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw ApiError.internal('Failed to fetch system logs.');
        return paginatedResponse(data, count, page, limit);
    }

    // ========================
    // SYSTEM STATS (Admin Dashboard)
    // ========================
    async getSystemStats() {
        const { count: totalUsers } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true });

        const { count: activeUsers } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true);

        const { count: totalOfficers } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'police');

        const { count: totalStaff } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'staff');

        const { count: totalComplaints } = await supabase
            .from('complaints')
            .select('id', { count: 'exact', head: true });

        const { count: totalCases } = await supabase
            .from('cases')
            .select('id', { count: 'exact', head: true });

        const { count: totalLogs } = await supabase
            .from('system_logs')
            .select('id', { count: 'exact', head: true });

        return {
            totalUsers: totalUsers || 0,
            activeUsers: activeUsers || 0,
            totalOfficers: totalOfficers || 0,
            totalStaff: totalStaff || 0,
            totalComplaints: totalComplaints || 0,
            totalCases: totalCases || 0,
            totalLogs: totalLogs || 0
        };
    }
}

module.exports = new AdminService();
