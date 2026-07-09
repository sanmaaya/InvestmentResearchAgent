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
  Briefcase,
  Search,
  ChevronDown,
  ArrowLeft,
  Globe,
  Star,
  FileText
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

  // Redesigned landing page helper states
  const [activeTab, setActiveTab] = useState<"equities" | "crypto" | "swot">("equities");
  const [filterAsset, setFilterAsset] = useState("Equities");
  const [filterModel, setFilterModel] = useState("gemini");
  const [filterSource, setFilterSource] = useState("tavily");
  const [filterConviction, setFilterConviction] = useState("high");

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
  const triggerResearch = async (e?: React.FormEvent, overrideCompany?: string) => {
    if (e) e.preventDefault();
    const targetCompany = overrideCompany || companyInput;
    if (!targetCompany.trim()) return;

    if (overrideCompany) {
      setCompanyInput(overrideCompany);
    }

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
          companyName: targetCompany,
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
    const handleLandingSearch = (e: React.FormEvent) => {
      e.preventDefault();
      let target = companyInput.trim();
      if (!target) {
        // Defaults based on active tab
        if (activeTab === "equities") target = "NVIDIA";
        else if (activeTab === "crypto") target = "Tesla";
        else target = "Apple";
        setCompanyInput(target);
      }
      setView("console");
      triggerResearch(undefined, target);
    };

    const handleFilterSearch = (e: React.FormEvent) => {
      e.preventDefault();
      let target = companyInput.trim();
      if (!target) {
        target = "Apple";
        setCompanyInput("Apple");
      }
      setView("console");
      triggerResearch(undefined, target);
    };

    return (
      <div className="landing-theme">
        <div className="l-container">
          
          {/* Header */}
          <header className="l-header">
            <a href="#" className="l-logo" onClick={(e) => e.preventDefault()}>
              <div className="l-logo-icon">U</div>
              UIXSHUVO
            </a>
            
            <ul className="l-nav-links">
              <li><a href="#" className="l-nav-link" onClick={(e) => e.preventDefault()}>Buy</a></li>
              <li><a href="#" className="l-nav-link" onClick={(e) => e.preventDefault()}>Rent</a></li>
              <li><a href="#" className="l-nav-link" onClick={(e) => e.preventDefault()}>Sell</a></li>
              <li><a href="#" className="l-nav-link" onClick={(e) => e.preventDefault()}>Find Agent</a></li>
            </ul>
            
            <ul className="l-nav-actions">
              <li><a href="#" className="l-nav-link" onClick={(e) => e.preventDefault()}>Add Property</a></li>
              <li><a href="#" className="l-nav-link" onClick={(e) => e.preventDefault()}>About Us</a></li>
              <li>
                <button className="l-nav-btn l-join-btn" onClick={() => setView("console")}>
                  Join
                </button>
              </li>
            </ul>
          </header>

          {/* Hero Section */}
          <section className="l-hero">
            <div className="l-hero-left">
              <h1 className="l-hero-heading">
                Connecting you <br />
                <span className="muted-text">to the </span> <span className="muted-text">home </span> <br />
                you love
              </h1>
              
              {/* Hero Tabs */}
              <div className="l-hero-tabs">
                <button 
                  className={`l-hero-tab ${activeTab === "equities" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("equities");
                  }}
                >
                  Buy
                </button>
                <button 
                  className={`l-hero-tab ${activeTab === "crypto" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("crypto");
                  }}
                >
                  Rent
                </button>
                <button 
                  className={`l-hero-tab ${activeTab === "swot" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("swot");
                  }}
                >
                  Sell
                </button>
              </div>

              {/* Hero Search Input Form */}
              <form onSubmit={handleLandingSearch} className="l-hero-search">
                <input 
                  type="text" 
                  placeholder="Address, School, City or Market"
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                />
                <button type="submit" className="l-search-btn-circle" title="Search">
                  <Search size={18} />
                </button>
              </form>

              {/* Quote / Testimonial */}
              <div className="l-hero-quote">
                <p className="l-quote-text">
                  "Turning your dreams into reality, one home at a time. Let us guide you to your perfect place."
                </p>
              </div>
            </div>

            {/* Hero Right Side - Beautiful Dashboard mockup */}
            <div className="l-hero-right">
              <div className="l-stock-display">
                <div className="l-stock-glow" />
                <div className="l-stock-header">
                  <div className="l-stock-meta">
                    <span className="l-stock-label">Interactive Diligence</span>
                    <span className="l-stock-title">AI Pipeline Activity</span>
                  </div>
                  <div className="l-stock-badge-live">
                    <span className="l-stock-pulse" />
                    LIVE TELEMETRY
                  </div>
                </div>

                <div className="l-chart-area">
                  <svg className="l-chart-svg" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f38c12" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#f38c12" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    
                    {/* Grid Lines */}
                    <line x1="0" y1="30" x2="400" y2="30" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="70" x2="400" y2="70" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="110" x2="400" y2="110" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="150" x2="400" y2="150" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    
                    {/* Area under curve */}
                    <path d="M 0 140 Q 50 130 80 110 T 150 90 T 220 100 T 280 60 T 350 40 T 400 20 L 400 180 L 0 180 Z" fill="url(#chartGradient)" />
                    
                    {/* Curve */}
                    <path d="M 0 140 Q 50 130 80 110 T 150 90 T 220 100 T 280 60 T 350 40 T 400 20" stroke="#f38c12" strokeWidth="3" strokeLinecap="round" />
                    
                    {/* Pulse Dot */}
                    <circle cx="400" cy="20" r="6" fill="#f38c12" />
                    <circle cx="400" cy="20" r="12" fill="none" stroke="#f38c12" strokeWidth="2" opacity="0.5">
                      <animate attributeName="r" values="6;16;6" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                    </circle>
                  </svg>
                </div>

                {/* Floating Tags */}
                <div className="l-floating-tag l-tag-1">
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>MODEL ACCURACY</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: '850', color: '#10b981' }}>98.4%</span>
                </div>
                
                <div className="l-floating-tag l-tag-2">
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>SENTIMENT</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: '850', color: '#38bdf8' }}>+88% BULL</span>
                </div>
              </div>

              {/* Overlapping Bismillah House Card (matches screenshot) */}
              <div className="l-stock-card">
                <span className="l-sc-title">Bismillah House</span>
                <p className="l-sc-desc">Contemporary home featuring exceptional interior design.</p>
                <div className="l-sc-footer">
                  <span className="l-sc-price">USD 560,000</span>
                  <div className="l-sc-actions">
                    <button type="button" className="l-sc-arrow-prev" title="Back" onClick={() => setCompanyInput("Tesla")}>
                      <ArrowLeft size={14} />
                    </button>
                    <button type="button" className="l-sc-arrow-next" title="Run NVIDIA research" onClick={() => {
                      setCompanyInput("NVIDIA");
                      setView("console");
                      triggerResearch(undefined, "NVIDIA");
                    }}>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Trusted by Section */}
          <section className="l-trusted">
            <div className="l-trusted-left">
              <div className="l-trusted-left-inner">
                <h2 className="l-trusted-heading">
                  Trusted by <br />
                  <span className="muted-text">100 Million </span> <br />
                  buyers
                </h2>
                <p className="l-trusted-sub">
                  Only we connects you directly to the person that knows the most about a property for sale, the listing agent.
                </p>

                {/* Overlapping User Avatars */}
                <div className="l-avatar-group">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces" alt="Analyst 1" className="l-avatar" />
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces" alt="Analyst 2" className="l-avatar" />
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces" alt="Analyst 3" className="l-avatar" />
                  <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces" alt="Analyst 4" className="l-avatar" />
                </div>

                {/* Stats */}
                <div className="l-stats-row">
                  <div className="l-stat-item">
                    <span className="l-stat-val">100M</span>
                    <span className="l-stat-lbl">Happy buyers</span>
                  </div>
                  <div className="l-stat-item">
                    <span className="l-stat-val">40M</span>
                    <span className="l-stat-lbl">Client review</span>
                  </div>
                  <div className="l-stat-item">
                    <span className="l-stat-val">4.6</span>
                    <span className="l-stat-lbl">Positive Rating</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: 3 cards matching screenshot */}
            <div className="l-trusted-right">
              <div className="l-feature-card" onClick={() => {
                setCompanyInput("Apple");
                setView("console");
                triggerResearch(undefined, "Apple");
              }} style={{ cursor: 'pointer' }}>
                <div className="l-feat-icon-circle">
                  <Globe size={20} />
                </div>
                <div className="l-feat-info">
                  <span className="l-feat-title">Explore great neighborhoods</span>
                  <p className="l-feat-desc">
                    Explore video tours, in-depth research, and articles on 20.000 neighborhoods.
                  </p>
                </div>
                <div className="l-feat-arrow">
                  <ArrowRight size={16} />
                </div>
              </div>

              <div className="l-feature-card" onClick={() => {
                setCompanyInput("NVIDIA");
                setView("console");
                triggerResearch(undefined, "NVIDIA");
              }} style={{ cursor: 'pointer' }}>
                <div className="l-feat-icon-circle">
                  <Star size={20} />
                </div>
                <div className="l-feat-info">
                  <span className="l-feat-title">Find highly rated best property</span>
                  <p className="l-feat-desc">
                    Find the very best schools with in-depth reviews and ratings from multiple experts.
                  </p>
                </div>
                <div className="l-feat-arrow">
                  <ArrowRight size={16} />
                </div>
              </div>

              <div className="l-feature-card" onClick={() => {
                setCompanyInput("Tesla");
                setView("console");
                triggerResearch(undefined, "Tesla");
              }} style={{ cursor: 'pointer' }}>
                <div className="l-feat-icon-circle">
                  <FileText size={20} />
                </div>
                <div className="l-feat-info">
                  <span className="l-feat-title">Discover condo quality buildings</span>
                  <p className="l-feat-desc">
                    Explore video tours, in-depth research, and articles on 20.000 neighborhoods.
                  </p>
                </div>
                <div className="l-feat-arrow">
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          </section>

          {/* Top Investment Picks Section */}
          <section className="l-picks-section" style={{ padding: "40px 0 60px 0", display: "flex", flexDirection: "column", gap: "28px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <h2 style={{ fontSize: "2.4rem", fontWeight: 850 }}>
                Top Investment <span className="muted-text">Picks</span>
              </h2>
              <p style={{ fontSize: "0.95rem", color: "var(--l-text-secondary)" }}>
                Curated high-conviction assets actively rated and monitored by the AI research agent
              </p>
            </div>

            <div className="l-picks-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
              {[
                { symbol: "NVDA", name: "NVIDIA Corp.", price: "$145.00", verdict: "Strong Buy", score: "92%", theme: "AI Hardware" },
                { symbol: "MSFT", name: "Microsoft Corp.", price: "$425.00", verdict: "Buy", score: "88%", theme: "Enterprise Cloud" },
                { symbol: "AAPL", name: "Apple Inc.", price: "$210.00", verdict: "Buy", score: "82%", theme: "Consumer Devices" },
                { symbol: "AMZN", name: "Amazon.com Inc.", price: "$185.00", verdict: "Buy", score: "85%", theme: "Retail & AWS" },
              ].map((pick) => (
                <div 
                  key={pick.symbol} 
                  className="l-pick-card"
                  onClick={() => {
                    setCompanyInput(pick.symbol);
                    setView("console");
                    triggerResearch(undefined, pick.symbol);
                  }}
                  style={{
                    background: "var(--l-card-white)",
                    border: "1px solid var(--l-border)",
                    borderRadius: "20px",
                    padding: "24px",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    boxShadow: "var(--l-shadow-soft)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "1.2rem", fontWeight: 800 }}>{pick.symbol}</span>
                      <span style={{ fontSize: "0.8rem", color: "var(--l-text-muted)" }}>{pick.name}</span>
                    </div>
                    <span 
                      style={{
                        padding: "4px 10px",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        background: "rgba(16, 185, 129, 0.08)",
                        color: "#10b981",
                        border: "1px solid rgba(16, 185, 129, 0.15)"
                      }}
                    >
                      {pick.verdict}
                    </span>
                  </div>

                  <div style={{ height: "1px", background: "rgba(0, 0, 0, 0.05)" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "0.65rem", color: "var(--l-text-muted)", fontWeight: "bold", textTransform: "uppercase" }}>Current Price</span>
                      <span style={{ fontSize: "1rem", fontWeight: 800 }}>{pick.price}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-end" }}>
                      <span style={{ fontSize: "0.65rem", color: "var(--l-text-muted)", fontWeight: "bold", textTransform: "uppercase" }}>Conviction</span>
                      <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--l-accent-orange)" }}>{pick.score}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--l-text-secondary)", fontWeight: "500", background: "rgba(0, 0, 0, 0.03)", padding: "4px 8px", borderRadius: "6px" }}>
                      {pick.theme}
                    </span>
                    <span className="l-pick-arrow" style={{ color: "var(--l-text-muted)", transition: "all 0.2s ease" }}>
                      <ArrowRight size={16} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Curved filter section at bottom */}
          <section className="l-filter-section">
            <h2 className="l-fs-heading">
              Find your <span className="muted-text">dream home</span>
            </h2>
            <p className="l-fs-sub">
              Connecting you with the perfect property for your loved ones
            </p>

            <form onSubmit={handleFilterSearch} className="l-filter-bar">
              {/* Col 1 */}
              <div className="l-filter-col">
                <span className="l-filter-col-label">Property</span>
                <div className="l-filter-select-wrapper">
                  <select 
                    className="l-filter-select"
                    value={filterAsset}
                    onChange={(e) => setFilterAsset(e.target.value)}
                  >
                    <option value="Equities">Stocks & Shares</option>
                    <option value="Crypto">Crypto Assets</option>
                    <option value="ETFs">ETFs & Funds</option>
                  </select>
                  <ChevronDown size={14} className="l-filter-chevron" />
                </div>
              </div>

              <div className="l-filter-divider" />

              {/* Col 2 */}
              <div className="l-filter-col">
                <span className="l-filter-col-label">Location</span>
                <div className="l-filter-select-wrapper">
                  <select 
                    className="l-filter-select"
                    value={filterModel}
                    onChange={(e) => {
                      setFilterModel(e.target.value);
                      setProvider(e.target.value as any);
                    }}
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI GPT</option>
                  </select>
                  <ChevronDown size={14} className="l-filter-chevron" />
                </div>
              </div>

              <div className="l-filter-divider" />

              {/* Col 3 */}
              <div className="l-filter-col">
                <span className="l-filter-col-label">Date</span>
                <div className="l-filter-select-wrapper">
                  <select 
                    className="l-filter-select"
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                  >
                    <option value="tavily">Tavily Engine</option>
                    <option value="duckduckgo">DuckDuckGo Scraper</option>
                  </select>
                  <ChevronDown size={14} className="l-filter-chevron" />
                </div>
              </div>

              <div className="l-filter-divider" />

              {/* Col 4 */}
              <div className="l-filter-col">
                <span className="l-filter-col-label">Price</span>
                <div className="l-filter-select-wrapper">
                  <select 
                    className="l-filter-select"
                    value={filterConviction}
                    onChange={(e) => setFilterConviction(e.target.value)}
                  >
                    <option value="high">High Conviction</option>
                    <option value="balanced">Balanced Risk</option>
                    <option value="growth">Aggressive Growth</option>
                  </select>
                  <ChevronDown size={14} className="l-filter-chevron" />
                </div>
              </div>

              {/* Action search button */}
              <button type="submit" className="l-search-btn-pill">
                <Search size={16} />
                Search
              </button>
            </form>
          </section>

          <footer className="landing-footer-new">
            <p>© 2026 UIXSHUVO AI Labs. All rights reserved. Developed for AI Product Design.</p>
          </footer>

        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-title-group" style={{ cursor: "pointer" }} onClick={() => setView("landing")}>
          <h1>Sanmaaya AI Labs</h1>
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
