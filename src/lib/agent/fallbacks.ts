import { AnalysisSection, RiskSection, MoatMetrics, CompetitorComparison, InvestmentScores, ValuationAnalysis, Recommendation } from "./state";

export const FALLBACK_ANALYSIS: Record<string, AnalysisSection> = {
  nvda: {
    financialHealth: "NVIDIA exhibits exceptional financial health, with operating margins exceeding 60% and return on equity (ROE) above 100%. Debt levels are negligible, and cash flow generation is outstanding, yielding a very high liquidity cover.",
    marketPosition: "Undisputed leader in high-performance computing and artificial intelligence accelerators. The CUDA software platform creates a massive developer moat that makes competitor transitions difficult.",
    growthDrivers: "Continued cloud service provider capital expenditure on AI datacenters, the rollout of Blackwell architecture, and expansion into enterprise software and sovereign AI markets."
  },
  aapl: {
    financialHealth: "Apple boasts a fortress balance sheet with over $150 billion in cash and equivalents. Return on equity (ROE) is exceptionally high, driven by high-margin Services and strong hardware pricing power.",
    marketPosition: "Strong ecosystem lock-in with over 2 billion active iOS devices. High switching costs and premium brand value yield consistent margins and strong defensive positioning.",
    growthDrivers: "Generative AI upgrades (Apple Intelligence) driving iPhone replacement cycles, alongside services expansion across payment, subscription, and cloud vectors."
  },
  tsla: {
    financialHealth: "Tesla maintains a solid debt-free balance sheet with ample cash reserves. However, margins are currently pressured by global EV price wars and capital expenditure on AI computing clusters.",
    marketPosition: "Pioneer and market share leader in electric vehicles. Long-term position hinges on option value from full self-driving (FSD) autonomy, robotaxi fleet, and humanoid robotics.",
    growthDrivers: "Autonomy software subscription licensing, energy storage segment expansion (Megapacks), and cost improvements through next-generation vehicle platforms."
  },
  amzn: {
    financialHealth: "Amazon maintains highly robust cash generation channels. Operating margins are expanding due to regional fulfillment efficiencies in E-Commerce and high-margin AWS cloud service additions.",
    marketPosition: "Global market dominance in both digital E-Commerce and cloud hosting infrastructure (AWS). Powerful logistical moat and advertising platforms sustain steady consumer capture.",
    growthDrivers: "AWS enterprise capital spending cycles for generative AI clusters, localized logistics automation (robotics), and advertising segment expansion."
  },
  msft: {
    financialHealth: "Microsoft maintains a fortress balance sheet with massive operating cash flows from its Office and Azure franchises. Debt levels are well-managed and liquidity cover is highly secure.",
    marketPosition: "Pervasive enterprise moat. Azure has established a clear leadership position in enterprise cloud hosting and is the primary scaling partner for OpenAI systems.",
    growthDrivers: "Enterprise AI adoption via Microsoft Copilot integrations, Azure AI consumption scaling, and gaming division monetization following Activision acquisition."
  }
};

export const FALLBACK_RISKS: Record<string, RiskSection> = {
  nvda: {
    competitiveThreats: "Faces competition from AMD's MI300 series chips and internal custom ASIC designs from hyperscalers (Google TPU, AWS Trainium).",
    macroFactors: "Heavy reliance on TSMC for semiconductor fabrication and advanced packaging presents geopolitical supply chain risks.",
    regulatoryRisks: "Antitrust scrutiny in the US and Europe regarding GPU allocation policies, alongside strict export control restrictions to key global markets."
  },
  aapl: {
    competitiveThreats: "Increasing competitive pressures in key international markets like China, alongside slower initial AI execution compared to software rivals.",
    macroFactors: "Consumer spending cycles impact discretionary premium hardware purchases during economic slowdowns.",
    regulatoryRisks: "Ongoing legal and antitrust suits globally regarding the 30% App Store fee and ecosystem restrictions (anti-steering provisions)."
  },
  tsla: {
    competitiveThreats: "Intense price competition from Chinese EV manufacturers (e.g. BYD) and traditional auto giants transitioning to electric models.",
    macroFactors: "Higher interest rates making vehicle financing more expensive, directly depressing near-term consumer auto demand.",
    regulatoryRisks: "Regulatory investigations into Autopilot and FSD safety claims, alongside potential tariffs or geographic policy shifts."
  },
  amzn: {
    competitiveThreats: "Intense retail competition from discount platforms (Temu, Shein) and enterprise software rivalry in the cloud from Microsoft Azure.",
    macroFactors: "Consumer discretionary spending remains sensitive to persistent inflation and logistics fuel surcharges.",
    regulatoryRisks: "Antitrust litigation from the FTC and global commissions regarding E-Commerce marketplace policies and seller fee pricing structures."
  },
  msft: {
    competitiveThreats: "Faces aggressive cloud infrastructure competition from AWS and Google Cloud, alongside rapid AI models additions from competitors.",
    macroFactors: "Enterprise IT capital spending budgets are exposed to high interest rates and macroeconomic cycles.",
    regulatoryRisks: "Antitrust inspection over AI investment structures (e.g. OpenAI partnership) and bundling practices in European markets."
  }
};

