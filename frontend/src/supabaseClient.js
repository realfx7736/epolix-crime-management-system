import { createClient } from '@supabase/supabase-js'

// Use environment variables for production security
// These should be configured in Vercel/Render dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase configuration missing! Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in environment variables.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
