import express from 'express';
import axios from 'axios';
import { z } from 'zod';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple API routes for Vercel
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/users/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 2) {
      return res.json([]);
    }

    const response = await axios.get('https://gamma-api.polymarket.com/public-search', {
      params: {
        q: query,
        search_profiles: true
      },
      timeout: 3000
    });

    let profiles = [];
    if (Array.isArray(response.data)) {
      profiles = response.data;
    } else if (response.data?.profiles && Array.isArray(response.data.profiles)) {
      profiles = response.data.profiles;
    }

    if (profiles.length > 0) {
      const possibleNameFields = ['name', 'username', 'displayName', 'handle', 'pseudonym'];
      const usernames = profiles.map((profile) => {
        for (const field of possibleNameFields) {
          if (profile[field]) return profile[field];
        }
        return null;
      }).filter(Boolean).slice(0, 10);
      
      return res.json(usernames);
    }
    
    res.json([]);
  } catch (error) {
    console.error('Error searching users:', error);
    res.json([]);
  }
});

app.get('/api/dashboard/username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Simple demo data for now
    const demoData = {
      profile: {
        username: username,
        profileImage: undefined,
        bio: "Demo account for preview",
        walletAddress: "0x0000000000000000000000000000000000000000"
      },
      stats: {
        totalValue: 1000,
        totalPnL: 150,
        totalVolume: 5000,
        totalTrades: 25,
        winRate: 60,
        bestTrade: 50,
        worstTrade: -20,
        activePositions: 3,
        winStreak: 5
      },
      pnlHistory: [
        { timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), value: 0 },
        { timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), value: 25 },
        { timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), value: 45 },
        { timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), value: 30 },
        { timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), value: 60 },
        { timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), value: 80 },
        { timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), value: 120 },
        { timestamp: new Date().toISOString(), value: 150 }
      ],
      positions: [
        {
          id: "demo-pos1",
          marketName: "Will Bitcoin reach $100k in 2025?",
          marketId: "demo-market1",
          outcome: "YES",
          entryPrice: 0.65,
          currentPrice: 0.72,
          size: 100,
          unrealizedPnL: 7,
          status: "ACTIVE",
          openedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      recentTrades: [
        {
          id: "demo-trade1",
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          marketName: "Will Bitcoin reach $100k in 2025?",
          type: "BUY",
          outcome: "YES",
          price: 0.72,
          size: 50,
          profit: 3.5
        }
      ],
      achievements: [
        {
          id: "first_trade",
          name: "First Trade",
          description: "Complete your first trade",
          icon: "star",
          unlocked: true,
          progress: 1,
          total: 1
        }
      ]
    };

    res.json(demoData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default app;