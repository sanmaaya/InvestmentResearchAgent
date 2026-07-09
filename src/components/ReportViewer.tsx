"use client";
import React, { useState, useEffect, useRef } from "react";
import { 
  TrendingUp, 
  AlertTriangle, 
  Scale, 
  Shield, 
  Sparkles, 
  BookOpen, 
  Star, 
  MessageSquare, 
  Send, 
  Copy, 
  Download, 
  Share2, 
  Loader2, 
  Check, 
  Coins 
} from "lucide-react";
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer 
} from "recharts";
import { 
  Recommendation, 
  AnalysisSection, 
  RiskSection, 
  NewsResult, 
  FinancialMetrics,
  MoatMetrics,
  CompetitorComparison,
  InvestmentScores,
  ValuationAnalysis,
  CompanyProfile
} from "@/lib/agent/state";

interface ReportViewerProps {
  ticker?: string;
  companyName?: string;
  profile?: CompanyProfile;
  recommendation?: Recommendation;
  analysis?: AnalysisSection;
  risks?: RiskSection;
  news?: NewsResult[];
  financials?: FinancialMetrics;
  moat?: MoatMetrics;
  competitors?: CompetitorComparison[];
  scores?: InvestmentScores;
  valuationAnalysis?: ValuationAnalysis;
  provider?: "gemini" | "openai";
  apiKey?: string;
}

