"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { XTextToggle } from "@/components/import/XTextToggle";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Loader2,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  FileText,
  Layers,
  Clock,
} from "lucide-react";

interface PreviewItem {
  url: string;
  title: string;
  type: "youtube_video" | "article" | "x_thread";
  thumbnail?: string;
}

interface ImportItemResult {
  input: string;
  status: "success" | "failed" | "duplicate";
  raw_item_id: string | null;
  title: string | null;
  type: "youtube_video" | "article" | "x_thread" | null;
  reason: string | null;
}

interface DraftPreview {
  variation_id: string;
  content_text: string;
  hook_used: string;
  format_used: string;
  char_count: number;
}

interface ImportResponse {
  results: ImportItemResult[];
  generated_drafts: DraftPreview[];
  success_count: number;
  failed_count: number;
  duplicate_count: number;
}

interface QuickImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

type FlowStage =
  | "preview"
  | "confirm"
  | "importing"
  | "extracting"
  | "generating"
  | "complete";

export function QuickImportModal({
  open,
  onOpenChange,
  onImportComplete,
}: QuickImportModalProps) {
  const [urlsText, setUrlsText] = useState("");
  const [xText, setXText] = useState("");
  const [note, setNote] = useState("");
  const [showXText, setShowXText] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flowStage, setFlowStage] = useState<FlowStage>("preview");
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [results, setResults] = useState<ImportResponse | null>(null);

  const parseUrls = () => {
    const urls = urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    const items: PreviewItem[] = urls.map((url) => {
      let type: PreviewItem["type"] = "article";
      let title = url;

      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        type = "youtube_video";
        const videoId = url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1];
        title = `YouTube Video ${videoId || ""}`;
      } else if (url.includes("twitter.com") || url.includes("x.com")) {
        type = "x_thread";
        title = "Twitter/X Thread";
      } else {
        try {
          const urlObj = new URL(url);
          title = urlObj.hostname + urlObj.pathname.split("/").pop();
        } catch {}
      }

      let thumbnail: string | undefined;
      if (type === "youtube_video") {
        const videoId = url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1];
        if (videoId) {
          thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        }
      }

      return { url, title: title.substring(0, 60), type, thumbnail };
    });
    return items;
  };

  const handlePreview = () => {
    const items = parseUrls();
    if (items.length > 0) {
      setPreviews(items);
      setFlowStage("confirm");
    }
  };

  const handleSubmit = async () => {
    const urls = urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    const xTextValue = xText.trim() || null;
    const noteValue = note.trim() || null;

    if (!urls.length && !xTextValue) return;

    setIsSubmitting(true);
    setFlowStage("importing");

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/v1/pipeline/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.NEXT_PUBLIC_INTERNAL_API_KEY || "",
        },
        body: JSON.stringify({
          urls,
          x_text: xTextValue,
          note: noteValue,
        }),
      });

      if (response.ok) {
        const data: ImportResponse = await response.json();
        setResults(data);

        // If we have successful imports, proceed through the flow
        if (data.success_count > 0) {
          setFlowStage("extracting");

          // Wait a bit for extraction to complete
          await new Promise((r) => setTimeout(r, 2000));
          setFlowStage("generating");

          // Wait for generation
          await new Promise((r) => setTimeout(r, 2000));
          setFlowStage("complete");
        } else {
          setFlowStage("complete");
        }

        onImportComplete?.();
      }
    } catch (error) {
      console.error("Import failed:", error);
      setFlowStage("complete");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setUrlsText("");
    setXText("");
    setNote("");
    setShowXText(false);
    setResults(null);
    setPreviews([]);
    setFlowStage("preview");
    onOpenChange(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "youtube_video":
        return "▶";
      case "x_thread":
        return "𝕏";
      default:
        return "📄";
    }
  };

  const hasInput = urlsText.trim() || xText.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#16181C] border-[#FFFFFF1A] max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Quick Import</DialogTitle>
        </DialogHeader>

        {flowStage === "preview" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-[#8B98A5] mb-1.5 block">
                URLs
              </label>
              <textarea
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
                placeholder={
                  "https://youtube.com/watch?v=...\nhttps://substack.com/..."
                }
                rows={4}
                className="w-full bg-[#0D0D0D] border border-[#FFFFFF1A] rounded-md p-3 text-sm text-white placeholder-[#536471] focus:border-[#1D9BF0] focus:outline-none resize-none font-mono"
              />
            </div>

            <XTextToggle
              show={showXText}
              onToggle={() => setShowXText(!showXText)}
              value={xText}
              onChange={setXText}
            />

            <div>
              <label className="text-xs uppercase tracking-wide text-[#8B98A5] mb-1.5 block">
                Optional note
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why you saved this"
                className="w-full bg-[#0D0D0D] border border-[#FFFFFF1A] rounded-md p-3 text-sm text-white placeholder-[#536471] focus:border-[#1D9BF0] focus:outline-none"
              />
            </div>

            <Button
              onClick={handlePreview}
              disabled={!hasInput}
              className="w-full bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white"
            >
              Preview
            </Button>
          </div>
        )}

        {flowStage === "confirm" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">Confirm Import</h3>
              <button
                onClick={() => setFlowStage("preview")}
                className="text-xs text-[#8B98A5] hover:text-white"
              >
                ← Edit
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {previews.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-[#0D0D0D] border border-[#FFFFFF1A] rounded-md p-2"
                >
                  {item.thumbnail && (
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="w-16 h-9 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{item.title}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#1D9BF0] text-white rounded">
                        {getTypeIcon(item.type)}
                      </span>
                      <span className="text-[10px] text-[#536471] truncate">
                        {item.url}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-[#00BA7C] hover:bg-[#009960] text-white"
            >
              {isSubmitting ? "Importing..." : "Confirm & Import"}
            </Button>
          </div>
        )}

        {(flowStage === "importing" ||
          flowStage === "extracting" ||
          flowStage === "generating") && (
          <div className="space-y-6 py-8">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#1D9BF0] animate-spin" />
            </div>

            <div className="space-y-3">
              <FlowIndicator
                stage="importing"
                currentStage={flowStage}
                label="Importing content"
              />
              <FlowIndicator
                stage="extracting"
                currentStage={flowStage}
                label="Extracting insights"
              />
              <FlowIndicator
                stage="generating"
                currentStage={flowStage}
                label="Generating drafts"
              />
            </div>

            <p className="text-center text-sm text-[#8B98A5]">
              {flowStage === "importing" && "Downloading content..."}
              {flowStage === "extracting" && "AI is analyzing the content..."}
              {flowStage === "generating" && "Creating post variations..."}
            </p>
          </div>
        )}

        {flowStage === "complete" && results && (
          <div className="space-y-4">
            {/* Results Summary */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#00BA7C]">
                ✓ {results.success_count} imported
              </span>
              <span className="text-[#F4212E]">
                ⊘ {results.failed_count} failed
              </span>
              <span className="text-[#8B98A5]">
                ≈ {results.duplicate_count} duplicate
              </span>
            </div>

            {/* Successful Items */}
            {results.results.filter((r) => r.status === "success").length >
              0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-white">
                  Imported Content
                </h4>
                {results.results
                  .filter((r) => r.status === "success")
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-[#0D0D0D] border border-[#00BA7C]/30 rounded-md p-2"
                    >
                      <CheckCircle className="w-4 h-4 text-[#00BA7C]" />
                      <span className="text-xs text-white truncate">
                        {item.title || item.input}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {/* Generated Drafts */}
            {results.generated_drafts &&
              results.generated_drafts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-white">
                    {results.generated_drafts.length} Drafts Ready for Review
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {results.generated_drafts.map((draft, idx) => (
                      <div
                        key={idx}
                        className="bg-[#0D0D0D] border border-[#FFFFFF1A] rounded-md p-3"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-[#8B98A5] font-mono">
                            {draft.variation_id}
                          </span>
                          <span className="text-xs text-[#536471]">
                            {draft.hook_used} • {draft.format_used} •{" "}
                            {draft.char_count} chars
                          </span>
                        </div>
                        <p className="text-xs text-white line-clamp-3">
                          {draft.content_text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Failed Items */}
            {results.results.filter((r) => r.status === "failed").length >
              0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-[#F4212E]">Failed</h4>
                {results.results
                  .filter((r) => r.status === "failed")
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-[#0D0D0D] border border-[#F4212E]/30 rounded-md p-2"
                    >
                      <XCircle className="w-4 h-4 text-[#F4212E]" />
                      <div className="flex-1">
                        <span className="text-xs text-white truncate">
                          {item.input}
                        </span>
                        <p className="text-[10px] text-[#F4212E]">
                          {item.reason}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <Button
              onClick={handleClose}
              className="w-full bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FlowIndicator({
  stage,
  currentStage,
  label,
}: {
  stage: FlowStage;
  currentStage: FlowStage;
  label: string;
}) {
  const isComplete =
    ["extracting", "generating", "complete"].includes(currentStage) &&
    stage !== currentStage;
  const isCurrent = currentStage === stage;
  const isPending = !isComplete && !isCurrent;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm",
        isComplete && "text-[#00BA7C]",
        isCurrent && "text-[#1D9BF0]",
        isPending && "text-[#536471]",
      )}
    >
      {isComplete && <CheckCircle className="w-4 h-4" />}
      {isCurrent && <Loader2 className="w-4 h-4 animate-spin" />}
      {isPending && (
        <div className="w-4 h-4 rounded-full border border-[#536471]" />
      )}
      <span>{label}</span>
    </div>
  );
}
