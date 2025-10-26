const axios = require('axios');

const POSITIONS_SUBGRAPH = 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/positions-subgraph/0.0.7/gn';
const USER_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b'; // car

async function testPositionsSubgraph() {
  console.log('\n🔍 Testing Positions Subgraph Schema...\n');
  
  try {
    // Introspection
    const response = await axios.post(POSITIONS_SUBGRAPH, {
      query: `{
        __schema {
          queryType {
            fields {
              name
            }
          }
        }
      }`
    });
    
    console.log('Available Queries:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testPositionsSubgraph();
