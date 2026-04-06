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
    type: v.union(v.literal("rss"), v.literal("youtube_channel"), v.literal("youtube_video"), v.literal("manual")),
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
    type: v.optional(v.union(v.literal("rss"), v.literal("youtube_channel"), v.literal("youtube_video"), v.literal("manual"))),
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

export const getManualSourceId = query({
  args: {},
  handler: async (ctx) => {
    const source = await ctx.db
      .query("feedSources")
      .filter((q) => q.eq(q.field("type"), "manual"))
      .first();
    return source?._id ?? null;
  },
});

export const migrateYoutubeType = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("feedSources").collect();
    let migratedCount = 0;
    for (const doc of all) {
      if ((doc.type as string) === "youtube") {
        await ctx.db.patch(doc._id, { type: "youtube_channel" as any });
        migratedCount++;
      }
    }
    return `Migrated ${migratedCount} feedSources`;
  },
});

export const seedManualSource = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("feedSources")
      .filter((q) => q.eq(q.field("type"), "manual"))
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("feedSources", {
      name: "Manual Import",
      type: "manual",
      url: "",
      isActive: true,
      fetchIntervalMinutes: 0,
    });
  },
});
