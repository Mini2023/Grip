
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Try to read .env.local
let envContent = '';
try {
    envContent = fs.readFileSync('.env.local', 'utf8');
} catch (e) {}

const getEnv = (key) => {
    const match = envContent.match(new RegExp(`${key}=(.*)`));
    return match ? match[1].trim() : process.env[key];
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    // 1. Check profiles table
    const { data: profile, error: pError } = await supabase.from('profiles').select('*').limit(1);
    if (pError) console.error('Profiles select error:', pError);
    else {
        console.log('--- PROFILES TABLE ---');
        console.log('Sample:', profile[0]);
        console.log('Columns:', Object.keys(profile[0] || {}));
    }

    // 2. Check sessions table
    const { data: session, error: sError } = await supabase.from('sessions').select('*').limit(1);
    if (sError) console.error('Sessions select error:', sError);
    else {
        console.log('--- SESSIONS TABLE ---');
        console.log('Sample:', session[0]);
        console.log('Columns:', Object.keys(session[0] || {}));
    }
}

checkSchema();
