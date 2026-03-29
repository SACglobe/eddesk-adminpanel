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
    console.log('Inspecting componentregistry for Academic...');
    const { data: reg, error: regError } = await supabase.from('componentregistry').select('*').ilike('componentname', '%Academic%');
    if (regError) console.error('Error:', regError);
    else console.log('Registry:', JSON.stringify(reg, null, 2));

    if (reg && reg.length > 0) {
        console.log('\nInspecting templatecomponents for Academic...');
        const { data: comp, error: compError } = await supabase.from('templatecomponents').select('*').eq('componentregistrykey', reg[0].key);
        if (compError) console.error('Error:', compError);
        else console.log('Template Components:', JSON.stringify(comp, null, 2));
    }
}
check();
