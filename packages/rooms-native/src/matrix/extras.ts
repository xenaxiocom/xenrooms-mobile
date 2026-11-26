// Ported from the web client (xenaxiocom/webmail, lib/xenaxio/chat/extras.ts at 491c2a07d):
// the room state types of Rooms (voice channel, forum, canvas, bookmarks) and their parsing.
// The web's stores and requests around them stay in the web.

/** Our room state: a voice channel (Discord), a forum (Discord), a canvas and bookmarks (Slack). */
export const VOICE_TYPE = "com.xenaxio.voice";
export const FORUM_TYPE = "com.xenaxio.forum";
export const CANVAS_TYPE = "com.xenaxio.canvas";
export const BOOKMARKS_TYPE = "com.xenaxio.bookmarks";
/** A forum post: a message with a title and tags; its replies are the thread. */
export const POST_FIELD = "com.xenaxio.post";

export interface Bookmark {
  title: string;
  url: string;
}

export interface ForumPost {
  title: string;
  tags: string[];
}

/**
 * Step 105: an edit keeps the post's title and tags when the new content has
 * none (an edit from an older client or another Matrix app); before, the post
 * vanished from the forum after an edit.
 */
export function keepPost(next: Record<string, unknown>, previous: Record<string, unknown>): Record<string, unknown> {
  return next[POST_FIELD] === undefined && previous[POST_FIELD] !== undefined ? { ...next, [POST_FIELD]: previous[POST_FIELD] } : next;
}

/** Bookmarks from room state: https links only. */
export function bookmarksOf(content: Record<string, unknown> | undefined): Bookmark[] {
  const items = (content?.items ?? []) as unknown;
  if (!Array.isArray(items)) return [];
  return items
    .filter((b): b is { title?: unknown; url?: unknown } => !!b && typeof b === "object")
    .map((b) => ({ title: typeof b.title === "string" ? b.title.trim().slice(0, 80) : "", url: typeof b.url === "string" ? b.url.trim() : "" }))
    .filter((b) => /^https:\/\/[^\s<>"']+$/.test(b.url))
    .map((b) => ({ ...b, title: b.title || b.url.replace(/^https:\/\//, "").slice(0, 80) }))
    .slice(0, 20);
}
