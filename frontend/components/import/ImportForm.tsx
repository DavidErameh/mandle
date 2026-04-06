"use client";

import { useState } from "react";
import { XTextToggle } from "./XTextToggle";

interface ImportFormProps {
  onSubmit: (urls: string[], xText: string | null, note: string | null) => void;
  isSubmitting: boolean;
}

export function ImportForm({ onSubmit, isSubmitting }: ImportFormProps) {
  const [urlsText, setUrlsText] = useState("");
  const [xText, setXText] = useState("");
  const [note, setNote] = useState("");
  const [showXText, setShowXText] = useState(false);

  const handleSubmit = () => {
    const urls = urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    const xTextValue = xText.trim() || null;
    const noteValue = note.trim() || null;
    onSubmit(urls, xTextValue, noteValue);
  };

  const hasInput = urlsText.trim() || xText.trim();

  return (
    <div className="space-y-4">
      {/* URL Section */}
      <div>
        <label className="text-xs uppercase tracking-wide text-[#8B98A5] mb-1.5 block">
          URLs
        </label>
        <textarea
          value={urlsText}
          onChange={(e) => setUrlsText(e.target.value)}
          placeholder={"https://youtube.com/watch?v=...\nhttps://substack.com/...\nhttps://x.com/..."}
          rows={5}
          className="w-full bg-[#16181C] border border-[#FFFFFF1A] rounded-md p-3 text-sm text-white placeholder-[#536471] focus:border-[#1D9BF0] focus:outline-none resize-none font-mono"
        />
        <p className="text-xs text-[#536471] mt-1">
          One URL per line. YouTube, articles, X posts.
        </p>
      </div>

      {/* X Text Toggle */}
      <XTextToggle
        show={showXText}
        onToggle={() => setShowXText(!showXText)}
        value={xText}
        onChange={setXText}
      />

      {/* Note */}
      <div>
        <label className="text-xs uppercase tracking-wide text-[#8B98A5] mb-1.5 block">
          Optional note
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why you saved this (for your reference only)"
          className="w-full bg-[#16181C] border border-[#FFFFFF1A] rounded-md p-3 text-sm text-white placeholder-[#536471] focus:border-[#1D9BF0] focus:outline-none"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!hasInput || isSubmitting}
        className="bg-[#1D9BF0] hover:bg-[#1A8CD8] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors"
      >
        {isSubmitting ? "Importing..." : "Import"}
      </button>
    </div>
  );
}
