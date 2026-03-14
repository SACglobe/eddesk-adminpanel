const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnv() {
    const content = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) env[key.trim()] = value.trim();
    });
    return env;
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log('Inspecting schools table columns...');
    const { data, error } = await supabase.from('schools').select('*').limit(1);
    if (error) {
        console.error('Error:', error.message);
    } else if (data && data[0]) {
        console.log('Columns in schools table:', Object.keys(data[0]).join(', '));
    } else {
        console.log('Schools table is empty or inaccessible.');
    }
}
check();
