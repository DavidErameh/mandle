"use client";

import { useState, useEffect, useCallback } from "react";
import { PipelineNode } from "./PipelineNode";
import { QuickImportModal } from "./QuickImportModal";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineStats {
  ingestion: number;
  extraction: number;
  generation: number;
  review: number;
  queue: number;
}

const STAGES = [
  { id: "ingestion", title: "Ingestion" },
  { id: "extraction", title: "Extraction" },
  { id: "generation", title: "Generation" },
  { id: "review", title: "Review" },
  { id: "queue", title: "Queue" },
] as const;

export function PipelineBoard() {
  const [stats, setStats] = useState<PipelineStats>({
    ingestion: 0,
    extraction: 0,
    generation: 0,
    review: 0,
    queue: 0,
  });
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/v1/pipeline/stats`, {
        headers: {
          "X-API-Key": process.env.NEXT_PUBLIC_INTERNAL_API_KEY || "",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch pipeline stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleNodeToggle = (nodeId: string) => {
    setExpandedNode(expandedNode === nodeId ? null : nodeId);
    setActiveNode(nodeId);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: '"Bambino New", sans-serif' }}
          >
            Pipeline
          </h1>
          <p className="text-sm text-zinc-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={loading}
            className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <RefreshCw
              className={cn("w-4 h-4 mr-2", loading && "animate-spin")}
            />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowImport(true)}
            className="bg-white text-black hover:bg-zinc-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      {/* Pipeline Canvas */}
      <div className="relative bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 overflow-x-auto">
        {/* SVG Wiring Layer */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <linearGradient id="wireGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#52525B" />
              <stop offset="50%" stopColor="#71717A" />
              <stop offset="100%" stopColor="#52525B" />
            </linearGradient>
            <linearGradient id="wireActiveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00BA7C" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#00BA7C" />
              <stop offset="100%" stopColor="#00BA7C" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Horizontal Wire Connections */}
          {STAGES.map((stage, idx) => {
            if (idx === STAGES.length - 1) return null;
            const nextStage = STAGES[idx + 1];
            const isActive =
              stats[stage.id as keyof PipelineStats] > 0 &&
              stats[nextStage.id as keyof PipelineStats] > 0;

            return (
              <line
                key={`wire-${idx}`}
                x1={`${((idx + 1) / STAGES.length) * 100}%`}
                y1="50%"
                x2={`${((idx + 2) / STAGES.length) * 100}%`}
                y2="50%"
                stroke={isActive ? "url(#wireActiveGradient)" : "url(#wireGradient)"}
                strokeWidth="2"
                strokeDasharray={isActive ? "0" : "8 4"}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>

        {/* Pipeline Nodes */}
        <div className="relative flex items-center justify-between gap-4 min-w-[800px]">
          {STAGES.map((stage) => (
            <PipelineNode
              key={stage.id}
              id={stage.id}
              title={stage.title}
              count={stats[stage.id as keyof PipelineStats] || 0}
              isExpanded={expandedNode === stage.id}
              isActive={activeNode === stage.id}
              onToggle={() => handleNodeToggle(stage.id)}
              onAction={
                stage.id === "ingestion" ? () => setShowImport(true) : undefined
              }
            />
          ))}
        </div>

        {/* Flow Direction Indicator */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 text-xs text-zinc-600">
          <Zap className="w-3 h-3" />
          <span>Data flows left → right</span>
        </div>
      </div>

      {/* Import Modal */}
      <QuickImportModal
        open={showImport}
        onOpenChange={setShowImport}
        onImportComplete={fetchStats}
      />
    </div>
  );
}