import { z } from "zod";

// Polymarket Position Schema
export const positionSchema = z.object({
  id: z.string(),
  marketName: z.string(),
  marketId: z.string(),
  marketSlug: z.string().optional(), // Question slug for Polymarket URL
  eventSlug: z.string().optional(), // Event slug for Polymarket URL
  outcome: z.enum(["YES", "NO"]),
  entryPrice: z.number(),
  currentPrice: z.number(),
  size: z.number(),
  unrealizedPnL: z.number(),
  status: z.enum(["ACTIVE", "CLOSED"]),
  openedAt: z.string(),
  closedAt: z.string().optional(),
});

export type Position = z.infer<typeof positionSchema>;

// Trading Activity Schema
export const tradeSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  marketName: z.string(),
  type: z.enum(["BUY", "SELL"]),
  outcome: z.enum(["YES", "NO"]),
  price: z.number(),
  size: z.number(),
  profit: z.number().optional(),
});

export type Trade = z.infer<typeof tradeSchema>;

// Portfolio Stats Schema
export const portfolioStatsSchema = z.object({
  totalValue: z.number().optional(),
  totalPnL: z.number(),
  realizedPnL: z.number(),
  unrealizedPnL: z.number(),
  totalVolume: z.number(),
  totalTrades: z.number(),
  winRate: z.number(),
  bestTrade: z.number().optional(),
  worstTrade: z.number().optional(),
  activePositions: z.number(),
  closedPositions: z.number(),
  openPositionsValue: z.number(),
  winStreak: z.number().optional(),
  closedPositionsHistory: z.array(z.any()).optional(), // Closed positions with timestamps for chart
});

export type PortfolioStats = z.infer<typeof portfolioStatsSchema>;

// PnL Data Point Schema
export const pnlDataPointSchema = z.object({
  timestamp: z.string(),
  value: z.number(),
});

export type PnLDataPoint = z.infer<typeof pnlDataPointSchema>;

// Achievement Schema
export const achievementSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  unlocked: z.boolean(),
  progress: z.number(),
  total: z.number(),
});

export type Achievement = z.infer<typeof achievementSchema>;

// User Profile Schema
export const userProfileSchema = z.object({
  username: z.string(),
  profileImage: z.string().optional(),
  bio: z.string().optional(),
  walletAddress: z.string().optional(),
  xUsername: z.string().optional(),
  rank: z.string().optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

// User Dashboard Data Schema
export const dashboardDataSchema = z.object({
  profile: userProfileSchema,
  stats: portfolioStatsSchema,
  pnlHistory: z.array(pnlDataPointSchema),
  positions: z.array(positionSchema),
  recentTrades: z.array(tradeSchema),
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;

// API Response Schemas
export const walletAddressSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
});

export type WalletAddress = z.infer<typeof walletAddressSchema>;
