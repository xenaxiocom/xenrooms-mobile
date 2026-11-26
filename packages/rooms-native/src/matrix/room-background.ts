// Ported from the web client (xenaxiocom/webmail, lib/xenaxio/chat/room-background.ts at
// 491c2a07d): the channel backgrounds as room state and the person's own choices (account data).
// The drawing of a background (CSS in the web) is the screens' business, not here.
import { parseMxc } from './api';

/** Room state: `{ background: <code> }` or `{ image: "mxc://…" }` (an uploaded picture); neither — no background. */
export const BACKGROUND_TYPE = "com.xenaxio.background";
/** Account data: the person's own view of channel backgrounds. */
export const ROOM_BACKGROUNDS_TYPE = "com.xenaxio.room_backgrounds";

/** In the person's choices: no background in this channel (the default look). */
export const DEFAULT_LOOK = "default";
/** A person's choice for one channel: follow the channel, the default look, or a code. */
export const FOLLOW_CHANNEL = "channel";

export interface RoomBackgrounds {
  hideAll: boolean;
  /** Room id → "default" or a background code. */
  rooms: Record<string, string>;
}

export const NO_ROOM_BACKGROUNDS: RoomBackgrounds = { hideAll: false, rooms: {} };

const CODE = /^[a-z0-9-]{1,40}$/;

/** The code in a channel's background state, or null (anything else is no background). */
export function backgroundCodeOf(content: Record<string, unknown> | undefined): string | null {
  const code = content?.background;
  return typeof code === "string" && CODE.test(code) ? code : null;
}

/** The uploaded picture in a room's background state ("mxc://…"), or null. */
export function backgroundImageOf(content: Record<string, unknown> | undefined): string | null {
  const image = content?.image;
  return typeof image === "string" && image.length <= 300 && parseMxc(image) ? image : null;
}

/** The person's choices from account data; anything odd is dropped (another client may have written it). */
export function parseRoomBackgrounds(content: Record<string, unknown> | undefined): RoomBackgrounds {
  const rooms: Record<string, string> = {};
  const raw = content?.rooms;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [roomId, value] of Object.entries(raw as Record<string, unknown>)) {
      if (roomId.startsWith("!") && typeof value === "string" && (value === DEFAULT_LOOK || CODE.test(value))) rooms[roomId] = value;
    }
  }
  return { hideAll: content?.hideAll === true, rooms };
}

/** The person's choice for a channel: "channel", "default" or a code. */
export function myChoiceFor(mine: RoomBackgrounds, roomId: string): string {
  return mine.rooms[roomId] ?? FOLLOW_CHANNEL;
}

/** The person's choices with a new one for a channel. */
export function withMyChoice(mine: RoomBackgrounds, roomId: string, choice: string): RoomBackgrounds {
  const rooms = { ...mine.rooms };
  if (choice === FOLLOW_CHANNEL) delete rooms[roomId];
  else rooms[roomId] = choice;
  return { ...mine, rooms };
}
