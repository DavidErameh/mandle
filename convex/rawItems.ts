import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getUnprocessed = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("rawItems")
      .withIndex("by_processed", (q) => q.eq("processed", false))
      .collect();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("rawItems").collect();
  },
});

export const create = mutation({
  args: {
    sourceId: v.id("feedSources"),
    externalId: v.string(),
    title: v.string(),
    rawText: v.string(),
    publishedAt: v.number(),
    ingestedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("rawItems", {
      sourceId: args.sourceId,
      externalId: args.externalId,
      title: args.title,
      rawText: args.rawText,
      publishedAt: args.publishedAt,
      ingestedAt: args.ingestedAt,
      processed: false,
    });
  },
});

export const markProcessed = mutation({
  args: { id: v.id("rawItems") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { processed: true });
  },
});

export const getBySource = query({
  args: { sourceId: v.id("feedSources") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rawItems")
      .withIndex("by_sourceId", (q) => q.eq("sourceId", args.sourceId))
      .collect();
  },
});

export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rawItems")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});
