"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface TargetAccount {
  id: string;
  xUsername: string;
  xUserId: string;
  category: "thought_leader" | "competitor" | "potential_client" | "community";
  engagementLevel: "high" | "medium" | "low";
  isActive: boolean;
  lastCheckedAt?: number;
  createdAt: number;
}

const categories = [
  { value: "thought_leader", label: "Thought Leader" },
  { value: "competitor", label: "Competitor" },
  { value: "potential_client", label: "Potential Client" },
  { value: "community", label: "Community" },
];

const engagementLevels = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function CategoryBadge({ category }: { category: string }) {
  return (
    <Badge variant="outline" className="border-[#FFFFFF1A] text-[#8B98A5]">
      {categories.find((c) => c.value === category)?.label || category}
    </Badge>
  );
}

function EngagementBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    high: "bg-[#00BA7C] text-white",
    medium: "bg-[#FFD400] text-[#0F0F0F]",
    low: "bg-[#536471] text-white",
  };
  return (
    <Badge className={cn("font-mono text-xs px-3 py-0.5", colors[level])}>
      {engagementLevels.find((e) => e.value === level)?.label || level}
    </Badge>
  );
}

function AddAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [username, setUsername] = useState("");
  const [category, setCategory] = useState("thought_leader");
  const [engagement, setEngagement] = useState("medium");

  const handleAdd = () => {
    if (!username) return;
    console.log("Add account:", { username, category, engagement });
    setUsername("");
    setCategory("thought_leader");
    setEngagement("medium");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#16181C] border-[#FFFFFF1A]">
        <DialogHeader>
          <DialogTitle className="text-white">Add Target Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm text-[#8B98A5] mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              className="w-full p-2 bg-[#16181C] border border-[#FFFFFF1A] rounded-lg text-white placeholder-[#536471]"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8B98A5] mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 bg-[#16181C] border border-[#FFFFFF1A] rounded-lg text-white"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#8B98A5] mb-1">
              Engagement Level
            </label>
            <select
              value={engagement}
              onChange={(e) => setEngagement(e.target.value)}
              className="w-full p-2 bg-[#16181C] border border-[#FFFFFF1A] rounded-lg text-white"
            >
              {engagementLevels.map((eng) => (
                <option key={eng.value} value={eng.value}>
                  {eng.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#FFFFFF1A] text-white hover:bg-[#1C1F26]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            className="bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white rounded-full"
          >
            Add Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TargetsPage() {
  const [accounts] = useState<TargetAccount[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleToggleActive = (id: string) => {
    console.log("Toggle active:", id);
  };

  const handleDelete = (id: string) => {
    console.log("Delete:", id);
    setDeleteConfirm(null);
  };

  const handleCategoryChange = (id: string, category: string) => {
    console.log("Change category:", { id, category });
  };

  const handleEngagementChange = (id: string, level: string) => {
    console.log("Change engagement:", { id, level });
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: '"Bambino New", sans-serif' }}
          >
            Target Accounts
          </h1>
          <p className="text-[#8B98A5]">Manage accounts for reply monitoring</p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white rounded-full"
        >
          Add Account
        </Button>
      </div>

      <AddAccountDialog open={showAddDialog} onOpenChange={setShowAddDialog} />

      {accounts.length === 0 ? (
        <Card className="bg-[#16181C] border-[#FFFFFF1A] border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-[#8B98A5]">No target accounts</p>
            <p className="text-sm text-[#536471] mt-1">
              Add accounts to monitor for replies
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#16181C] border-[#FFFFFF1A]">
          <Table>
            <TableHeader>
              <TableRow className="border-b-[#FFFFFF1A] hover:bg-transparent">
                <TableHead className="text-[#8B98A5]">Username</TableHead>
                <TableHead className="text-[#8B98A5]">Category</TableHead>
                <TableHead className="text-[#8B98A5]">Engagement</TableHead>
                <TableHead className="text-[#8B98A5]">Last Checked</TableHead>
                <TableHead className="text-[#8B98A5]">Active</TableHead>
                <TableHead className="text-[#8B98A5]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow
                  key={account.id}
                  className="border-b-[#FFFFFF1A] hover:bg-[#1C1F26]"
                >
                  <TableCell className="text-white">
                    @{account.xUsername}
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={account.category} />
                  </TableCell>
                  <TableCell>
                    <EngagementBadge level={account.engagementLevel} />
                  </TableCell>
                  <TableCell className="text-[#8B98A5] font-mono text-sm">
                    {formatDate(account.lastCheckedAt)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={account.isActive}
                      onCheckedChange={() => handleToggleActive(account.id)}
                      className={
                        account.isActive ? "bg-[#1D9BF0]" : "bg-[#536471]"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(account.id)}
                      className="text-[#F4212E] hover:text-[#F4212E] hover:bg-[#F4212E]/10"
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent className="bg-[#16181C] border-[#FFFFFF1A]">
          <DialogHeader>
            <DialogTitle className="text-white">Remove Account</DialogTitle>
          </DialogHeader>
          <p className="text-[#8B98A5]">
            Are you sure you want to remove this target account?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="border-[#FFFFFF1A] text-white hover:bg-[#1C1F26]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-[#F4212E] hover:bg-[#E01D28] text-white rounded-full"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
