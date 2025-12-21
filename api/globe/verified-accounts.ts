import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getCountryCoordinates } from '../utils/country-geocoding';
import { getCountryByHash } from '../utils/countries';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Fetch users with X usernames (verified accounts) from leaderboard
    const { data: users, error } = await supabase
      .from('leaderboard_users')
      .select('username, x_username, wallet_address, rank, volume')
      .not('x_username', 'is', null)
      .limit(100) // Limit to top 100 verified accounts
      .order('rank', { ascending: true });

    if (error) {
      console.error('Error fetching verified accounts:', error);
      return res.status(500).json({ error: 'Failed to fetch verified accounts' });
    }

    if (!users || users.length === 0) {
      return res.status(200).json([]);
    }

    console.log(`📍 Processing ${users.length} verified accounts for country-based geolocation...`);

    // Get countries for each user (with fallback to hash-based assignment)
    const countryMap = new Map<string, { lat: number; lng: number; country: string }>();
    const accountsByCountry = new Map<string, any[]>();

    // Process users and group by country
    for (const user of users) {
      let countryCoords: { lat: number; lng: number; country: string } | null = null;
      const xUsername = user.x_username;

      // Use hash-based country assignment
      if (!countryCoords) {
        const fallbackCountry = getCountryByHash(user.username || user.x_username || user.wallet_address || '');
        countryCoords = {
          lat: fallbackCountry.lat,
          lng: fallbackCountry.lng,
          country: fallbackCountry.name,
        };
      }

      // Group accounts by country
      const countryKey = countryCoords.country;
      if (!accountsByCountry.has(countryKey)) {
        accountsByCountry.set(countryKey, []);
        countryMap.set(countryKey, countryCoords);
      }

      accountsByCountry.get(countryKey)!.push({
        username: user.username,
        xUsername: user.x_username,
        wallet: user.wallet_address,
        rank: user.rank,
        volume: user.volume,
      });
    }

    // Aggregate accounts by country
    const countryData = Array.from(accountsByCountry.entries()).map(([country, accounts]) => {
      const coords = countryMap.get(country)!;
      const totalVolume = accounts.reduce((sum, acc) => sum + (parseFloat(acc.volume) || 0), 0);

      return {
        country,
        lat: coords.lat,
        lng: coords.lng,
        accounts,
        accountCount: accounts.length,
        totalVolume,
      };
    });

    // Sort by account count (descending)
    countryData.sort((a, b) => b.accountCount - a.accountCount);

    console.log(`✓ Processed ${users.length} accounts into ${countryData.length} countries`);
    return res.status(200).json(countryData);
  } catch (error: any) {
    console.error('Error in verified-accounts handler:', error);
    return res.status(500).json({
      error: 'Failed to fetch verified accounts',
      message: error?.message || 'Unknown error',
    });
  }
}




