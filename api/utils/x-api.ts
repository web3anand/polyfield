import axios from 'axios';

const TWITTER_API_BASE = 'https://api.twitterapi.io/twitter';
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || process.env.X_API_KEY || 'new1_492f045b10da41aaa032a5bc1e00d504';

/**
 * Simplified X API fetch - single attempt with reasonable timeout
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
    // Single attempt with 12 second timeout (based on test results showing ~15s works)
    const response = await axios.get(`${TWITTER_API_BASE}/user_about`, {
      params: {
        userName: xUsername,
      },
      headers: {
        'X-API-Key': TWITTER_API_KEY,
      },
      timeout: 12000, // 12 second timeout - single attempt
    });

    if (response.data?.status === 'success') {
      const data = response.data?.data;
      const aboutProfile = data?.about_profile;
      const affiliatesLabel = data?.affiliates_highlighted_label?.label;
      
      const result: { accountBasedIn?: string; affiliate?: { username: string; profileImage: string; description: string } } = {};
      
      // Extract nationality
      if (aboutProfile?.account_based_in && typeof aboutProfile.account_based_in === 'string') {
        result.accountBasedIn = aboutProfile.account_based_in.trim();
      }
      
      // Extract affiliate information
      if (affiliatesLabel) {
        const affiliateUsername = affiliatesLabel.url?.url?.split('/').pop() || aboutProfile?.affiliate_username;
        const affiliateImage = affiliatesLabel.badge?.url;
        const affiliateDescription = affiliatesLabel.description;
        
        if (affiliateUsername && affiliateImage) {
          result.affiliate = {
            username: affiliateUsername,
            profileImage: affiliateImage,
            description: affiliateDescription || '',
          };
        }
      }
      
      if (Object.keys(result).length > 0) {
        return result;
      }
    }
    
    return null;
  } catch (error: any) {
    // Silent fail - don't log errors to avoid noise
    // The dashboard will handle the null return gracefully
    if (error.response?.status === 404) {
      // User not found - this is expected for some users
      return null;
    }
    // For timeouts and other errors, just return null
    return null;
  }
}

