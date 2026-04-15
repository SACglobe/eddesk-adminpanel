const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load env
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectData() {
    const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'arun@sacglobe.com', // Assuming this from previous logs
        password: 'Password123' 
    });

    if (!session) {
        console.error("Login failed");
        return;
    }

    const { data, error } = await supabase.rpc('get_admin_initial_data');
    if (error) {
        console.error(error);
        return;
    }

    // Inspect Contact Details component in templatescreens
    const screens = data.templatescreens;
    for (const screen of screens) {
        for (const comp of screen.components) {
            if (comp.componentcode === 'contactdetails') {
                console.log('--- Contact Details Component ---');
                console.log('Component Keys:', Object.keys(comp));
                console.log('Content Property:', comp.content);
                console.log('ContentPlacements Property:', comp.contentplacements);
            }
        }
    }
}

inspectData();
