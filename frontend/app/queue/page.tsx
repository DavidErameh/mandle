"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface QueueItem {
  id: string;
  draftId: string;
  scheduledAt: number;
  postType: "feed" | "community";
  status: "queued" | "posted" | "failed" | "cancelled";
  xPostId?: string;
  postedAt?: number;
  errorMessage?: string;
  createdAt: number;
}

function ProgressBar({ current, max }: { current: number; max: number }) {
  const percentage = Math.min((current / max) * 100, 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-white font-mono">{current} posted</span>
        <span className="text-[#8B98A5] font-mono">{max} daily limit</span>
      </div>
      <div className="h-2 bg-[#FFFFFF1A] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1D9BF0] transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: "bg-[#1D9BF0] text-white",
    posted: "bg-[#00BA7C] text-white",
    failed: "bg-[#F4212E] text-white",
    cancelled: "bg-[#536471] text-white",
  };
  return (
    <Badge className={cn("font-mono text-xs px-2 py-0.5", colors[status])}>
      {status}
    </Badge>
  );
}

function PostTypeBadge({ type }: { type: string }) {
  return (
    <Badge
      variant="outline"
      className="border-[#FFFFFF1A] text-[#8B98A5] text-xs"
    >
      {type}
    </Badge>
  );
}

interface QueueItemCardProps {
  item: QueueItem;
  onReschedule: (id: string, newTime: number) => void;
  onCancel: (id: string) => void;
}

function QueueItemCard({ item, onReschedule, onCancel }: QueueItemCardProps) {
  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [newTime, setNewTime] = useState("");

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleReschedule = () => {
    if (newTime) {
      onReschedule(item.id, new Date(newTime).getTime());
      setShowReschedule(false);
    }
  };

  return (
    <>
      <Card className="bg-[#16181C] border-[#FFFFFF1A]">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <StatusBadge status={item.status} />
              <PostTypeBadge type={item.postType} />
            </div>
            {item.status === "queued" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                className="text-[#F4212E] hover:text-[#F4212E] hover:bg-[#F4212E]/10"
              >
                Cancel
              </Button>
            )}
          </div>

          <p className="text-sm text-[#8B98A5] font-mono mb-2">
            {formatDate(item.scheduledAt)}
          </p>

          {item.status === "failed" && item.errorMessage && (
            <p className="text-xs text-[#F4212E] mb-2">{item.errorMessage}</p>
          )}

          {item.status === "posted" && item.xPostId && (
            <p className="text-xs text-[#8B98A5] font-mono mb-2">
              X Post ID: {item.xPostId}
            </p>
          )}

          {item.status === "queued" && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReschedule(!showReschedule)}
                className="border-[#FFFFFF1A] text-[#8B98A5] hover:bg-[#1C1F26] hover:text-white"
              >
                {showReschedule ? "Cancel" : "Reschedule"}
              </Button>
              {showReschedule && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="datetime-local"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="p-2 text-sm bg-[#16181C] border border-[#FFFFFF1A] rounded-lg text-white"
                  />
                  <Button
                    onClick={handleReschedule}
                    size="sm"
                    className="bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white rounded-full"
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="bg-[#16181C] border-[#FFFFFF1A]">
          <DialogHeader>
            <DialogTitle className="text-white">Cancel Post</DialogTitle>
            <DialogDescription className="text-[#8B98A5]">
              Are you sure you want to cancel this scheduled post?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              className="border-[#FFFFFF1A] text-white hover:bg-[#1C1F26]"
            >
              Keep Post
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onCancel(item.id);
                setShowCancelDialog(false);
              }}
              className="bg-[#F4212E] hover:bg-[#E01D28] text-white"
            >
              Cancel Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TimelineView({ items }: { items: QueueItem[] }) {
  const sortedItems = [...items].sort((a, b) => a.scheduledAt - b.scheduledAt);
  const today = new Date();
  const days: { date: Date; items: QueueItem[] }[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const dayItems = sortedItems.filter(
      (item) =>
        item.scheduledAt >= date.getTime() &&
        item.scheduledAt < nextDate.getTime(),
    );
    days.push({ date, items: dayItems });
  }

  return (
    <div className="space-y-4">
      {days.map((day) => (
        <div
          key={day.date.toISOString()}
          className="bg-[#16181C] border-[#FFFFFF1A] rounded-2xl p-4"
        >
          <h3
            className="font-medium text-white mb-3"
            style={{ fontFamily: '"Bambino New", sans-serif' }}
          >
            {day.date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h3>
          {day.items.length === 0 ? (
            <p className="text-sm text-[#536471]">No posts scheduled</p>
          ) : (
            <div className="space-y-2">
              {day.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-[#1C1F26] rounded-lg"
                >
                  <span className="text-xs text-[#8B98A5] font-mono w-16">
                    {new Date(item.scheduledAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <PostTypeBadge type={item.postType} />
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function QueuePage() {
  const [view, setView] = useState<"timeline" | "list">("timeline");
  const [items] = useState<QueueItem[]>([]);

  const handleReschedule = (id: string, newTime: number) => {
    console.log("Reschedule:", { id, newTime });
  };

  const handleCancel = (id: string) => {
    console.log("Cancel:", id);
  };

  const queuedCount = items.filter((i) => i.status === "queued").length;
  const postedCount = items.filter((i) => i.status === "posted").length;
  const dailyLimit = 20;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: '"Bambino New", sans-serif' }}
          >
            Post Queue
          </h1>
          <p className="text-[#8B98A5]">View and manage scheduled posts</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "timeline" ? "default" : "outline"}
            onClick={() => setView("timeline")}
            className={
              view === "timeline"
                ? "bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white rounded-full"
                : "border-[#FFFFFF1A] text-[#8B98A5] hover:bg-[#1C1F26] hover:text-white"
            }
          >
            Timeline
          </Button>
          <Button
            variant={view === "list" ? "default" : "outline"}
            onClick={() => setView("list")}
            className={
              view === "list"
                ? "bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white rounded-full"
                : "border-[#FFFFFF1A] text-[#8B98A5] hover:bg-[#1C1F26] hover:text-white"
            }
          >
            List
          </Button>
        </div>
      </div>

      <Card className="bg-[#16181C] border-[#FFFFFF1A]">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-lg">Daily Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressBar current={postedCount} max={dailyLimit} />
        </CardContent>
      </Card>

      <div className="flex gap-4 text-sm">
        <span className="text-[#8B98A5]">{queuedCount} queued</span>
        <span className="text-[#8B98A5]">{postedCount} posted</span>
      </div>

      {items.length === 0 ? (
        <Card className="bg-[#16181C] border-[#FFFFFF1A] border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-[#8B98A5]">No posts in queue</p>
            <p className="text-sm text-[#536471] mt-1">
              Approved posts will appear here
            </p>
          </CardContent>
        </Card>
      ) : view === "timeline" ? (
        <TimelineView items={items} />
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <QueueItemCard
              key={item.id}
              item={item}
              onReschedule={handleReschedule}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
