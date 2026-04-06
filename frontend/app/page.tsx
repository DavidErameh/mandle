"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  href?: string;
}

function StatusCard({ title, value, subtitle, href }: StatusCardProps) {
  const content = (
    <Card className="bg-[#16181C] border-[#FFFFFF1A] hover:border-[#FFFFFF1A]/80 transition-colors">
      <CardHeader className="pb-2">
        <h3 className="text-sm text-[#8B98A5]">{title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-white font-mono">{value}</p>
        {subtitle && <p className="text-sm text-[#8B98A5] mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function ReplySystemCard() {
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/v1/config/REPLIES_ENABLED");
        if (res.ok) {
          const data = await res.json();
          setIsEnabled(data.value !== "false");
        }
      } catch (e) {}
    }
    fetchStatus();
  }, []);

  return (
    <Link href="/settings">
      <Card className="bg-[#16181C] border-[#FFFFFF1A] hover:border-[#FFFFFF1A]/80 transition-colors">
        <CardHeader className="pb-2">
          <h3 className="text-sm text-[#8B98A5]">Reply System</h3>
        </CardHeader>
        <CardContent>
          <span
            className={cn(
              "text-3xl font-bold font-mono",
              isEnabled ? "text-[#00BA7C]" : "text-[#F4212E]",
            )}
          >
            {isEnabled ? "Active" : "Paused"}
          </span>
          <p className="text-sm text-[#8B98A5] mt-1">Click to configure</p>
        </CardContent>
      </Card>
    </Link>
  );
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

function ActivityItem({
  action,
  timestamp,
}: {
  action: string;
  timestamp: string;
}) {
  return (
    <div className="py-3 border-b border-[#FFFFFF1A] last:border-0">
      <p className="text-sm text-white">{action}</p>
      <p className="text-xs text-[#536471] font-mono">{timestamp}</p>
    </div>
  );
}

export default function DashboardPage() {
  const dailyLimit = 20;
  const postedToday = 0;
  const pendingDrafts = 0;
  const pendingReplies = 0;
  const recentActivity = [
    { action: "System initialized", timestamp: "Just now" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: '"Bambino New", sans-serif' }}
        >
          Dashboard
        </h1>
        <p className="text-[#8B98A5]">Pipeline overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Today's Posts"
          value={`${postedToday} / ${dailyLimit}`}
          subtitle="Posted"
          href="/queue"
        />
        <StatusCard
          title="Pending Review"
          value={pendingDrafts}
          subtitle="Drafts awaiting approval"
          href="/review"
        />
        <StatusCard
          title="Reply Drafts"
          value={pendingReplies}
          subtitle="Awaiting approval"
          href="/replies"
        />
        <ReplySystemCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#16181C] border-[#FFFFFF1A]">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              Posting Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressBar current={postedToday} max={dailyLimit} />
          </CardContent>
        </Card>
        <Card className="bg-[#16181C] border-[#FFFFFF1A]">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              Next Scheduled Post
            </CardTitle>
          </CardHeader>
          <CardContent>
            {postedToday === 0 ? (
              <p className="text-[#8B98A5]">No posts scheduled</p>
            ) : (
              <div>
                <p className="font-medium text-white">Post preview here...</p>
                <p className="text-sm text-[#8B98A5] mt-1 font-mono">
                  Scheduled for: --
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#16181C] border-[#FFFFFF1A]">
        <CardHeader>
          <CardTitle className="text-white text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div>
              {recentActivity.map((activity, index) => (
                <ActivityItem
                  key={index}
                  action={activity.action}
                  timestamp={activity.timestamp}
                />
              ))}
            </div>
          ) : (
            <p className="text-[#8B98A5]">No recent activity</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#16181C] border-[#FFFFFF1A]">
          <CardContent className="pt-4">
            <h3 className="font-medium mb-2 text-white">Ingestion</h3>
            <p className="text-sm text-[#8B98A5] font-mono">Last run: --</p>
            <p className="text-sm text-[#00BA7C]">● Idle</p>
          </CardContent>
        </Card>
        <Card className="bg-[#16181C] border-[#FFFFFF1A]">
          <CardContent className="pt-4">
            <h3 className="font-medium mb-2 text-white">Extraction</h3>
            <p className="text-sm text-[#8B98A5] font-mono">Last run: --</p>
            <p className="text-sm text-[#00BA7C]">● Idle</p>
          </CardContent>
        </Card>
        <Card className="bg-[#16181C] border-[#FFFFFF1A]">
          <CardContent className="pt-4">
            <h3 className="font-medium mb-2 text-white">Generation</h3>
            <p className="text-sm text-[#8B98A5] font-mono">Last run: --</p>
            <p className="text-sm text-[#00BA7C]">● Idle</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
