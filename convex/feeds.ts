import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("feedSources").collect();
  },
});

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("feedSources")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("rss"), v.literal("youtube")),
    url: v.string(),
    isActive: v.boolean(),
    fetchIntervalMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("feedSources", {
      name: args.name,
      type: args.type,
      url: args.url,
      isActive: args.isActive,
      fetchIntervalMinutes: args.fetchIntervalMinutes,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("feedSources"),
    name: v.optional(v.string()),
    type: v.optional(v.union(v.literal("rss"), v.literal("youtube"))),
    url: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    fetchIntervalMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("feedSources") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const updateLastFetched = mutation({
  args: {
    id: v.id("feedSources"),
    lastFetchedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { lastFetchedAt: args.lastFetchedAt });
  },
});
