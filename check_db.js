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
    console.log('Fetching sample data from candidates...');
    const guesses = [
        'admins', 'admin', 'staff', 'users', 'profiles',
        'admin_profile', 'school_admins', 'schooladmins'
    ];

    for (const t of guesses) {
        const { data, error } = await supabase.from(t).select('*').limit(1);
        if (error) {
            // Only log if it's not a common "not found" error to reduce noise
            if (error.code !== 'PGRST205' && error.code !== 'PGRST204') {
                console.log(`${t}: ERROR ${error.message} (${error.code})`);
            }
        } else if (data && data.length > 0) {
            console.log(`${t}: SUCCESS - Keys: ${Object.keys(data[0])}`);
        } else if (data) {
            console.log(`${t}: SUCCESS (Empty)`);
        }
    }
}
check();
