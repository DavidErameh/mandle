import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("targetAccounts")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("targetAccounts").collect();
  },
});

export const create = mutation({
  args: {
    xUsername: v.string(),
    xUserId: v.string(),
    category: v.union(
      v.literal("thought_leader"),
      v.literal("competitor"),
      v.literal("potential_client"),
      v.literal("community"),
    ),
    engagementLevel: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
    ),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("targetAccounts", {
      xUsername: args.xUsername,
      xUserId: args.xUserId,
      category: args.category,
      engagementLevel: args.engagementLevel,
      isActive: true,
      createdAt: args.createdAt,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("targetAccounts"),
    category: v.optional(
      v.union(
        v.literal("thought_leader"),
        v.literal("competitor"),
        v.literal("potential_client"),
        v.literal("community"),
      ),
    ),
    engagementLevel: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("targetAccounts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const updateLastChecked = mutation({
  args: {
    id: v.id("targetAccounts"),
    lastCheckedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { lastCheckedAt: args.lastCheckedAt });
  },
});
