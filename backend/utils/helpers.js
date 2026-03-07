const crypto = require('crypto');

// Generate unique complaint number: EPLX-COMP-YYYYMMDD-XXXX
const generateComplaintNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `EPLX-COMP-${dateStr}-${random}`;
};

// Generate unique case number: EPLX-CASE-YYYYMMDD-XXXX
const generateCaseNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `EPLX-CASE-${dateStr}-${random}`;
};

// Generate FIR number: FIR-YYYY-XXXXX
const generateFIRNumber = () => {
    const year = new Date().getFullYear();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
    return `FIR-${year}-${random}`;
};

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Sanitize string input
const sanitize = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>]/g, '').trim();
};

// Paginate results
const paginate = (page = 1, limit = 20) => {
    const safePage = Math.max(1, parseInt(page));
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (safePage - 1) * safeLimit;
    return { offset, limit: safeLimit, page: safePage };
};

// Build pagination response
const paginatedResponse = (data, count, page, limit) => {
    return {
        data,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
            hasMore: page * limit < count
        }
    };
};

// Get file extension category
const getFileCategory = (mimeType) => {
    if (!mimeType) return 'other';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('sheet') || mimeType.includes('text'))
        return 'document';
    return 'other';
};

module.exports = {
    generateComplaintNumber,
    generateCaseNumber,
    generateFIRNumber,
    generateOTP,
    sanitize,
    paginate,
    paginatedResponse,
    getFileCategory
};
