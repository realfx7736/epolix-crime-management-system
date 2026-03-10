const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const DEFAULT_SUPABASE_URL = 'http://127.0.0.1:54321';
const FALLBACK_SERVICE_KEY = 'missing-service-role-key';
const FALLBACK_ANON_KEY = 'missing-anon-key';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration. Check your .env file.');
    console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    console.error(`   Using fallback client config (${DEFAULT_SUPABASE_URL}) so the API can boot.`);
}

// Service role client — bypasses RLS, used server-side only
const supabase = createClient(supabaseUrl || DEFAULT_SUPABASE_URL, supabaseServiceKey || FALLBACK_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Anon client — respects RLS, for public operations
const supabasePublic = createClient(supabaseUrl || DEFAULT_SUPABASE_URL, supabaseAnonKey || FALLBACK_ANON_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

module.exports = { supabase, supabasePublic };
