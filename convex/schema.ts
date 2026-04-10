import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── FEED SOURCES ──────────────────────────────────────────────────────────
  // Registered RSS feeds and YouTube channels to ingest from.

  feedSources: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("rss"),
      v.literal("youtube_channel"),
      v.literal("youtube_video"),
      v.literal("manual")
    ),
    url: v.string(),
    isActive: v.boolean(),
    lastFetchedAt: v.optional(v.number()), // epoch ms
    fetchIntervalMinutes: v.number(), // default 60
  }),

  // ─── RAW ITEMS ─────────────────────────────────────────────────────────────
  // Raw ingested content before any extraction or filtering.

  rawItems: defineTable({
    sourceId: v.id("feedSources"),
    externalId: v.string(), // Article URL or YouTube video ID
    title: v.string(),
    rawText: v.string(), // Full article body or YT transcript
    publishedAt: v.number(), // epoch ms
    ingestedAt: v.number(), // epoch ms
    processed: v.boolean(), // Has extraction run on this?
    importNote: v.optional(v.string()),
  })
    .index("by_processed", ["processed"])
    .index("by_sourceId", ["sourceId"])
    .index("by_externalId", ["externalId"]),

  // ─── EXTRACTED POINTS ──────────────────────────────────────────────────────
  // Brand-filtered ideas, quotes, data points, and story seeds from raw items.

  extractedPoints: defineTable({
    rawItemId: v.id("rawItems"),
    text: v.string(),
    type: v.union(
      v.literal("mechanism"),
      v.literal("intersection"),
      v.literal("data"),
      v.literal("failure"),
      v.literal("gap"),
      v.literal("translation"),
      v.literal("contrarian")
    ),
    sourceLens: v.optional(v.union(
      v.literal("trending_tech"),
      v.literal("design_craft"),
      v.literal("raw_practitioner"),
      v.literal("unfiltered_opinion"),
      v.literal("general")
    )),
    translationPath: v.optional(v.string()),
    relevanceScore: v.number(), // 1–10, assigned by extractor model
    suggestedAngle: v.string(), // Model's suggested content angle
    usedInGeneration: v.boolean(), // Has generation been triggered?
    createdAt: v.number(), // epoch ms
  })
    .index("by_usedInGeneration", ["usedInGeneration"])
    .index("by_relevanceScore", ["relevanceScore"]),

  // ─── CONTENT DRAFTS ────────────────────────────────────────────────────────
  // Generated content variations. Always created in sets of 3 per point.

  contentDrafts: defineTable({
    extractedPointId: v.id("extractedPoints"),
    variationNumber: v.number(), // 1, 2, or 3
    contentText: v.string(),
    hookUsed: v.string(), // Hook template name
    formatUsed: v.string(), // Format template name
    charCount: v.number(),

    // Brand review fields — populated after AI review stage
    brandScore: v.optional(v.number()), // 1–10
    reviewerApproved: v.optional(v.boolean()),
    ruleViolations: v.optional(v.array(v.string())),
    suggestedEdits: v.optional(v.array(v.string())),

    // Human review fields
    humanStatus: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("edited"),
    ),
    finalContent: v.optional(v.string()), // Set after human edits
    mediaAssetId: v.optional(v.id("mediaAssets")),
    createdAt: v.number(),
  })
    .index("by_humanStatus", ["humanStatus"])
    .index("by_extractedPointId", ["extractedPointId"])
    .index("by_reviewerApproved", ["reviewerApproved"]),

  // ─── POST QUEUE ────────────────────────────────────────────────────────────
  // Approved posts waiting to be scheduled and sent via X API.

  postQueue: defineTable({
    draftId: v.id("contentDrafts"),
    scheduledAt: v.number(), // epoch ms — when to post
    postType: v.union(v.literal("feed"), v.literal("community")),
    communityId: v.optional(v.string()), // X Community ID if community post
    status: v.union(
      v.literal("queued"),
      v.literal("posted"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    xPostId: v.optional(v.string()), // Returned by X API on success
    postedAt: v.optional(v.number()), // epoch ms
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_status_scheduledAt", ["status", "scheduledAt"])
    .index("by_scheduledAt", ["scheduledAt"]),

  // ─── MEDIA ASSETS ──────────────────────────────────────────────────────────
  // Images stored in Cloudinary, registered here for the media picker.

  mediaAssets: defineTable({
    cloudinaryPublicId: v.string(),
    url: v.string(), // Cloudinary delivery URL
    tags: v.array(v.string()), // Emotion / topic / vibe tags
    width: v.number(),
    height: v.number(),
    uploadedAt: v.number(), // epoch ms
  }).index("by_tags", ["tags"]),

  // ─── TARGET ACCOUNTS ───────────────────────────────────────────────────────
  // Curated X accounts the reply system monitors.

  targetAccounts: defineTable({
    xUsername: v.string(), // Without @
    xUserId: v.string(), // X platform user ID
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
    isActive: v.boolean(),
    lastCheckedAt: v.optional(v.number()), // epoch ms
    createdAt: v.number(),
  }).index("by_isActive", ["isActive"]),

  // ─── REPLY DRAFTS ──────────────────────────────────────────────────────────
  // AI-generated reply options for target account tweets. Always 3 options.

  replyDrafts: defineTable({
    targetAccountId: v.id("targetAccounts"),
    sourceTweetId: v.string(), // The tweet being replied to
    sourceTweetText: v.string(),
    replyAgreeExtend: v.string(), // Option 1: agree + add value
    replyContrarian: v.string(), // Option 2: respectful pushback
    replyCuriosityHook: v.string(), // Option 3: question to engage
    humanStatus: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    selectedReply: v.optional(v.string()), // Final text after human edit
    xReplyId: v.optional(v.string()), // X API ID after posting
    postedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_humanStatus", ["humanStatus"])
    .index("by_targetAccountId", ["targetAccountId"]),

  // ─── POST PERFORMANCE ──────────────────────────────────────────────────────
  // Basic metrics fetched from X API after posting.

  postPerformance: defineTable({
    queueId: v.id("postQueue"),
    xPostId: v.string(),
    impressions: v.optional(v.number()),
    likes: v.optional(v.number()),
    reposts: v.optional(v.number()),
    repliesCount: v.optional(v.number()),
    fetchedAt: v.number(), // epoch ms
  }).index("by_queueId", ["queueId"]),

  // ─── SYSTEM CONFIG ───────────────────────────────────────────────────────────
  // Key-value store for system-wide settings (e.g., REPLIES_ENABLED toggle).

  systemConfig: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(), // epoch ms
  }).index("by_key", ["key"]),
});
