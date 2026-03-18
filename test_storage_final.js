import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase Environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  const schoolKey = 'bbe79277-b0f0-4b09-b873-e8b1e48f321c'; // Valid school key found earlier
  const category = 'banners';
  const fileName = `test-upload-${Date.now()}.txt`;
  const filePath = `${schoolKey}/${category}/${fileName}`;
  const fileBody = 'This is a test file to verify Supabase Storage upload and folder structure.';

  console.log(`🚀 Testing upload to: media/${filePath}`);

  const { data, error } = await supabase.storage
    .from('media')
    .upload(filePath, fileBody, {
      contentType: 'text/plain',
      upsert: true
    });

  if (error) {
    console.error('❌ Upload failed:', error.message);
    return;
  }

  console.log('✅ Upload successful!', data);

  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(filePath);

  console.log('🔗 Public URL:', publicUrl);
  
  // Clean up: optional, but good for testing
  // console.log('Cleaning up test file...');
  // await supabase.storage.from('media').remove([filePath]);
}

testUpload();
