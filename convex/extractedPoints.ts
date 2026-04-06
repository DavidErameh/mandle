import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getUnused = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("extractedPoints")
      .withIndex("by_usedInGeneration", (q) => q.eq("usedInGeneration", false))
      .collect();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("extractedPoints").collect();
  },
});

export const create = mutation({
  args: {
    rawItemId: v.id("rawItems"),
    text: v.string(),
    type: v.union(
      v.literal("idea"),
      v.literal("quote"),
      v.literal("data"),
      v.literal("story"),
    ),
    relevanceScore: v.number(),
    suggestedAngle: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("extractedPoints", {
      rawItemId: args.rawItemId,
      text: args.text,
      type: args.type,
      relevanceScore: args.relevanceScore,
      suggestedAngle: args.suggestedAngle,
      usedInGeneration: false,
      createdAt: args.createdAt,
    });
  },
});

export const markUsed = mutation({
  args: { id: v.id("extractedPoints") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { usedInGeneration: true });
  },
});

export const getByScore = query({
  args: { minScore: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("extractedPoints")
      .withIndex("by_relevanceScore", (q) =>
        q.gte("relevanceScore", args.minScore),
      )
      .collect();
  },
});
