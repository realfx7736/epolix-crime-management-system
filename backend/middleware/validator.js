const Joi = require('joi');

// ============================================================
// Authentication Validators
// ============================================================

const registerSchema = Joi.object({
    full_name: Joi.string().min(2).max(150).required().messages({
        'string.min': 'Name must be at least 2 characters',
        'any.required': 'Full name is required'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).required().messages({
        'string.pattern.base': 'Please provide a valid 10-digit Indian phone number',
        'any.required': 'Phone number is required'
    }),
    password: Joi.string().min(6).max(128).required().messages({
        'string.min': 'Password must be at least 6 characters',
        'any.required': 'Password is required'
    }),
    aadhaar: Joi.string().pattern(/^\d{12}$/).optional().messages({
        'string.pattern.base': 'Aadhaar must be a 12-digit number'
    }),
    role: Joi.string().valid('citizen', 'police', 'staff', 'admin').default('citizen'),
    department_id: Joi.string().optional(),
    badge_number: Joi.string().optional(),
    rank: Joi.string().optional(),
    station: Joi.string().optional(),
    district: Joi.string().optional(),
    state: Joi.string().optional()
});

const loginSchema = Joi.object({
    identifier: Joi.string().required().messages({
        'any.required': 'Email, Aadhaar, or Department ID is required'
    }),
    password: Joi.string().required().messages({
        'any.required': 'Password is required'
    }),
    role: Joi.string().valid('citizen', 'police', 'staff', 'admin').required()
});

const otpVerifySchema = Joi.object({
    identifier: Joi.string().required(),
    otp: Joi.string().length(6).required().messages({
        'string.length': 'OTP must be 6 digits'
    }),
    role: Joi.string().valid('citizen', 'police', 'staff', 'admin').required()
});

const citizenLoginSchema = Joi.object({
    aadhaarNumber: Joi.string().pattern(/^\d{12}$/).required().messages({
        'string.pattern.base': 'Aadhaar must be exactly 12 digits',
        'any.required': 'Aadhaar number is required'
    })
});

const terminalLoginSchema = Joi.object({
    role: Joi.string().valid('police', 'staff', 'admin').required(),
    identifier: Joi.string().trim().max(120).required(),
    password: Joi.string().min(1).max(256).required()
});

const verifyOtpLoginSchema = Joi.object({
    userId: Joi.string().trim().max(120).required(),
    role: Joi.string().valid('citizen', 'police', 'staff', 'admin').required(),
    otp: Joi.string().pattern(/^\d{6}$/).required().messages({
        'string.pattern.base': 'OTP must be exactly 6 digits'
    })
});

// ============================================================
// Complaint Validators
// ============================================================

const complaintSchema = Joi.object({
    title: Joi.string().min(5).max(300).required().messages({
        'string.min': 'Title must be at least 5 characters',
        'any.required': 'Complaint title is required'
    }),
    description: Joi.string().min(20).max(5000).required().messages({
        'string.min': 'Description must be at least 20 characters',
        'any.required': 'Complaint description is required'
    }),
    category_id: Joi.string().uuid().optional(),
    category_name: Joi.string().max(100).optional(),
    subcategory: Joi.string().max(100).optional(),
    incident_date: Joi.date().iso().optional(),
    incident_time: Joi.string().optional(),
    location: Joi.string().max(500).optional(),
    landmark: Joi.string().max(200).optional(),
    district: Joi.string().max(100).optional(),
    state: Joi.string().max(100).optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
    is_anonymous: Joi.boolean().default(false),
    complainant_name: Joi.string().optional(),
    complainant_phone: Joi.string().optional(),
    complainant_email: Joi.string().email().optional(),
    complainant_address: Joi.string().optional()
});

const complaintUpdateSchema = Joi.object({
    status: Joi.string().valid(
        'submitted', 'under_review', 'verified', 'investigation',
        'resolved', 'closed', 'rejected', 'escalated'
    ).optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
    review_notes: Joi.string().max(2000).optional(),
    is_fir_filed: Joi.boolean().optional(),
    fir_number: Joi.string().optional()
}).min(1);

// ============================================================
// Case Validators
// ============================================================

const caseSchema = Joi.object({
    complaint_id: Joi.string().uuid().optional(),
    title: Joi.string().min(5).max(300).required(),
    description: Joi.string().max(5000).optional(),
    category_id: Joi.string().uuid().optional(),
    category_name: Joi.string().optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
    assigned_officer_id: Joi.string().uuid().optional(),
    location: Joi.string().optional(),
    district: Joi.string().optional(),
    state: Joi.string().optional()
});

const caseUpdateSchema = Joi.object({
    status: Joi.string().valid(
        'open', 'assigned', 'under_investigation', 'evidence_collection',
        'chargesheet_filed', 'court_proceedings', 'convicted', 'acquitted',
        'closed', 'reopened', 'transferred'
    ).optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
    assigned_officer_id: Joi.string().uuid().optional(),
    investigating_officer: Joi.string().optional(),
    court_name: Joi.string().optional(),
    court_case_number: Joi.string().optional(),
    hearing_date: Joi.date().iso().optional(),
    judgment: Joi.string().optional(),
    notes: Joi.string().max(2000).optional()
}).min(1);

const investigationNoteSchema = Joi.object({
    title: Joi.string().min(3).max(200).required(),
    content: Joi.string().min(10).max(10000).required(),
    is_confidential: Joi.boolean().default(false)
});

// ============================================================
// Validation Middleware Factory
// ============================================================

const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const details = error.details.map(d => ({
                field: d.path.join('.'),
                message: d.message.replace(/['"]/g, '')
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                details
            });
        }

        req.body = value;
        next();
    };
};

module.exports = {
    validate,
    registerSchema,
    loginSchema,
    otpVerifySchema,
    citizenLoginSchema,
    terminalLoginSchema,
    verifyOtpLoginSchema,
    complaintSchema,
    complaintUpdateSchema,
    caseSchema,
    caseUpdateSchema,
    investigationNoteSchema
};
