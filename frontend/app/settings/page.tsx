"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Feed {
  id: string;
  name: string;
  type: "rss" | "youtube";
  url: string;
  isActive: boolean;
  fetchIntervalMinutes: number;
}

const prompts = [
  {
    name: "brand_voice",
    path: "prompts/brand/brand_voice.md",
    category: "brand",
    required: true,
    last_updated: "2026-03-25",
  },
  {
    name: "brand_rules",
    path: "prompts/brand/brand_rules.md",
    category: "brand",
    required: true,
    last_updated: "2026-03-25",
  },
  {
    name: "niche_context",
    path: "prompts/brand/niche_context.md",
    category: "brand",
    required: true,
    last_updated: "2026-03-25",
  },
  {
    name: "offer_context",
    path: "prompts/brand/offer_context.md",
    category: "brand",
    required: true,
    last_updated: "2026-03-25",
  },
  {
    name: "extractor_system",
    path: "prompts/system/extractor_system.md",
    category: "system",
    required: true,
    last_updated: "2026-03-25",
  },
  {
    name: "generator_system",
    path: "prompts/system/generator_system.md",
    category: "system",
    required: true,
    last_updated: "2026-03-25",
  },
  {
    name: "reviewer_system",
    path: "prompts/system/reviewer_system.md",
    category: "system",
    required: true,
    last_updated: "2026-03-25",
  },
  {
    name: "reply_system",
    path: "prompts/system/reply_system.md",
    category: "system",
    required: true,
    last_updated: "2026-03-25",
  },
];

