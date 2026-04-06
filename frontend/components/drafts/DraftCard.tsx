"use client";

import { useState } from "react";

interface Draft {
  id: string;
  variationNumber: number;
  contentText: string;
  charCount: number;
  brandScore?: number;
  hookUsed?: string;
  formatUsed?: string;
}

interface DraftCardProps {
  draft: Draft;
  onApprove: (draftId: string) => void;
  onReject: (draftId: string) => void;
}

export function DraftCard({ draft, onApprove, onReject }: DraftCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(draft.contentText);

  return (
    <div className="border border-[#e5e5e5] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs px-2 py-1 bg-gray-100 rounded">
          Variation {draft.variationNumber}
        </span>
        {draft.brandScore && (
          <span
            className={`px-2 py-1 text-xs rounded ${
              draft.brandScore >= 7
                ? "bg-green-100 text-green-800"
                : draft.brandScore >= 5
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
            }`}
          >
            Score: {draft.brandScore}
          </span>
        )}
      </div>

      <textarea
        value={editedContent}
        onChange={(e) => setEditedContent(e.target.value)}
        className="w-full p-2 border border-[#e5e5e5] rounded text-sm mb-2"
        rows={4}
      />

      <p className="text-xs text-[#737373] mb-3">{draft.charCount} chars</p>

      <div className="flex gap-2">
        <button
          onClick={() => onApprove(draft.id)}
          className="flex-1 px-3 py-2 bg-black text-white text-sm rounded"
        >
          Approve
        </button>
        <button
          onClick={() => onReject(draft.id)}
          className="flex-1 px-3 py-2 border border-[#e5e5e5] text-sm rounded"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
