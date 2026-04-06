"use client";

interface XTextToggleProps {
  show: boolean;
  onToggle: () => void;
  value: string;
  onChange: (value: string) => void;
}

export function XTextToggle({ show, onToggle, value, onChange }: XTextToggleProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="text-sm text-[#8B98A5] hover:text-white transition-colors"
      >
        {show ? "▾" : "▸"} Or paste X thread text directly
      </button>

      {show && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste thread text here..."
          rows={4}
          className="w-full mt-2 bg-[#16181C] border border-[#FFFFFF1A] rounded-md p-3 text-sm text-white placeholder-[#536471] focus:border-[#1D9BF0] focus:outline-none resize-none"
        />
      )}
    </div>
  );
}
