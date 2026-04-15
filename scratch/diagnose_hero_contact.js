const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load env
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

const SCHOOL_KEY = 'bbe79277-b0f0-4b09-b873-e8b1e48f321c';

async function diagnose() {
    console.log('--- DIAGNOSING HERO FOR SCHOOL:', SCHOOL_KEY, '---');

    // 0. Resolve Template Key
    const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('templatekey')
        .eq('key', SCHOOL_KEY)
        .single();
    
    if (schoolError) {
        console.error('School Fetch Error:', schoolError);
        return;
    }
    
    const templateKey = schoolData.templatekey;
    console.log('Using Template Key:', templateKey);

    // 1. Get Template Screens
    const { data: screens, error: screenError } = await supabase
        .from('templatescreens')
        .select('*')
        .eq('templatekey', templateKey);
    
    if (screenError) {
        console.error('Screen Fetch Error:', screenError);
        return;
    }
    
    const contactScreen = screens.find(s => s.screenslug === 'contact');
    console.log('Contact Screen Found:', !!contactScreen);

    if (contactScreen) {
        // 2. Get Components for Contact Screen
        const { data: components } = await supabase
            .from('templatecomponents')
            .select('*, componentregistry(*)')
            .eq('templatescreenkey', contactScreen.key);
        
        const heroComp = components.find(c => c.componentcode === 'hero' || c.componentcode.includes('hero'));
        console.log('Hero Component on Contact:', heroComp ? {
            code: heroComp.componentcode,
            tableName: heroComp.componentregistry?.tablename,
            config: heroComp.config,
            registryDataType: heroComp.componentregistry?.datatype
        } : 'NOT FOUND');

        // 3. Check actual herocontent table
        if (heroComp?.componentregistry?.tablename) {
            const { count, data } = await supabase
                .from(heroComp.componentregistry.tablename)
                .select('*', { count: 'exact' })
                .eq('schoolkey', SCHOOL_KEY)
                .eq('screenslug', 'contact');
            
            console.log('Actual DB Count (Filtered by contact):', count);
            console.log('Sample Record:', data?.[0] ? { key: data[0].key, headline: data[0].headline } : 'NONE');
        }
    }
}

diagnose();
