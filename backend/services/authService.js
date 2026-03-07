const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const { generateOTP } = require('../utils/helpers');
const logger = require('../utils/logger');

const crypto = require('crypto');

const SALT_ROUNDS = 12;
const MASTER_OTP = process.env.MASTER_OTP || '123456';
const AADHAAR_SALT = process.env.AADHAAR_SALT || 'E-POLIX-SECURE-SALT-2026';

class AuthService {

    // Securely hash Aadhaar for database lookups
    _hashAadhaar(aadhaar) {
        return crypto.createHmac('sha256', AADHAAR_SALT).update(aadhaar).digest('hex');
    }

    // Citizen Login Step 1: Aadhaar Check & Send OTP
    async citizenAadhaarStep1(aadhaar) {
        if (!/^\d{12}$/.test(aadhaar)) {
            throw ApiError.badRequest('Invalid Aadhaar format. Must be 12 digits.');
        }

        const hash = this._hashAadhaar(aadhaar);
        const masked = `XXXXXXXX${aadhaar.slice(-4)}`;

        // Check if citizen exists
        let { data: citizen } = await supabase
            .from('users')
            .select('*')
            .eq('aadhaar_hash', hash)
            .eq('role', 'citizen')
            .single();

        // If not, auto-create a basic citizen record (since it's a mock eKYC)
        if (!citizen) {
            const { data: newUser, error } = await supabase
                .from('users')
                .insert({
                    full_name: 'Citizen (Aadhaar Verified)',
                    role: 'citizen',
                    aadhaar_hash: hash,
                    aadhaar: masked,
                    phone: '9876543210', // Mock phone linked to Aadhaar
                    is_active: true,
                    is_verified: false
                })
                .select('*')
                .single();

            if (error) throw ApiError.internal('Failed to initialize citizen record.');
            citizen = newUser;
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds as requested

        // Store OTP
        await supabase.from('otp_tokens').insert({
            user_id: citizen.id,
            identifier: hash, // Use hash as ID to avoid exposing Aadhaar
            otp_code: otp,
            purpose: 'citizen_login',
            expires_at: expiresAt.toISOString()
        });

        logger.info(`Citizen OTP sent for Aadhaar: ${masked}`);

        return {
            success: true,
            message: `OTP sent to phone linked with Aadhaar ${masked}`,
            identifier: hash,
            expiresIn: 60,
            // Dev mode return
            ...(process.env.NODE_ENV === 'development' && { devOtp: otp })
        };
    }

    // Citizen Login Step 2: Verify OTP
    async citizenVerifyOTP(identifier_hash, otp) {
        const { data: otpRecord } = await supabase
            .from('otp_tokens')
            .select('*')
            .eq('identifier', identifier_hash)
            .eq('otp_code', otp)
            .eq('is_used', false)
            .gte('expires_at', new Date().toISOString())
            .single();

        if (!otpRecord && !(otp === MASTER_OTP && process.env.NODE_ENV === 'development')) {
            throw ApiError.unauthorized('Invalid or expired OTP.');
        }

        // Find user
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', otpRecord?.user_id || (await supabase.from('users').select('id').eq('aadhaar_hash', identifier_hash).single()).data.id)
            .single();

        if (!user) throw ApiError.notFound('Citizen record not found.');

        // Update OTP as used
        if (otpRecord) {
            await supabase.from('otp_tokens').update({ is_used: true }).eq('id', otpRecord.id);
        }

        // Update last login
        await supabase.from('users').update({
            last_login: new Date().toISOString(),
            is_verified: true,
            is_aadhaar_verified: true
        }).eq('id', user.id);

        return this._generateTokenResponse(user);
    }


    // Register a new user
    async register(userData) {
        const { email, phone, aadhaar, password, full_name, role, department_id, badge_number, rank, station, district, state } = userData;

        // Check if email already exists
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existing) {
            throw ApiError.conflict('A user with this email already exists.');
        }

        // Check if aadhaar already exists (if provided)
        if (aadhaar) {
            const { data: aadhaarExists } = await supabase
                .from('users')
                .select('id')
                .eq('aadhaar', aadhaar)
                .single();

            if (aadhaarExists) {
                throw ApiError.conflict('A user with this Aadhaar number already exists.');
            }
        }

        // Check if department_id already exists (for police/staff/admin)
        if (department_id) {
            const { data: deptExists } = await supabase
                .from('users')
                .select('id')
                .eq('department_id', department_id)
                .single();

            if (deptExists) {
                throw ApiError.conflict('A user with this Department ID already exists.');
            }
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        // Insert user
        const { data: newUser, error } = await supabase
            .from('users')
            .insert({
                full_name,
                email,
                phone,
                aadhaar: aadhaar || null,
                password_hash,
                role: role || 'citizen',
                department_id: department_id || null,
                badge_number: badge_number || null,
                rank: rank || null,
                station: station || null,
                district: district || null,
                state: state || null,
                is_verified: false,
                is_active: true
            })
            .select('id, full_name, email, phone, role, department_id, created_at')
            .single();

        if (error) {
            logger.error('Registration failed', { error: error.message });
            throw ApiError.internal('Registration failed. Please try again.');
        }

        logger.info(`New user registered: ${email} (${role})`);
        return newUser;
    }

    // Login — Stage 1: Verify identity & password
    async login(identifier, password, role) {
        let query = supabase.from('users').select('*');

        if (role === 'citizen') {
            // Citizens login with Aadhaar or email
            query = query.or(`aadhaar.eq.${identifier},email.eq.${identifier}`);
        } else {
            // Police/Staff/Admin login with email or department ID
            query = query.or(`email.eq.${identifier},department_id.eq.${identifier}`);
        }

        query = query.eq('role', role);

        const { data: users, error } = await query;

        if (error) {
            logger.error('Login query failed', { error: error.message });
            throw ApiError.internal('Login failed. Please try again.');
        }

        const user = users && users.length > 0 ? users[0] : null;

        if (!user) {
            throw ApiError.notFound('Identity not recognized in the system.');
        }

        if (!user.is_active) {
            throw ApiError.forbidden('Your account has been deactivated.');
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            throw ApiError.unauthorized('Invalid credentials.');
        }

        // Generate OTP (in production, send via SMS/Email)
        const otp = generateOTP();

        // Store OTP in database
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await supabase.from('otp_tokens').insert({
            user_id: user.id,
            identifier,
            otp_code: otp,
            purpose: 'login',
            expires_at: expiresAt.toISOString()
        });

        logger.info(`OTP generated for ${identifier} (Role: ${role})`);

        return {
            message: 'Identity verified. OTP sent to registered device.',
            nextStep: 'OTP_VERIFICATION',
            // In dev mode, return OTP. In production, remove this.
            ...(process.env.NODE_ENV === 'development' && { devOtp: otp })
        };
    }

    // Login — Stage 2: Verify OTP and issue JWT
    async verifyOTP(identifier, otp, role) {
        // Check master OTP for development
        if (otp === MASTER_OTP && process.env.NODE_ENV === 'development') {
            // Find user directly
            let query = supabase.from('users').select('*');

            if (role === 'citizen') {
                query = query.or(`aadhaar.eq.${identifier},email.eq.${identifier}`);
            } else {
                query = query.or(`email.eq.${identifier},department_id.eq.${identifier}`);
            }

            const { data: users } = await query.eq('role', role);
            const user = users && users.length > 0 ? users[0] : null;

            if (!user) throw ApiError.notFound('User not found.');

            return this._generateTokenResponse(user);
        }

        // Verify OTP from database
        const { data: otpRecord } = await supabase
            .from('otp_tokens')
            .select('*')
            .eq('identifier', identifier)
            .eq('otp_code', otp)
            .eq('is_used', false)
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!otpRecord) {
            throw ApiError.unauthorized('Invalid or expired OTP.');
        }

        // Mark OTP as used
        await supabase
            .from('otp_tokens')
            .update({ is_used: true })
            .eq('id', otpRecord.id);

        // Fetch user
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', otpRecord.user_id)
            .single();

        if (!user) throw ApiError.notFound('User not found.');

        // Update last login
        await supabase
            .from('users')
            .update({ last_login: new Date().toISOString(), is_verified: true })
            .eq('id', user.id);

        return this._generateTokenResponse(user);
    }

