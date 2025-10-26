const axios = require('axios');

const PNL_SUBGRAPH = 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/pnl-subgraph/0.0.14/gn';
const USER_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b'; // car

async function testPnLSubgraphFields() {
  console.log('\n🔍 Testing PNL Subgraph Schema...\n');
  
  try {
    // Introspection query to discover all types
    const response = await axios.post(PNL_SUBGRAPH, {
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
      (t.name.includes('Position') || t.name.includes('Pnl') || t.name.includes('History') || t.name.includes('Snapshot'))
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
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testPnLSubgraphFields();
