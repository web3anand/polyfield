// Quick test to verify search endpoint returns objects
import axios from 'axios';

async function testSearch() {
  try {
    const response = await axios.get('http://localhost:3000/api/users/search?q=test');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.length > 0) {
      const first = response.data[0];
      console.log('\nFirst result type:', typeof first);
      console.log('Has username?', 'username' in first);
      console.log('Has profileImage?', 'profileImage' in first);
      
      if (typeof first === 'string') {
        console.log('\n❌ ERROR: API is returning strings instead of objects!');
      } else if (first.username && first.profile Image) {
        console.log('\n✅ SUCCESS: API is returning objects with username and profileImage');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testSearch();
