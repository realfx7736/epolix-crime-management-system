import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dlpnjbbmzfwxbvwqzuxh.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRscG5qYmJtemZ3eGJ2d3F6dXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzQzMjEsImV4cCI6MjA4ODQ1MDMyMX0.Yg6ADdRAZ8mreAdoFo664LretdIB5uJE99UmyGmxsOQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