    // Generate JWT tokens and response
    _generateTokenResponse(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role
        };

        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRY || '24h'
        });

        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d'
        });

        logger.info(`User logged in: ${user.email} (${user.role})`);

        return {
            message: 'Login successful',
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                departmentId: user.department_id,
                badgeNumber: user.badge_number,
                rank: user.rank,
                station: user.station,
                isVerified: user.is_verified
            }
        };
    }

    // Refresh access token
    async refreshToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

            const { data: user } = await supabase
                .from('users')
                .select('*')
                .eq('id', decoded.userId)
                .single();

            if (!user || !user.is_active) {
                throw ApiError.unauthorized('Invalid refresh token.');
            }

            const newAccessToken = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRY || '24h' }
            );

            return { accessToken: newAccessToken };
        } catch (err) {
            throw ApiError.unauthorized('Invalid or expired refresh token.');
        }
    }

    // Get user profile
    async getProfile(userId) {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, full_name, email, phone, aadhaar, role, department_id, badge_number, rank, station, district, state, profile_photo_url, is_verified, last_login, created_at')
            .eq('id', userId)
            .single();

        if (error || !user) throw ApiError.notFound('User profile not found.');
        return user;
    }

    // Update user profile
    async updateProfile(userId, updates) {
        const allowedFields = ['full_name', 'phone', 'district', 'state', 'station'];
        const safeUpdates = {};

        for (const key of allowedFields) {
            if (updates[key] !== undefined) {
                safeUpdates[key] = updates[key];
            }
        }

        const { data, error } = await supabase
            .from('users')
            .update(safeUpdates)
            .eq('id', userId)
            .select('id, full_name, email, phone, role, district, state, station')
            .single();

        if (error) throw ApiError.internal('Failed to update profile.');
        return data;
    }

    // Seed default users (for development/testing)
    async seedUsers() {
        const salt = await bcrypt.genSalt(SALT_ROUNDS);

        const users = [
            {
                full_name: 'Super Admin',
                email: 'admin@epolix.gov.in',
                phone: '9999999999',
                department_id: 'ADMIN-001',
                role: 'admin',
                password_hash: await bcrypt.hash('admin123', salt),
                is_verified: true,
                is_active: true
            },
            {
                full_name: 'Inspector Vikram',
                email: 'vikram@police.gov.in',
                phone: '8888888888',
                department_id: 'POLICE-001',
                badge_number: 'BDG-1001',
                rank: 'Inspector',
                station: 'Central Police Station',
                role: 'police',
                password_hash: await bcrypt.hash('police123', salt),
                is_verified: true,
                is_active: true
            },
            {
                full_name: 'Staff Rahul',
                email: 'rahul@staff.gov.in',
                phone: '7777777777',
                department_id: 'STAFF-001',
                role: 'staff',
                password_hash: await bcrypt.hash('staff123', salt),
                is_verified: true,
                is_active: true
            },
            {
                full_name: 'Citizen Priya',
                email: 'priya@citizen.com',
                phone: '6666666666',
                aadhaar: '123456789012',
                role: 'citizen',
                password_hash: await bcrypt.hash('citizen123', salt),
                is_verified: true,
                is_active: true
            }
        ];

        // Upsert to avoid duplicates
        for (const user of users) {
            const { data: existing } = await supabase
                .from('users')
                .select('id')
                .eq('email', user.email)
                .single();

            if (!existing) {
                await supabase.from('users').insert(user);
            }
        }

        logger.info('Database seeded with default users');
        return { message: 'Database seeded successfully with Admin, Police, Staff, and Citizen users.' };
    }
}

module.exports = new AuthService();
