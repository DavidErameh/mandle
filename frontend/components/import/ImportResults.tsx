"use client";

interface ImportItemResult {
  input: string;
  status: "success" | "failed" | "duplicate";
  raw_item_id: string | null;
  title: string | null;
  type: "youtube_video" | "article" | "x_thread" | null;
  reason: string | null;
}

interface ImportResponse {
  results: ImportItemResult[];
  success_count: number;
  failed_count: number;
  duplicate_count: number;
}

interface ImportResultsProps {
  data: ImportResponse;
}

const STATUS_CONFIG = {
  success: { icon: "✓", color: "text-emerald-600" },
  failed: { icon: "⊘", color: "text-red-500" },
  duplicate: { icon: "≈", color: "text-zinc-400" },
} as const;

const TYPE_LABELS: Record<string, string> = {
  youtube_video: "YouTube",
  article: "Article",
  x_thread: "X Thread",
};

export function ImportResults({ data }: ImportResultsProps) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-[#8B98A5] mb-3 block">
        Results
      </label>

      <div className="space-y-2">
        {data.results.map((item, i) => {
          const config = STATUS_CONFIG[item.status];
          return (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className={`${config.color} font-mono mt-0.5`}>{config.icon}</span>
              <div className="min-w-0 flex-1">
                <span className="text-white truncate block">
                  {item.title || item.input}
                </span>
                <span className="text-[#536471] text-xs">
                  {item.type ? TYPE_LABELS[item.type] || item.type : ""}
                  {item.reason && (
                    <span className="text-red-500/70 ml-2">— {item.reason}</span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <p className="text-sm text-[#8B98A5] mt-4 font-mono">
        {data.success_count} added · {data.failed_count} failed · {data.duplicate_count} duplicate
      </p>
      {data.success_count > 0 && (
        <p className="text-xs text-[#536471] mt-1">
          Items will be extracted within 30 minutes.
        </p>
      )}
    </div>
  );
}
