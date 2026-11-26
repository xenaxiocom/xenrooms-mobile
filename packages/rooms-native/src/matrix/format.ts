// From the web client (xenaxiocom/webmail, lib/xenaxio/chat/format.ts): the channel a
// message can link to (#channel). The web's HTML formatting (DOMPurify) stays in the web.
export interface ChannelRef {
  roomId: string;
  name: string;
}
