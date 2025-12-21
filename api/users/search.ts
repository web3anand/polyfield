import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

/**
 * Polymarket GAMMA API Search Endpoint
 * 
 * Official API: https://gamma-api.polymarket.com/public-search
 * 
 * Request Parameters:
 * - q: string (required) - Search query
 * - search_profiles: boolean (optional) - Include profiles in search results
 * 
 * Response Structure:
 * {
 *   events: [...],
 *   tags: [...],
 *   profiles: [...],
 *   pagination: {...}
 * }
 * 
 * Profile Object Structure:
 * {
 *   name: string,              // Primary username field
 *   profileImage?: string,     // Profile image URL (optional)
 *   pseudonym?: string,        // Alternative name (optional)
 *   proxyWallet?: string       // Wallet address (optional)
 * }
 */
const POLYMARKET_GAMMA_API = "https://gamma-api.polymarket.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { q } = req.query;

    // Validate query parameter
    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Query parameter q is required' });
      return;
    }

    const query = q.trim();

    if (query.length < 2) {
      res.status(200).json([]);
      return;
    }

    console.log(`[Search] Query: "${query}"`);

    try {
      // Call Polymarket GAMMA API public-search endpoint
      // Try multiple requests with different parameters to get more results
      let allProfiles: any[] = [];
      const maxRequests = 3; // Try up to 3 requests to get more results
      
      for (let attempt = 0; attempt < maxRequests; attempt++) {
        try {
          const params: any = {
            q: query,
            search_profiles: true,
          };
          
          // Try different pagination parameters
          if (attempt === 0) {
            params.limit = 50;
          } else if (attempt === 1) {
            params.offset = 0;
            params.limit = 50;
          } else {
            params.page = attempt;
            params.limit = 50;
          }
          
          const response = await axios.get(`${POLYMARKET_GAMMA_API}/public-search`, {
            params,
            timeout: 5000,
            validateStatus: (status) => status < 500,
          });

          // Handle API errors
          if (response.status >= 400) {
            if (attempt === 0) {
              console.warn(`[Search] Polymarket API returned ${response.status} for query: ${query}`);
            }
            break; // Stop trying if API returns error
          }

          // Extract profiles from response
          const profiles: any[] = response.data?.profiles || [];
          const pagination = response.data?.pagination;

          if (attempt === 0) {
            console.log(`[Search] API returned ${profiles.length} profiles for query: "${query}"`);
            if (pagination) {
              console.log(`[Search] Pagination info:`, JSON.stringify(pagination));
            }
          }

          if (profiles.length > 0) {
            // Add profiles that we haven't seen yet (deduplicate by username)
            const existingUsernames = new Set(allProfiles.map(p => (p.name || p.pseudonym)?.toLowerCase()));
            const newProfiles = profiles.filter(p => {
              const username = (p.name || p.pseudonym)?.toLowerCase();
              return username && !existingUsernames.has(username);
            });
            allProfiles.push(...newProfiles);
            
            // If we got fewer results than requested, we've likely reached the end
            if (profiles.length < 50 || (pagination && !pagination.hasMore)) {
              break;
            }
          } else {
            break; // No more profiles
          }
          
          // Small delay between requests to avoid rate limiting
          if (attempt < maxRequests - 1 && profiles.length >= 50) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error: any) {
          if (attempt === 0) {
            console.error(`[Search] Error fetching profiles:`, error.message);
          }
          break;
        }
      }

      const profiles = allProfiles;

      if (profiles.length === 0) {
        console.log(`[Search] No profiles found for query: ${query}`);
        res.status(200).json([]);
        return;
      }

      // Transform profiles to match frontend expectations
      // Official API fields: name (primary), profileImage (optional), pseudonym (optional)
      const userResults = profiles
        .map((profile: any) => {
          // Use 'name' as primary username, fallback to 'pseudonym' if name is missing
          // This ensures we capture all profiles, not just those with 'name'
          const username = profile.name || profile.pseudonym;
          
          // Skip if no username or invalid type
          if (!username || typeof username !== 'string') {
            return null;
          }

          // Extract profile image (official API field is 'profileImage')
          const profileImage = profile.profileImage;

          return {
            username: username.trim(),
            profileImage: profileImage && typeof profileImage === 'string' ? profileImage.trim() : undefined,
          };
        })
        .filter((item): item is { username: string; profileImage: string | undefined } => item !== null)
        .slice(0, 20); // Increased to 20 results

      console.log(`[Search] Query: "${query}" → Found ${userResults.length} profiles (from ${profiles.length} total API results)`);

      res.status(200).json(userResults);

    } catch (axiosError: any) {
      if (axiosError.response?.status >= 500) {
        console.error(`[Search] Polymarket API error (${axiosError.response.status}) for query: ${query}`, axiosError.message);
      } else if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        console.error(`[Search] Request timeout for query: ${query}`);
      } else {
        console.error(`[Search] Network error for query: ${query}:`, axiosError.message);
      }
      res.status(200).json([]);
    }
  } catch (error: any) {
    console.error('[Search] Unexpected error:', error.message);
    res.status(200).json([]);
  }
}
