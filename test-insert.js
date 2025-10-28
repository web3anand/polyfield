const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://orxyqgecymsuwuxtjdck.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeHlxZ2VjeW1zdXd1eHRqZGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MzAxNzQsImV4cCI6MjA3NzIwNjE3NH0.pk46vevHaUjX0Ewq8dAfNidNgQjjov3fX7CJU997b8U'
);

async function test() {
  const { data, error } = await supabase
    .from('edges')
    .insert([{
      market_id: 'nodetest123',
      title: 'Node Test Insert',
      outcome: 'YES',
      ev: 2.5,
      market_price: 0.48,
      true_prob: 0.5,
      liquidity: 25000,
      status: 'testing'
    }]);
  
  console.log('Result:', JSON.stringify({ data, error }, null, 2));
}

test();
