// ============================================================
// Application Constants & Enums
// ============================================================

const ROLES = {
    CITIZEN: 'citizen',
    POLICE: 'police',
    STAFF: 'staff',
    ADMIN: 'admin'
};

const COMPLAINT_STATUS = {
    SUBMITTED: 'submitted',
    UNDER_REVIEW: 'under_review',
    VERIFIED: 'verified',
    INVESTIGATION: 'investigation',
    RESOLVED: 'resolved',
    CLOSED: 'closed',
    REJECTED: 'rejected',
    ESCALATED: 'escalated'
};

const CASE_STATUS = {
    OPEN: 'open',
    ASSIGNED: 'assigned',
    UNDER_INVESTIGATION: 'under_investigation',
    EVIDENCE_COLLECTION: 'evidence_collection',
    CHARGESHEET_FILED: 'chargesheet_filed',
    COURT_PROCEEDINGS: 'court_proceedings',
    CONVICTED: 'convicted',
    ACQUITTED: 'acquitted',
    CLOSED: 'closed',
    REOPENED: 'reopened',
    TRANSFERRED: 'transferred'
};

const PRIORITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

const EVIDENCE_TYPES = {
    IMAGE: 'image',
    VIDEO: 'video',
    DOCUMENT: 'document',
    AUDIO: 'audio',
    FORENSIC: 'forensic',
    OTHER: 'other'
};

const NOTIFICATION_TYPES = {
    INFO: 'info',
    WARNING: 'warning',
    SUCCESS: 'success',
    ERROR: 'error',
    CASE_UPDATE: 'case_update',
    COMPLAINT_UPDATE: 'complaint_update',
    ASSIGNMENT: 'assignment',
    SYSTEM: 'system'
};

const ALLOWED_FILE_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
    video: ['video/mp4', 'video/avi', 'video/mkv', 'video/webm', 'video/mov'],
    document: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
    ],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3']
};

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50MB default

module.exports = {
    ROLES,
    COMPLAINT_STATUS,
    CASE_STATUS,
    PRIORITY,
    EVIDENCE_TYPES,
    NOTIFICATION_TYPES,
    ALLOWED_FILE_TYPES,
    MAX_FILE_SIZE
};
