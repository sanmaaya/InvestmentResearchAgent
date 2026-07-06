"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Settings, 
  History, 
  Trash2, 
  Terminal as TerminalIcon, 
  Loader2, 
  ArrowRight,
  TrendingUp, 
  CheckCircle,
  Briefcase
} from "lucide-react";
import GraphVisualizer from "@/components/GraphVisualizer";
import FinancialDashboard from "@/components/FinancialDashboard";
import ReportViewer from "@/components/ReportViewer";
import { CompanyProfile, FinancialMetrics, ChartPoint, NewsResult, AnalysisSection, RiskSection, Recommendation } from "@/lib/agent/state";

interface HistoryItem {
  id: string;
  companyName: string;
  ticker: string;
  date: string;
  decision: "INVEST" | "PASS";
  verdict: string;
  profile: CompanyProfile;
  financials: FinancialMetrics;
  chartData: ChartPoint[];
  news: NewsResult[];
  analysis: AnalysisSection;
  risks: RiskSection;
  recommendation: Recommendation;
}

export default function Home() {
  const [view, setView] = useState<"landing" | "console">("landing");

  // Input states
  const [companyInput, setCompanyInput] = useState("");
  const [provider, setProvider] = useState<"gemini" | "openai">("gemini");
  const [apiKey, setApiKey] = useState("");
  const [tavilyKey, setTavilyKey] = useState("");
  const [serpApiKey, setSerpApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // App running states
  const [loading, setLoading] = useState(false);
  const [currentNode, setCurrentNode] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Agent response states
  const [ticker, setTicker] = useState("");
  const [profile, setProfile] = useState<CompanyProfile | undefined>(undefined);
  const [financials, setFinancials] = useState<FinancialMetrics | undefined>(undefined);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [news, setNews] = useState<NewsResult[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisSection | undefined>(undefined);
  const [risks, setRisks] = useState<RiskSection | undefined>(undefined);
  const [recommendation, setRecommendation] = useState<Recommendation | undefined>(undefined);

  // History states
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Load configuration & history on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedProvider = localStorage.getItem("research_provider");
      if (savedProvider) setProvider(savedProvider as any);

      const savedApiKey = localStorage.getItem("research_api_key");
      if (savedApiKey) setApiKey(savedApiKey);

      const savedTavily = localStorage.getItem("research_tavily_key");
      if (savedTavily) setTavilyKey(savedTavily);

      const savedSerp = localStorage.getItem("research_serp_key");
      if (savedSerp) setSerpApiKey(savedSerp);

      const savedHistory = localStorage.getItem("research_history");
      if (savedHistory) {
        try {
          setHistoryList(JSON.parse(savedHistory));
        } catch (e) {
          console.error("Failed to parse history from localStorage", e);
        }
      }
    }
  }, []);

  // Save configuration on change
  useEffect(() => {
    localStorage.setItem("research_provider", provider);
  }, [provider]);

  useEffect(() => {
    localStorage.setItem("research_api_key", apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem("research_tavily_key", tavilyKey);
  }, [tavilyKey]);

  useEffect(() => {
    localStorage.setItem("research_serp_key", serpApiKey);
  }, [serpApiKey]);

  // Auto-scroll terminal logs to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Handle launching the Research Agent
  const triggerResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyInput.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setCurrentNode("resolveTicker");
    setLogs(["[system] Starting new research assignment..."]);
    setTicker("");
    setProfile(undefined);
    setFinancials(undefined);
    setChartData([]);
    setNews([]);
    setAnalysis(undefined);
    setRisks(undefined);
    setRecommendation(undefined);
    setActiveHistoryId(null);

    // Keep temporary references of states as they update
    let currentTicker = "";
    let currentProfile: CompanyProfile | undefined;
    let currentFinancials: FinancialMetrics | undefined;
    let currentChartData: ChartPoint[] = [];
    let currentNews: NewsResult[] = [];
    let currentAnalysis: AnalysisSection | undefined;
    let currentRisks: RiskSection | undefined;
    let currentRecommendation: Recommendation | undefined;

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName: companyInput,
          provider,
          apiKey: apiKey.trim(),
          tavilyKey: tavilyKey.trim(),
          serpApiKey: serpApiKey.trim(),
        }),
      });

      if (!response.ok) {
        let errorText = "Internal Server Error";
        try {
          const errData = await response.json();
          errorText = errData.error || errorText;
        } catch (_) {}
        throw new Error(errorText);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("API did not return a stream.");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // retain incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            switch (chunk.type) {
              case "log":
                setLogs((prev) => [...prev, chunk.data]);
                break;
              case "node":
                setCurrentNode(chunk.data);
                break;
              case "ticker":
                setTicker(chunk.data);
                currentTicker = chunk.data;
                break;
              case "profile":
                setProfile(chunk.data);
                currentProfile = chunk.data;
                break;
              case "financials":
                setFinancials(chunk.data);
                currentFinancials = chunk.data;
                break;
              case "chartData":
                setChartData(chunk.data);
                currentChartData = chunk.data;
                break;
              case "news":
                setNews(chunk.data);
                currentNews = chunk.data;
                break;
              case "analysis":
                setAnalysis(chunk.data);
                currentAnalysis = chunk.data;
                break;
              case "risks":
                setRisks(chunk.data);
                currentRisks = chunk.data;
                break;
              case "recommendation":
                setRecommendation(chunk.data);
                currentRecommendation = chunk.data;
                break;
              case "done":
                setLogs((prev) => [...prev, `[system] ${chunk.data}`]);
                setCurrentNode("done");

                // Save to history list if final decision is available
                if (currentRecommendation) {
                  const newHistoryItem: HistoryItem = {
                    id: Date.now().toString(),
                    companyName: companyInput,
                    ticker: currentTicker,
                    date: new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    decision: currentRecommendation.decision,
                    verdict: currentRecommendation.verdict,
                    profile: currentProfile || { symbol: currentTicker },
                    financials: currentFinancials || {},
                    chartData: currentChartData,
                    news: currentNews,
                    analysis: currentAnalysis || { financialHealth: "", marketPosition: "", growthDrivers: "" },
                    risks: currentRisks || { competitiveThreats: "", macroFactors: "", regulatoryRisks: "" },
                    recommendation: currentRecommendation,
                  };

                  setHistoryList((prev) => {
                    const updated = [newHistoryItem, ...prev];
                    localStorage.setItem("research_history", JSON.stringify(updated));
                    return updated;
                  });
                }
                break;
              case "error":
                throw new Error(chunk.data);
            }
          } catch (err) {
            console.error("Failed to parse stream line:", line, err);
          }
        }
      }
    } catch (err) {
      const msg = (err as Error).message;
      setErrorMsg(msg);
      setLogs((prev) => [...prev, `[system ERROR] ${msg}`]);
      setCurrentNode("");
    } finally {
      setLoading(false);
    }
  };

  // Load a report from saved history
  const loadHistoryItem = (item: HistoryItem) => {
    if (loading) return; // prevent interrupting active runs
    setActiveHistoryId(item.id);
    setCompanyInput(item.companyName);
    setTicker(item.ticker);
    setProfile(item.profile);
    setFinancials(item.financials);
    setChartData(item.chartData);
    setNews(item.news);
    setAnalysis(item.analysis);
    setRisks(item.risks);
    setRecommendation(item.recommendation);
    setCurrentNode("done");
    setLogs([`[system] Loaded cached research report for ${item.companyName} (${item.ticker}) from date ${item.date}.`]);
    setErrorMsg(null);
  };

  // Clear history
  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear your search history?")) {
      setHistoryList([]);
      localStorage.removeItem("research_history");
      if (activeHistoryId) {
        // clear current fields if they were loaded from history
        setActiveHistoryId(null);
        setTicker("");
        setProfile(undefined);
        setFinancials(undefined);
        setChartData([]);
        setNews([]);
        setAnalysis(undefined);
        setRisks(undefined);
        setRecommendation(undefined);
        setCurrentNode("");
        setLogs([]);
      }
    }
  };

  if (view === "landing") {
    return (
      <div className="app-container" style={{ paddingBottom: "0" }}>
        {/* Simple Header */}
        <header className="header" style={{ borderBottom: "none" }}>
          <div className="header-title-group">
            <h1 style={{ background: "linear-gradient(135deg, #fff 0%, var(--color-brand-light) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Altuni AI Labs</h1>
            <span className="header-subtitle">AI Investment Research Agent Node</span>
          </div>
          <button className="btn btn-secondary" onClick={() => setView("console")}>
            Enter Console
            <ArrowRight size={16} />
          </button>
        </header>

        {/* Hero */}
        <div className="landing-hero-container">
          <span className="landing-badge">V1.0 Autonomous Agentic Workflow</span>
          <h2 className="landing-title">Empower Your Portfolio with Agentic Intelligence</h2>
          <p className="landing-subtitle">
            Altuni AI Investment Research Agent leverages real-time financial statements, SWOT news sentiment analytics, and LangGraph DAG execution to deliver structured invest/pass decisions with deep reasoning in seconds.
          </p>
          <button className="btn landing-cta-btn" onClick={() => setView("console")}>
            Launch Research Console
            <ArrowRight size={18} />
          </button>

          {/* Visual Node Diagram */}
          <div className="landing-visual-panel">
            <div className="landing-visual-glow" />
            <div className="landing-visual-inner">
              <h3 style={{ fontSize: "1.05rem", color: "var(--text-secondary)", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                LangGraph Diligence Pipeline
              </h3>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", zIndex: 1, position: "relative" }}>
                {[
                  { title: "Resolve Ticker", desc: "Maps text query to symbol" },
                  { title: "Fetch Financials", desc: "Quotes, balance sheet ratios" },
                  { title: "Scrape News", desc: "Gathers articles & sentiments" },
                  { title: "Analyze Fundamentals", desc: "PE, solvency, leverage" },
                  { title: "Assess Risks", desc: "Competitive & macro SWOT" },
                  { title: "Decide & Synthesize", desc: "Invest/pass conviction verdict" }
                ].map((item, idx) => (
                  <div key={idx} style={{ flex: "1 1 120px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(99, 102, 241, 0.15)", border: "2px solid var(--color-brand)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", fontWeight: "bold", color: "#fff", fontSize: "0.85rem" }}>
                      {idx + 1}
                    </div>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>{item.title}</span>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textAlign: "center" }}>{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="landing-features-grid">
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <Briefcase size={20} />
              </div>
              <h4 className="landing-feature-title">Autonomous Diligence DAG</h4>
              <p className="landing-feature-desc">
                Organized as isolated execution nodes with state channels. Handles web searches, document fetching, and financial analysis in structured stages.
              </p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <TrendingUp size={20} />
              </div>
              <h4 className="landing-feature-title">Real Yahoo Finance Feeds</h4>
              <p className="landing-feature-desc">
                Pulls actual cash statements, operating margins, leverage percentages, and prices directly without requiring registration or paid API tokens.
              </p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <CheckCircle size={20} />
              </div>
              <h4 className="landing-feature-title">Dual Model Flexibility</h4>
              <p className="landing-feature-desc">
                Switch between Google Gemini and OpenAI models dynamically. Enter keys directly inside the client panel or fetch from workspace settings.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="landing-footer">
          <p>© 2026 Altuni AI Labs. All rights reserved. Developed for AI Product Development Assignment.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-title-group" style={{ cursor: "pointer" }} onClick={() => setView("landing")}>
          <h1>Altuni AI Labs</h1>
          <span className="header-subtitle">AI Investment Research Agent Node</span>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button 
            className={`btn btn-secondary ${showSettings ? "active" : ""}`}
            onClick={() => setShowSettings(!showSettings)}
            title="Configure API Keys"
          >
            <Settings size={18} />
            Settings
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="dashboard-grid">
        
        {/* Left Side: Controls & History */}
        <section className="sidebar">
          
          {/* Settings Card */}
          {showSettings && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px", animation: "fadeIn 0.2s ease" }}>
              <h3 style={{ fontSize: "1.05rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", fontWeight: 700 }}>
                API Configuration
              </h3>
              
              <div className="form-group">
                <label className="form-label">LLM Provider</label>
                <select 
                  className="form-select"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as any)}
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{provider === "gemini" ? "Gemini API Key" : "OpenAI API Key"}</label>
                <input 
                  type="password"
                  className="form-input"
                  placeholder={provider === "gemini" ? "AIzaSy..." : "sk-..."}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  If omitted, uses backend environment keys.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Tavily API Key (Optional)</label>
                <input 
                  type="password"
                  className="form-input"
                  placeholder="tvly-..."
                  value={tavilyKey}
                  onChange={(e) => setTavilyKey(e.target.value)}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Falls back to free DuckDuckGo scraper if empty.
                </span>
              </div>
            </div>
          )}

          {/* Console Launch Card */}
          <div className="card">
            <h3 style={{ fontSize: "1.05rem", marginBottom: "16px", fontWeight: 700 }}>Research Console</h3>
            <form onSubmit={triggerResearch} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="company-name">Target Company</label>
                <input 
                  id="company-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Apple, Tesla, Nvidia..."
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <button 
                type="submit" 
                className="btn"
                disabled={loading || !companyInput.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
                    Running Due Diligence...
                  </>
                ) : (
                  <>
                    <Play size={16} fill="white" />
                    Launch AI Research
                  </>
                )}
              </button>
            </form>
          </div>

          {/* History Card */}
          <div className="card" style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Research Vault</h3>
              {historyList.length > 0 && (
                <button 
                  className="btn btn-secondary" 
                  onClick={clearHistory}
                  style={{ padding: "6px 8px", borderRadius: "6px" }}
                  title="Clear Vault"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            
            {historyList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-muted)", fontSize: "0.85rem", border: "1px dashed var(--border-color)", borderRadius: "8px" }}>
                No past analysis runs saved.
              </div>
            ) : (
              <div className="history-list">
                {historyList.map((item) => (
                  <div 
                    key={item.id}
                    className={`history-item ${activeHistoryId === item.id ? "active" : ""}`}
                    onClick={() => loadHistoryItem(item)}
                    style={{
                      borderColor: activeHistoryId === item.id ? "var(--color-brand)" : "",
                      background: activeHistoryId === item.id ? "rgba(99, 102, 241, 0.1)" : ""
                    }}
                  >
                    <div className="history-item-info">
                      <span className="history-item-ticker">{item.ticker || item.companyName}</span>
                      <span className="history-item-name">{item.companyName}</span>
                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "4px" }}>{item.date}</span>
                    </div>
                    <span className={`history-verdict-badge ${item.decision === "INVEST" ? "invest" : "pass"}`}>
                      {item.decision}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Dashboard Views */}
        <section className="main-content">
          
          {/* Welcome view when empty and not loading */}
          {!currentNode && !recommendation && !loading && (
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 40px", textAlign: "center", gap: "24px", minHeight: "500px" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--color-brand-glow)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
                <Briefcase size={32} color="var(--color-brand-light)" />
              </div>
              <div>
                <h2 style={{ fontSize: "1.8rem", marginBottom: "8px", fontWeight: 800 }}>Welcome to the AI Investment Research Agent</h2>
                <p style={{ color: "var(--text-secondary)", maxWidth: "550px", margin: "0 auto", fontSize: "0.95rem" }}>
                  Provide a company name in the console to initiate our autonomous dual-model LangGraph diligence stream. The agent resolves the company symbol, pulls financial statements, scrapes recent market news, evaluates risk hedges, and compiles a comprehensive investment memo.
                </p>
              </div>
              <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                <div style={{ background: "rgba(30, 41, 59, 0.25)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "16px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <TrendingUp size={20} color="var(--color-success)" />
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>Yahoo Finance API</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Real financial metrics</span>
                </div>
                <div style={{ background: "rgba(30, 41, 59, 0.25)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "16px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <CheckCircle size={20} color="var(--color-brand-light)" />
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>LangGraph Agent</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Reasoning pipeline</span>
                </div>
              </div>
            </div>
          )}

          {/* Running State: Graph Visualizer */}
          {currentNode && (
            <GraphVisualizer currentNode={currentNode} />
          )}

          {/* Running State: Live Terminal Logs */}
          {(logs.length > 0 || errorMsg) && (
            <div className="card" style={{ padding: "16px" }}>
              <div className="terminal-header">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <TerminalIcon size={16} />
                  <span>Agent Execution Log Output</span>
                </div>
                {loading && (
                  <span style={{ color: "var(--color-brand-light)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Loader2 size={12} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
                    Streaming...
                  </span>
                )}
              </div>
              <div className="terminal">
                {logs.map((log, index) => (
                  <div key={index} className="terminal-log">
                    <span className="terminal-log-prefix">&gt; </span>
                    {log}
                  </div>
                ))}
                {errorMsg && (
                  <div className="terminal-log" style={{ color: "var(--color-danger)" }}>
                    <span className="terminal-log-prefix">&gt; </span>
                    [system ERROR] {errorMsg}
                  </div>
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>
          )}

          {/* Financials & Stock Charts */}
          {profile && financials && (
            <FinancialDashboard 
              profile={profile}
              financials={financials}
              chartData={chartData}
            />
          )}

          {/* Synthesis Verdict & Tabs */}
          {recommendation && (
            <ReportViewer
              recommendation={recommendation}
              analysis={analysis}
              risks={risks}
              news={news}
              financials={financials}
            />
          )}

        </section>
      </main>
    </div>
  );
}
