import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getDue = query({
  args: { currentTime: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("postQueue")
      .withIndex("by_status_scheduledAt", (q) =>
        q.eq("status", "queued").lte("scheduledAt", args.currentTime),
      )
      .collect();
  },
});

export const getQueued = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("postQueue")
      .withIndex("by_status", (q) => q.eq("status", "queued"))
      .collect();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("postQueue").collect();
  },
});

export const create = mutation({
  args: {
    draftId: v.id("contentDrafts"),
    scheduledAt: v.number(),
    postType: v.union(v.literal("feed"), v.literal("community")),
    communityId: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("postQueue", {
      draftId: args.draftId,
      scheduledAt: args.scheduledAt,
      postType: args.postType,
      communityId: args.communityId,
      status: "queued",
      createdAt: args.createdAt,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("postQueue"),
    status: v.union(
      v.literal("queued"),
      v.literal("posted"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    xPostId: v.optional(v.string()),
    postedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const getDailyCount = query({
  args: {
    dayStartMs: v.number(),
    dayEndMs: v.number(),
  },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("postQueue")
      .withIndex("by_status", (q) => q.eq("status", "posted"))
      .filter((q) =>
        q.and(
          q.gte(q.field("postedAt"), args.dayStartMs),
          q.lte(q.field("postedAt"), args.dayEndMs),
        ),
      )
      .collect();
    return posts.length;
  },
});

export const cancel = mutation({
  args: { id: v.id("postQueue") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "cancelled" });
  },
});
