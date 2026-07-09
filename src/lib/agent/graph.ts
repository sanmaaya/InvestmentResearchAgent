import { StateGraph } from "@langchain/langgraph";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import YahooFinance from "yahoo-finance2";
import { 
  AgentState, 
  AgentStateType, 
  CompanyProfile, 
  FinancialMetrics, 
  ChartPoint, 
  NewsResult, 
  AnalysisSection, 
  RiskSection, 
  Recommendation, 
  ValuationAnalysis,
  MoatMetrics,
  CompetitorComparison,
  InvestmentScores
} from "./state";
import { searchWeb } from "./search";
import { 
  FALLBACK_ANALYSIS, 
  FALLBACK_RISKS, 
  FALLBACK_QUALITY, 
  FALLBACK_DECISION 
} from "./fallbacks";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });

function extractJson<T>(text: string): T {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (inner) {}
    }
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      } catch (inner) {}
    }
    throw new Error("Could not parse structured JSON from LLM response");
  }
}

export function createAgent(
  model: BaseChatModel,
  searchConfig?: { tavilyKey?: string; serpApiKey?: string }
) {
  // 1. Resolve Ticker
  const resolveTicker = async (state: AgentStateType) => {
    const company = state.companyName;
    const logs = [`[resolveTicker] Starting ticker lookup for: "${company}"`];
    
    let ticker = "";
    let companyName = company;

    // Direct autocomplete/typo-safety resolver for major tech equities
    const cleanCompany = company.toLowerCase().trim();
    if (cleanCompany.includes("nvidia") || cleanCompany.includes("nvda")) {
      ticker = "NVDA";
      companyName = "NVIDIA Corporation";
    } else if (cleanCompany.includes("apple") || cleanCompany.includes("aapl")) {
      ticker = "AAPL";
      companyName = "Apple Inc.";
    } else if (cleanCompany.includes("tesla") || cleanCompany.includes("tsla")) {
      ticker = "TSLA";
      companyName = "Tesla, Inc.";
    } else if (cleanCompany.includes("amazon") || cleanCompany.includes("amzn")) {
      ticker = "AMZN";
      companyName = "Amazon.com, Inc.";
    } else if (cleanCompany.includes("microsoft") || cleanCompany.includes("msft")) {
      ticker = "MSFT";
      companyName = "Microsoft Corporation";
    }

    if (!ticker) {
      try {
        const searchRes = await yahooFinance.search(company);
        const equityQuotes = searchRes.quotes?.filter(q => q.quoteType === "EQUITY" || q.quoteType === "ETF") || [];
        const bestQuote: any = equityQuotes.length > 0 ? equityQuotes[0] : searchRes.quotes?.[0];

        if (bestQuote && bestQuote.symbol) {
          ticker = bestQuote.symbol;
          companyName = bestQuote.longname || bestQuote.shortname || company;
          logs.push(`[resolveTicker] Found equity ticker: "${ticker}" (${companyName}) via Yahoo Finance search.`);
        } else {
          logs.push(`[resolveTicker] Yahoo Finance search yielded no quotes. Falling back to LLM...`);
        }
      } catch (err) {
        logs.push(`[resolveTicker] Error during Yahoo Finance search: ${(err as Error).message}. Falling back to LLM...`);
      }
    } else {
      logs.push(`[resolveTicker] Auto-resolved query to standard ticker: "${ticker}" (${companyName}).`);
    }

    // Fallback or double check with LLM
    if (!ticker) {
      try {
        const prompt = `Identify the stock ticker symbol for the company/organization: "${company}". 
If it is a public company, return its standard ticker symbol. If it is private, return closest competitor.
Format your response as a JSON object matching this schema exactly:
{
  "ticker": "TICKER_SYMBOL",
  "companyName": "Official Company Name"
}
Respond with ONLY the JSON object.`;
        const response = await model.invoke(prompt);
        const textContent = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
        const parsed = extractJson<{ ticker: string; companyName: string }>(textContent);
        ticker = parsed.ticker;
        companyName = parsed.companyName;
        logs.push(`[resolveTicker] Resolved ticker to "${ticker}" (${companyName}) via LLM.`);
      } catch (err) {
        ticker = company.toUpperCase().replace(/\s+/g, "").substring(0, 5);
        logs.push(`[resolveTicker] Final fallback ticker set to "${ticker}".`);
      }
    }

    return {
      ticker,
      profile: { symbol: ticker, longName: companyName },
      logs,
      currentNode: "resolveTicker",
    };
  };

  // 2. Fetch Financials
  const fetchFinancials = async (state: AgentStateType) => {
    const ticker = state.ticker;
    const logs = [`[fetchFinancials] Retrieving financial statements and stock charts for: ${ticker}`];
    
    let financials: FinancialMetrics = {};
    let profile: CompanyProfile = { symbol: ticker, longName: state.profile?.longName };
    let chartData: ChartPoint[] = [];

    try {
      const summary = await yahooFinance.quoteSummary(ticker, {
        modules: ["financialData", "price", "defaultKeyStatistics", "summaryProfile", "summaryDetail"],
      });

      const fd: any = summary.financialData || {};
      const price: any = summary.price || {};
      const keyStats: any = summary.defaultKeyStatistics || {};
      const summaryProfile: any = summary.summaryProfile || {};
      const sd: any = summary.summaryDetail || {};

      profile = {
        symbol: ticker,
        longName: price.longName || state.profile?.longName || price.shortName,
        industry: summaryProfile.industry,
        sector: summaryProfile.sector,
        summary: summaryProfile.longBusinessSummary,
        website: summaryProfile.website,
        city: summaryProfile.city,
        country: summaryProfile.country,
      };

      financials = {
        currentPrice: fd.currentPrice || price.regularMarketPrice,
        marketCap: price.marketCap || sd.marketCap,
        peRatio: keyStats.trailingPE || sd.trailingPE || price.trailingPE,
        forwardPe: keyStats.forwardPE || sd.forwardPE,
        currentRatio: fd.currentRatio,
        quickRatio: fd.quickRatio,
        debtToEquity: fd.debtToEquity,
        returnOnEquity: fd.returnOnEquity,
        returnOnAssets: fd.returnOnAssets,
        revenueGrowth: fd.revenueGrowth,
        profitMargin: fd.profitMargins || keyStats.profitMargins || sd.profitMargins,
        operatingMargin: fd.operatingMargins,
        ebitdaMargin: fd.ebitdaMargins,
        freeCashFlow: fd.freeCashflow,
        operatingCashFlow: fd.operatingCashflow,
        currency: price.financialCurrency || fd.financialCurrency || "USD",
      };

      logs.push(`[fetchFinancials] Successfully retrieved financial metrics. Price: ${financials.currency} ${financials.currentPrice}. Market Cap: ${financials.marketCap}.`);
    } catch (err) {
      logs.push(`[fetchFinancials] Error fetching financials from Yahoo Finance: ${(err as Error).message}. Using mock defaults.`);
      financials = {
        currentPrice: 150.0,
        marketCap: 500000000000,
        peRatio: 25.0,
        forwardPe: 22.0,
        currentRatio: 1.5,
        quickRatio: 1.2,
        debtToEquity: 50.0,
        returnOnEquity: 0.18,
        returnOnAssets: 0.08,
        revenueGrowth: 0.10,
        profitMargin: 0.15,
        currency: "USD",
      };
    }

    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const chartRes = await yahooFinance.chart(ticker, {
        period1: oneYearAgo,
        interval: "1mo",
      });

      if (chartRes && chartRes.quotes) {
        chartData = chartRes.quotes.map(q => ({
          date: new Date(q.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          close: q.close || q.adjclose || 0,
          open: q.open ?? undefined,
          high: q.high ?? undefined,
          low: q.low ?? undefined,
          volume: q.volume ?? undefined,
        }));
        logs.push(`[fetchFinancials] Fetched ${chartData.length} monthly chart history data points.`);
      }
    } catch (err) {
      logs.push(`[fetchFinancials] Failed to fetch historical chart data: ${(err as Error).message}.`);
      const mockMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      let basePrice = financials.currentPrice || 100;
      chartData = mockMonths.map((m) => {
        basePrice = basePrice + (Math.random() - 0.45) * 10;
        return {
          date: `${m} 25`,
          close: parseFloat(basePrice.toFixed(2)),
        };
      });
    }

    return {
      profile,
      financials,
      chartData,
      logs,
      currentNode: "fetchFinancials",
    };
  };

  // 3. Search News
  const searchNews = async (state: AgentStateType) => {
    const compName = state.profile?.longName || state.companyName;
    const ticker = state.ticker;
    const logs = [`[searchNews] Searching web for news regarding ${compName} (${ticker})`];
    const searchQuery = `"${compName}" OR "${ticker}" stock news market performance analysis 2026`;
    const results = await searchWeb(searchQuery, searchConfig);
    
    logs.push(`[searchNews] Found ${results.length} relevant news headlines.`);
    return {
      news: results,
      logs,
      currentNode: "searchNews",
    };
  };

  // 4. Analyze Fundamentals
  const analyzeFundamentals = async (state: AgentStateType) => {
    const logs = [`[analyzeFundamentals] Analyzing company fundamentals...`];
    const profile = state.profile || {};
    const financials = state.financials || {};

    const prompt = `You are a Senior Equity Research Analyst. Analyze financials for ${profile.longName} (${state.ticker}):
Sector: ${profile.sector || "Unknown"} | Industry: ${profile.industry || "Unknown"}
PE Ratio: ${financials.peRatio || "N/A"} | ROE: ${financials.returnOnEquity || "N/A"} | Margin: ${financials.profitMargin || "N/A"}
Write:
1. Financial Health (liquidity, debt safety, margins).
2. Market Position & Competitive Advantage (moat, size, pricing power).
3. Growth Drivers (revenue trends, catalysts, expansions).
Format response as raw JSON matching this schema:
{
  "financialHealth": "...",
  "marketPosition": "...",
  "growthDrivers": "..."
}
Respond with ONLY the JSON object.`;

    try {
      const response = await model.invoke(prompt);
      const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      const parsed = extractJson<AnalysisSection>(content);
      logs.push(`[analyzeFundamentals] Fundamental analysis complete.`);
      return {
        analysis: parsed,
        logs,
        currentNode: "analyzeFundamentals",
      };
    } catch (err) {
      logs.push(`[analyzeFundamentals] Error: ${(err as Error).message}. Using fallback analysis.`);
      const tickerLower = state.ticker?.toLowerCase() || "";
      const matched = Object.keys(FALLBACK_ANALYSIS).find(key => tickerLower.includes(key));
      if (matched) {
        return {
          analysis: FALLBACK_ANALYSIS[matched],
          logs,
          currentNode: "analyzeFundamentals",
        };
      }
      return {
        analysis: {
          financialHealth: `${profile.longName || state.companyName} exhibits standard cash flow and leverage parameters. PE ratio is currently ${financials.peRatio || "moderate"}.`,
          marketPosition: `${profile.longName || state.companyName} operates as a major player in its respective ${profile.sector || "sector"}.`,
          growthDrivers: `Revenue growth is currently at ${financials.revenueGrowth ? (financials.revenueGrowth * 100).toFixed(1) + "%" : "market averages"}.`
        },
        logs,
        currentNode: "analyzeFundamentals",
      };
    }
  };

  // 5. Assess Risks
  const assessRisks = async (state: AgentStateType) => {
    const logs = [`[assessRisks] Performing SWOT risk assessment...`];
    const profile = state.profile || {};
    const news = state.news || [];

    const prompt = `You are a Senior Risk Officer. Evaluate risks for ${profile.longName} (${state.ticker}) based on news:
${news.map((n, i) => `${i + 1}. [${n.title}] - ${n.snippet}`).join("\n")}
Format response as raw JSON matching this schema:
{
  "competitiveThreats": "...",
  "macroFactors": "...",
  "regulatoryRisks": "..."
}
Respond with ONLY the JSON object.`;

    try {
      const response = await model.invoke(prompt);
      const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      const parsed = extractJson<RiskSection>(content);
      logs.push(`[assessRisks] Risk assessment complete.`);
      return {
        risks: parsed,
        logs,
        currentNode: "assessRisks",
      };
    } catch (err) {
      logs.push(`[assessRisks] Error: ${(err as Error).message}. Using fallback risks.`);
      const tickerLower = state.ticker?.toLowerCase() || "";
      const matched = Object.keys(FALLBACK_RISKS).find(key => tickerLower.includes(key));
      if (matched) {
        return {
          risks: FALLBACK_RISKS[matched],
          logs,
          currentNode: "assessRisks",
        };
      }
      return {
        risks: {
          competitiveThreats: "Faces standard sector competition from major incumbents and rising disruptors.",
          macroFactors: "Macroeconomic factors including supply chain and pricing variables represent moderate headwinds.",
          regulatoryRisks: "Subject to standard local and international compliance, with typical legal risks."
        },
        logs,
        currentNode: "assessRisks",
      };
    }
  };

  // 5.5. Evaluate Investment Quality (Moat, Competitor, Scores, Valuation)
  const evaluateInvestmentQuality = async (state: AgentStateType) => {
    const logs = [`[evaluateInvestmentQuality] Assessing moat, competitor margins, and scoring...`];
    const profile = state.profile || {};
    const financials = state.financials || {};

    const prompt = `You are a Senior Investment Quality Evaluator. Analyze ${profile.longName} (${state.ticker}) metrics:
P/E: ${financials.peRatio || "N/A"} | ROE: ${financials.returnOnEquity || "N/A"} | Growth: ${financials.revenueGrowth || "N/A"}
Evaluate:
1. Moat: Score (1-5) and brief comment for: Brand, Technology, Network Effect, Switching Cost, Patents, Economies of Scale.
2. Competitors: Metrics (P/E, Margin, Growth, Market Cap) for 2 key competitors.
3. Scores (0-100): Financial Health, Growth, Management, Risk, Valuation, Innovation, and Overall.
4. Valuation Analysis: Determine if "Overvalued", "Fairly Valued", or "Undervalued" with reason.
Format response as raw JSON matching this schema:
{
  "moat": {
    "brand": 4, "brandComment": "...",
    "technology": 5, "technologyComment": "...",
    "networkEffect": 3, "networkEffectComment": "...",
    "switchingCost": 4, "switchingCostComment": "...",
    "patents": 4, "patentsComment": "...",
    "economiesOfScale": 5, "economiesOfScaleComment": "..."
  },
  "competitors": [
    { "symbol": "TICKER_1", "name": "Name 1", "peRatio": "24.5", "margin": "18.2%", "growth": "11.5%", "marketCap": "150B" },
    { "symbol": "TICKER_2", "name": "Name 2", "peRatio": "20.1", "margin": "12.4%", "growth": "6.8%", "marketCap": "80B" }
  ],
  "scores": { "financialHealth": 90, "growth": 85, "management": 80, "risk": 75, "valuation": 65, "innovation": 95, "overall": 82 },
  "valuationAnalysis": { "verdict": "Fairly Valued", "reason": "..." }
}
Respond with ONLY the JSON object.`;

    try {
      const response = await model.invoke(prompt);
      const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      const parsed = extractJson<{
        moat: any;
        competitors: any[];
        scores: any;
        valuationAnalysis: any;
      }>(content);

      logs.push(`[evaluateInvestmentQuality] Scoring complete. Overall score: ${parsed.scores?.overall || 80}/100.`);
      return {
        moat: parsed.moat,
        competitors: parsed.competitors,
        scores: parsed.scores,
        valuationAnalysis: parsed.valuationAnalysis,
        logs,
        currentNode: "evaluateInvestmentQuality",
      };
    } catch (err) {
      logs.push(`[evaluateInvestmentQuality] Error: ${(err as Error).message}. Using fallback metrics.`);
      const tickerLower = state.ticker?.toLowerCase() || "";
      const matched = Object.keys(FALLBACK_QUALITY).find(key => tickerLower.includes(key));
      
      let fallbackMoat: MoatMetrics = {
        brand: 4, brandComment: "Strong household brand with global recognition.",
        technology: 4, technologyComment: "Industry standard proprietary platforms and frameworks.",
        networkEffect: 3, networkEffectComment: "Moderate ecosystem stickiness but growing database.",
        switchingCost: 3, switchingCostComment: "Moderate switching barriers for standard enterprise users.",
        patents: 4, patentsComment: "Deep utility patent library protecting design features.",
        economiesOfScale: 4, economiesOfScaleComment: "Substantial global logistics infrastructure scaling unit cost."
      };
      let fallbackCompetitors: CompetitorComparison[] = [
        { symbol: "COMP1", name: "Competitor A", peRatio: "22.5", margin: "14.2%", growth: "8.5%", marketCap: "120B" },
        { symbol: "COMP2", name: "Competitor B", peRatio: "28.1", margin: "12.8%", growth: "6.2%", marketCap: "95B" }
      ];
      let fallbackScores: InvestmentScores = {
        financialHealth: 85, growth: 80, management: 82, risk: 78, valuation: 70, innovation: 85, overall: 80
      };
      let fallbackValuation: ValuationAnalysis = {
        verdict: "Fairly Valued",
        reason: "Trading in-line with historical industry averages with robust cash generation support."
      };

      if (matched) {
        const q = FALLBACK_QUALITY[matched];
        fallbackMoat = q.moat;
        fallbackCompetitors = q.competitors;
        fallbackScores = q.scores;
        fallbackValuation = q.valuationAnalysis;
      }

      return {
        moat: fallbackMoat,
        competitors: fallbackCompetitors,
        scores: fallbackScores,
        valuationAnalysis: fallbackValuation,
        logs,
        currentNode: "evaluateInvestmentQuality",
      };
    }
  };

  // 6. Synthesize Decision
  const synthesizeDecision = async (state: AgentStateType) => {
    const logs = [`[synthesizeDecision] Synthesizing final investment decision...`];
    const profile = state.profile || {};
    const financials = state.financials || {};
    const analysis = state.analysis || { financialHealth: "", marketPosition: "", growthDrivers: "" };
    const risks = state.risks || { competitiveThreats: "", macroFactors: "", regulatoryRisks: "" };

    const prompt = `You are the Investment Committee Chair. Review data for ${profile.longName} (${state.ticker}).
Make a recommendation to INVEST or PASS.
Format response as raw JSON matching this schema:
{
  "verdict": "Verdict text (e.g. Strong Buy)",
  "decision": "INVEST or PASS",
  "confidenceScore": 85,
  "targetPriceRange": { "low": 120, "high": 165 },
  "bullThesis": ["...", "..."],
  "bearThesis": ["...", "..."],
  "executiveSummary": "Investment memo paragraphs..."
}
Respond with ONLY the JSON object.`;

    try {
      const response = await model.invoke(prompt);
      const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      const parsed = extractJson<Recommendation>(content);
      logs.push(`[synthesizeDecision] Decided to ${parsed.decision} with ${parsed.confidenceScore}% confidence.`);
      return {
        recommendation: parsed,
        logs,
        currentNode: "synthesizeDecision",
      };
    } catch (err) {
      logs.push(`[synthesizeDecision] Error: ${(err as Error).message}. Defaulting to fallback recommendation.`);
      const tickerLower = state.ticker?.toLowerCase() || "";
      const matched = Object.keys(FALLBACK_DECISION).find(key => tickerLower.includes(key));
      const currentVal = financials.currentPrice || 100;
      
      if (matched) {
        const d = FALLBACK_DECISION[matched];
        return {
          recommendation: {
            verdict: d.verdict,
            decision: d.decision,
            confidenceScore: d.confidenceScore,
            targetPriceRange: { low: Math.round(currentVal * d.lowMultiplier), high: Math.round(currentVal * d.highMultiplier) },
            bullThesis: d.bullThesis,
            bearThesis: d.bearThesis,
            executiveSummary: d.executiveSummary
          },
          logs,
          currentNode: "synthesizeDecision",
        };
      }

      return {
        recommendation: {
          verdict: "Hold",
          decision: "PASS",
          confidenceScore: 50,
          targetPriceRange: { low: Math.round(currentVal * 0.9), high: Math.round(currentVal * 1.1) },
          bullThesis: [
            "Stable fundamental positioning within its respective sector.",
            "Consistent historic earnings output and cash flow margins."
          ],
          bearThesis: [
            "Macroeconomic headwinds limit near-term valuation expansions.",
            "Rising competitive landscape restricts rapid organic growth."
          ],
          executiveSummary: `Due to default parameters, we issue a Hold recommendation for the ticker ${state.ticker}. Fundamentals remain solid, but near-term industry competition and macroeconomic pressures suggest waiting for a catalyst entry point.`
        },
        logs,
        currentNode: "synthesizeDecision",
      };
    }
  };

  // --- Compile Graph ---
  const workflow = new StateGraph(AgentState)
    .addNode("resolveTicker", resolveTicker)
    .addNode("fetchFinancials", fetchFinancials)
    .addNode("searchNews", searchNews)
    .addNode("analyzeFundamentals", analyzeFundamentals)
    .addNode("assessRisks", assessRisks)
    .addNode("evaluateInvestmentQuality", evaluateInvestmentQuality)
    .addNode("synthesizeDecision", synthesizeDecision)
    .addEdge("__start__", "resolveTicker")
    .addEdge("resolveTicker", "fetchFinancials")
    .addEdge("fetchFinancials", "searchNews")
    .addEdge("searchNews", "analyzeFundamentals")
    .addEdge("analyzeFundamentals", "assessRisks")
    .addEdge("assessRisks", "evaluateInvestmentQuality")
    .addEdge("evaluateInvestmentQuality", "synthesizeDecision")
    .addEdge("synthesizeDecision", "__end__");

  return workflow.compile();
}
