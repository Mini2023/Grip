
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => envContent.match(new RegExp(`${key}=(.*)`))?.[1].trim();

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data: p } = await supabase.from('profiles').select('*').limit(1);
    console.log('PROFILES COLUMNS:', Object.keys(p[0]));
}
checkSchema();
