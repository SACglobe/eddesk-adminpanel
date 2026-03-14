import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase.rpc('get_admin_initial_data');
    if (error) {
        console.error(error);
        return;
    }
    const screens = data.templatescreens;
    const c1 = screens.find(s => s.screenslug === 'home')?.components?.find(c => c.componentcode === 'gallery');
    const c2 = screens.find(s => s.screenslug === 'gallery')?.components?.find(c => c.componentcode === 'gallery');
    console.log("Home Gallery:", JSON.stringify(c1, null, 2));
    console.log("Gallery Gallery:", JSON.stringify(c2, null, 2));
}
run();
