/**
 * E-POLIX Environment Configuration Sanitizer
 * Automatically trims and cleans environment variables of accidental 
 * white spaces or quotes which often occur during cloud deployment.
 */

const clean = (val) => {
    if (!val) return '';
    let result = val.trim();
    // Strip accidental wrapping quotes (single or double)
    if ((result.startsWith('"') && result.endsWith('"')) || (result.startsWith("'") && result.endsWith("'"))) {
        result = result.substring(1, result.length - 1);
    }
    return result.trim();
};

module.exports = {
    // Supabase
    SUPABASE_URL: clean(process.env.SUPABASE_URL),
    SUPABASE_ANON_KEY: clean(process.env.SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),

    // JWT
    JWT_SECRET: clean(process.env.JWT_SECRET),
    JWT_REFRESH_SECRET: clean(process.env.JWT_REFRESH_SECRET),
    JWT_EXPIRY: clean(process.env.JWT_EXPIRY) || '15m',
    JWT_REFRESH_EXPIRY: clean(process.env.JWT_REFRESH_EXPIRY) || '7d',

    // Twilio
    TWILIO_ACCOUNT_SID: clean(process.env.TWILIO_ACCOUNT_SID),
    TWILIO_AUTH_TOKEN: clean(process.env.TWILIO_AUTH_TOKEN),
    TWILIO_PHONE_NUMBER: clean(process.env.TWILIO_PHONE_NUMBER),

    // App
    NODE_ENV: clean(process.env.NODE_ENV) || 'development',
    PORT: parseInt(process.env.PORT) || 5000,
    FRONTEND_URL: clean(process.env.FRONTEND_URL) || 'http://localhost:5173',
};
