/**
 * API client for Mandle backend.
 *
 * Handles communication with FastAPI endpoints for operations
 * that require backend processing.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_KEY = process.env.INTERNAL_API_KEY || "";

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export async function triggerGeneration(pointId: string) {
  return fetchApi<{ status: string; point_id: string; drafts_created: number }>(
    `/api/v1/inspire/points/${pointId}/generate`,
    { method: "POST" },
  );
}

export async function uploadMedia(file: File, tags: string[]) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("tags", tags.join(","));

  const response = await fetch(`${API_URL}/api/v1/media`, {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
}

export async function approveReply(replyId: string, selectedReply: string) {
  return fetchApi<{ status: string; reply_id: string }>(
    `/api/v1/replies/drafts/${replyId}/approve`,
    {
      method: "POST",
      body: JSON.stringify({ selected_reply: selectedReply }),
    },
  );
}

export async function rejectReply(replyId: string) {
  return fetchApi<{ status: string; reply_id: string }>(
    `/api/v1/replies/drafts/${replyId}/reject`,
    { method: "POST" },
  );
}

export async function fetchPromptRegistry() {
  return fetchApi<{ version: string; prompts: Record<string, any> }>(
    "/api/v1/prompts/registry",
  );
}

export async function fetchPromptChangelog() {
  return fetchApi<{ content: string }>("/api/v1/prompts/changelog");
}

export async function fetchQueueStats() {
  return fetchApi<{
    daily_count: number;
    daily_limit: number;
    posting_window: { start: string; end: string };
  }>("/api/v1/queue/stats");
}

export async function approveDraft(
  draftId: string,
  scheduledAt: number,
  postType: string,
  communityId?: string,
  mediaAssetId?: string,
) {
  return fetchApi<{ status: string; draft_id: string; queue_id: string }>(
    `/api/v1/content/drafts/${draftId}/approve`,
    {
      method: "POST",
      body: JSON.stringify({
        scheduled_at: scheduledAt,
        post_type: postType,
        community_id: communityId,
        media_asset_id: mediaAssetId,
      }),
    },
  );
}

export async function rejectDraft(draftId: string) {
  return fetchApi<{ status: string; draft_id: string }>(
    `/api/v1/content/drafts/${draftId}/reject`,
    { method: "POST" },
  );
}

export async function cancelQueueItem(queueId: string) {
  return fetchApi<void>(`/api/v1/queue/${queueId}`, {
    method: "DELETE",
  });
}

export async function rescheduleQueueItem(
  queueId: string,
  scheduledAt: number,
) {
  return fetchApi<{ status: string }>(`/api/v1/queue/${queueId}`, {
    method: "PATCH",
    body: JSON.stringify({ scheduled_at: scheduledAt }),
  });
}

export async function addTargetAccount(
  username: string,
  category: string,
  engagementLevel: string,
) {
  return fetchApi<{ id: string }>("/api/v1/targets", {
    method: "POST",
    body: JSON.stringify({
      x_username: username,
      x_user_id: "auto",
      category,
      engagement_level: engagementLevel,
    }),
  });
}

export async function updateTargetAccount(
  targetId: string,
  updates: {
    category?: string;
    engagement_level?: string;
    is_active?: boolean;
  },
) {
  return fetchApi<{ id: string }>(`/api/v1/targets/${targetId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteTargetAccount(targetId: string) {
  return fetchApi<void>(`/api/v1/targets/${targetId}`, {
    method: "DELETE",
  });
}

export async function addFeed(
  name: string,
  feedType: string,
  url: string,
  fetchIntervalMinutes: number = 60,
) {
  return fetchApi<{ id: string }>("/api/v1/feeds", {
    method: "POST",
    body: JSON.stringify({
      name,
      feed_type: feedType,
      url,
      is_active: true,
      fetch_interval_minutes: fetchIntervalMinutes,
    }),
  });
}

export async function deleteFeed(feedId: string) {
  return fetchApi<void>(`/api/v1/feeds/${feedId}`, {
    method: "DELETE",
  });
}

export async function toggleFeed(feedId: string, isActive: boolean) {
  return fetchApi<{ id: string }>(`/api/v1/feeds/${feedId}`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
}
