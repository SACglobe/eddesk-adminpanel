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
    console.log('Inspecting templatecomponents table columns...');
    const { data, error } = await supabase.from('templatecomponents').select('*').limit(1);
    if (error) {
        console.error('Error:', error.message);
    } else if (data && data[0]) {
        console.log('Columns in templatecomponents table:', Object.keys(data[0]).join(', '));
        console.log('Sample row:', JSON.stringify(data[0], null, 2));
    } else {
        console.log('templatecomponents table is empty or inaccessible.');
    }

    console.log('\nInspecting templatescreens table columns...');
    const { data: screenData, error: screenError } = await supabase.from('templatescreens').select('*').limit(1);
    if (screenError) {
        console.error('Error:', screenError.message);
    } else if (screenData && screenData[0]) {
        console.log('Columns in templatescreens table:', Object.keys(screenData[0]).join(', '));
        console.log('Sample row:', JSON.stringify(screenData[0], null, 2));
    }
}
check();