export interface FallbackQuality {
  moat: MoatMetrics;
  competitors: CompetitorComparison[];
  scores: InvestmentScores;
  valuationAnalysis: ValuationAnalysis;
}

export const FALLBACK_QUALITY: Record<string, FallbackQuality> = {
  nvda: {
    moat: {
      brand: 5, brandComment: "Gold-standard brand in high-performance computing.",
      technology: 5, technologyComment: "Blackwell chipsets and market-standard hardware engineering.",
      networkEffect: 5, networkEffectComment: "CUDA developer network makes platform migration extremely costly.",
      switchingCost: 5, switchingCostComment: "Rebuilding GPU software stacks outside CUDA is prohibitive.",
      patents: 5, patentsComment: "Thousands of high-value microarchitecture and layout patents.",
      economiesOfScale: 5, economiesOfScaleComment: "TSMC allocation dominance provides volume cost advantages."
    },
    competitors: [
      { symbol: "AMD", name: "Advanced Micro Devices", peRatio: "45.2", margin: "18.5%", growth: "12.0%", marketCap: "280B" },
      { symbol: "INTC", name: "Intel Corp.", peRatio: "18.4", margin: "5.2%", growth: "-2.5%", marketCap: "92B" }
    ],
    scores: {
      financialHealth: 92, growth: 95, management: 90, risk: 70, valuation: 60, innovation: 98, overall: 87
    },
    valuationAnalysis: {
      verdict: "Overvalued",
      reason: "Trading at historical forward multiples that require perfect growth execution to justify."
    }
  },
  aapl: {
    moat: {
      brand: 5, brandComment: "Preeminent luxury consumer technology brand with extreme customer loyalty.",
      technology: 4, technologyComment: "Proprietary Apple Silicon design yields strong hardware-software lock.",
      networkEffect: 5, networkEffectComment: "iOS ecosystem features (iMessage, iCloud) create a highly cohesive network.",
      switchingCost: 5, switchingCostComment: "High platform migration frictional barrier for users with multiple iOS devices.",
      patents: 5, patentsComment: "Fortress design and utility patents guarding user interface features.",
      economiesOfScale: 5, economiesOfScaleComment: "Massive hardware supply contract leverages lowest unit production cost."
    },
    competitors: [
      { symbol: "MSFT", name: "Microsoft Corp.", peRatio: "35.2", margin: "34.5%", growth: "14.0%", marketCap: "3.2T" },
      { symbol: "GOOGL", name: "Alphabet Inc.", peRatio: "24.5", margin: "25.8%", growth: "13.2%", marketCap: "2.1T" }
    ],
    scores: {
      financialHealth: 95, growth: 80, management: 92, risk: 85, valuation: 68, innovation: 90, overall: 86
    },
    valuationAnalysis: {
      verdict: "Fairly Valued",
      reason: "Premium valuation justified by consistent capital return program and services business high margin growth."
    }
  },
  tsla: {
    moat: {
      brand: 5, brandComment: "Global leader in clean energy and EV mindshare.",
      technology: 5, technologyComment: "Pioneering EV skateboard chassis, battery pack integrations, and FSD model training.",
      networkEffect: 4, networkEffectComment: "Supercharger network exclusivity and fleet learning telemetry scale daily.",
      switchingCost: 3, switchingCostComment: "Relatively low switching cost but brand ecosystem retention remains very high.",
      patents: 4, patentsComment: "Open-source patent pledge but proprietary manufacturing processes remain locked.",
      economiesOfScale: 5, economiesOfScaleComment: "Gigafactory vertical castings yield lowest per-unit vehicle assembly cost."
    },
    competitors: [
      { symbol: "BYDDY", name: "BYD Company Ltd.", peRatio: "19.5", margin: "6.2%", growth: "18.4%", marketCap: "98B" },
      { symbol: "LCID", name: "Lucid Group", peRatio: "N/A", margin: "-120.5%", growth: "5.5%", marketCap: "6B" }
    ],
    scores: {
      financialHealth: 88, growth: 82, management: 85, risk: 65, valuation: 55, innovation: 95, overall: 78
    },
    valuationAnalysis: {
      verdict: "Overvalued",
      reason: "Carries substantial AI and autonomy premiums relative to contemporary automotive sales slowdown."
    }
  },
  amzn: {
    moat: {
      brand: 5, brandComment: "Household synonym for online shopping convenience and AWS cloud computing.",
      technology: 4, technologyComment: "Advanced automated warehousing, route optimization algorithms, and AWS core stack.",
      networkEffect: 5, networkEffectComment: "Prime ecosystem attracts third-party merchants, expanding selection and drawing more users.",
      switchingCost: 4, switchingCostComment: "AWS enterprise migrations involve high database egress and reconfiguration fees.",
      patents: 4, patentsComment: "Broad array of server architecture, one-click ordering, and drone system patents.",
      economiesOfScale: 5, economiesOfScaleComment: "Regionally decentralized sorting networks yield massive logistics advantages."
    },
    competitors: [
      { symbol: "WMT", name: "Walmart Inc.", peRatio: "28.5", margin: "4.5%", growth: "5.2%", marketCap: "520B" },
      { symbol: "MSFT", name: "Microsoft Corp. (Azure)", peRatio: "35.2", margin: "34.5%", growth: "14.0%", marketCap: "3.2T" }
    ],
    scores: {
      financialHealth: 90, growth: 86, management: 88, risk: 80, valuation: 72, innovation: 92, overall: 85
    },
    valuationAnalysis: {
      verdict: "Fairly Valued",
      reason: "Trading in-line with cash flow expansion as retail efficiencies expand operating cash margins."
    }
  },
  msft: {
    moat: {
      brand: 5, brandComment: "Global standard in productivity software and enterprise IT infrastructure.",
      technology: 5, technologyComment: "Azure cloud architecture and early leadership in enterprise LLM tooling.",
      networkEffect: 5, networkEffectComment: "Office 365 and Windows platforms lock in millions of users globally.",
      switchingCost: 5, switchingCostComment: "High migration costs for enterprise IT departments using active AD and Azure nodes.",
      patents: 5, patentsComment: "Expansive enterprise software and operating systems patent library.",
      economiesOfScale: 5, economiesOfScaleComment: "Hyperscale datacenter footprints lower computing and infrastructure costs."
    },
    competitors: [
      { symbol: "AMZN", name: "Amazon.com (AWS)", peRatio: "40.5", margin: "14.8%", growth: "11.2%", marketCap: "1.9T" },
      { symbol: "GOOGL", name: "Alphabet Inc.", peRatio: "24.5", margin: "25.8%", growth: "13.2%", marketCap: "2.1T" }
    ],
    scores: {
      financialHealth: 94, growth: 88, management: 90, risk: 80, valuation: 70, innovation: 92, overall: 88
    },
    valuationAnalysis: {
      verdict: "Fairly Valued",
      reason: "Trading at historical averages considering its high margin profile and Azure AI expansion metrics."
    }
  }
};

