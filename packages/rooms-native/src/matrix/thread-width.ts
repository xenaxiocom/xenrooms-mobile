// Ported from the web client (xenaxiocom/webmail, lib/xenaxio/split.ts and
// lib/xenaxio/chat/thread-width.ts at 491c2a07d): the thread width a person keeps per room
// (account data), kept so the phone does not lose the browser's choice.

export const SPLIT_DEFAULT = 50;
export const SPLIT_MIN = 20;
export const SPLIT_MAX = 80;
/** Neither column gets narrower than this. */
export const SPLIT_COLUMN_MIN_PX = 280;

export function clampSplit(percent: number, areaPx?: number): number {
  let low: number = SPLIT_MIN;
  let high: number = SPLIT_MAX;
  if (areaPx && areaPx > 2 * SPLIT_COLUMN_MIN_PX) {
    const min = (SPLIT_COLUMN_MIN_PX / areaPx) * 100;
    low = Math.max(low, min);
    high = Math.min(high, 100 - min);
  }
  return Math.round(Math.min(high, Math.max(low, percent)) * 10) / 10;
}

/** A saved share: a number within 20–80, anything else is none. */
export function splitOf(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(clampSplit(value)) : null;
}

/** The right column's style while the divider is shown. */
export function splitStyle(percent: number): { width: string; minWidth: number; maxWidth: string } {
  return { width: `${percent}%`, minWidth: SPLIT_COLUMN_MIN_PX, maxWidth: `calc(100% - ${SPLIT_COLUMN_MIN_PX}px)` };
}

/** Account data: `{ rooms: { "!room": percent } }` — the thread column's share of the room. */
export const THREAD_WIDTHS_TYPE = "com.xenaxio.thread_widths";
export const THREAD_WIDTH_DEFAULT = SPLIT_DEFAULT;

/** A person's thread widths from their account data (anything else dropped). */
export function parseThreadWidths(content: Record<string, unknown> | undefined): Record<string, number> {
  const rooms: Record<string, number> = {};
  const raw = content?.rooms;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [roomId, value] of Object.entries(raw as Record<string, unknown>)) {
      const percent = splitOf(value);
      if (roomId.startsWith("!") && percent !== null) rooms[roomId] = percent;
    }
  }
  return rooms;
}

/** Within 20–80 %, and (with the area's width) leaving both columns at least 280 px. */
export const clampThreadWidth = clampSplit;
