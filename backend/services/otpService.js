const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');
const { generateOTP, sendSMS } = require('../utils/helpers');

/**
 * OTP Service for E-POLIX
 * Handles generation, hashing, storage, and verification of OTPs.
 */

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;

/**
 * Generate and send OTP to a mobile number
 * @param {string} mobileNumber - 10-digit mobile number
 * @param {string} userId - UUID of the user
 * @param {string} purpose - 'login', 'register', 'kyc', etc.
 * @returns {Promise<object>} - { success, message, otp (dev only) }
 */
const sendOTP = async (mobileNumber, userId, purpose = 'login') => {
    const mobile = mobileNumber.trim().replace(/\s|-/g, '');

    // 1. Generate 6-digit OTP
    const otp = process.env.NODE_ENV === 'test' ? '123456' : generateOTP();

    // 2. Hash OTP for secure storage
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    try {
        // 3. Delete any existing active OTP for this user/purpose
        await supabase.from('otp_tokens')
            .delete()
            .eq('user_id', userId)
            .eq('purpose', purpose);

        // 4. Store hashed OTP
        // Note: Using 'otp_hash' and 'attempts_count' as per updated schema.sql
        const { error } = await supabase.from('otp_tokens').insert([{
            user_id: userId,
            identifier: mobile,
            otp_hash: otpHash,
            purpose: purpose,
            is_used: false,
            // Try without attempts_count first to avoid schema mismatch if it's just `attempts`
            expires_at: expiresAt,
            created_at: new Date().toISOString()
        }]);

        if (error) {
            console.error('[OTP Service] DB Error:', error.message);
            // Fallback: If 'otp_hash' doesn't exist yet, try 'otp_code' (plain)
            if (error.message.includes('otp_hash') || error.message.includes('attempts_count')) {
                await supabase.from('otp_tokens').insert([{
                    user_id: userId,
                    identifier: mobile,
                    otp_code: otp, // store plain if hash column missing
                    purpose: purpose,
                    is_used: false,
                    expires_at: expiresAt
                }]);
            } else {
                throw new Error('Failed to record OTP in system.');
            }
        }

        // 5. Send via SMS
        const message = `Your E-POLIX security code is ${otp}. Valid for 5 minutes. DO NOT share this with anyone.`;
        const smsSent = await sendSMS(mobile, message);

        return {
            success: true,
            message: smsSent ? 'OTP sent successfully.' : 'OTP generated (SMS failed).',
            otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
            expiresAt
        };
    } catch (err) {
        console.error('[OTP Service] Error:', err.message);
        throw err;
    }
};

/**
 * Verify OTP entered by user
 * @param {string} userId - UUID of the user
 * @param {string} otpInput - 6-digit OTP entered by user
 * @param {string} purpose - 'login', etc.
 * @returns {Promise<object>} - { success, message }
 */
const verifyOTP = async (userId, otpInput, purpose = 'login') => {
    // 1. Check for Master OTP bypass in dev
    if (process.env.NODE_ENV !== 'production' && otpInput === (process.env.MASTER_OTP || '123456')) {
        return { success: true, message: 'Master OTP accepted.' };
    }

    try {
        // 2. Fetch latest unused OTP record
        const { data: records, error } = await supabase.from('otp_tokens')
            .select('*')
            .eq('user_id', userId)
            .eq('purpose', purpose)
            .eq('is_used', false)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error || !records || records.length === 0) {
            throw new Error('OTP not found. Please request a new one.');
        }

        const otpRecord = records[0];

        // 3. Check for expiry
        if (new Date(otpRecord.expires_at) < new Date()) {
            await supabase.from('otp_tokens').update({ is_used: true }).eq('id', otpRecord.id);
            throw new Error('OTP has expired. Please request a new one.');
        }

        // 4. Check for max attempts
        if ((otpRecord.attempts_count || otpRecord.attempts || 0) >= MAX_ATTEMPTS) {
            throw new Error('Too many incorrect attempts. Please request a new OTP.');
        }

        // 5. Verify Hash (or plain code if hash missing)
        let isValid = false;
        if (otpRecord.otp_hash) {
            isValid = await bcrypt.compare(otpInput, otpRecord.otp_hash);
        } else if (otpRecord.otp_code) {
            isValid = otpRecord.otp_code === otpInput;
        }

        if (!isValid) {
            // Increment attempts
            const col = otpRecord.attempts_count !== undefined ? 'attempts_count' : 'attempts';
            await supabase.from('otp_tokens')
                .update({ [col]: (otpRecord[col] || 0) + 1 })
                .eq('id', otpRecord.id);

            throw new Error('Invalid OTP code. Please try again.');
        }

        // 6. Mark as used on success
        await supabase.from('otp_tokens')
            .update({ is_used: true })
            .eq('id', otpRecord.id);

        return { success: true, message: 'OTP verified successfully.' };
    } catch (err) {
        console.error('[OTP Service] Verification Error:', err.message);
        throw err;
    }
};

module.exports = {
    sendOTP,
    verifyOTP
};
