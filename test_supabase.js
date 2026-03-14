const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://adjxsdihvjwntavpymhg.supabase.co'
const supabaseKey = 'sb_publishable_8n3xN3orVAA071qiLkQVPg_U5HnkqMZ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('Testing Supabase Connection...')
  
  // Try to call the RPC as defined in your governance docs
  console.log('Calling RPC get_schema_information...')
  const { data, error } = await supabase.rpc('get_schema_information')
  
  if (error) {
    console.error('RPC Error:', error.message)
    console.log('\nTrying a fallback query to information_schema (if permissions allow)...')
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('templates')
      .select('*')
      .limit(1)
      
    if (fallbackError) {
       console.error('Fallback Error:', fallbackError.message)
    } else {
       console.log('Fallback Success. Connection is working, but RPC might not exist or be accessible.')
       console.log('Templates data:', fallbackData)
    }
  } else {
    console.log('RPC Success!')
    console.log(JSON.stringify(data, null, 2))
  }
}

testConnection()
