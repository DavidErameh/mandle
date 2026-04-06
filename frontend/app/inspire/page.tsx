"use client";

import { useState } from "react";
import { triggerGeneration } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ExtractedPoint {
  id: string;
  text: string;
  type: "idea" | "quote" | "data" | "story";
  relevanceScore: number;
  suggestedAngle: string;
  usedInGeneration: boolean;
  createdAt: number;
}

interface RawItem {
  id: string;
  sourceId: string;
  title: string;
  rawText: string;
  publishedAt: number;
  processed: boolean;
  extractedPoints?: ExtractedPoint[];
}

function ScoreBadge({ score }: { score: number }) {
  let colorClass = "bg-[#F4212E] text-white";
  if (score >= 7) colorClass = "bg-[#00BA7C] text-white";
  else if (score >= 5) colorClass = "bg-[#FFD400] text-[#0F0F0F]";
  return (
    <Badge
      className={cn("font-mono text-[13px] font-bold px-2 py-0.5", colorClass)}
    >
      {score}
    </Badge>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    idea: "bg-[#1D9BF0] text-white",
    quote: "bg-[#8B98A5] text-white",
    data: "bg-[#00BA7C] text-white",
    story: "bg-[#FFD400] text-[#0F0F0F]",
  };
  return (
    <Badge className={cn("text-xs px-2 py-0.5", colors[type])}>{type}</Badge>
  );
}

interface RawItemCardProps {
  item: RawItem;
  onGenerate: (pointId: string) => void;
}

function RawItemCard({ item, onGenerate }: RawItemCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card className="bg-[#16181C] border-[#FFFFFF1A] overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-[#1C1F26] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-white">{item.title}</h3>
            <p className="text-sm text-[#8B98A5] font-mono">
              {formatDate(item.publishedAt)} • {item.sourceId}
            </p>
          </div>
          <span className="text-[#8B98A5]">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && item.extractedPoints && item.extractedPoints.length > 0 && (
        <div className="border-t border-[#FFFFFF1A] p-4 space-y-4">
          <p className="text-sm font-medium text-[#8B98A5]">
            Extracted Points ({item.extractedPoints.length})
          </p>
          {item.extractedPoints.map((point) => (
            <div
              key={point.id}
              className="border border-[#FFFFFF1A] rounded-xl p-4 bg-[#1C1F26]"
            >
              <div className="flex items-center gap-2 mb-3">
                <TypeBadge type={point.type} />
                <ScoreBadge score={point.relevanceScore} />
                {point.usedInGeneration && (
                  <span className="text-xs text-[#00BA7C]">✓ Generated</span>
                )}
              </div>
              <p className="text-sm text-white mb-3">{point.text}</p>
              {point.suggestedAngle && (
                <p className="text-xs text-[#8B98A5] mb-3">
                  Angle: {point.suggestedAngle}
                </p>
              )}
              {!point.usedInGeneration && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerate(point.id);
                  }}
                  className="bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white rounded-full"
                >
                  Generate from this point
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {expanded &&
        (!item.extractedPoints || item.extractedPoints.length === 0) && (
          <div className="border-t border-[#FFFFFF1A] p-4">
            <p className="text-sm text-[#536471]">No extracted points</p>
          </div>
        )}
    </Card>
  );
}

export default function InspirePage() {
  const [items] = useState<RawItem[]>([]);
  const [filter, setFilter] = useState<"all" | "processed" | "unprocessed">(
    "all",
  );
  const [minScore, setMinScore] = useState(1);

  const handleGenerate = async (pointId: string) => {
    try {
      const result = await triggerGeneration(pointId);
      console.log("Generation triggered:", result);
    } catch (error) {
      console.error("Failed to trigger generation:", error);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filter === "processed") return item.processed;
    if (filter === "unprocessed") return !item.processed;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: '"Bambino New", sans-serif' }}
          >
            Inspiration Feed
          </h1>
          <p className="text-[#8B98A5]">Browse raw items and extracted points</p>
        </div>
        <Link
          href="/inspire/import"
          className="text-sm text-[#8B98A5] hover:text-white border border-[#FFFFFF1A] hover:bg-[#1C1F26] px-3 py-1.5 rounded-full transition-colors"
        >
          + Import content
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          {(["all", "processed", "unprocessed"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className={
                filter === f
                  ? "bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white rounded-full"
                  : "border-[#FFFFFF1A] text-[#8B98A5] hover:bg-[#1C1F26] hover:text-white"
              }
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[#8B98A5]">Min score:</label>
          <select
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="p-2 text-sm bg-[#16181C] border border-[#FFFFFF1A] rounded-lg text-white"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
              <option key={score} value={score}>
                {score}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <Card className="bg-[#16181C] border-[#FFFFFF1A] border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-[#8B98A5]">No raw items found</p>
            <p className="text-sm text-[#536471] mt-1">
              Ingested content will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <RawItemCard
              key={item.id}
              item={item}
              onGenerate={handleGenerate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
