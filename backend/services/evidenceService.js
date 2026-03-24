const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const { getFileCategory } = require('../utils/helpers');
const logger = require('../utils/logger');

const LOCAL_DB_PATH = path.join(__dirname, '../data/local_db.json');
const isLocalAuthEnabled = () => process.env.NODE_ENV !== 'production';

class EvidenceService {

    // Helper to read local database
    _readLocalDb() {
        if (!fs.existsSync(LOCAL_DB_PATH)) return { users: [], cases: [], evidence: [] };
        try {
            const data = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
            if (!data.evidence) data.evidence = [];
            return data;
        } catch (e) { return { users: [], cases: [], evidence: [] }; }
    }

    // Helper to write local database
    _writeLocalDb(data) {
        fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
    }

    // Upload evidence file to Supabase Storage
    async upload(file, metadata, uploadedBy) {
        if (!file) throw ApiError.badRequest('No file provided.');

        // Clean up local temp file (if uploaded to storage successfully)
        let storagePath = `evidence/${Date.now()}_${file.filename}`;
        let publicUrl = null;

        try {
            const fileBuffer = fs.readFileSync(file.path);
            const { data: storageData, error: storageError } = await supabase.storage
                .from('evidence-files')
                .upload(storagePath, fileBuffer, {
                    contentType: file.mimetype,
                    upsert: false
                });

            if (!storageError) {
                const { data: urlData } = supabase.storage
                    .from('evidence-files')
                    .getPublicUrl(storagePath);
                publicUrl = urlData?.publicUrl;
                // Clean up local temp file ONLY if storage succeeded
                try { fs.unlinkSync(file.path); } catch (e) { }
            } else {
                logger.warn('Storage upload failed, falling back to local', { error: storageError.message });
                publicUrl = `/uploads/evidence/${file.filename}`;
                storagePath = file.path;
            }
        } catch (err) {
            logger.error('File operation failed', { error: err.message });
            publicUrl = `/uploads/evidence/${file.filename}`;
            storagePath = file.path;
        }

        // Save metadata to database
        return this._saveMetadata({
            ...metadata,
            file_name: file.filename,
            original_name: file.originalname,
            file_type: getFileCategory(file.mimetype),
            mime_type: file.mimetype,
            file_size: file.size,
            storage_path: storagePath,
            storage_url: publicUrl || `/uploads/evidence/${file.filename}`,
            uploaded_by: uploadedBy
        });
    }

