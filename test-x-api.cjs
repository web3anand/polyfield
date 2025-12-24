/**
 * Test script for X API function
 * Tests the getXUserAbout function with various usernames
 */

const axios = require('axios');

const TWITTER_API_BASE = 'https://api.twitterapi.io/twitter';
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || process.env.X_API_KEY || 'new1_492f045b10da41aaa032a5bc1e00d504';

async function testXAPI(username) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing X API for: @${username}`);
  console.log(`${'='.repeat(80)}\n`);
  
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${TWITTER_API_BASE}/user_about`, {
      params: {
        userName: username,
      },
      headers: {
        'X-API-Key': TWITTER_API_KEY,
      },
      timeout: 10000, // 10 second timeout
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ Response received in ${elapsed}ms`);
    console.log(`Response status: ${response.data?.status || 'unknown'}`);
    
    if (response.data?.status === 'success') {
      const data = response.data?.data;
      const aboutProfile = data?.about_profile;
      const affiliatesLabel = data?.affiliates_highlighted_label?.label;
      
      console.log('\n📊 Extracted Data:');
      
      if (aboutProfile?.account_based_in) {
        console.log(`   Nationality: "${aboutProfile.account_based_in}"`);
      } else {
        console.log(`   Nationality: NOT FOUND`);
      }
      
      if (affiliatesLabel) {
        const affiliateUsername = affiliatesLabel.url?.url?.split('/').pop();
        const affiliateImage = affiliatesLabel.badge?.url;
        const affiliateDescription = affiliatesLabel.description;
        
        console.log(`   Affiliate Username: ${affiliateUsername || 'NOT FOUND'}`);
        console.log(`   Affiliate Image: ${affiliateImage || 'NOT FOUND'}`);
        console.log(`   Affiliate Description: ${affiliateDescription || 'NOT FOUND'}`);
      } else {
        console.log(`   Affiliate: NOT FOUND`);
      }
      
      // Show full response structure
      console.log('\n📦 Full Response Structure:');
      console.log(JSON.stringify({
        status: response.data?.status,
        hasAboutProfile: !!aboutProfile,
        aboutProfileKeys: aboutProfile ? Object.keys(aboutProfile) : [],
        hasAffiliatesLabel: !!affiliatesLabel,
        affiliatesLabelKeys: affiliatesLabel ? Object.keys(affiliatesLabel) : [],
      }, null, 2));
      
    } else {
      console.log(`⚠️ API returned status: ${response.data?.status || 'unknown'}`);
      console.log(`Message: ${response.data?.msg || 'No message'}`);
    }
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.log(`❌ Error after ${elapsed}ms`);
    
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.log(`   Error: Request timeout (${error.message})`);
    } else if (error.response) {
      console.log(`   Error: ${error.response.status} - ${error.response.statusText}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }
}

async function main() {
  const usernames = process.argv.slice(2);
  
  if (usernames.length === 0) {
    console.log('Usage: node test-x-api.cjs <username1> [username2] ...');
    console.log('Example: node test-x-api.cjs hashvalue CarOnPolymarket');
    return;
  }
  
  console.log('🚀 X API Test Script');
  console.log(`Testing ${usernames.length} username(s)...\n`);
  
  for (const username of usernames) {
    await testXAPI(username);
    
    // Small delay between tests
    if (usernames.indexOf(username) < usernames.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Test Complete');
  console.log(`${'='.repeat(80)}\n`);
}

main().catch(console.error);


