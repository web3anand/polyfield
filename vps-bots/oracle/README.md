# Oracle Bot with LLM Integration

Advanced Polymarket oracle scanner with AI-powered market analysis using Groq + NewsAPI.

## Features

### Core Oracle (Always Active)
- Scans 14,000+ Polymarket markets every 60 seconds
- Filters for consensus markets (>60% probability, >$10k liquidity)
- Saves to Supabase for real-time dashboard display
- Smart URL mapping using event slugs

### LLM Analysis (Optional - Free Tier)
- **Groq Llama 3.1** (70B model) for market analysis
- **NewsAPI** for recent headline context
- Only analyzes high-value political markets (>$50k liquidity)
- Outputs:
  - True probability estimates (YES/NO)
  - Expected Value (EV) calculations
  - Edge % vs market price
  - Bet recommendations (YES/NO/SKIP)
  - Risk assessment (LOW/MEDIUM/HIGH)
  - Rationale (2-sentence summary)

## Setup

### 1. Install Dependencies
```bash
cd vps-bots/oracle
npm install @supabase/supabase-js dotenv
```

### 2. Configure Environment
Copy `.env.template` to `.env` and add your keys:

```env
# Required
SUPABASE_URL=https://bzlxrggciehkcslchooe.supabase.co
SUPABASE_KEY=your_service_role_key

# Optional (for LLM features)
GROQ_API_KEY=gsk_xxx  # Free: https://console.groq.com/keys
NEWS_API_KEY=xxx      # Free: https://newsapi.org/register (100 req/day)
```

### 3. Database Migration
Run the LLM column migration:
```bash
# On VPS or local with psql
psql "your_supabase_connection_string" -f supabase-migrations/05-add-llm-analysis.sql
```

Or run directly in Supabase SQL Editor:
```sql
ALTER TABLE oracles ADD COLUMN IF NOT EXISTS llm_analysis JSONB;
CREATE INDEX IF NOT EXISTS idx_oracles_llm_analysis ON oracles USING GIN (llm_analysis);
```

### 4. Run Oracle Bot
```bash
# With LLM features
node full-oracle-v2.js

# Or without LLM (original version)
node full-oracle.js
```

### 5. PM2 Deployment (VPS)
```bash
pm2 start full-oracle-v2.js --name oracle-llm
pm2 save
```

## API Keys (All Free Tier)

### Groq API
- **Provider**: Groq (https://console.groq.com)
- **Model**: Llama 3.1 70B Versatile
- **Free Tier**: 30 requests/minute, 14,400 requests/day
- **Cost**: $0 (perfect for our use case: ~50-100 markets/scan)

### NewsAPI
- **Provider**: NewsAPI.org (https://newsapi.org)
- **Free Tier**: 100 requests/day
- **Cost**: $0 (we batch 5 headlines per LLM call)

## How It Works

### Market Filtering
1. Fetch all active Polymarket markets (14k+)
2. Filter for recent (last 7 days)
3. Filter for liquidity (>$10k)
4. Filter for consensus (>60% on YES or NO)
5. **Exclude 100% markets** (>99.5% to avoid resolved)

### LLM Analysis Trigger
Only runs on markets meeting ALL criteria:
- Liquidity > $50k (high stakes)
- Political/economic topic (regex match)
- GROQ_API_KEY present in .env

### LLM Workflow
1. Extract market question + current prices
2. Fetch 5 recent news headlines from NewsAPI
3. Send prompt to Groq Llama 3.1:
   - Market context (question, prices, liquidity)
   - News context (recent headlines)
   - Task: Estimate true probabilities + recommend bet
4. Parse JSON response:
   ```json
   {
     "yesProb": 0.72,
     "noProb": 0.28,
     "ev": 15.3,
     "edge": 12.0,
     "betSide": "YES",
     "confidence": 0.85,
     "rationale": "Historical Trump dominance...",
     "risk": "LOW"
   }
   ```
5. Save to `oracles.llm_analysis` JSONB column

### Dashboard Display
- All markets: Sortable table with search
- Markets with LLM: Purple "AI Analysis" badge
- Expandable cards show:
  - Recommended bet (YES/NO at price)
  - True probability vs market price
  - Edge percentage (green if positive)
  - Risk level (color-coded)
  - Rationale (2-sentence explanation)
  - News sources (3 recent headlines)

## Example Output

### Console (Oracle Bot)
```
🔍 ORACLE SCAN at 2025-10-30T12:00:00Z
📥 Fetching all markets...
✅ Fetched 14,016 markets
📊 782 markets after 7-day filter
📊 Analyzing 782 markets...

✅ Will Trump shake hands with Xi? - 72% Yes 🤖 YES 12%
✅ MegaETH >$1.4B TVL? - 88% No
✅ Bitcoin >$100k by 2025? - 65% Yes

✅ Scan complete: 371 consensus markets saved (48 with LLM analysis)
```

### Dashboard (UI)
```
🔥 EDGE DETECTED
Bet: YES at 65¢
True Prob: 72%
Edge: +12%
Risk: LOW

💡 Historical Trump dominance in similar diplomatic scenarios. 
Recent polling shows 85% approval for China engagement.

📰 News:
• Trump announces China summit next week (Reuters)
• Polls show bipartisan support for talks (CNN)
• Xi extends invitation to Mar-a-Lago (Bloomberg)
```

## Rate Limits & Costs

### Free Tier Budget
- Groq: 30 req/min, 14,400/day → **$0**
- NewsAPI: 100 req/day → **$0**
- Supabase: 500MB DB, 2GB bandwidth → **$0**

### Usage Estimate (per scan)
- Markets analyzed: ~50-100 political markets >$50k
- Groq calls: ~50 (within 30/min limit)
- NewsAPI calls: ~50 (within 100/day limit)
- **All scans fit in free tier** ✅

## Files

### Core Files
- `full-oracle-v2.js` - Main oracle with LLM integration
- `llm-analyzer.js` - Groq + NewsAPI logic
- `.env` - API keys (gitignored)
- `.env.template` - Example config

### Database
- `supabase-migrations/05-add-llm-analysis.sql` - JSONB column

### Frontend
- `client/src/pages/oracle.tsx` - Dashboard with LLM displays

## Troubleshooting

### No LLM analysis appearing
- Check `GROQ_API_KEY` in `.env`
- Verify markets are >$50k liquidity + political
- Check console for "🤖" emoji in logs

### NewsAPI quota exceeded
- Free tier: 100 req/day
- LLM still works without news (uses market data only)
- Consider upgrading NewsAPI or reducing scan frequency

### Rate limit errors (Groq)
- Free tier: 30 req/min
- Bot respects limits (sequential processing)
- Reduce `MIN_LIQUIDITY` to scan fewer markets

## Roadmap

- [ ] UMA dispute integration (TheGraph)
- [ ] Telegram alerts on high-edge opportunities
- [ ] Backtest win rate tracker
- [ ] Auto-bet simulation (no gas)
- [ ] Redis caching for faster scans

## Credits

Built by web3anand | Powered by Groq, NewsAPI, Supabase
