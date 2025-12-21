import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { getCountryCoordinates } from '../utils/country-geocoding';
import { getCountryByHash } from '../utils/countries';

const POLYMARKET_DATA_API = 'https://data-api.polymarket.com';

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
    // Fetch recent trades/positions from Polymarket (last 100 active positions)
    const response = await axios.get(`${POLYMARKET_DATA_API}/trades`, {
      params: {
        limit: 100,
        offset: 0,
      },
      timeout: 10000,
    });

    if (!response.data || !Array.isArray(response.data)) {
      return res.status(200).json([]);
    }

    const trades = response.data;
    
    // Get unique users and their recent trades
    const userTrades = new Map<string, any>();
    
    trades.forEach((trade: any) => {
      const user = trade.user || trade.wallet || trade.address;
      if (!user) return;

      if (!userTrades.has(user)) {
        userTrades.set(user, {
          user,
          trades: [],
        });
      }

      userTrades.get(user)!.trades.push({
        id: trade.transactionHash || trade.id,
        marketName: trade.title || trade.market || 'Unknown Market',
        outcome: trade.outcome || 'YES',
        size: parseFloat(trade.size || 0),
        price: parseFloat(trade.price || 0),
        timestamp: trade.timestamp || Date.now(),
      });
    });

    console.log(`📍 Processing ${userTrades.size} unique users for country-based geolocation...`);

    // Get X usernames for wallets from Supabase (if available)
    const wallets = Array.from(userTrades.keys());
    const walletToXUsername = new Map<string, string>();

    try {
      const { data: userData } = await supabase
        .from('leaderboard_users')
        .select('wallet_address, x_username')
        .in('wallet_address', wallets)
        .not('x_username', 'is', null);

      if (userData) {
        userData.forEach((user) => {
          if (user.x_username) {
            walletToXUsername.set(user.wallet_address, user.x_username);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to fetch X usernames from Supabase:', error);
    }

    // Group bets by country
    const countryMap = new Map<string, { lat: number; lng: number; country: string }>();
    const betsByCountry = new Map<string, any[]>();

    // Process each user's bets
    for (const [wallet, userData] of userTrades.entries()) {
      // Get most recent trade for this user
      const latestTrade = userData.trades.sort((a: any, b: any) => 
        b.timestamp - a.timestamp
      )[0];

      if (!latestTrade) continue;

      let countryCoords: { lat: number; lng: number; country: string } | null = null;
      const xUsername = walletToXUsername.get(wallet);

      // Use hash-based country assignment
      if (!countryCoords) {
        const fallbackCountry = getCountryByHash(wallet);
        countryCoords = {
          lat: fallbackCountry.lat,
          lng: fallbackCountry.lng,
          country: fallbackCountry.name,
        };
      }

      // Group bets by country
      const countryKey = countryCoords.country;
      if (!betsByCountry.has(countryKey)) {
        betsByCountry.set(countryKey, []);
        countryMap.set(countryKey, countryCoords);
      }

      betsByCountry.get(countryKey)!.push({
        id: latestTrade.id,
        user: wallet,
        marketName: latestTrade.marketName,
        outcome: latestTrade.outcome,
        size: latestTrade.size,
        price: latestTrade.price,
        timestamp: latestTrade.timestamp,
      });
    }

    // Aggregate bets by country
    const countryData = Array.from(betsByCountry.entries()).map(([country, bets]) => {
      const coords = countryMap.get(country)!;
      const totalVolume = bets.reduce((sum, bet) => sum + (bet.size || 0), 0);

      return {
        country,
        lat: coords.lat,
        lng: coords.lng,
        bets,
        betCount: bets.length,
        totalVolume,
      };
    });

    // Sort by total volume (descending)
    countryData.sort((a, b) => b.totalVolume - a.totalVolume);

    console.log(`✓ Processed ${userTrades.size} users into ${countryData.length} countries`);
    return res.status(200).json(countryData);
  } catch (error: any) {
    console.error('Error in live-bets handler:', error);
    // Return empty array on error to prevent UI crashes
    return res.status(200).json([]);
  }
}




