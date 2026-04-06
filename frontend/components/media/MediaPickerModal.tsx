"use client";

import { useState } from "react";

interface MediaAsset {
  id: string;
  url: string;
  tags: string[];
  width: number;
  height: number;
}

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (assetId: string) => void;
  assets?: MediaAsset[];
}

export default function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  assets = [],
}: MediaPickerModalProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  if (!isOpen) return null;

  const allTags = [...new Set(assets.flatMap((a) => a.tags))];

  const filteredAssets = selectedTag
    ? assets.filter((a) => a.tags.includes(selectedTag))
    : assets;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-[#e5e5e5] flex items-center justify-between">
          <h2 className="font-semibold">Select Image</h2>
          <button onClick={onClose} className="text-[#737373] hover:text-black">
            ✕
          </button>
        </div>

        <div className="p-4 border-b border-[#e5e5e5]">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1 text-sm rounded ${
                selectedTag === null ? "bg-black text-white" : "bg-gray-100"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 text-sm rounded ${
                  selectedTag === tag ? "bg-black text-white" : "bg-gray-100"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {filteredAssets.length === 0 ? (
            <div className="text-center py-8 text-[#737373]">
              No images available
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => {
                    onSelect(asset.id);
                    onClose();
                  }}
                  className="relative aspect-square border border-[#e5e5e5] rounded overflow-hidden hover:border-black transition-colors"
                >
                  <img
                    src={asset.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#e5e5e5] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#e5e5e5] rounded hover:bg-[#f5f5f5]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