export default function ReportViewer({ 
  ticker, 
  companyName, 
  profile,
  recommendation, 
  analysis, 
  risks, 
  news, 
  financials,
  moat,
  competitors,
  scores,
  valuationAnalysis,
  provider,
  apiKey
}: ReportViewerProps) {
  const [activeTab, setActiveTab] = useState<"thesis" | "analysis" | "risks" | "moat" | "summary">("thesis");
  
  // Chat states
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Export feedback states
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // Reset chat if ticker changes
  useEffect(() => {
    setChatMessages([]);
    setChatInput("");
  }, [ticker]);

  if (!recommendation) {
    return (
      <div className="card" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px", color: "var(--text-secondary)" }}>
        <p>Awaiting agent research analysis results...</p>
      </div>
    );
  }

  const isInvest = recommendation.decision === "INVEST";

  // Format price
  const formatVal = (val?: number) => {
    if (val === undefined) return "N/A";
    const currency = financials?.currency || "$";
    return `${currency}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getConfClass = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 50) return "warning";
    return "danger";
  };

  // Render Stars
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star 
          key={i} 
          size={16} 
          fill={i <= rating ? "var(--color-brand)" : "none"} 
          stroke={i <= rating ? "var(--color-brand)" : "var(--text-muted)"}
          style={{ marginRight: "2px" }}
        />
      );
    }
    return <div style={{ display: "flex", alignItems: "center" }}>{stars}</div>;
  };

  // Handle Send Chat
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, { role: "user", content: userMsg }],
          provider,
          apiKey,
          companyContext: {
            ticker: ticker || profile?.symbol,
            companyName: companyName || profile?.longName,
            profile,
            financials,
            recommendation,
            analysis,
            risks,
            moat,
            scores,
            valuationAnalysis
          }
        })
      });

      if (!response.ok) {
        throw new Error("Chat api failed to respond.");
      }

      const resData = await response.json();
      setChatMessages((prev) => [...prev, { role: "assistant", content: resData.content || "Sorry, I encountered an empty response." }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: `Error: ${(err as Error).message || "Unable to reach the AI model. Check your API Keys."}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Export report as Text
  const handleExportText = () => {
    const textReport = `INVESTMENT DUE DILIGENCE REPORT: ${companyName || ticker} (${ticker})
Generated by: Invests SANLABS AI Research Node
=========================================
VERDICT: ${recommendation.verdict} (${recommendation.decision})
Conviction Score: ${recommendation.confidenceScore}%
12M Price Target Range: ${formatVal(recommendation.targetPriceRange?.low)} - ${formatVal(recommendation.targetPriceRange?.high)}
Valuation Grade: ${valuationAnalysis?.verdict || "Fairly Valued"} (${valuationAnalysis?.reason || ""})
Overall Rating Score: ${scores?.overall || 80}/100

BULL THESIS:
${recommendation.bullThesis?.map(t => `- ${t}`).join("\n")}

BEAR THESIS:
${recommendation.bearThesis?.map(t => `- ${t}`).join("\n")}

FINANCIALS KEY RATIOS:
- P/E: ${financials?.peRatio || "N/A"}
- Return on Equity: ${financials?.returnOnEquity ? (financials.returnOnEquity * 100).toFixed(2) + "%" : "N/A"}
- Debt/Equity: ${financials?.debtToEquity ? financials.debtToEquity.toFixed(2) + "%" : "N/A"}
- Operating Margin: ${financials?.operatingMargin ? (financials.operatingMargin * 100).toFixed(2) + "%" : "N/A"}
- Revenue Growth: ${financials?.revenueGrowth ? (financials.revenueGrowth * 100).toFixed(2) + "%" : "N/A"}
- Free Cash Flow: ${financials?.freeCashFlow?.toLocaleString() || "N/A"}

EXECUTIVE MEMORANDUM SUMMARY:
${recommendation.executiveSummary}

=========================================
Developed for AI Product Design. © 2026.`;

    const blob = new Blob([textReport], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${ticker || "Report"}_AI_Diligence_Report.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy report to clipboard
  const handleCopyReport = () => {
    const summaryText = `**AI Investment Report: ${companyName || ticker} (${ticker})**\nVerdict: ${recommendation.verdict} | Conviction: ${recommendation.confidenceScore}%\nTarget price range: ${formatVal(recommendation.targetPriceRange?.low)} - ${formatVal(recommendation.targetPriceRange?.high)}\nOverall score: ${scores?.overall || 80}/100\n\n*Read the full details in the Invests SANLABS vault.*`;
    navigator.clipboard.writeText(summaryText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Copy share link
  const handleShareLink = () => {
    const url = typeof window !== "undefined" ? window.location.href : "http://localhost:3000";
    navigator.clipboard.writeText(`${url}?ticker=${ticker}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Setup risk radar chart data
  const riskChartData = [
    { subject: "Market Risk", value: Math.max(15, 100 - (scores?.growth || 80)) },
    { subject: "Financial Risk", value: Math.max(15, 100 - (scores?.financialHealth || 85)) },
    { subject: "Competition", value: Math.max(15, 100 - ((moat?.technology || 4) * 20)) },
    { subject: "Management", value: Math.max(15, 100 - (scores?.management || 80)) },
    { subject: "Legal/Regulatory", value: Math.max(15, (scores?.risk || 70) * 0.8) },
    { subject: "Geopolitical", value: Math.max(15, (scores?.risk || 70) * 0.9) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Verdict Glowing Container */}
      <div className={`verdict-box ${isInvest ? "invest" : "pass"}`}>
        <div className="verdict-info">
          <div className="verdict-badge-container">
            <span className={`verdict-badge ${isInvest ? "invest-badge" : "pass-badge"}`}>
              {recommendation.decision}
            </span>
            <span style={{ fontSize: "1.05rem", color: "var(--text-secondary)", fontWeight: 700 }}>
              Verdict: {recommendation.verdict}
            </span>
          </div>
          <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "28px" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "bold" }}>12M Price Target</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, marginTop: "2px" }}>
                {formatVal(recommendation.targetPriceRange?.low)} - {formatVal(recommendation.targetPriceRange?.high)}
              </div>
            </div>
            {financials?.currentPrice && recommendation.targetPriceRange?.low && (
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "bold" }}>Value Grade</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, marginTop: "2px", color: "var(--color-brand-light)" }}>
                  {valuationAnalysis?.verdict || (financials.currentPrice < recommendation.targetPriceRange.low ? "Undervalued" : "Overvalued")}
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "bold" }}>Horizon</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, marginTop: "2px" }}>5 Years</div>
            </div>
          </div>
        </div>
        <div className="verdict-confidence">
          <span className="verdict-confidence-label">Conviction Score</span>
          <span className={`verdict-confidence-value ${getConfClass(recommendation.confidenceScore)}`}>
            {recommendation.confidenceScore}%
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="tabs-header">
          <button className={`tab-btn ${activeTab === "thesis" ? "active" : ""}`} onClick={() => setActiveTab("thesis")}>
            Thesis & Valuation
          </button>
          <button className={`tab-btn ${activeTab === "moat" ? "active" : ""}`} onClick={() => setActiveTab("moat")}>
            Moat & Quality Scores
          </button>
          <button className={`tab-btn ${activeTab === "analysis" ? "active" : ""}`} onClick={() => setActiveTab("analysis")}>
            Fundamentals & Competitors
          </button>
          <button className={`tab-btn ${activeTab === "risks" ? "active" : ""}`} onClick={() => setActiveTab("risks")}>
            Risks & SWOT Chart
          </button>
          <button className={`tab-btn ${activeTab === "summary" ? "active" : ""}`} onClick={() => setActiveTab("summary")}>
            Executive Summary
          </button>
        </div>

        {/* Tab 1: Verdict & Thesis */}
        {activeTab === "thesis" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="thesis-container">
              <div className="thesis-col">
                <div className="thesis-header-row bull">
                  <TrendingUp size={18} />
                  <span>Bull Thesis (Reasons to Invest)</span>
                </div>
                <ul className="thesis-list">
                  {recommendation.bullThesis?.map((item, idx) => (
                    <li key={idx} className="thesis-list-item">
                      <span className="thesis-list-item-bullet bull">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                  {(!recommendation.bullThesis || recommendation.bullThesis.length === 0) && (
                    <li className="thesis-list-item">No core bull arguments listed.</li>
                  )}
                </ul>
              </div>
              <div className="thesis-col">
                <div className="thesis-header-row bear">
                  <AlertTriangle size={18} />
                  <span>Bear Thesis (Key Concerns)</span>
                </div>
                <ul className="thesis-list">
                  {recommendation.bearThesis?.map((item, idx) => (
                    <li key={idx} className="thesis-list-item">
                      <span className="thesis-list-item-bullet bear">✗</span>
                      <span>{item}</span>
                    </li>
                  ))}
                  {(!recommendation.bearThesis || recommendation.bearThesis.length === 0) && (
                    <li className="thesis-list-item">No core bear arguments listed.</li>
                  )}
                </ul>
              </div>
            </div>

            {valuationAnalysis && (
              <div className="report-section" style={{ background: "rgba(0,0,0,0.02)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.95rem", fontWeight: 800 }}>
                  <Coins size={16} color="var(--color-brand)" />
                  Valuation Diagnostics
                </h4>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "8px", lineHeight: 1.6 }}>
                  <strong>{valuationAnalysis.verdict}:</strong> {valuationAnalysis.reason}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Moat & Scores (NEW) */}
        {activeTab === "moat" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
            {/* Moat Section */}
            <div>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.1rem", marginBottom: "16px", fontWeight: 700 }}>
                <Scale size={18} />
                Economic Moat Ratings
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {[
                  { label: "Brand Advantage", val: moat?.brand || 4, comment: moat?.brandComment },
                  { label: "Technology Superiority", val: moat?.technology || 4, comment: moat?.technologyComment },
                  { label: "Network Effects", val: moat?.networkEffect || 3, comment: moat?.networkEffectComment },
                  { label: "Switching Costs", val: moat?.switchingCost || 3, comment: moat?.switchingCostComment },
                  { label: "Patents & IP Moat", val: moat?.patents || 4, comment: moat?.patentsComment },
                  { label: "Economies of Scale", val: moat?.economiesOfScale || 4, comment: moat?.economiesOfScaleComment },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{item.label}</span>
                      {renderStars(item.val)}
                    </div>
                    {item.comment && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.3 }}>{item.comment}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quality Scores breakdown */}
            <div>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.1rem", marginBottom: "16px", fontWeight: 700 }}>
                <Sparkles size={18} />
                Investment Scorecard
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Overall Score Circular Display */}
                <div style={{ display: "flex", alignItems: "center", gap: "20px", background: "rgba(243,140,18,0.06)", padding: "16px", borderRadius: "16px", border: "1px solid var(--border-glow)", marginBottom: "8px" }}>
                  <div style={{ width: "70px", height: "70px", borderRadius: "50%", border: "4px solid var(--color-brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "var(--bg-card)" }}>
                    <span style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--color-brand)" }}>{scores?.overall || 80}</span>
                  </div>
                  <div>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 800 }}>Overall Quality Grade</h4>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                      Weighted performance score derived from core financial metrics and competitive assets.
                    </p>
                  </div>
                </div>

                {[
                  { label: "Financial Health", score: scores?.financialHealth || 85 },
                  { label: "Growth Capitalization", score: scores?.growth || 80 },
                  { label: "Management Integrity", score: scores?.management || 82 },
                  { label: "Risk Mitigation", score: scores?.risk || 78 },
                  { label: "Valuation Safety", score: scores?.valuation || 70 },
                  { label: "Innovation Velocity", score: scores?.innovation || 85 },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700 }}>
                      <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                      <span>{item.score}/100</span>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "rgba(0,0,0,0.06)", borderRadius: "10px", overflow: "hidden" }}>
                      <div 
                        style={{ 
                          width: `${item.score}%`, 
                          height: "100%", 
                          background: item.score >= 80 ? "var(--color-success)" : item.score >= 60 ? "var(--color-brand)" : "var(--color-danger)",
                          borderRadius: "10px" 
                        }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Fundamental Analysis & Competitors */}
        {activeTab === "analysis" && analysis && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="report-section">
                <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={16} />
                  Financial Health & Solvency
                </h3>
                <p>{analysis.financialHealth}</p>
              </div>
              <div className="report-section">
                <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Scale size={16} />
                  Market Moat & Competitive Dynamics
                </h3>
                <p>{analysis.marketPosition}</p>
              </div>
              <div className="report-section">
                <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <TrendingUp size={16} />
                  Revenue Growth & Catalysts
                </h3>
                <p>{analysis.growthDrivers}</p>
              </div>
            </div>

            {/* Competitors Benchmarking Table */}
            {competitors && competitors.length > 0 && (
              <div className="report-section" style={{ marginTop: "12px" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "12px" }}>Competitor Comparison Matrix</h3>
                <div style={{ overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "12px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ background: "rgba(0,0,0,0.03)", borderBottom: "1px solid var(--border-color)" }}>
                        <th style={{ padding: "12px 16px", fontWeight: 700 }}>Company</th>
                        <th style={{ padding: "12px 16px", fontWeight: 700 }}>Market Cap</th>
                        <th style={{ padding: "12px 16px", fontWeight: 700 }}>P/E Ratio</th>
                        <th style={{ padding: "12px 16px", fontWeight: 700 }}>Operating Margin</th>
                        <th style={{ padding: "12px 16px", fontWeight: 700 }}>Revenue Growth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Current Company */}
                      <tr style={{ borderBottom: "1px solid var(--border-color)", fontWeight: "bold", background: "rgba(243,140,18,0.03)" }}>
                        <td style={{ padding: "12px 16px" }}>{ticker || "Subject"} (Target)</td>
                        <td style={{ padding: "12px 16px" }}>{financials?.marketCap ? (financials.marketCap >= 1e12 ? `${(financials.marketCap / 1e12).toFixed(1)}T` : `${(financials.marketCap / 1e9).toFixed(1)}B`) : "N/A"}</td>
                        <td style={{ padding: "12px 16px" }}>{financials?.peRatio?.toFixed(1) || "N/A"}</td>
                        <td style={{ padding: "12px 16px" }}>{financials?.operatingMargin ? `${(financials.operatingMargin * 100).toFixed(1)}%` : "N/A"}</td>
                        <td style={{ padding: "12px 16px" }}>{financials?.revenueGrowth ? `${(financials.revenueGrowth * 100).toFixed(1)}%` : "N/A"}</td>
                      </tr>
                      {/* Competitors */}
                      {competitors.map((comp, idx) => (
                        <tr key={idx} style={{ borderBottom: idx < competitors.length - 1 ? "1px solid var(--border-color)" : "none" }}>
                          <td style={{ padding: "12px 16px", fontWeight: 600 }}>{comp.symbol} - {comp.name}</td>
                          <td style={{ padding: "12px 16px" }}>{comp.marketCap || "N/A"}</td>
                          <td style={{ padding: "12px 16px" }}>{comp.peRatio || "N/A"}</td>
                          <td style={{ padding: "12px 16px" }}>{comp.margin || "N/A"}</td>
                          <td style={{ padding: "12px 16px" }}>{comp.growth || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Risks & SWOT Chart */}
        {activeTab === "risks" && risks && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="swot-grid">
              <div className="swot-card swot-s">
                <div className="swot-card-title" style={{ color: "var(--color-success)" }}>Strengths & Moats</div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {analysis?.marketPosition || "Robust market size, pricing leadership, and brand value advantages."}
                </p>
              </div>
              <div className="swot-card swot-w">
                <div className="swot-card-title" style={{ color: "var(--color-danger)" }}>Weaknesses & Bottlenecks</div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {risks.competitiveThreats || "High input costs, competitor pricing actions, or narrow cash yields."}
                </p>
              </div>
              <div className="swot-card swot-o">
                <div className="swot-card-title" style={{ color: "var(--color-brand-light)" }}>Opportunities & Expansion</div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {analysis?.growthDrivers || "Pivots to emerging sectors, technology catalysts, or overseas expansion."}
                </p>
              </div>
              <div className="swot-card swot-t">
                <div className="swot-card-title" style={{ color: "var(--color-warning)" }}>Threats & Headwinds</div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {risks.macroFactors || "Geopolitical friction, regulatory controls, supply blocks, or inflation in 2026."}
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "28px", alignItems: "center", marginTop: "12px" }}>
              <div className="report-section">
                <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <Shield size={16} />
                  Risk Vector Diagnostics
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <h4 style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 700 }}>Competitor Threats</h4>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "2px" }}>{risks.competitiveThreats}</p>
                  </div>
                  <div>
                    <h4 style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 700 }}>Macroeconomic Variables (2026 Context)</h4>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "2px" }}>{risks.macroFactors}</p>
                  </div>
                  <div>
                    <h4 style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 700 }}>Compliance & Legal Exposure</h4>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "2px" }}>{risks.regulatoryRisks}</p>
                  </div>
                </div>
              </div>

              {/* Recharts Radar risk visualization */}
              <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(0,0,0,0.01)", padding: "16px", height: "260px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>Risk Radar Exposure Map</span>
                <div style={{ width: "100%", height: "200px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={riskChartData}>
                      <PolarGrid stroke="var(--border-color)" />
                      <PolarAngleAxis dataKey="subject" stroke="var(--text-secondary)" fontSize={10} fontWeight={600} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="none" tick={false} />
                      <Radar 
                        name="Risk" 
                        dataKey="value" 
                        stroke="var(--color-danger)" 
                        fill="var(--color-danger)" 
                        fillOpacity={0.2} 
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Executive Summary */}
        {activeTab === "summary" && (
          <div className="report-section">
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <BookOpen size={16} />
              Investment Committee Memorandum
            </h3>
            <p style={{ whiteSpace: "pre-wrap", color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.8, marginTop: "12px" }}>
              {recommendation.executiveSummary}
            </p>
          </div>
        )}
      </div>

      {/* Export Options Panel (NEW) */}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>Export & Sharing Portal</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Download copy of complete memorandum or share with peers</span>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn btn-secondary" onClick={handleCopyReport} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {copiedReport ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
            {copiedReport ? "Summary Copied!" : "Copy Summary"}
          </button>
          <button className="btn btn-secondary" onClick={handleShareLink} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {copiedLink ? <Check size={14} color="var(--color-success)" /> : <Share2 size={14} />}
            {copiedLink ? "Link Copied!" : "Share Link"}
          </button>
          <button className="btn" onClick={handleExportText} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Download size={14} />
            Download Full Report
          </button>
        </div>
      </div>

      {/* AI Interactive Chat (NEW) */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px", minHeight: "350px" }}>
        <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <MessageSquare size={18} color="var(--color-brand)" />
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Chat with {ticker} Investment Assistant</h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Ask questions about growth, risk metrics, or competitor comparisons.</p>
          </div>
        </div>

        {/* Chat message display area */}
        <div style={{ flexGrow: 1, maxHeight: "250px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", padding: "12px", background: "rgba(0,0,0,0.01)", borderRadius: "8px" }}>
          {chatMessages.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", margin: "auto", padding: "20px" }}>
              👋 Ask a follow-up question. Try: <em>"What are the core technology risks?"</em> or <em>"Explain why you decided to {recommendation.decision}"</em>.
            </div>
          )}
          {chatMessages.map((msg, idx) => (
            <div 
              key={idx} 
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                background: msg.role === "user" ? "var(--color-brand-glow)" : "var(--bg-card)",
                border: msg.role === "user" ? "1px solid var(--border-glow)" : "1px solid var(--border-color)",
                color: "var(--text-primary)",
                borderRadius: msg.role === "user" ? "12px 12px 0 12px" : "12px 12px 12px 0",
                padding: "10px 14px",
                maxWidth: "80%",
                fontSize: "0.85rem",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                boxShadow: "0 2px 5px rgba(0,0,0,0.01)"
              }}
            >
              <strong>{msg.role === "user" ? "You" : `${ticker} Assistant`}:</strong>
              <div style={{ marginTop: "4px" }}>{msg.content}</div>
            </div>
          ))}
          {chatLoading && (
            <div style={{
              alignSelf: "flex-start",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px 12px 12px 0",
              padding: "10px 14px",
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <Loader2 size={12} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
              <span>Analyzing context...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input box */}
        <form onSubmit={handleSendChat} style={{ display: "flex", gap: "8px" }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder={`Ask about ${companyName || ticker}...`}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={chatLoading}
            style={{ flexGrow: 1 }}
          />
          <button type="submit" className="btn" disabled={chatLoading || !chatInput.trim()} style={{ padding: "0 16px" }}>
            <Send size={14} />
          </button>
        </form>
      </div>

      {/* News Links Card */}
      {news && news.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: "1.05rem", marginBottom: "16px", fontWeight: 700 }}>Gathered Research References</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {news.map((item, idx) => (
              <div key={idx} style={{ paddingBottom: "12px", borderBottom: idx < news.length - 1 ? "1px solid var(--border-color)" : "none" }}>
                <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: "0.95rem", display: "block" }}>
                  {item.title}
                </a>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px", lineHeight: 1.4 }}>{item.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
