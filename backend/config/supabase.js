const { createClient } = require('@supabase/supabase-js');
const env = require('./env');
const supabaseUrl = env.SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = env.SUPABASE_ANON_KEY;
const DEFAULT_SUPABASE_URL = 'http://127.0.0.1:54321';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration. Check your Render dashboard OR local .env.');
    console.error(`   URL set: ${Boolean(supabaseUrl)} | Key set: ${Boolean(supabaseServiceKey)}`);
}

// Service role client — bypasses RLS, used server-side only
const supabase = createClient(supabaseUrl || DEFAULT_SUPABASE_URL, supabaseServiceKey || 'missing', {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Anon client — respects RLS, for public operations
const supabasePublic = createClient(supabaseUrl || DEFAULT_SUPABASE_URL, supabaseAnonKey || 'missing', {
    auth: { autoRefreshToken: false, persistSession: false }
});

module.exports = { supabase, supabasePublic };
