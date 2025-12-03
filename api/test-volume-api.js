import axios from 'axios';

const POLYMARKET_DATA_API = "https://data-api.polymarket.com";
const LOCAL_API = "http://localhost:3000";

async function testVolumeAPI() {
  try {
    console.log('🧪 Testing Builder Volume API...\n');
    
    // Test 1: Direct Polymarket API
    console.log('1. Testing Polymarket API directly:');
    console.log(`   URL: ${POLYMARKET_DATA_API}/v1/builders/volume?timePeriod=DAY\n`);
    
    const polyResponse = await axios.get(`${POLYMARKET_DATA_API}/v1/builders/volume`, {
      params: { timePeriod: 'DAY' },
      timeout: 15000,
    });

    const polyData = polyResponse.data || [];
    console.log(`   ✓ Status: ${polyResponse.status}`);
    console.log(`   ✓ Data points: ${polyData.length}`);
    console.log(`   ✓ Sample entry:`, JSON.stringify(polyData[0], null, 2));
    console.log(`   ✓ Builders found:`, Array.from(new Set(polyData.map(e => e.builder))).slice(0, 5));
    console.log(`   ✓ Date range:`, polyData[0]?.dt, 'to', polyData[polyData.length - 1]?.dt);
    console.log('');

    // Test 2: Local API endpoint
    console.log('2. Testing Local API endpoint:');
    console.log(`   URL: ${LOCAL_API}/api/leaderboard/builders/volume?timePeriod=DAY\n`);
    
    try {
      const localResponse = await axios.get(`${LOCAL_API}/api/leaderboard/builders/volume`, {
        params: { timePeriod: 'DAY' },
        timeout: 10000,
      });

      const localData = localResponse.data || [];
      console.log(`   ✓ Status: ${localResponse.status}`);
      console.log(`   ✓ Data type: ${Array.isArray(localData) ? 'array' : typeof localData}`);
      console.log(`   ✓ Data points: ${localData.length}`);
      
      if (localData.length > 0) {
        console.log(`   ✓ Sample entry:`, JSON.stringify(localData[0], null, 2));
        const builders = Array.from(new Set(localData.map(e => e.builder).filter(b => b)));
        console.log(`   ✓ Builders found: ${builders.length}`, builders.slice(0, 5));
        console.log(`   ✓ Date range:`, localData[0]?.dt, 'to', localData[localData.length - 1]?.dt);
        
        // Check data structure
        const sample = localData[0];
        console.log(`   ✓ Has 'dt': ${!!sample.dt}`);
        console.log(`   ✓ Has 'builder': ${!!sample.builder} (value: ${sample.builder})`);
        console.log(`   ✓ Has 'volume': ${sample.volume !== undefined}`);
        console.log(`   ✓ Volume value: ${sample.volume}`);
        
        // Check how many entries have builder field
        const withBuilder = localData.filter(e => e.builder && e.builder !== 'Unknown').length;
        console.log(`   ✓ Entries with builder field: ${withBuilder} / ${localData.length}`);
        
        if (withBuilder === 0) {
          console.log('   ❌ PROBLEM: No entries have builder field! Server might be running old code.');
          console.log('   💡 Solution: Restart the server to pick up the latest changes.');
        }
      } else {
        console.log('   ⚠️ Local API returned empty array');
      }
    } catch (localError) {
      console.error('   ❌ Local API error:');
      if (localError.response) {
        console.error(`      Status: ${localError.response.status}`);
        console.error(`      Data:`, localError.response.data);
      } else if (localError.request) {
        console.error('      No response - server might not be running');
        console.error('      Make sure server is running on port 3000');
      } else {
        console.error('      Error:', localError.message);
      }
    }

    console.log('\n✅ Test completed!');
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

testVolumeAPI();

