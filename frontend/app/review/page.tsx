"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Draft {
  id: string;
  extractedPointId: string;
  variationNumber: number;
  contentText: string;
  hookUsed: string;
  formatUsed: string;
  charCount: number;
  brandScore?: number;
  reviewerApproved?: boolean;
  ruleViolations?: string[];
  suggestedEdits?: string[];
  humanStatus: string;
  finalContent?: string;
  mediaAssetId?: string;
}

function ScoreBadge({ score }: { score?: number }) {
  if (score === undefined) {
    return (
      <Badge variant="outline" className="border-[#536471] text-[#536471]">
        Pending
      </Badge>
    );
  }

  let colorClass = "bg-[#F4212E] text-white";
  if (score >= 7) colorClass = "bg-[#00BA7C] text-white";
  else if (score >= 5) colorClass = "bg-[#FFD400] text-[#0F0F0F]";

  return (
    <Badge
      className={cn("font-mono text-[13px] font-bold px-3 py-0.5", colorClass)}
    >
      {score}
    </Badge>
  );
}

interface DraftCardProps {
  draft: Draft;
  onApprove: (draftId: string, scheduledAt: number, postType: string) => void;
  onReject: (draftId: string) => void;
}

function DraftCard({ draft, onApprove, onReject }: DraftCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(
    draft.finalContent || draft.contentText,
  );
  const [showViolations, setShowViolations] = useState(false);
  const [showEdits, setShowEdits] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [postType, setPostType] = useState<"feed" | "community">("feed");
  const [showSchedule, setShowSchedule] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);

  const handleApprove = () => {
    const timestamp = scheduledAt
      ? new Date(scheduledAt).getTime()
      : Date.now();
    onApprove(draft.id, timestamp, postType);
  };

  return (
    <Card className="bg-[#16181C] border-[#FFFFFF1A]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-[#FFFFFF1A] text-[#8B98A5]"
            >
              Variation {draft.variationNumber}
            </Badge>
            <ScoreBadge score={draft.brandScore} />
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          {draft.hookUsed && (
            <Badge
              variant="secondary"
              className="bg-[#1C1F26] text-[#8B98A5] text-xs"
            >
              {draft.hookUsed}
            </Badge>
          )}
          {draft.formatUsed && (
            <Badge
              variant="secondary"
              className="bg-[#1C1F26] text-[#8B98A5] text-xs"
            >
              {draft.formatUsed}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          {isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full p-3 bg-[#16181C] border border-[#FFFFFF1A] rounded-lg text-sm text-white placeholder-[#536471] focus:border-[#1D9BF0] focus:outline-none"
              rows={4}
              onBlur={() => setIsEditing(false)}
            />
          ) : (
            <p
              className="text-sm text-white cursor-pointer hover:bg-[#1C1F26] p-2 -m-2 rounded-lg transition-colors"
              onClick={() => setIsEditing(true)}
            >
              {draft.finalContent || draft.contentText}
            </p>
          )}
          <p className="text-xs text-[#536471] font-mono mt-1">
            {draft.charCount} characters
          </p>
        </div>

        {draft.ruleViolations && draft.ruleViolations.length > 0 && (
          <div>
            <button
              onClick={() => setShowViolations(!showViolations)}
              className="text-xs text-[#F4212E] underline"
            >
              {showViolations ? "Hide" : "Show"} violations (
              {draft.ruleViolations.length})
            </button>
            {showViolations && (
              <ul className="text-xs text-[#F4212E] mt-2 space-y-1">
                {draft.ruleViolations.map((v, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-[#F4212E]">●</span> {v}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {draft.suggestedEdits && draft.suggestedEdits.length > 0 && (
          <div>
            <button
              onClick={() => setShowEdits(!showEdits)}
              className="text-xs text-[#8B98A5] underline"
            >
              {showEdits ? "Hide" : "Show"} suggestions (
              {draft.suggestedEdits.length})
            </button>
            {showEdits && (
              <ul className="text-xs text-[#8B98A5] mt-2 space-y-1">
                {draft.suggestedEdits.map((e, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-[#1D9BF0]">●</span> {e}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImagePicker(!showImagePicker)}
            className="border-[#FFFFFF1A] text-[#8B98A5] hover:bg-[#1C1F26] hover:text-white w-full"
          >
            {showImagePicker ? "Hide" : "Add"} Image
          </Button>
          {showImagePicker && (
            <div className="p-3 bg-[#1C1F26] rounded-lg text-xs text-[#8B98A5] text-center">
              Media picker would open here
            </div>
          )}
        </div>

        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSchedule(!showSchedule)}
            className="border-[#FFFFFF1A] text-[#8B98A5] hover:bg-[#1C1F26] hover:text-white w-full"
          >
            {showSchedule ? "Hide" : "Show"} Schedule
          </Button>
          {showSchedule && (
            <div className="space-y-2 p-3 bg-[#1C1F26] rounded-lg mt-2">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full p-2 text-sm bg-[#16181C] border border-[#FFFFFF1A] rounded text-white"
              />
              <select
                value={postType}
                onChange={(e) =>
                  setPostType(e.target.value as "feed" | "community")
                }
                className="w-full p-2 text-sm bg-[#16181C] border border-[#FFFFFF1A] rounded text-white"
              >
                <option value="feed">Feed</option>
                <option value="community">Community</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleApprove}
            className="flex-1 bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white rounded-full"
          >
            Approve
          </Button>
          <Button
            onClick={() => onReject(draft.id)}
            variant="destructive"
            className="flex-1 bg-[#F4212E] hover:bg-[#E01D28] text-white rounded-full"
          >
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReviewPage() {
  const [drafts] = useState<Draft[]>([]);

  const handleApprove = (
    draftId: string,
    scheduledAt: number,
    postType: string,
  ) => {
    console.log("Approve:", { draftId, scheduledAt, postType });
  };

  const handleReject = (draftId: string) => {
    console.log("Reject:", draftId);
  };

  const groupedDrafts = drafts.reduce(
    (acc, draft) => {
      const key = draft.extractedPointId;
      if (!acc[key]) acc[key] = [];
      acc[key].push(draft);
      return acc;
    },
    {} as Record<string, Draft[]>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: '"Bambino New", sans-serif' }}
          >
            Content Review
          </h1>
          <p className="text-[#8B98A5]">Review and approve generated content</p>
        </div>
        <Badge className="bg-[#1D9BF0] text-white px-4 py-1 rounded-full">
          {drafts.length} pending
        </Badge>
      </div>

      {drafts.length === 0 ? (
        <Card className="bg-[#16181C] border-[#FFFFFF1A] border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-[#8B98A5]">No drafts pending review</p>
            <p className="text-sm text-[#536471] mt-1">
              Generated content will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedDrafts).map(([pointId, pointDrafts]) => (
          <div key={pointId} className="space-y-4">
            <div className="border-l-2 border-[#1D9BF0] pl-4">
              <p className="text-xs text-[#8B98A5]">Original extracted point</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pointDrafts
                .sort((a, b) => a.variationNumber - b.variationNumber)
                .map((draft) => (
                  <DraftCard
                    key={draft.id}
                    draft={draft}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
