import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    queueId: v.id("postQueue"),
    xPostId: v.string(),
    fetchedAt: v.number(),
    impressions: v.optional(v.number()),
    likes: v.optional(v.number()),
    reposts: v.optional(v.number()),
    repliesCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("postPerformance", {
      queueId: args.queueId,
      xPostId: args.xPostId,
      fetchedAt: args.fetchedAt,
      impressions: args.impressions,
      likes: args.likes,
      reposts: args.reposts,
      repliesCount: args.repliesCount,
    });
  },
});

export const getByQueue = query({
  args: { queueId: v.id("postQueue") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("postPerformance")
      .withIndex("by_queueId", (q) => q.eq("queueId", args.queueId))
      .collect();
  },
});
