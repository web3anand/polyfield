const axios = require('axios');

const ACTIVITY_SUBGRAPH = 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/activity-subgraph/0.0.4/gn';
const USER_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b'; // car

async function testActivitySubgraph() {
  console.log('\n🔍 Testing Activity Subgraph Schema...\n');
  
  try {
    // Introspection query
    const response = await axios.post(ACTIVITY_SUBGRAPH, {
      query: `{
        __schema {
          types {
            name
            kind
            fields {
              name
              type {
                name
                kind
              }
            }
          }
        }
      }`
    });
    
    const types = response.data.data.__schema.types.filter(t => 
      !t.name.startsWith('__') && 
      t.kind === 'OBJECT' &&
      !t.name.startsWith('_') &&
      (t.name.includes('Trade') || t.name.includes('Activity') || t.name.includes('Transaction') || t.name.includes('Position'))
    );
    
    console.log('📋 Available Entity Types:');
    types.forEach(type => {
      console.log(`\n${type.name}:`);
      if (type.fields) {
        type.fields.forEach(field => {
          console.log(`  - ${field.name}: ${field.type.name || field.type.kind}`);
        });
      }
    });
    
    // Test a sample query
    console.log('\n\n🧪 Testing sample query...\n');
    const testResponse = await axios.post(ACTIVITY_SUBGRAPH, {
      query: `query UserTrades($user: String!) {
        trades(where: { user: $user }, first: 3, orderBy: timestamp, orderDirection: desc) {
          id
          user
          timestamp
          marketId
          outcomeIndex
          size
          price
          side
          type
        }
      }`,
      variables: { user: USER_ADDRESS.toLowerCase() }
    });
    
    console.log('Sample trades:', JSON.stringify(testResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testActivitySubgraph();
