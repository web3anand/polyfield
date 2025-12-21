import axios from 'axios';

const TWITTER_API_BASE = 'https://api.twitterapi.io/twitter';
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || process.env.X_API_KEY || 'new1_492f045b10da41aaa032a5bc1e00d504';

/**
 * Fetches user about/profile data from Twitter API
 * @param xUsername - The X (Twitter) username (without @)
 * @returns Object with accountBasedIn and affiliate info, or null if not available
 */
export async function getXUserAbout(xUsername: string): Promise<{ 
  accountBasedIn?: string;
  affiliate?: {
    username: string;
    profileImage: string;
    description: string;
  };
} | null> {
  if (!xUsername) {
    return null;
  }

  try {
    console.log(`📍 Fetching user_about for X username: ${xUsername}`);
    
    const response = await axios.get(`${TWITTER_API_BASE}/user_about`, {
      params: {
        userName: xUsername,
      },
      headers: {
        'X-API-Key': TWITTER_API_KEY,
      },
      timeout: 10000,
    });

    // Log full response for debugging
    console.log(`   📦 API Response status: ${response.data?.status || 'unknown'}`);
    
    if (response.data?.status === 'success') {
      const data = response.data?.data;
      const aboutProfile = data?.about_profile;
      const affiliatesLabel = data?.affiliates_highlighted_label?.label;
      
      const result: { accountBasedIn?: string; affiliate?: { username: string; profileImage: string; description: string } } = {};
      
      // Extract nationality
      if (aboutProfile) {
        console.log(`   📦 about_profile keys: ${Object.keys(aboutProfile).join(', ')}`);
        console.log(`   📦 account_based_in value: ${aboutProfile.account_based_in || 'NOT FOUND'}`);
        
        if (aboutProfile.account_based_in && typeof aboutProfile.account_based_in === 'string') {
          result.accountBasedIn = aboutProfile.account_based_in.trim();
          console.log(`   ✓ account_based_in found: "${result.accountBasedIn}"`);
        }
        
        // Extract affiliate username from about_profile
        if (aboutProfile.affiliate_username) {
          console.log(`   📦 affiliate_username found in about_profile: ${aboutProfile.affiliate_username}`);
        }
      }
      
      // Extract affiliate information from affiliates_highlighted_label
      if (affiliatesLabel) {
        console.log(`   📦 affiliates_highlighted_label found`);
        const affiliateUsername = affiliatesLabel.url?.url?.split('/').pop() || aboutProfile?.affiliate_username;
        const affiliateImage = affiliatesLabel.badge?.url;
        const affiliateDescription = affiliatesLabel.description;
        
        if (affiliateUsername && affiliateImage) {
          result.affiliate = {
            username: affiliateUsername,
            profileImage: affiliateImage,
            description: affiliateDescription || '',
          };
          console.log(`   ✓ Affiliate found: @${result.affiliate.username}`);
          console.log(`   ✓ Affiliate image: ${result.affiliate.profileImage}`);
        }
      }
      
      if (Object.keys(result).length > 0) {
        return result;
      }
    } else {
      console.log(`   ⚠ API returned status: ${response.data?.status || 'unknown'}`);
      console.log(`   Message: ${response.data?.msg || 'No message'}`);
    }

    console.log(`   ⚠ No data found in API response`);
    return null;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(`   ⚠ X user not found: ${xUsername}`);
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      console.error(`   ❌ Twitter API authentication error: ${error.response?.status}`);
    } else {
      console.error(`   ❌ Error fetching user_about for ${xUsername}:`, error.message);
      if (error.response) {
        console.error(`   ❌ Response status: ${error.response.status}`);
        console.error(`   ❌ Response data:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    return null;
  }
}

/**
 * Fetches user's last tweet from Twitter API
 * @param xUsername - The X (Twitter) username (without @)
 * @returns Object with tweet data, or null if not available
 */
export async function getXUserLastTweet(xUsername: string): Promise<{ text: string; url: string; createdAt: string; likeCount: number; retweetCount: number } | null> {
  if (!xUsername) {
    return null;
  }

  try {
    console.log(`📍 Fetching last tweet for X username: ${xUsername}`);
    
    const response = await axios.get(`${TWITTER_API_BASE}/user/last_tweets`, {
      params: {
        userName: xUsername,
        count: 1, // Only get the most recent tweet
      },
      headers: {
        'X-API-Key': TWITTER_API_KEY,
      },
      timeout: 10000,
    });

    console.log(`   📦 Last tweet API Response status: ${response.data?.status || 'unknown'}`);
    console.log(`   📦 Last tweet API response:`, JSON.stringify(response.data, null, 2));
    
    if (response.data?.status === 'success') {
      const tweets = response.data?.data?.tweets || response.data?.data || [];
      if (Array.isArray(tweets) && tweets.length > 0) {
        const lastTweet = tweets[0];
        console.log(`   📦 Last tweet keys: ${Object.keys(lastTweet).join(', ')}`);
        
        // Extract tweet data - field names may vary, so check multiple possibilities
        const text = lastTweet.text || lastTweet.full_text || lastTweet.content || '';
        const tweetId = lastTweet.id || lastTweet.id_str || '';
        const url = tweetId ? `https://twitter.com/${xUsername}/status/${tweetId}` : '';
        const createdAt = lastTweet.created_at || lastTweet.createdAt || new Date().toISOString();
        const likeCount = lastTweet.favorite_count || lastTweet.like_count || lastTweet.likes || 0;
        const retweetCount = lastTweet.retweet_count || lastTweet.retweets || 0;
        
        if (text) {
          console.log(`   ✓ Last tweet found: "${text.substring(0, 50)}..."`);
          return {
            text,
            url,
            createdAt,
            likeCount: typeof likeCount === 'number' ? likeCount : parseInt(String(likeCount)) || 0,
            retweetCount: typeof retweetCount === 'number' ? retweetCount : parseInt(String(retweetCount)) || 0,
          };
        } else {
          console.log(`   ⚠ Last tweet found but text field is missing`);
        }
      } else {
        console.log(`   ⚠ No tweets in response`);
      }
    } else {
      console.log(`   ⚠ API returned status: ${response.data?.status || 'unknown'}`);
      console.log(`   Message: ${response.data?.msg || 'No message'}`);
    }

    console.log(`   ⚠ No last tweet found in API response`);
    return null;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(`   ⚠ X user not found: ${xUsername}`);
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      console.error(`   ❌ Twitter API authentication error: ${error.response?.status}`);
    } else {
      console.error(`   ❌ Error fetching last tweet for ${xUsername}:`, error.message);
      if (error.response) {
        console.error(`   ❌ Response status: ${error.response.status}`);
        console.error(`   ❌ Response data:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    return null;
  }
}
