// LLM Market Analyzer using Groq (free tier) + NewsAPI
require('dotenv').config();

const GROQ_API_KEY = process.env.GROQ_API_KEY; // Free tier: https://console.groq.com
const NEWS_API_KEY = process.env.NEWS_API_KEY; // Free tier: https://newsapi.org (100 req/day)

/**
 * Fetch recent news headlines for market context
 * @param {string} query - Search query (e.g. "Trump handshake")
 * @param {number} maxResults - Max headlines to fetch (default 5)
 * @returns {Promise<string[]>} Array of headlines
 */
async function fetchNewsContext(query, maxResults = 5) {
  if (!NEWS_API_KEY) {
    console.log('⚠️ No NEWS_API_KEY - skipping news fetch');
    return [];
  }

  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=${maxResults}&language=en&apiKey=${NEWS_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`NewsAPI error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.articles?.map(a => `${a.title} (${a.source.name})`) || [];
  } catch (error) {
    console.error('Failed to fetch news:', error.message);
    return [];
  }
}

/**
 * Analyze market using Groq Llama 3.1 (free tier)
 * @param {object} market - Market data from Polymarket
 * @returns {Promise<object|null>} LLM analysis or null if skipped
 */
async function analyzeLLM(market) {
  // Only analyze high-liquidity political markets (free tier has rate limits)
  if (!market.liquidity || market.liquidity < 20000) { // Lowered from 50k
    return null; // Skip low liquidity
  }

  // Focus on politics/economics (where LLM can add value)
  const question = market.question || market.title;
  const isPolitical = /trump|biden|election|president|senate|congress|policy|immigration|tariff|china|russia|ukraine|saudi|israel|hamas|fed|interest|rate/i.test(question);
  
  // Filter out meme/impossible markets
  const isMemeMarket = /satoshi|alien|ufo|simulation|time.travel|immortal|bitcoin.*creator|nakamoto.*identity/i.test(question);
  
  if (isMemeMarket) {
    console.log(`⏭️  Skipping meme market: ${question.substring(0, 60)}...`);
    return null; // Skip impossible-to-resolve markets
  }
  
  if (!isPolitical) {
    return null; // Skip non-political markets to save API quota
  }

  if (!GROQ_API_KEY) {
    console.log('⚠️ No GROQ_API_KEY - skipping LLM analysis');
    return null;
  }

  try {
    // Fetch recent news context
    const searchQuery = question.substring(0, 100); // Trim for API
    const headlines = await fetchNewsContext(searchQuery, 5);
    
    const newsContext = headlines.length > 0 
      ? `Recent news:\n${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}`
      : 'No recent news available.';

    // Get current market prices
    const prices = JSON.parse(market.outcomePrices);
    const yesPrice = parseFloat(prices[0]);
    const noPrice = parseFloat(prices[1]);

    // Prompt for Groq Llama 3.1
    const prompt = `You are a conservative prediction market analyst. Your job is to estimate TRUE probabilities based on EVIDENCE ONLY.

**CRITICAL RULES:**
1. Base estimates on historical precedent and factual evidence ONLY
2. If insufficient evidence exists, stay close to market price
3. Extreme probabilities (>90% or <10%) require extraordinary evidence
4. Meme/impossible events (e.g., "Trump is Satoshi") = reject analysis

**Market Question**: ${question}

**Current Polymarket Prices** (ACTUAL LIVE ODDS):
- YES: ${(yesPrice * 100).toFixed(1)}¢ (${(yesPrice * 100).toFixed(0)}% implied probability)
- NO: ${(noPrice * 100).toFixed(1)}¢ (${(noPrice * 100).toFixed(0)}% implied probability)

**Market Context**:
- Liquidity: $${(market.liquidity / 1000).toFixed(0)}k
- Volume (24h): $${(market.volume24hr / 1000).toFixed(0)}k

**News Context**:
${newsContext}

**Task**:
1. Analyze if market is mispriced based on EVIDENCE from news/history
2. Calculate true probability (conservative, evidence-based)
3. Only recommend bet if edge >10% AND confidence >70%
4. Specify how this market will RESOLVE (UMA oracle, news source, on-chain data)

**IMPORTANT**: 
- If question is impossible to verify (e.g., identity claims without proof), set betSide = "SKIP"
- If insufficient evidence, keep yesProb/noProb within ±5% of market price
- Extreme markets (>95% or <5%) are usually correct - need STRONG evidence to contradict

**Output Format** (JSON only, no markdown):
{
  "yesProb": 0.08,
  "noProb": 0.92,
  "ev": 3.2,
  "edge": 3.0,
  "betSide": "NO",
  "confidence": 0.75,
  "rationale": "No credible evidence of Trump-Satoshi link. Market correctly priced at ~5% (meme value). Small edge betting NO but low conviction.",
  "risk": "LOW",
  "resolveSource": "UMA oracle will require cryptographic proof or credible admission - neither exists"
}`;

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Fast + free tier (replacement for deprecated 70b)
        messages: [
          { role: 'system', content: 'You are a precise prediction market analyst. Output valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Low temp for consistency
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Groq API error: ${response.status} - ${error}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content from Groq');
      return null;
    }

    // Parse JSON response
    let analysis;
    try {
      // Extract JSON if wrapped in markdown
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse LLM JSON:', content);
      return null;
    }

    // Validate analysis quality
    if (analysis.betSide === 'SKIP') {
      console.log(`⏭️  LLM skipped: ${market.question.substring(0, 50)}... (insufficient evidence)`);
      return null;
    }

    // Recalculate edge based on actual market price
    const trueProbYes = analysis.yesProb || 0;
    const marketProbYes = yesPrice;
    const edgeYes = (trueProbYes - marketProbYes) * 100; // Convert to percentage
    const edgeNo = ((1 - trueProbYes) - noPrice) * 100;
    
    // Determine best side and actual edge
    let bestSide, actualEdge;
    if (Math.abs(edgeYes) > Math.abs(edgeNo)) {
      bestSide = edgeYes > 0 ? 'YES' : 'NO';
      actualEdge = Math.abs(edgeYes);
    } else {
      bestSide = edgeNo > 0 ? 'NO' : 'YES';
      actualEdge = Math.abs(edgeNo);
    }

    // Override LLM if edge calculation disagrees significantly
    if (actualEdge < 5) {
      console.log(`⚠️  Edge too small: ${market.question.substring(0, 50)}... (${actualEdge.toFixed(1)}%)`);
      return null; // Don't save low-edge markets
    }

    // Update analysis with accurate values
    analysis.betSide = bestSide;
    analysis.edge = actualEdge;
    analysis.ev = actualEdge; // Simplified EV for now

    // Add metadata
    analysis.sources = headlines;
    analysis.analyzedAt = new Date().toISOString();
    analysis.marketPrice = yesPrice;

    console.log(`🤖 LLM Analysis: ${market.question.substring(0, 50)}... → ${analysis.betSide} (${analysis.edge.toFixed(0)}% edge, ${(analysis.confidence * 100).toFixed(0)}% conf)`);
    
    return analysis;

  } catch (error) {
    console.error('LLM analysis failed:', error.message);
    return null;
  }
}

module.exports = { analyzeLLM, fetchNewsContext };
