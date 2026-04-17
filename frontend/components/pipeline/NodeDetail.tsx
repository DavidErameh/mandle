"use client";

import { useState } from "react";
import {
  Play,
  Check,
  X,
  Clock,
  Sparkles,
  Layers,
  FileText,
  ExternalLink,
  ArrowRight,
  Star,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NodeDetailProps {
  item: any;
  stage: string;
  onActionComplete?: () => void;
}

export function NodeDetail({ item, stage, onActionComplete }: NodeDetailProps) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleAction = async (action: string) => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      let endpoint = "";
      let method = "POST";

      if (stage === "ingestion" && action === "extract") {
        endpoint = `/api/v1/pipeline/extract/${item.id}`;
      } else if (stage === "extraction" && action === "generate") {
        endpoint = `/api/v1/pipeline/generate/${item.id}`;
      } else if (stage === "generation" && action === "approve") {
        endpoint = `/api/v1/content/drafts/${item.id}/approve`;
      } else if (stage === "generation" && action === "reject") {
        endpoint = `/api/v1/content/drafts/${item.id}/reject`;
      }

      if (endpoint) {
        await fetch(endpoint, {
          method,
          headers: {
            "X-API-Key": process.env.NEXT_PUBLIC_INTERNAL_API_KEY || "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ scheduled_at: Date.now(), post_type: "feed" }),
        });
        onActionComplete?.();
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (stage === "ingestion") return item.title || item.externalId || "Untitled";
    if (stage === "extraction")
      return item.text?.substring(0, 60) + (item.text?.length > 60 ? "..." : "") || "Untitled point";
    if (stage === "generation" || stage === "review")
      return item.contentText?.substring(0, 60) + (item.contentText?.length > 60 ? "..." : "") || "Untitled draft";
    if (stage === "queue")
      return item.finalContent?.substring(0, 60) + (item.finalContent?.length > 60 ? "..." : "") || "Scheduled post";
    return "Unknown";
  };

  const getVideoId = () => {
    if (stage === "ingestion" && item.type === "youtube_video") {
      const match = item.externalId?.match(/yt:([a-zA-Z0-9_-]+)/)?.[1] 
        || item.externalId?.match(/v=([a-zA-Z0-9_-]+)/)?.[1]
        || item.title?.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1];
      return match;
    }
    return null;
  };

  const renderIngestionContent = () => {
    const videoId = getVideoId();
    const hasVideo = videoId && stage === "ingestion";

    return (
      <div className="space-y-3">
        {/* Thumbnail or Video Embed */}
        {videoId && (
          <div className="space-y-2">
            {!expanded ? (
              <div 
                className="relative aspect-video bg-zinc-900 rounded-md overflow-hidden cursor-pointer group"
                onClick={() => setExpanded(true)}
              >
                <img
                  src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-5 h-5 text-black ml-1" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video rounded-md overflow-hidden bg-black">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=0`}
                  title="YouTube video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  className="w-full h-full"
                />
              </div>
            )}
          </div>
        )}

        {/* Raw Text Preview */}
        <div className="bg-zinc-900/50 rounded-md p-2">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3 h-3 text-zinc-500" />
            <span className="text-xs text-zinc-500">Raw Content</span>
          </div>
          <p className="text-xs text-zinc-400 whitespace-pre-wrap line-clamp-4">
            {item.rawText?.substring(0, expanded ? 2000 : 300)}
            {(item.rawText?.length || 0) > (expanded ? 2000 : 300) && !expanded && "..."}
          </p>
          {(item.rawText?.length || 0) > 300 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-zinc-500 hover:text-white mt-2"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="px-2 py-0.5 bg-zinc-800 rounded">{item.type || "article"}</span>
          {item.sourceName && <span>{item.sourceName}</span>}
          {item.importedAt && (
            <span>{new Date(item.importedAt).toLocaleDateString()}</span>
          )}
        </div>

        {/* Action */}
        <div className="pt-2 border-t border-zinc-700">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleAction("extract");
            }}
            disabled={loading}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-white text-xs"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Extract Insights
          </Button>
        </div>
      </div>
    );
  };

  const renderExtractionContent = () => {
    return (
      <div className="space-y-3">
        {/* Source Context */}
        {item.rawItemTitle && (
          <div className="text-xs text-zinc-500">
            From: {item.rawItemTitle.substring(0, 50)}...
          </div>
        )}

        {/* Extracted Point */}
        <div className="bg-zinc-900/50 rounded-md p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500">Extracted Point</span>
            <div className="flex items-center gap-2">
              {item.relevanceScore && (
                <Badge className={cn(
                  "text-[10px] px-1.5 py-0",
                  item.relevanceScore >= 7 ? "bg-green-900/50 text-green-400" :
                  item.relevanceScore >= 5 ? "bg-yellow-900/50 text-yellow-400" :
                  "bg-red-900/50 text-red-400"
                )}>
                  Score: {item.relevanceScore}
                </Badge>
              )}
              {item.type && (
                <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">
                  {item.type}
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-white whitespace-pre-wrap">{item.text}</p>
        </div>

        {/* Suggested Angle */}
        {item.suggestedAngle && (
          <div className="flex items-start gap-2 text-xs">
            <Lightbulb className="w-3 h-3 text-yellow-500 mt-0.5" />
            <span className="text-zinc-400">{item.suggestedAngle}</span>
          </div>
        )}

        {/* Translation Path */}
        {item.translationPath && (
          <div className="flex items-start gap-2 text-xs">
            <ArrowRight className="w-3 h-3 text-zinc-500 mt-0.5" />
            <span className="text-zinc-500">{item.translationPath}</span>
          </div>
        )}

        {/* Action */}
        <div className="pt-2 border-t border-zinc-700">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleAction("generate");
            }}
            disabled={loading}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-white text-xs"
          >
            <Layers className="w-3 h-3 mr-1" />
            Generate Drafts
          </Button>
        </div>
      </div>
    );
  };

  const renderGenerationContent = () => {
    return (
      <div className="space-y-3">
        {/* Source Point */}
        {item.extractedPointText && (
          <div className="text-xs text-zinc-500">
            Based on: {item.extractedPointText.substring(0, 50)}...
          </div>
        )}

        {/* Draft Variation */}
        <div className="bg-zinc-900/50 rounded-md p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400">
                {item.variationNumber ? `v${item.variationNumber}` : "Draft"}
              </span>
              {item.hookUsed && (
                <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">
                  {item.hookUsed}
                </span>
              )}
              {item.formatUsed && (
                <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">
                  {item.formatUsed}
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-500">{item.charCount} chars</span>
          </div>
          <p className="text-sm text-white whitespace-pre-wrap">{item.contentText}</p>
        </div>

        {/* Review Score (if available) */}
        {item.brandScore !== undefined && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Star className={cn("w-3 h-3", item.brandScore >= 7 ? "text-green-400" : "text-zinc-500")} />
              <span className={item.brandScore >= 7 ? "text-green-400" : "text-zinc-500"}>
                {item.brandScore}/10
              </span>
            </div>
            {item.reviewerApproved !== undefined && (
              <Badge className={cn(
                "text-[10px] px-1.5 py-0",
                item.reviewerApproved ? "bg-green-900/50 text-green-400" : "bg-yellow-900/50 text-yellow-400"
              )}>
                {item.reviewerApproved ? "Approved" : "Pending"}
              </Badge>
            )}
          </div>
        )}

        {/* Rule Violations */}
        {item.ruleViolations && item.ruleViolations.length > 0 && (
          <div className="flex items-start gap-2 text-xs">
            <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5" />
            <span className="text-red-400">{item.ruleViolations.join(", ")}</span>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-zinc-700 flex gap-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleAction("approve");
            }}
            disabled={loading}
            className="flex-1 bg-green-800 hover:bg-green-700 text-green-100 text-xs"
          >
            <Check className="w-3 h-3 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleAction("reject");
            }}
            disabled={loading}
            className="flex-1 bg-red-900/50 hover:bg-red-800/50 text-red-200 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Reject
          </Button>
        </div>
      </div>
    );
  };

  const renderQueueContent = () => {
    return (
      <div className="space-y-3">
        {/* Full Post Content */}
        <div className="bg-zinc-900/50 rounded-md p-3">
          <p className="text-sm text-white whitespace-pre-wrap">{item.finalContent}</p>
        </div>

        {/* Schedule Info */}
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              {item.scheduledAt
                ? new Date(item.scheduledAt).toLocaleString()
                : "Not scheduled"}
            </span>
          </div>
          <Badge className={cn(
            "text-[10px] px-1.5 py-0",
            item.status === "posted" ? "bg-green-900/50 text-green-400" :
            item.status === "queued" ? "bg-blue-900/50 text-blue-400" :
            "bg-zinc-700 text-zinc-400"
          )}>
            {item.status || "queued"}
          </Badge>
        </div>

        {/* Media */}
        {item.mediaUrls && item.mediaUrls.length > 0 && (
          <div className="flex gap-2 overflow-x-auto py-2">
            {item.mediaUrls.map((url: string, idx: number) => (
              <img
                key={idx}
                src={url}
                alt=""
                className="h-16 w-auto rounded object-cover"
              />
            ))}
          </div>
        )}

        {/* Action */}
        <div className="pt-2 border-t border-zinc-700">
          <Button
            size="sm"
            variant="ghost"
            className="w-full text-zinc-400 hover:text-white text-xs"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            View on X
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="border-b border-zinc-700 last:border-b-0">
      <div
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-zinc-800/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-300 truncate">{getTitle()}</p>
            <span className="text-zinc-600 text-xs">{expanded ? "−" : "+"}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3">
          {stage === "ingestion" && renderIngestionContent()}
          {stage === "extraction" && renderExtractionContent()}
          {(stage === "generation" || stage === "review") && renderGenerationContent()}
          {stage === "queue" && renderQueueContent()}
        </div>
      )}
    </div>
  );
}