import { Annotation } from "@langchain/langgraph";

export interface CompanyProfile {
  symbol: string;
  longName?: string;
  industry?: string;
  sector?: string;
  summary?: string;
  website?: string;
  city?: string;
  country?: string;
}

export interface FinancialMetrics {
  currentPrice?: number;
  marketCap?: number;
  peRatio?: number;
  forwardPe?: number;
  currentRatio?: number;
  quickRatio?: number;
  debtToEquity?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  revenueGrowth?: number;
  profitMargin?: number;
  operatingMargin?: number;
  ebitdaMargin?: number;
  freeCashFlow?: number;
  operatingCashFlow?: number;
  currency?: string;
}

export interface ChartPoint {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface NewsResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
}

export interface AnalysisSection {
  financialHealth: string;
  marketPosition: string;
  growthDrivers: string;
}

export interface RiskSection {
  competitiveThreats: string;
  macroFactors: string;
  regulatoryRisks: string;
}

export interface Recommendation {
  verdict: "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell";
  decision: "INVEST" | "PASS";
  confidenceScore: number; // 1-100
  targetPriceRange: { low: number; high: number };
  bullThesis: string[];
  bearThesis: string[];
  executiveSummary: string;
}

export interface MoatMetrics {
  brand: number; // 1-5
  brandComment?: string;
  technology: number;
  technologyComment?: string;
  networkEffect: number;
  networkEffectComment?: string;
  switchingCost: number;
  switchingCostComment?: string;
  patents: number;
  patentsComment?: string;
  economiesOfScale: number;
  economiesOfScaleComment?: string;
}

export interface CompetitorComparison {
  symbol: string;
  name: string;
  peRatio?: string;
  margin?: string;
  growth?: string;
  marketCap?: string;
}

export interface InvestmentScores {
  financialHealth: number;
  growth: number;
  management: number;
  risk: number;
  valuation: number;
  innovation: number;
  overall: number;
}

export interface ValuationAnalysis {
  verdict: "Overvalued" | "Fairly Valued" | "Undervalued";
  reason: string;
}

export const AgentState = Annotation.Root({
  companyName: Annotation<string>(),
  ticker: Annotation<string>(),
  profile: Annotation<CompanyProfile>(),
  financials: Annotation<FinancialMetrics>(),
  chartData: Annotation<ChartPoint[]>(),
  news: Annotation<NewsResult[]>(),
  analysis: Annotation<AnalysisSection>(),
  risks: Annotation<RiskSection>(),
  recommendation: Annotation<Recommendation>(),
  moat: Annotation<MoatMetrics>(),
  competitors: Annotation<CompetitorComparison[]>(),
  scores: Annotation<InvestmentScores>(),
  valuationAnalysis: Annotation<ValuationAnalysis>(),
  logs: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  currentNode: Annotation<string>(),
});

export type AgentStateType = typeof AgentState.State;
