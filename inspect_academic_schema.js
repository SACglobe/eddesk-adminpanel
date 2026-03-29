const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspectTable() {
    let { data, error } = await supabase.from('academicresults').select('*').limit(1);
    if (error) {
        console.log("Error querying academicresults:", error.message);
        // Try with underscore
        let res2 = await supabase.from('academic_results').select('*').limit(1);
        if (res2.error) console.log("Error querying academic_results:", res2.error.message);
        else console.log("Columns for academic_results:", Object.keys(res2.data[0] || {}));
    } else {
        console.log("academicresults table exists.");
        if (data && data.length > 0) {
            console.log("Columns for academicresults:", Object.keys(data[0]));
        } else {
            console.log("Table is empty, need to inspect via RPC or admin permissions");
        }
    }
}
inspectTable();
