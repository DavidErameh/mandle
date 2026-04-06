import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getPending = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("replyDrafts")
      .withIndex("by_humanStatus", (q) => q.eq("humanStatus", "pending"))
      .collect();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("replyDrafts").collect();
  },
});

export const create = mutation({
  args: {
    targetAccountId: v.id("targetAccounts"),
    sourceTweetId: v.string(),
    sourceTweetText: v.string(),
    replyAgreeExtend: v.string(),
    replyContrarian: v.string(),
    replyCuriosityHook: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("replyDrafts", {
      targetAccountId: args.targetAccountId,
      sourceTweetId: args.sourceTweetId,
      sourceTweetText: args.sourceTweetText,
      replyAgreeExtend: args.replyAgreeExtend,
      replyContrarian: args.replyContrarian,
      replyCuriosityHook: args.replyCuriosityHook,
      humanStatus: "pending",
      createdAt: args.createdAt,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("replyDrafts"),
    humanStatus: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { humanStatus: args.humanStatus });
  },
});

export const setSelected = mutation({
  args: {
    id: v.id("replyDrafts"),
    selectedReply: v.string(),
    xReplyId: v.optional(v.string()),
    postedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const getByAccount = query({
  args: { targetAccountId: v.id("targetAccounts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("replyDrafts")
      .withIndex("by_targetAccountId", (q) =>
        q.eq("targetAccountId", args.targetAccountId),
      )
      .collect();
  },
});
