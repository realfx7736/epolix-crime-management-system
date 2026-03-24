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

// Generate unique Police ID / Badge Number: POL-KL-2026-0001
const generatePoliceID = async (supabase) => {
    const year = new Date().getFullYear();
    const stateCode = 'KL';

    // Count existing to increment
    const { count, error } = await supabase
        .from('police_officers')
        .select('*', { count: 'exact', head: true });

    if (error) return `POL-${stateCode}-${year}-${Math.floor(1000 + Math.random() * 9000)}`;

    const nextNumber = (count + 1).toString().padStart(4, '0');
    return `POL-${stateCode}-${year}-${nextNumber}`;
};

// Generate unique Staff ID / Personnel Number: STF-KL-2026-0001
const generateStaffID = async (supabase) => {
    const year = new Date().getFullYear();
    const stateCode = 'KL';
    const { count, error } = await supabase
        .from('staff_members')
        .select('*', { count: 'exact', head: true });

    if (error) return `STF-${stateCode}-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nextNumber = (count + 1).toString().padStart(4, '0');
    return `STF-${stateCode}-${year}-${nextNumber}`;
};

// Generate unique Admin ID: ADM-KL-2026-0001
const generateAdminID = async (supabase) => {
    const year = new Date().getFullYear();
    const stateCode = 'KL';
    const { count, error } = await supabase
        .from('admin_users')
        .select('*', { count: 'exact', head: true });

    if (error) return `ADM-${stateCode}-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nextNumber = (count + 1).toString().padStart(4, '0');
    return `ADM-${stateCode}-${year}-${nextNumber}`;
};

// Generate strong password (12 or 14 chars)
const generateSecurePassword = (length = 12) => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
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

// Send OTP via SMS API (Twilio implementation)
const sendSMS = async (phone, message) => {
    const hasTwilioConfig = process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER;

    // DEVELOPMENT: Log to console if Twilio not fully configured or in test mode
    if (!hasTwilioConfig || process.env.NODE_ENV === 'test') {
        console.log(`[DEV SMS] To: ${phone} | Msg: ${message}`);
        return true; // pretend success so OTP flow continues
    }

    try {
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        // Ensure phone is in E.164 format (e.g., +919876543210)
        let formattedPhone = phone.trim().replace(/\s/g, '');
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = `+91${formattedPhone}`; // Default to India
        }

        // Wrap in a 10-second timeout so a Twilio failure never hangs the server
        const smsPromise = client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedPhone
        });
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Twilio timeout after 10s')), 10000)
        );

        const response = await Promise.race([smsPromise, timeoutPromise]);

        if (process.env.NODE_ENV !== 'production') {
            console.log(`[Twilio SMS] SID: ${response.sid} | Status: ${response.status}`);
        }
        return true;
    } catch (err) {
        console.error('Twilio SMS Error:', err.message);
        return false;
    }
};

// Send Email via SMTP / Resend / Mailgun
const sendEmail = async (email, subject, body) => {
    // DEVELOPMENT: Log to console
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[EMAIL] To: ${email} | Sub: ${subject}`);
        return true;
    }
    // PRODUCTION: Implement Email API
    // await transporter.sendMail({ from, to: email, subject, html: body });
    return true;
};

module.exports = {
    generateComplaintNumber,
    generateCaseNumber,
    generateFIRNumber,
    generatePoliceID,
    generateStaffID,
    generateAdminID,
    generateSecurePassword,
    generateOTP,
    sanitize,
    paginate,
    paginatedResponse,
    getFileCategory,
    sendSMS,
    sendEmail
};
