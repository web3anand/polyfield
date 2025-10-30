require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env');
  process.exit(1);
}

console.log('Key:', SUPABASE_KEY.substring(0, 30));
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scan() {
  console.log('Scanning...');
  const { error } = await supabase.from('oracles').select('*').limit(1);
  if (error) console.error('DB Error:', error);
  else console.log('DB Connected!');
}

scan();
