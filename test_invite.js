import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Superbase Env variables!");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const email = 'superadmin@eddesk.in';
  const password = 'Password@123';
  const fullname = 'System Superadmin';
  const role = 'superadmin';
  const phone = '+1234567890';
  const schoolkey = 'bbe79277-b0f0-4b09-b873-e8b1e48f321c';

  console.log(`1. Calling /api/createadmininvite running on localhost:3000...`);
  try {
    const res = await fetch('http://localhost:3000/api/createadmininvite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pemail: email,
        pfullname: fullname,
        pphone: phone,
        prole: role,
        pschoolkey: schoolkey
      })
    });
    
    const data = await res.json();
    console.log("API Response:", data);
    
    let uidToUpdate = null;
    
    if (data.success && data.authuserid) {
       uidToUpdate = data.authuserid;
    } else if (data.error && data.error.includes("already exists")) {
       console.log("User already exists, fetching their ID from Auth...");
       const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
       if (usersData && usersData.users) {
          const user = usersData.users.find(u => u.email === email);
          if (user) uidToUpdate = user.id;
       }
    } else if (!data.success) {
       console.error("Failed to create user through API:", data.error);
       return;
    }
    
    if (uidToUpdate) {
       console.log(`2. Updating password for auth user ${uidToUpdate}...`);
       // Set password and automatically verify email to skip verification
       const { error } = await supabaseAdmin.auth.admin.updateUserById(
          uidToUpdate,
          { password: password, email_confirm: true }
       );
       
       if (error) {
           console.error("Error setting password:", error.message);
       } else {
           console.log("------------------------------------------");
           console.log("✅ USER SUCCESSFULLY CREATED AND VERIFIED!");
           console.log(`📧 Email: ${email}`);
           console.log(`🔑 Password: ${password}`);
           console.log("------------------------------------------");
       }
    }
  } catch(e) {
    console.error("Execution failed:", e);
  }
}

main();
