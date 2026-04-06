import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getPending = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("contentDrafts")
      .withIndex("by_humanStatus", (q) => q.eq("humanStatus", "pending"))
      .collect();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contentDrafts").collect();
  },
});

export const getApproved = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("contentDrafts")
      .withIndex("by_humanStatus", (q) => q.eq("humanStatus", "approved"))
      .collect();
  },
});

export const create = mutation({
  args: {
    extractedPointId: v.id("extractedPoints"),
    variationNumber: v.number(),
    contentText: v.string(),
    hookUsed: v.string(),
    formatUsed: v.string(),
    charCount: v.number(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("contentDrafts", {
      extractedPointId: args.extractedPointId,
      variationNumber: args.variationNumber,
      contentText: args.contentText,
      hookUsed: args.hookUsed,
      formatUsed: args.formatUsed,
      charCount: args.charCount,
      humanStatus: "pending",
      createdAt: args.createdAt,
    });
  },
});

export const updateReview = mutation({
  args: {
    id: v.id("contentDrafts"),
    brandScore: v.optional(v.number()),
    reviewerApproved: v.optional(v.boolean()),
    ruleViolations: v.optional(v.array(v.string())),
    suggestedEdits: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const updateHumanStatus = mutation({
  args: {
    id: v.id("contentDrafts"),
    humanStatus: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("edited"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { humanStatus: args.humanStatus });
  },
});

export const setMedia = mutation({
  args: {
    id: v.id("contentDrafts"),
    mediaAssetId: v.id("mediaAssets"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { mediaAssetId: args.mediaAssetId });
  },
});

export const setFinalContent = mutation({
  args: {
    id: v.id("contentDrafts"),
    finalContent: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      finalContent: args.finalContent,
      humanStatus: "edited",
    });
  },
});

export const getByExtractedPoint = query({
  args: { extractedPointId: v.id("extractedPoints") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentDrafts")
      .withIndex("by_extractedPointId", (q) =>
        q.eq("extractedPointId", args.extractedPointId),
      )
      .collect();
  },
});
