"use client";
import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { CompanyProfile, FinancialMetrics, ChartPoint } from "@/lib/agent/state";

interface FinancialDashboardProps {
  profile?: CompanyProfile;
  financials?: FinancialMetrics;
  chartData?: ChartPoint[];
}

export default function FinancialDashboard({ profile, financials, chartData }: FinancialDashboardProps) {
  if (!financials || !profile) return null;

  // Format big numbers (M, B, T)
  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return "N/A";
    const prefix = financials.currency === "USD" ? "$" : financials.currency + " ";
    if (num >= 1e12) return `${prefix}${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${prefix}${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${prefix}${(num / 1e6).toFixed(2)}M`;
    return prefix + num.toLocaleString();
  };

  const formatPercent = (val?: number) => {
    if (val === undefined || val === null) return "N/A";
    return `${(val * 100).toFixed(2)}%`;
  };

  // Determine styles for values
  const getPeClass = (pe?: number) => {
    if (!pe) return "";
    if (pe < 15) return "good";
    if (pe > 35) return "warn";
    return "";
  };

  const getDteClass = (dte?: number) => {
    if (dte === undefined) return "";
    if (dte < 60) return "good";
    if (dte > 150) return "bad";
    return "warn";
  };

  const getMarginClass = (margin?: number) => {
    if (margin === undefined) return "";
    if (margin > 0.20) return "good";
    if (margin < 0.05) return "bad";
    return "";
  };

  const getGrowthClass = (growth?: number) => {
    if (growth === undefined) return "";
    if (growth > 0.15) return "good";
    if (growth < 0) return "bad";
    return "";
  };

  const getRoeClass = (roe?: number) => {
    if (roe === undefined) return "";
    if (roe > 0.18) return "good";
    if (roe < 0.06) return "bad";
    return "";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Overview Card */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 800 }}>
              {profile.longName || "Company Profile"} {profile.symbol ? `(${profile.symbol})` : ""}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>
              {profile.sector || "N/A"} • {profile.industry || "N/A"} 
              {profile.city && profile.country ? ` • ${profile.city}, ${profile.country}` : ""}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {financials.currency || "$"} {financials.currentPrice?.toFixed(2) || "0.00"}
            </div>
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", display: "inline-block", marginTop: "4px" }}>
                Visit Corporate Site
              </a>
            )}
          </div>
        </div>
        {profile.summary && (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={profile.summary}>
            {profile.summary}
          </p>
        )}
      </div>

      {/* Charts Card */}
      {chartData && chartData.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", fontWeight: 700 }}>12-Month Performance Chart ({financials.currency || "USD"})</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", borderColor: "var(--border-color)", borderRadius: "8px" }}
                  labelStyle={{ color: "var(--text-secondary)", fontSize: 11 }}
                  itemStyle={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 700 }}
                />
                <Area type="monotone" dataKey="close" stroke="var(--color-brand)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPrice)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Market Capitalization</span>
          <span className="metric-value">{formatNumber(financials.marketCap)}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">P/E Ratio</span>
          <span className={`metric-value ${getPeClass(financials.peRatio)}`}>
            {financials.peRatio ? financials.peRatio.toFixed(2) : "N/A"}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Debt-To-Equity</span>
          <span className={`metric-value ${getDteClass(financials.debtToEquity)}`}>
            {financials.debtToEquity !== undefined ? `${financials.debtToEquity.toFixed(1)}%` : "N/A"}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Profit Margin</span>
          <span className={`metric-value ${getMarginClass(financials.profitMargin)}`}>
            {formatPercent(financials.profitMargin)}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Revenue Growth</span>
          <span className={`metric-value ${getGrowthClass(financials.revenueGrowth)}`}>
            {formatPercent(financials.revenueGrowth)}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Return on Equity (ROE)</span>
          <span className={`metric-value ${getRoeClass(financials.returnOnEquity)}`}>
            {formatPercent(financials.returnOnEquity)}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Liquidity (Current Ratio)</span>
          <span className="metric-value">
            {financials.currentRatio ? financials.currentRatio.toFixed(2) : "N/A"}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Free Cash Flow</span>
          <span className="metric-value">{formatNumber(financials.freeCashFlow)}</span>
        </div>
      </div>
    </div>
  );
}
