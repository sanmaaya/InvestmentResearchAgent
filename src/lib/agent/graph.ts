import { StateGraph } from "@langchain/langgraph";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import YahooFinance from "yahoo-finance2";
import { AgentState, AgentStateType, CompanyProfile, FinancialMetrics, ChartPoint, NewsResult, AnalysisSection, RiskSection, Recommendation } from "./state";
import { searchWeb } from "./search";

// Initialize yahoo-finance2 with suppressed notices to prevent logs pollution
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });

// Robust JSON extraction helper
function extractJson<T>(text: string): T {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (inner) {
        // continue
      }
    }
    
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      } catch (inner) {
        // continue
      }
    }
    throw new Error("Could not parse structured JSON from LLM response");
  }
}

export function createAgent(
  model: BaseChatModel,
  searchConfig?: { tavilyKey?: string; serpApiKey?: string }
) {
  // --- Nodes ---

  // 1. Resolve Ticker
  const resolveTicker = async (state: AgentStateType) => {
    const company = state.companyName;
    const logs = [`[resolveTicker] Starting ticker lookup for: "${company}"`];
    
    let ticker = "";
    let companyName = company;

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

    // Fallback or double check with LLM
    if (!ticker) {
      try {
        const prompt = `Identify the stock ticker symbol for the company/organization: "${company}". 
If it is a public company, return its standard ticker symbol (e.g. "AAPL" for Apple, "TSLA" for Tesla). If it is a private company or obscure, return the closest public competitor or market indicator ticker, or standard index like "SPY".
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
        // Last fallback: use the query as ticker uppercase
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
      // Fetch quote summary
      const summary = await yahooFinance.quoteSummary(ticker, {
        modules: ["financialData", "price", "defaultKeyStatistics", "summaryProfile"],
      });

      const fd: any = summary.financialData || {};
      const price: any = summary.price || {};
      const keyStats: any = summary.defaultKeyStatistics || {};
      const summaryProfile: any = summary.summaryProfile || {};

      // Map profile
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

      // Map metrics
      financials = {
        currentPrice: fd.currentPrice || price.regularMarketPrice,
        marketCap: price.marketCap,
        peRatio: keyStats.trailingPE || price.trailingPE,
        forwardPe: keyStats.forwardPE,
        currentRatio: fd.currentRatio,
        quickRatio: fd.quickRatio,
        debtToEquity: fd.debtToEquity,
        returnOnEquity: fd.returnOnEquity,
        returnOnAssets: fd.returnOnAssets,
        revenueGrowth: fd.revenueGrowth,
        profitMargin: fd.profitMargins || keyStats.profitMargins,
        operatingMargin: fd.operatingMargins,
        ebitdaMargin: fd.ebitdaMargins,
        freeCashFlow: fd.freeCashflow,
        operatingCashFlow: fd.operatingCashflow,
        currency: price.financialCurrency || fd.financialCurrency || "USD",
      };

      logs.push(`[fetchFinancials] Successfully retrieved financial metrics. Price: ${financials.currency} ${financials.currentPrice}. Market Cap: ${financials.marketCap}.`);
    } catch (err) {
      logs.push(`[fetchFinancials] Error fetching financials from Yahoo Finance: ${(err as Error).message}. Using mock defaults.`);
      // Mock defaults for robust execution
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
      // Fetch chart data (1 year monthly points)
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
      // Mock chart points if it fails
      const mockMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      let basePrice = financials.currentPrice || 100;
      chartData = mockMonths.map((m, i) => {
        const change = (Math.random() - 0.45) * 10; // slight upward drift
        basePrice = basePrice + change;
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
    const logs = [`[searchNews] Searching web for news and investment updates regarding ${compName} (${ticker})`];

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
    const logs = [`[analyzeFundamentals] Analyzing company fundamentals and balance sheet ratios...`];
    const profile = state.profile || {};
    const financials = state.financials || {};

    const prompt = `You are a Senior Equity Research Analyst. Analyze the financial statements and key statistics of ${profile.longName} (${state.ticker}).
Sector: ${profile.sector || "Unknown"} | Industry: ${profile.industry || "Unknown"}
Business Summary: ${profile.summary || "No summary available."}

Key Financial Metrics:
- Current Price: ${financials.currency} ${financials.currentPrice}
- Market Capitalization: ${financials.marketCap}
- Trailing P/E Ratio: ${financials.peRatio || "N/A"}
- Forward P/E Ratio: ${financials.forwardPe || "N/A"}
- Current Ratio: ${financials.currentRatio || "N/A"}
- Quick Ratio: ${financials.quickRatio || "N/A"}
- Debt to Equity (%): ${financials.debtToEquity || "N/A"}
- Return on Equity (ROE %): ${financials.returnOnEquity !== undefined ? (financials.returnOnEquity * 100).toFixed(2) + "%" : "N/A"}
- Return on Assets (ROA %): ${financials.returnOnAssets !== undefined ? (financials.returnOnAssets * 100).toFixed(2) + "%" : "N/A"}
- Revenue Growth (%): ${financials.revenueGrowth !== undefined ? (financials.revenueGrowth * 100).toFixed(2) + "%" : "N/A"}
- Profit Margins (%): ${financials.profitMargin !== undefined ? (financials.profitMargin * 100).toFixed(2) + "%" : "N/A"}
- EBITDA Margin (%): ${financials.ebitdaMargin !== undefined ? (financials.ebitdaMargin * 100).toFixed(2) + "%" : "N/A"}
- Operating Margin (%): ${financials.operatingMargin !== undefined ? (financials.operatingMargin * 100).toFixed(2) + "%" : "N/A"}
- Free Cash Flow: ${financials.freeCashFlow || "N/A"}
- Operating Cash Flow: ${financials.operatingCashFlow || "N/A"}

Please evaluate and write:
1. Financial Health (liquidity, debt safety, margins).
2. Market Position & Competitive Advantage (moat, size, pricing power).
3. Growth Drivers (revenue trends, catalysts, expansions).

Format your response as a JSON object matching this schema exactly. Ensure it contains no formatting errors and fits the structure:
{
  "financialHealth": "Paragraph detailing liquidity, cash flows, margins, and debt health...",
  "marketPosition": "Paragraph detailing industry standing, size, competitive advantage, and moat...",
  "growthDrivers": "Paragraph detailing growth catalysts, revenue growth trends, and expansion plans..."
}
Respond with ONLY the raw JSON object. Do not wrap in markdown or add text outside of the JSON.`;

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
      logs.push(`[analyzeFundamentals] Error during analysis: ${(err as Error).message}. Using fallback analysis.`);
      return {
        analysis: {
          financialHealth: `${profile.longName} exhibits standard cash flow and leverage parameters. PE ratio is currently ${financials.peRatio || "moderate"}.`,
          marketPosition: `${profile.longName} operates as a major player in its respective ${profile.sector || "sector"}.`,
          growthDrivers: `Revenue growth is currently at ${financials.revenueGrowth ? (financials.revenueGrowth * 100).toFixed(1) + "%" : "market averages"}.`
        },
        logs,
        currentNode: "analyzeFundamentals",
      };
    }
  };

  // 5. Assess Risks
  const assessRisks = async (state: AgentStateType) => {
    const logs = [`[assessRisks] Performing SWOT risk assessment and news sentiment analysis...`];
    const profile = state.profile || {};
    const news = state.news || [];

    const prompt = `You are a Senior Risk Officer. Evaluate the risks and headwinds for ${profile.longName} (${state.ticker}) based on the following recent news headlines/summaries.
Recent News Headlines:
${news.map((n, i) => `${i + 1}. [${n.title}] - ${n.snippet}`).join("\n")}

Analyze:
1. Competitive Threats (industry rivals, substitution, technological disruption).
2. Macro Factors (inflation, interest rates, geographic supply chain dynamics in 2026).
3. Regulatory Risks (government policy, environmental compliance, lawsuits).

Format your response as a JSON object matching this schema exactly:
{
  "competitiveThreats": "Paragraph detailing rival activities, technological shifts, and substitution threats...",
  "macroFactors": "Paragraph detailing economic cycles, macro vulnerabilities, inflation, and interest rate impacts in 2026...",
  "regulatoryRisks": "Paragraph detailing legal, government policy, compliance, and antitrust risks..."
}
Respond with ONLY the raw JSON object.`;

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
      logs.push(`[assessRisks] Error during risk assessment: ${(err as Error).message}. Using fallback risks.`);
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

  // 6. Synthesize Decision
  const synthesizeDecision = async (state: AgentStateType) => {
    const logs = [`[synthesizeDecision] Synthesizing final investment decision...`];
    const profile = state.profile || {};
    const financials = state.financials || {};
    const analysis = state.analysis || { financialHealth: "", marketPosition: "", growthDrivers: "" };
    const risks = state.risks || { competitiveThreats: "", macroFactors: "", regulatoryRisks: "" };

    const prompt = `You are the Investment Committee Chair. Review all research and analysis gathered for ${profile.longName} (${state.ticker}):

Financial Fundamentals Summary:
- Health: ${analysis.financialHealth}
- Position: ${analysis.marketPosition}
- Growth Drivers: ${analysis.growthDrivers}

Risk and Tailwind Summary:
- Competitive: ${risks.competitiveThreats}
- Macro Factors: ${risks.macroFactors}
- Regulatory Risks: ${risks.regulatoryRisks}

Current Stock Price: ${financials.currency} ${financials.currentPrice}

Make a definitive recommendation on whether to invest or pass.
Select:
1. Verdict: "Strong Buy", "Buy", "Hold", "Sell", or "Strong Sell".
2. Decision: "INVEST" (for Strong Buy/Buy) or "PASS" (for Hold/Sell/Strong Sell).
3. Confidence Score: An integer from 1 to 100 representing your conviction.
4. Target Price Range: Realistic Low and High stock price expectations for the next 12 months.
5. Bull Thesis: 3 to 5 core bullet points justifying the positive outlook.
6. Bear Thesis: 3 to 5 core bullet points detailing the key risks and reasons to pass/hold.
7. Executive Summary: A beautifully written, professional investment memo (300-500 words) summarizing the thesis. Use clear, sophisticated language fit for high-value portfolio managers.

Format your response as a JSON object matching this schema exactly:
{
  "verdict": "Verdict text",
  "decision": "INVEST or PASS",
  "confidenceScore": 85,
  "targetPriceRange": {
    "low": 120,
    "high": 165
  },
  "bullThesis": [
    "Bull point 1",
    "Bull point 2",
    "Bull point 3"
  ],
  "bearThesis": [
    "Bear point 1",
    "Bear point 2",
    "Bear point 3"
  ],
  "executiveSummary": "Investment memo paragraphs..."
}
Respond with ONLY the raw JSON object.`;

    try {
      const response = await model.invoke(prompt);
      const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      const parsed = extractJson<Recommendation>(content);
      logs.push(`[synthesizeDecision] Decided to ${parsed.decision} (${parsed.verdict}) with ${parsed.confidenceScore}% confidence. Research finished successfully.`);
      return {
        recommendation: parsed,
        logs,
        currentNode: "synthesizeDecision",
      };
    } catch (err) {
      logs.push(`[synthesizeDecision] Error synthesizing decision: ${(err as Error).message}. Defaulting to HOLD/PASS.`);
      const currentVal = financials.currentPrice || 100;
      return {
        recommendation: {
          verdict: "Hold",
          decision: "PASS",
          confidenceScore: 50,
          targetPriceRange: { low: currentVal * 0.9, high: currentVal * 1.1 },
          bullThesis: ["Established market positioning", "Consistent standard earnings"],
          bearThesis: ["Macro headwinds limit short-term upside", "Competitive pressures"],
          executiveSummary: "Due to a technical fallback, we issue a Hold recommendation. Fundamentals remain sound but macro and technical limits suggest waiting for clear catalyst entries."
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
    .addNode("synthesizeDecision", synthesizeDecision)
    .addEdge("__start__", "resolveTicker")
    .addEdge("resolveTicker", "fetchFinancials")
    .addEdge("fetchFinancials", "searchNews")
    .addEdge("searchNews", "analyzeFundamentals")
    .addEdge("analyzeFundamentals", "assessRisks")
    .addEdge("assessRisks", "synthesizeDecision")
    .addEdge("synthesizeDecision", "__end__");

  return workflow.compile();
}
