"use client";
import React from "react";
import { Check, Loader2 } from "lucide-react";

interface GraphVisualizerProps {
  currentNode: string;
}

const NODES = [
  { id: "resolveTicker", label: "Resolve Ticker" },
  { id: "fetchFinancials", label: "Fetch Financials" },
  { id: "searchNews", label: "Search News" },
  { id: "analyzeFundamentals", label: "Analyze Fundamentals" },
  { id: "assessRisks", label: "Assess Risks" },
  { id: "synthesizeDecision", label: "Decide & Synthesize" },
];

export default function GraphVisualizer({ currentNode }: GraphVisualizerProps) {
  // Index of current executing node
  const currentIndex = currentNode === "done" ? NODES.length : NODES.findIndex((n) => n.id === currentNode);

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>LangGraph Execution Pipeline</h3>
      <div className="graph-container">
        {NODES.map((node, index) => {
          const isActive = node.id === currentNode;
          const isCompleted = index < currentIndex;

          return (
            <React.Fragment key={node.id}>
              <div className={`graph-node ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}>
                <div className="graph-node-circle">
                  {isCompleted ? (
                    <Check size={16} strokeWidth={3} />
                  ) : isActive ? (
                    <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="graph-node-label">{node.label}</span>
              </div>
              {index < NODES.length - 1 && (
                <div className={`graph-edge-line ${isCompleted ? "completed" : ""}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
