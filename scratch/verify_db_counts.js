const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load env
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounts() {
    // 1. Get School Key from schools table
    const { data: schools } = await supabase.from('schools').select('*').limit(1);
    const schoolKey = schools[0].key;
    console.log('--- System Context ---');
    console.log('Target School Key:', schoolKey);

    // 2. Check schoolidentity table
    const { count: identityCount, data: identityData } = await supabase
        .from('schoolidentity')
        .select('*', { count: 'exact' })
        .eq('schoolkey', schoolKey);
    
    console.log('--- Database Audit ---');
    console.log('Table: schoolidentity');
    console.log('Total Count for school:', identityCount);
    if (identityData && identityData.length > 0) {
        console.log('First Record Preview:', { 
            key: identityData[0].key, 
            vision: identityData[0].vision?.substring(0, 20),
            schoolkey: identityData[0].schoolkey 
        });
    }

    // 3. Check herocontent table
    const { count: heroCount } = await supabase
        .from('herocontent')
        .select('*', { count: 'exact' })
        .eq('schoolkey', schoolKey);
    console.log('Table: herocontent');
    console.log('Total Count for school:', heroCount);
}

checkCounts();
