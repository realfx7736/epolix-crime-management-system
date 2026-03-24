const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config(); // Picks up from cwd which will be backend

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySupabase() {
    console.log('--- Verifying Supabase Database ---');
    try {
        // Test auth
        const { data: users, error: authErr } = await supabase.auth.admin.listUsers();
        if (authErr) {
            console.log('⚠️ Could not list users (might not be an admin key):', authErr.message);
        } else {
            console.log('✅ Supabase Auth connection successful. Users count:', users.users.length);
        }

        // Test tables
        const tables = ['users', 'profiles', 'complaints', 'cases', 'evidence', 'notifications', 'crime_categories'];
        for (const table of tables) {
            const { data, error, count } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            if (error) {
                console.error(`❌ Error accessing table '${table}':`, error.message);
            } else {
                console.log(`✅ Table '${table}' is accessible. Row count: ${count}`);
            }
        }
    } catch (e) {
        console.error('❌ Supabase verification failed:', e.message);
    }
}

async function verifyLiveFrontend() {
    console.log('\n--- Verifying Live Frontend (Vercel) ---');
    const url = 'https://epolix-crime-management-system.vercel.app';
    try {
        const res = await fetch(url);
        const text = await res.text();
        if (res.ok && text.includes('<div id="root">')) {
            console.log(`✅ Frontend is live at ${url}`);
        } else {
            console.log(`❌ Frontend check failed. Status: ${res.status}`);
        }
    } catch (e) {
        console.error('❌ Error fetching frontend:', e.message);
    }
}

async function verifyLiveBackend() {
    console.log('\n--- Verifying Live Backend (Render) ---');
    const url = 'https://epolix-api.onrender.com/api/health';
    try {
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            console.log(`✅ Backend is live at ${url}. Service: ${data.service}`);
        } else {
            console.log(`❌ Backend check failed. Status: ${res.status}`);
        }
    } catch (e) {
        console.error('❌ Error fetching backend:', e.message);
    }
}

async function runAll() {
    await verifySupabase();
    await verifyLiveFrontend();
    await verifyLiveBackend();
}

runAll();
