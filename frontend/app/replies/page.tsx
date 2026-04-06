"use client";

import { useState } from "react";
import { approveReply, rejectReply } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ReplyDraft {
  id: string;
  targetAccountId: string;
  targetUsername?: string;
  sourceTweetId: string;
  sourceTweetText: string;
  replyAgreeExtend: string;
  replyContrarian: string;
  replyCuriosityHook: string;
  humanStatus: "pending" | "approved" | "rejected";
  category?: string;
}

interface ReplyCardProps {
  draft: ReplyDraft;
  onApprove: (id: string, text: string) => void;
  onReject: (id: string) => void;
}

function ReplyCard({ draft, onApprove, onReject }: ReplyCardProps) {
  const [selectedOption, setSelectedOption] = useState<
    "agree" | "contrarian" | "curiosity"
  >("agree");
  const [editedReply, setEditedReply] = useState("");

  const replyTexts = {
    agree: draft.replyAgreeExtend,
    contrarian: draft.replyContrarian,
    curiosity: draft.replyCuriosityHook,
  };

  const currentText = editedReply || replyTexts[selectedOption];
  const charCount = currentText.length;

  const handleApprove = () => {
    const finalText = currentText;
    onApprove(draft.id, finalText);
  };

  return (
    <Card className="bg-[#16181C] border-[#FFFFFF1A]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white">
              @{draft.targetUsername || "account"}
            </span>
            {draft.category && (
              <Badge
                variant="outline"
                className="border-[#FFFFFF1A] text-[#8B98A5] text-xs"
              >
                {draft.category}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-[#8B98A5] mb-2">Original Tweet</p>
          <blockquote className="border-l-2 border-[#1D9BF0] pl-3 text-sm text-[#8B98A5] italic">
            {draft.sourceTweetText}
          </blockquote>
          {draft.sourceTweetId && (
            <a
              href={`https://x.com/i/status/${draft.sourceTweetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#1D9BF0] underline mt-2 inline-block hover:text-[#1A8CD8]"
            >
              View on X →
            </a>
          )}
        </div>

        <div>
          <p className="text-xs text-[#8B98A5] mb-2">Reply Options</p>
          <Tabs
            value={selectedOption}
            onValueChange={(v) => setSelectedOption(v as typeof selectedOption)}
          >
            <TabsList className="bg-[#1C1F26] border-[#FFFFFF1A] w-full">
              <TabsTrigger
                value="agree"
                className="flex-1 data-[state=active]:bg-[#1D9BF0] data-[state=active]:text-white text-[#8B98A5]"
              >
                Agree/Extend
              </TabsTrigger>
              <TabsTrigger
                value="contrarian"
                className="flex-1 data-[state=active]:bg-[#1D9BF0] data-[state=active]:text-white text-[#8B98A5]"
              >
                Contrarian
              </TabsTrigger>
              <TabsTrigger
                value="curiosity"
                className="flex-1 data-[state=active]:bg-[#1D9BF0] data-[state=active]:text-white text-[#8B98A5]"
              >
                Curiosity
              </TabsTrigger>
            </TabsList>
            <TabsContent value="agree" className="mt-3">
              <div className="p-3 bg-[#1C1F26] rounded-lg text-sm text-white">
                {draft.replyAgreeExtend}
              </div>
            </TabsContent>
            <TabsContent value="contrarian" className="mt-3">
              <div className="p-3 bg-[#1C1F26] rounded-lg text-sm text-white">
                {draft.replyContrarian}
              </div>
            </TabsContent>
            <TabsContent value="curiosity" className="mt-3">
              <div className="p-3 bg-[#1C1F26] rounded-lg text-sm text-white">
                {draft.replyCuriosityHook}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <p className="text-xs text-[#8B98A5] mb-2">Edit Selected Reply</p>
          <textarea
            value={currentText}
            onChange={(e) => setEditedReply(e.target.value)}
            className="w-full p-3 bg-[#16181C] border border-[#FFFFFF1A] rounded-lg text-sm text-white placeholder-[#536471] focus:border-[#1D9BF0] focus:outline-none"
            rows={3}
          />
          <p
            className={
              charCount > 280
                ? "text-xs text-[#F4212E] mt-1 font-mono"
                : "text-xs text-[#536471] mt-1 font-mono"
            }
          >
            {charCount} / 280 characters
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleApprove}
            disabled={charCount > 280}
            className="flex-1 bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white rounded-full disabled:opacity-50"
          >
            Approve & Post
          </Button>
          <Button
            variant="destructive"
            onClick={() => onReject(draft.id)}
            className="flex-1 bg-[#F4212E] hover:bg-[#E01D28] text-white rounded-full"
          >
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RepliesPage() {
  const [drafts] = useState<ReplyDraft[]>([]);

  const handleApprove = async (id: string, text: string) => {
    try {
      const result = await approveReply(id, text);
      console.log("Reply approved:", result);
    } catch (error) {
      console.error("Failed to approve reply:", error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const result = await rejectReply(id);
      console.log("Reply rejected:", result);
    } catch (error) {
      console.error("Failed to reject reply:", error);
    }
  };

  const pendingDrafts = drafts.filter((d) => d.humanStatus === "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: '"Bambino New", sans-serif' }}
          >
            Reply Dashboard
          </h1>
          <p className="text-[#8B98A5]">
            Review and approve AI-generated replies
          </p>
        </div>
        <Badge className="bg-[#1D9BF0] text-white px-4 py-1 rounded-full">
          {pendingDrafts.length} pending
        </Badge>
      </div>

      {pendingDrafts.length === 0 ? (
        <Card className="bg-[#16181C] border-[#FFFFFF1A] border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-[#8B98A5]">No reply drafts pending</p>
            <p className="text-sm text-[#536471] mt-1">
              Generated replies will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingDrafts.map((draft) => (
            <ReplyCard
              key={draft.id}
              draft={draft}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