function formatTimestamp(timestamp: number | undefined): string {
  if (!timestamp) return "Never";
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AutoReplyToggle() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [lastToggled, setLastToggled] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/v1/config/REPLIES_ENABLED");
        if (res.ok) {
          const data = await res.json();
          setIsEnabled(data.value !== "false");
          setLastToggled(data.updatedAt);
        }
      } catch (e) {
        console.error("Failed to fetch config:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleToggle = async (checked: boolean) => {
    try {
      const res = await fetch("/api/v1/config/REPLIES_ENABLED", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: checked ? "true" : "false" }),
      });
      if (res.ok) {
        setIsEnabled(checked);
        setLastToggled(Date.now());
      }
    } catch (e) {
      console.error("Failed to save config:", e);
    }
  };

  if (loading) {
    return (
      <Card className="bg-[#16181C] border-[#FFFFFF1A]">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg font-semibold">
            Auto-Reply System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#8B98A5]">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#16181C] border-[#FFFFFF1A]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg font-semibold">
            Auto-Reply System
          </CardTitle>
          <span
            className={cn(
              "text-xs font-mono px-3 py-1 rounded-full",
              isEnabled ? "bg-[#00BA7C] text-white" : "bg-[#F4212E] text-white",
            )}
          >
            {isEnabled ? "Active" : "Paused"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-[#8B98A5]">
          When enabled, the system monitors target accounts and generates reply
          drafts automatically.
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
              className={cn(
                isEnabled ? "bg-[#1D9BF0]" : "bg-[#536471]",
                "cursor-pointer",
              )}
            />
            <span className="text-sm text-white">
              {isEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <span className="text-xs text-[#8B98A5] font-mono">
            Last toggled: {formatTimestamp(lastToggled)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const [feeds] = useState<Feed[]>([]);
  const [promptsList] = useState(prompts);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeed, setNewFeed] = useState({
    name: "",
    type: "rss" as "rss" | "youtube",
    url: "",
    fetchIntervalMinutes: 60,
  });
  const [scheduleSettings] = useState({
    maxDailyPosts: 20,
    windowStart: "07:00",
    windowEnd: "22:00",
    minPostGap: 30,
  });

  const handleAddFeed = () => {
    if (!newFeed.name || !newFeed.url) return;
    setNewFeed({ name: "", type: "rss", url: "", fetchIntervalMinutes: 60 });
    setShowAddFeed(false);
  };

  const handleDeleteFeed = (id: string) => {
    if (confirm("Delete this feed?")) console.log("Delete feed:", id);
  };

  const handleToggleFeed = (id: string) => {
    console.log("Toggle feed:", id);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: '"Bambino New", sans-serif' }}
        >
          Settings
        </h1>
        <p className="text-[#8B98A5]">Configure Mandle</p>
      </div>

      <AutoReplyToggle />

      <Card className="bg-[#16181C] border-[#FFFFFF1A]">
        <CardHeader className="border-b border-[#FFFFFF1A]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Feed Sources</CardTitle>
            <button
              onClick={() => setShowAddFeed(!showAddFeed)}
              className="text-sm px-3 py-1 bg-[#1D9BF0] text-white rounded-full hover:bg-[#1A8CD8] transition-colors"
            >
              {showAddFeed ? "Cancel" : "Add Feed"}
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {showAddFeed && (
            <div className="p-4 bg-[#1C1F26] space-y-4 border-b border-[#FFFFFF1A]">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-[#8B98A5] mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newFeed.name}
                    onChange={(e) =>
                      setNewFeed({ ...newFeed, name: e.target.value })
                    }
                    className="w-full p-2 bg-[#16181C] border border-[#FFFFFF1A] rounded-lg text-sm text-white placeholder-[#536471]"
                    placeholder="My Feed"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#8B98A5] mb-1">
                    Type
                  </label>
                  <select
                    value={newFeed.type}
                    onChange={(e) =>
                      setNewFeed({
                        ...newFeed,
                        type: e.target.value as "rss" | "youtube",
                      })
                    }
                    className="w-full p-2 bg-[#16181C] border border-[#FFFFFF1A] rounded-lg text-sm text-white"
                  >
                    <option value="rss">RSS</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-[#8B98A5] mb-1">
                    URL
                  </label>
                  <input
                    type="text"
                    value={newFeed.url}
                    onChange={(e) =>
                      setNewFeed({ ...newFeed, url: e.target.value })
                    }
                    className="w-full p-2 bg-[#16181C] border border-[#FFFFFF1A] rounded-lg text-sm text-white placeholder-[#536471]"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#8B98A5] mb-1">
                    Fetch Interval (minutes)
                  </label>
                  <input
                    type="number"
                    value={newFeed.fetchIntervalMinutes}
                    onChange={(e) =>
                      setNewFeed({
                        ...newFeed,
                        fetchIntervalMinutes: parseInt(e.target.value),
                      })
                    }
                    className="w-full p-2 bg-[#16181C] border border-[#FFFFFF1A] rounded-lg text-sm text-white"
                  />
                </div>
              </div>
              <button
                onClick={handleAddFeed}
                className="px-4 py-2 bg-[#1D9BF0] text-white text-sm rounded-full hover:bg-[#1A8CD8] transition-colors"
              >
                Add Feed
              </button>
            </div>
          )}
          {feeds.length === 0 ? (
            <div className="p-8 text-center text-[#8B98A5]">
              No feeds configured
            </div>
          ) : (
            <div className="divide-y divide-[#FFFFFF1A]">
              {feeds.map((feed) => (
                <div
                  key={feed.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-white">{feed.name}</p>
                    <p className="text-sm text-[#8B98A5]">
                      {feed.type} • {feed.url}
                    </p>
                    <p className="text-xs text-[#536471]">
                      Every {feed.fetchIntervalMinutes} min
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleToggleFeed(feed.id)}
                      className="w-10 h-5 rounded-full bg-[#536471]"
                    >
                      <span className="block w-4 h-4 bg-white rounded-full translate-x-0.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteFeed(feed.id)}
                      className="text-sm text-[#F4212E] hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#16181C] border-[#FFFFFF1A]">
        <CardHeader className="border-b border-[#FFFFFF1A]">
          <CardTitle className="text-white">Scheduling</CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-[#8B98A5] mb-1">
              Max Daily Posts
            </label>
            <input
              type="number"
              value={scheduleSettings.maxDailyPosts}
              className="w-full p-2 bg-[#16181C] border border-[#FFFFFF1A] rounded-lg text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8B98A5] mb-1">
              Posting Window Start
            </label>
            <input
              type="time"
              value={scheduleSettings.windowStart}
              className="w-full p-2 bg-[#16181C] border border-[#FFFFFF1A] rounded-lg text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8B98A5] mb-1">
              Posting Window End
            </label>
            <input
              type="time"
              value={scheduleSettings.windowEnd}
              className="w-full p-2 bg-[#16181C] border border-[#FFFFFF1A] rounded-lg text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8B98A5] mb-1">
              Min Post Gap (minutes)
            </label>
            <input
              type="number"
              value={scheduleSettings.minPostGap}
              className="w-full p-2 bg-[#16181C] border border-[#FFFFFF1A] rounded-lg text-sm text-white"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#16181C] border-[#FFFFFF1A]">
        <CardHeader className="border-b border-[#FFFFFF1A]">
          <CardTitle className="text-white">Prompt Registry</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#1C1F26]">
                <tr>
                  <th className="text-left p-3 text-[#8B98A5]">Name</th>
                  <th className="text-left p-3 text-[#8B98A5]">Category</th>
                  <th className="text-left p-3 text-[#8B98A5]">Required</th>
                  <th className="text-left p-3 text-[#8B98A5]">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FFFFFF1A]">
                {promptsList.map((prompt) => (
                  <tr key={prompt.name}>
                    <td className="p-3 text-white">{prompt.name}</td>
                    <td className="p-3 text-[#8B98A5]">{prompt.category}</td>
                    <td className="p-3 text-[#8B98A5]">
                      {prompt.required ? "Yes" : "No"}
                    </td>
                    <td className="p-3 text-[#8B98A5] font-mono text-xs">
                      {prompt.last_updated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