export const FALLBACK_DECISION: Record<string, Omit<Recommendation, "decision" | "verdict" | "confidenceScore" | "targetPriceRange" | "executiveSummary"> & {
  verdict: string;
  decision: "INVEST" | "PASS";
  confidenceScore: number;
  lowMultiplier: number;
  highMultiplier: number;
  executiveSummary: string;
}> = {
  nvda: {
    verdict: "Strong Buy",
    decision: "INVEST",
    confidenceScore: 92,
    lowMultiplier: 0.95,
    highMultiplier: 1.35,
    bullThesis: [
      "Undisputed AI hardware dominance with Blackwell GPU cycles accelerating.",
      "CUDA platform locks in software developers and prevents easy competitor migration.",
      "Extremely high operating margin (exceeding 60%) showcasing massive pricing power."
    ],
    bearThesis: [
      "High concentration of revenues among top cloud providers poses sudden demand shift risks.",
      "Reliance on third-party fabrication (TSMC) exposes manufacturing to geopolitical shocks.",
      "Premium valuation metrics require continuous triple-digit growth to justify."
    ],
    executiveSummary: "NVIDIA Corp. remains the absolute cornerstone of generative AI buildout. The Blackwell chip architecture is facing record-breaking pre-orders, and its CUDA software suite solidifies a multi-year lead. While customer concentration and premium valuation are noted risks, the fundamental growth profile is unmatched in the tech sector. Recommend a Strong Buy/Invest conviction."
  },
  aapl: {
    verdict: "Buy",
    decision: "INVEST",
    confidenceScore: 82,
    lowMultiplier: 0.9,
    highMultiplier: 1.25,
    bullThesis: [
      "Fortress cash flows and ecosystem retention lock in over 2 billion active iOS devices.",
      "Apple Intelligence serves as a major multi-year upgrade cycle driver for hardware.",
      "High-margin Services division continues robust double-digit growth trajectory."
    ],
    bearThesis: [
      "Increasing market share pressure in international regions and regulatory headwinds in the EU.",
      "Antitrust suits targeting App Store monetization policy represent structural revenue risks.",
      "High valuation multiple relative to modest near-term hardware revenue growth."
    ],
    executiveSummary: "Apple Inc. presents a highly defensive investment thesis with ecosystem stickiness. The integration of generative AI features directly into the core operating system is expected to ignite a long-awaited device refresh cycle. Supported by strong capital returns (buybacks), we issue a Buy/Invest conviction."
  },
  tsla: {
    verdict: "Hold",
    decision: "PASS",
    confidenceScore: 55,
    lowMultiplier: 0.8,
    highMultiplier: 1.2,
    bullThesis: [
      "Industry leader in EV manufacturing scale, cost margins, and energy storage.",
      "Massive long-term option value from FSD autonomy, robotaxis, and humanoid robotics.",
      "Extremely loyal customer brand base and extensive global Supercharger network."
    ],
    bearThesis: [
      "Slowing global EV adoption and aggressive pricing wars from lower-cost Chinese competitors.",
      "Near-term automotive gross margins remain pressured and unit deliveries are flat.",
      "Regulatory reviews of autopilot safety systems present downside legal risks."
    ],
    executiveSummary: "Tesla Inc. is currently transitioning between its EV automotive growth wave and its future AI/robotics autonomy wave. While autonomy provides massive upside potential, automotive earnings are facing headwinds from global EV price wars. We suggest a Hold/Pass stance until profitability margins bottom out."
  },
  amzn: {
    verdict: "Buy",
    decision: "INVEST",
    confidenceScore: 85,
    lowMultiplier: 0.9,
    highMultiplier: 1.28,
    bullThesis: [
      "AWS high-margin cloud infrastructure is re-accelerating, supported by enterprise AI demand.",
      "Local logistics regionalization and warehouse robotics are driving E-Commerce retail margins to multi-year highs.",
      "High-margin advertising and prime subscription revenues provide extremely resilient income channels."
    ],
    bearThesis: [
      "Ongoing FTC antitrust legal challenges represent structural and compliance hurdles.",
      "Substantial ongoing capital expenditures are required to build next-generation data center clusters.",
      "Discretionary retail spend remains exposed to persistent macroinflation cycles."
    ],
    executiveSummary: "Amazon.com Inc. represents a highly compelling growth narrative. The margin expansion in E-Commerce (retail logistics efficiency) and AWS cloud infrastructure acceleration create significant free cash flow. Despite legal risks and high data center spend, capital returns and cloud market share support our Buy/Invest conviction."
  },
  msft: {
    verdict: "Buy",
    decision: "INVEST",
    confidenceScore: 88,
    lowMultiplier: 0.9,
    highMultiplier: 1.22,
    bullThesis: [
      "Azure enterprise AI workloads are re-accelerating, driving robust cloud scaling.",
      "Copilot integration across Office suite boosts average revenue per user (ARPU).",
      "Fortress capital return program through continuous share buybacks and dividends."
    ],
    bearThesis: [
      "High capital expenditures are required to build next-generation data center capacity.",
      "Regulatory reviews of partnership structures could delay or restrict integration.",
      "Premium multiple relative to historic averages demands continuous growth execution."
    ],
    executiveSummary: "Microsoft Corp. represents a highly compelling growth profile with standard defensive cash positions. Azure's early adoption of OpenAI infrastructure provides a multi-year cloud workload acceleration vector. Backed by solid balance sheets, we issue a Buy/Invest conviction."
  }
};