    // Save evidence metadata to database
    async _saveMetadata(evidenceData) {
        // Prepare record
        const newRecord = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11),
            case_id: evidenceData.case_id || null,
            complaint_id: evidenceData.complaint_id || null,
            uploaded_by: evidenceData.uploaded_by,
            file_name: evidenceData.file_name,
            original_name: evidenceData.original_name,
            file_type: evidenceData.file_type || 'other',
            mime_type: evidenceData.mime_type,
            file_size: evidenceData.file_size,
            storage_path: evidenceData.storage_path,
            storage_url: evidenceData.storage_url,
            description: evidenceData.description || null,
            evidence_type: evidenceData.file_type || 'other',
            is_verified: false,
            created_at: new Date().toISOString()
        };

        try {
            const { data, error } = await supabase
                .from('evidence')
                .insert(newRecord)
                .select('*')
                .single();

            if (!error && data) return data;

            if (error) {
                logger.warn('Supabase insert failed, falling back to local registry', { error: error.message });
            }
        } catch (e) { }

        // Local Fallback
        const db = this._readLocalDb();
        db.evidence.push(newRecord);
        this._writeLocalDb(db);

        logger.info(`Evidence (Local) uploaded: ${newRecord.original_name}`, {
            id: newRecord.id,
            uploadedBy: newRecord.uploaded_by
        });

        return newRecord;
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

    // Get all evidence (admin only)
    async getAll() {
        try {
            const { data, error } = await supabase
                .from('evidence')
                .select('*, uploader:users!uploaded_by(full_name, role)')
                .order('created_at', { ascending: false });

            if (!error && data) {
                const localData = this._readLocalDb().evidence || [];
                return [...(data || []), ...localData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
        } catch (e) { }

        const db = this._readLocalDb();
        return (db.evidence || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Get evidence by case ID
    async getByCase(caseId) {
        try {
            const { data, error } = await supabase
                .from('evidence')
                .select('*, uploader:users!uploaded_by(full_name, role)')
                .eq('case_id', caseId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                // Merge with local if needed
                const localData = this._readLocalDb().evidence.filter(e => e.case_id === caseId);
                return [...(data || []), ...localData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
        } catch (e) { }

        const db = this._readLocalDb();
        return (db.evidence || []).filter(e => e.case_id === caseId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Get evidence by complaint ID
    async getByComplaint(complaintId) {
        try {
            const { data, error } = await supabase
                .from('evidence')
                .select('*, uploader:users!uploaded_by(full_name, role)')
                .eq('complaint_id', complaintId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                const localData = this._readLocalDb().evidence.filter(e => e.complaint_id === complaintId);
                return [...(data || []), ...localData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
        } catch (e) { }

        const db = this._readLocalDb();
        return (db.evidence || []).filter(e => e.complaint_id === complaintId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Get single evidence by ID
    async getById(evidenceId) {
        try {
            const { data, error } = await supabase
                .from('evidence')
                .select('*, uploader:users!uploaded_by(full_name, role)')
                .eq('id', evidenceId)
                .single();

            if (!error && data) return data;
        } catch (e) { }

        const db = this._readLocalDb();
        const local = (db.evidence || []).find(e => e.id === evidenceId);
        if (!local) throw ApiError.notFound('Evidence not found.');
        return local;
    }

    // Verify evidence (police/admin)
    async verify(evidenceId, verifiedBy) {
        try {
            const { data, error } = await supabase
                .from('evidence')
                .update({ is_verified: true, verified_by: verifiedBy })
                .eq('id', evidenceId)
                .select('*')
                .single();

            if (!error && data) return data;
        } catch (e) { }

        const db = this._readLocalDb();
        const index = db.evidence.findIndex(e => e.id === evidenceId);
        if (index === -1) throw ApiError.notFound('Evidence not found.');

        db.evidence[index].is_verified = true;
        db.evidence[index].verified_by = verifiedBy;
        this._writeLocalDb(db);

        logger.info(`Evidence ${evidenceId} verified (Local) by ${verifiedBy}`);
        return db.evidence[index];
    }

    // Delete evidence
    async delete(evidenceId) {
        let evidence = null;

        try {
            const { data } = await supabase
                .from('evidence')
                .select('storage_path, file_name')
                .eq('id', evidenceId)
                .single();
            evidence = data;
        } catch (e) { }

        if (!evidence) {
            const db = this._readLocalDb();
            evidence = db.evidence.find(e => e.id === evidenceId);
            if (!evidence) throw ApiError.notFound('Evidence not found.');

            db.evidence = db.evidence.filter(e => e.id !== evidenceId);
            this._writeLocalDb(db);
        } else {
            // Delete from Supabase
            await supabase.from('evidence').delete().eq('id', evidenceId);
        }

        // Delete from storage
        if (evidence.storage_path) {
            try {
                if (evidence.storage_path.startsWith('evidence/')) {
                    await supabase.storage.from('evidence-files').remove([evidence.storage_path]);
                } else if (fs.existsSync(evidence.storage_path)) {
                    fs.unlinkSync(evidence.storage_path);
                }
            } catch (e) {
                logger.warn('Storage deletion failed', { error: e.message });
            }
        }

        logger.info(`Evidence ${evidenceId} deleted`);
        return { message: 'Evidence deleted successfully.' };
    }
}

module.exports = new EvidenceService();
