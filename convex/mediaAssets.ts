import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("mediaAssets").collect();
  },
});

export const getByTag = query({
  args: { tag: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mediaAssets")
      .withIndex("by_tags", (q) => q.eq("tags", args.tag))
      .collect();
  },
});

export const create = mutation({
  args: {
    cloudinaryPublicId: v.string(),
    url: v.string(),
    tags: v.array(v.string()),
    width: v.number(),
    height: v.number(),
    uploadedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("mediaAssets", {
      cloudinaryPublicId: args.cloudinaryPublicId,
      url: args.url,
      tags: args.tags,
      width: args.width,
      height: args.height,
      uploadedAt: args.uploadedAt,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("mediaAssets") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
