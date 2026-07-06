"use client";
import React, { useState } from "react";
import { TrendingUp, AlertTriangle, Scale, Shield, Sparkles, BookOpen } from "lucide-react";
import { Recommendation, AnalysisSection, RiskSection, NewsResult, FinancialMetrics } from "@/lib/agent/state";

interface ReportViewerProps {
  recommendation?: Recommendation;
  analysis?: AnalysisSection;
  risks?: RiskSection;
  news?: NewsResult[];
  financials?: FinancialMetrics;
}

export default function ReportViewer({ recommendation, analysis, risks, news, financials }: ReportViewerProps) {
  const [activeTab, setActiveTab] = useState<"thesis" | "analysis" | "risks" | "summary">("thesis");

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
    if (!val) return "N/A";
    const currency = financials?.currency || "$";
    return `${currency}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getConfClass = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 50) return "warning";
    return "danger";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Verdict Glowing Container */}
      <div className={`verdict-box ${isInvest ? "invest" : "pass"}`}>
        <div className="verdict-info">
          <div className="verdict-badge-container">
            <span className={`verdict-badge ${isInvest ? "invest-badge" : "pass-badge"}`}>
              {recommendation.decision}
            </span>
            <span style={{ fontSize: "0.95rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              Recommendation: {recommendation.verdict}
            </span>
          </div>
          <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "24px" }}>
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>12M Price Target</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, marginTop: "2px" }}>
                {formatVal(recommendation.targetPriceRange?.low)} - {formatVal(recommendation.targetPriceRange?.high)}
              </div>
            </div>
            {financials?.currentPrice && recommendation.targetPriceRange?.low && (
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>Current Value Deviation</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, marginTop: "2px", color: isInvest ? "var(--color-success)" : "var(--color-danger)" }}>
                  {financials.currentPrice < recommendation.targetPriceRange.low 
                    ? `Discounted (${((1 - financials.currentPrice / recommendation.targetPriceRange.low) * 100).toFixed(1)}%)`
                    : `Premium`
                  }
                </div>
              </div>
            )}
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
            Verdict & Thesis
          </button>
          <button className={`tab-btn ${activeTab === "analysis" ? "active" : ""}`} onClick={() => setActiveTab("analysis")}>
            Fundamental Analysis
          </button>
          <button className={`tab-btn ${activeTab === "risks" ? "active" : ""}`} onClick={() => setActiveTab("risks")}>
            Risks & SWOT
          </button>
          <button className={`tab-btn ${activeTab === "summary" ? "active" : ""}`} onClick={() => setActiveTab("summary")}>
            Executive Summary
          </button>
        </div>

        {/* Tab 1: Verdict & Thesis */}
        {activeTab === "thesis" && (
          <div className="thesis-container">
            <div className="thesis-col">
              <div className="thesis-header-row bull">
                <TrendingUp size={18} />
                <span>Bull Thesis (Key Drivers)</span>
              </div>
              <ul className="thesis-list">
                {recommendation.bullThesis?.map((item, idx) => (
                  <li key={idx} className="thesis-list-item">
                    <span className="thesis-list-item-bullet bull">▲</span>
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
                <span>Bear Thesis (Key Risks)</span>
              </div>
              <ul className="thesis-list">
                {recommendation.bearThesis?.map((item, idx) => (
                  <li key={idx} className="thesis-list-item">
                    <span className="thesis-list-item-bullet bear">▼</span>
                    <span>{item}</span>
                  </li>
                ))}
                {(!recommendation.bearThesis || recommendation.bearThesis.length === 0) && (
                  <li className="thesis-list-item">No core bear arguments listed.</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: Fundamental Analysis */}
        {activeTab === "analysis" && analysis && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
        )}

        {/* Tab 3: Risks & SWOT */}
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

            <div className="report-section" style={{ marginTop: "12px" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Shield size={16} />
                Risk Vector Diagnostics
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
                <div>
                  <h4 style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: 700 }}>Competitor Threats</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>{risks.competitiveThreats}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: 700 }}>Macroeconomic Variables (2026 Context)</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>{risks.macroFactors}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: 700 }}>Compliance & Legal Exposure</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>{risks.regulatoryRisks}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Executive Summary */}
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

      {/* News Links Card */}
      {news && news.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", fontWeight: 700 }}>Gathered Research References</h3>
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
