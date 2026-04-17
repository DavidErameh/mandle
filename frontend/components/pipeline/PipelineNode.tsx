"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Inbox,
  Sparkles,
  Layers,
  Check,
  Clock,
  Loader2,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NodeDetail } from "./NodeDetail";

const STAGE_CONFIG = {
  ingestion: {
    title: "Ingestion",
    icon: Inbox,
    color: "text-zinc-300",
    bgColor: "bg-zinc-800/50",
    borderColor: "border-zinc-700",
    activeColor: "border-[#00BA7C] shadow-[0_0_10px_rgba(0,186,124,0.3)]",
    description: "Raw content sources",
  },
  extraction: {
    title: "Extraction",
    icon: Sparkles,
    color: "text-zinc-300",
    bgColor: "bg-zinc-800/50",
    borderColor: "border-zinc-700",
    activeColor: "border-[#00BA7C] shadow-[0_0_10px_rgba(0,186,124,0.3)]",
    description: "AI insights extraction",
  },
  generation: {
    title: "Generation",
    icon: Layers,
    color: "text-zinc-300",
    bgColor: "bg-zinc-800/50",
    borderColor: "border-zinc-700",
    activeColor: "border-[#00BA7C] shadow-[0_0_10px_rgba(0,186,124,0.3)]",
    description: "Draft variations",
  },
  review: {
    title: "Review",
    icon: Check,
    color: "text-zinc-300",
    bgColor: "bg-zinc-800/50",
    borderColor: "border-zinc-700",
    activeColor: "border-[#00BA7C] shadow-[0_0_10px_rgba(0,186,124,0.3)]",
    description: "Brand compliance",
  },
  queue: {
    title: "Queue",
    icon: Clock,
    color: "text-zinc-300",
    bgColor: "bg-zinc-800/50",
    borderColor: "border-zinc-700",
    activeColor: "border-[#00BA7C] shadow-[0_0_10px_rgba(0,186,124,0.3)]",
    description: "Scheduled posts",
  },
};

interface PipelineNodeProps {
  id: string;
  title: string;
  count: number;
  isExpanded: boolean;
  isActive: boolean;
  onToggle: () => void;
  onAction?: () => void;
}

export function PipelineNode({
  id,
  title,
  count,
  isExpanded,
  isActive,
  onToggle,
  onAction,
}: PipelineNodeProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const config =
    STAGE_CONFIG[id as keyof typeof STAGE_CONFIG] || STAGE_CONFIG.ingestion;
  const Icon = config.icon;

  useEffect(() => {
    if (isExpanded) {
      fetchItems();
    }
  }, [isExpanded, id]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_URL}/api/v1/pipeline/items?stage=${id}&limit=20`,
        {
          headers: {
            "X-API-Key": process.env.NEXT_PUBLIC_INTERNAL_API_KEY || "",
          },
        },
      );
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error(`Failed to fetch ${id} items:`, error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "relative flex-shrink-0 w-64 transition-all duration-300",
        config.bgColor,
        "border rounded-lg",
        isActive ? config.activeColor : config.borderColor,
      )}
    >
      {/* Node Header - Click to expand */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-zinc-700/30 rounded-t-lg transition-colors"
        onClick={onToggle}
      >
        <div
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center",
            config.bgColor,
            "border border-zinc-600",
          )}
        >
          <Icon className={cn("w-4 h-4", config.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">{config.title}</span>
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "text-lg font-bold font-mono",
                  count > 0 ? "text-white" : "text-zinc-600",
                )}
              >
                {count}
              </span>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              )}
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{config.description}</p>
        </div>
      </div>

      {/* Action Button */}
      {onAction && !isExpanded && (
        <div className="px-4 pb-3">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            className={cn(
              "w-full text-xs bg-zinc-700 hover:bg-zinc-600 text-white border-0",
            )}
          >
            <Play className="w-3 h-3 mr-1" />
            Run
          </Button>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-zinc-700">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              No items in this stage
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {items.map((item, idx) => (
                <NodeDetail
                  key={item.id || idx}
                  item={item}
                  stage={id}
                  onActionComplete={fetchItems}
                />
              ))}
            </div>
          )}

          {/* Close button */}
          <div className="p-2 border-t border-zinc-700">
            <button
              onClick={onToggle}
              className="w-full text-xs text-zinc-500 hover:text-white py-1 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}