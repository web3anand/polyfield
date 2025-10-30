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
  if (!market.liquidity || market.liquidity < 50000) {
    return null; // Skip low liquidity
  }

  // Focus on politics/economics (where LLM can add value)
  const question = market.question || market.title;
  const isPolitical = /trump|biden|election|president|senate|congress|policy|immigration|tariff|china|russia|ukraine/i.test(question);
  
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
    const prompt = `You are a prediction market analyst. Analyze this Polymarket question and provide probabilities + betting recommendation.

**Question**: ${question}

**Current Market Prices**:
- YES: ${(yesPrice * 100).toFixed(1)}¢ (${(yesPrice * 100).toFixed(0)}% implied probability)
- NO: ${(noPrice * 100).toFixed(1)}¢ (${(noPrice * 100).toFixed(0)}% implied probability)

**Market Context**:
- Liquidity: $${(market.liquidity / 1000).toFixed(0)}k
- Volume: $${(market.volume24hr / 1000).toFixed(0)}k (24h)

**News Context**:
${newsContext}

**Task**:
1. Estimate TRUE probabilities based on historical precedent, news, and logic
2. Calculate Expected Value (EV) and edge vs market price
3. Recommend bet side (YES/NO/SKIP) with confidence level
4. Provide concise rationale (max 2 sentences)

**Output Format** (JSON only, no markdown):
{
  "yesProb": 0.72,
  "noProb": 0.28,
  "ev": 15.3,
  "edge": 12.0,
  "betSide": "YES",
  "confidence": 0.85,
  "rationale": "Historical Trump dominance in similar scenarios combined with recent polling surge. Market underpricing YES by ~12%.",
  "risk": "LOW"
}`;

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile', // Fast + smart on free tier
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

    // Add metadata
    analysis.sources = headlines;
    analysis.analyzedAt = new Date().toISOString();
    analysis.marketPrice = yesPrice;

    console.log(`🤖 LLM Analysis: ${market.question.substring(0, 50)}... → ${analysis.betSide} (${(analysis.edge || 0).toFixed(0)}% edge)`);
    
    return analysis;

  } catch (error) {
    console.error('LLM analysis failed:', error.message);
    return null;
  }
}

module.exports = { analyzeLLM, fetchNewsContext };
