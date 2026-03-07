const fs = require('fs');
const path = require('path');
const { supabase } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const { getFileCategory } = require('../utils/helpers');
const logger = require('../utils/logger');

class EvidenceService {

    // Upload evidence file to Supabase Storage
    async upload(file, metadata, uploadedBy) {
        if (!file) throw ApiError.badRequest('No file provided.');

        const filePath = `evidence/${Date.now()}_${file.filename}`;
        const fileBuffer = fs.readFileSync(file.path);

        // Upload to Supabase Storage
        const { data: storageData, error: storageError } = await supabase.storage
            .from('evidence-files')
            .upload(filePath, fileBuffer, {
                contentType: file.mimetype,
                upsert: false
            });

        // Clean up local temp file
        try {
            fs.unlinkSync(file.path);
        } catch (e) {
            // Ignore cleanup errors
        }

        if (storageError) {
            logger.error('Storage upload failed', { error: storageError.message });
            // If Supabase storage is not configured, store locally
            const localUrl = `/uploads/evidence/${file.filename}`;
            return this._saveMetadata({
                ...metadata,
                file_name: file.filename,
                original_name: file.originalname,
                file_type: getFileCategory(file.mimetype),
                mime_type: file.mimetype,
                file_size: file.size,
                storage_path: file.path,
                storage_url: localUrl,
                uploaded_by: uploadedBy
            });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('evidence-files')
            .getPublicUrl(filePath);

        const publicUrl = urlData?.publicUrl || filePath;

        // Save metadata to database
        return this._saveMetadata({
            ...metadata,
            file_name: file.filename,
            original_name: file.originalname,
            file_type: getFileCategory(file.mimetype),
            mime_type: file.mimetype,
            file_size: file.size,
            storage_path: filePath,
            storage_url: publicUrl,
            uploaded_by: uploadedBy
        });
    }

    // Save evidence metadata to database
    async _saveMetadata(evidenceData) {
        const { data, error } = await supabase
            .from('evidence')
            .insert({
                case_id: evidenceData.case_id || null,
                complaint_id: evidenceData.complaint_id || null,
                uploaded_by: evidenceData.uploaded_by,
                file_name: evidenceData.file_name,
                original_name: evidenceData.original_name,
                file_type: evidenceData.file_type,
                mime_type: evidenceData.mime_type,
                file_size: evidenceData.file_size,
                storage_path: evidenceData.storage_path,
                storage_url: evidenceData.storage_url,
                description: evidenceData.description || null,
                evidence_type: evidenceData.file_type || 'other'
            })
            .select('*')
            .single();

        if (error) {
            logger.error('Failed to save evidence metadata', { error: error.message });
            throw ApiError.internal('Failed to save evidence record.');
        }

        logger.info(`Evidence uploaded: ${evidenceData.original_name}`, {
            caseId: evidenceData.case_id,
            uploadedBy: evidenceData.uploaded_by
        });

        return data;
    }

    // Upload multiple files
    async uploadMultiple(files, metadata, uploadedBy) {
        if (!files || files.length === 0) throw ApiError.badRequest('No files provided.');

        const results = [];
        const errors = [];

        for (const file of files) {
            try {
                const result = await this.upload(file, metadata, uploadedBy);
                results.push(result);
            } catch (err) {
                errors.push({ file: file.originalname, error: err.message });
            }
        }

        return {
            uploaded: results,
            failed: errors,
            total: files.length,
            successful: results.length
        };
    }

    // Get evidence by case ID
    async getByCase(caseId) {
        const { data, error } = await supabase
            .from('evidence')
            .select('*, uploader:users!uploaded_by(full_name, role)')
            .eq('case_id', caseId)
            .order('created_at', { ascending: false });

        if (error) throw ApiError.internal('Failed to fetch evidence.');
        return data || [];
    }

    // Get evidence by complaint ID
    async getByComplaint(complaintId) {
        const { data, error } = await supabase
            .from('evidence')
            .select('*, uploader:users!uploaded_by(full_name, role)')
            .eq('complaint_id', complaintId)
            .order('created_at', { ascending: false });

        if (error) throw ApiError.internal('Failed to fetch evidence.');
        return data || [];
    }

    // Get single evidence by ID
    async getById(evidenceId) {
        const { data, error } = await supabase
            .from('evidence')
            .select('*, uploader:users!uploaded_by(full_name, role)')
            .eq('id', evidenceId)
            .single();

        if (error || !data) throw ApiError.notFound('Evidence not found.');
        return data;
    }

    // Verify evidence (police/admin)
    async verify(evidenceId, verifiedBy) {
        const { data, error } = await supabase
            .from('evidence')
            .update({ is_verified: true, verified_by: verifiedBy })
            .eq('id', evidenceId)
            .select('*')
            .single();

        if (error || !data) throw ApiError.notFound('Evidence not found.');
        logger.info(`Evidence ${evidenceId} verified by ${verifiedBy}`);
        return data;
    }

    // Delete evidence
    async delete(evidenceId) {
        // Get evidence record
        const { data: evidence } = await supabase
            .from('evidence')
            .select('storage_path, file_name')
            .eq('id', evidenceId)
            .single();

        if (!evidence) throw ApiError.notFound('Evidence not found.');

        // Delete from storage
        if (evidence.storage_path) {
            await supabase.storage
                .from('evidence-files')
                .remove([evidence.storage_path]);
        }

        // Delete metadata
        const { error } = await supabase
            .from('evidence')
            .delete()
            .eq('id', evidenceId);

        if (error) throw ApiError.internal('Failed to delete evidence.');

        logger.info(`Evidence ${evidenceId} deleted`);
        return { message: 'Evidence deleted successfully.' };
    }
}

module.exports = new EvidenceService();
