const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const content = fs.readFileSync('.env.local', 'utf8');
const env = {};
content.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSchema() {
    console.log('Checking leadership table schema...');
    const { data, error } = await supabase.from('leadership').select('*').limit(1);
    if (error) {
        console.error('Error fetching leadership:', error.message, error.code);
    } else if (data && data[0]) {
        console.log('Leadership Variables (Truth):', Object.keys(data[0]));
    } else if (data) {
        console.log('Leadership table is empty, but accessible.');
        // We can't see keys if it's empty, but we can try to guess from the RPC if it exists.
    }
}
checkSchema();
