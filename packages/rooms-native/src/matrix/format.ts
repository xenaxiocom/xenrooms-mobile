// Ported from the web client (xenaxiocom/webmail, lib/xenaxio/chat/format.ts at 491c2a07d):
// what the composer sends — Slack-like Markdown as plain text plus Matrix HTML, @mentions
// and #channels as links, typed emoticons as emoji — so a message from the phone reads in
// the browser as one written there. Showing incoming HTML is the screens' business.
import { emoticonsToEmoji } from "./emoji";
import { languageOf } from "./snippet";

export interface Mention {
  userId: string;
  displayName: string;
}

/** A channel that "#name" in a message links to. */
export interface ChannelRef {
  roomId: string;
  name: string;
}

/** "@channel" and "@here" notify everyone in the channel (Matrix: a room mention). */
export const ROOM_MENTIONS = ["@channel", "@here"] as const;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const URL_RE = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/g;

/** A Matrix permalink to a room (other clients show it as a room pill). */
export function roomPermalink(roomId: string): string {
  const server = roomId.includes(":") ? roomId.slice(roomId.indexOf(":") + 1) : "";
  return `https://matrix.to/#/${encodeURIComponent(roomId)}${server ? `?via=${encodeURIComponent(server)}` : ""}`;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * "#name" of a known channel becomes a link, as in Slack. The text is
 * HTML-escaped; links go into `links` and leave placeholders, so Markdown
 * markers do not touch them. Not inside words or addresses ("a#b", "/#x", "&#39;").
 */
function linkChannels(escaped: string, channels: ChannelRef[], links: string[]): string {
  let out = escaped;
  for (const ch of [...channels].sort((a, b) => b.name.length - a.name.length)) {
    const label = escapeHtml(`#${ch.name}`);
    if (!ch.name || !out.includes(label)) continue;
    out = out.replace(new RegExp(`(^|[^\\p{L}\\p{N}&#/])${escapeRe(label)}(?![\\p{L}\\p{N}_-])`, "gu"), (_, pre: string) => {
      links.push(`<a href="${roomPermalink(ch.roomId)}">${label}</a>`);
      return `${pre}\uE000${links.length - 1}\uE001`;
    });
  }
  return out;
}

const restoreLinks = (s: string, links: string[]) => s.replace(/\uE000(\d+)\uE001/g, (_, i) => links[Number(i)] as string);

/** Inline Markdown of one line, already HTML-escaped (code spans stay untouched). */
function inline(escaped: string, mentions: Mention[], channels: ChannelRef[] = []): string {
  const parts = escaped.split(/(`[^`]+`)/g);
  return parts
    .map((part) => {
      if (/^`[^`]+`$/.test(part)) return `<code>${part.slice(1, -1)}</code>`;
      let out = part;
      // Links first, so the markers below do not touch addresses.
      const links: string[] = [];
      // Step 99: [text](https://…) from the link button.
      out = out.replace(/\[([^\]\n]{1,300})\]\((https?:\/\/[^\s<>"')]+)\)/g, (_, label: string, url: string) => {
        links.push(`<a href="${url}">${label}</a>`);
        return `\uE000${links.length - 1}\uE001`;
      });
      out = out.replace(URL_RE, (url) => {
        links.push(`<a href="${url}">${url}</a>`);
        return `\uE000${links.length - 1}\uE001`;
      });
      out = linkChannels(out, channels, links);
      out = out
        .replace(/\*\*(?=\S)([^*]*?\S)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^\w*])\*(?=\S)([^*]*?\S)\*(?!\w)/g, "$1<em>$2</em>")
        .replace(/(^|[^\w])_(?=\S)([^_]*?\S)_(?!\w)/g, "$1<em>$2</em>")
        .replace(/~~(?=\S)([^~]*?\S)~~/g, "<del>$1</del>");
      for (const m of [...mentions].sort((a, b) => b.displayName.length - a.displayName.length)) {
        const label = escapeHtml(`@${m.displayName}`);
        out = out.split(label).join(`<a href="https://matrix.to/#/${encodeURIComponent(m.userId)}">${label}</a>`);
      }
      return restoreLinks(out, links);
    })
    .join("");
}

/** Composer text → Matrix HTML (null when the text needs none). */
export function toHtml(text: string, mentions: Mention[] = [], channels: ChannelRef[] = []): string | null {
  const line1 = (l: string) => inline(escapeHtml(l), mentions, channels);
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] as string;
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      const first = line.trim().slice(3);
      if (first.endsWith("```") && first.length > 3) {
        out.push(`<pre><code>${escapeHtml(first.slice(0, -3))}</code></pre>`);
        i++;
        continue;
      }
      // Step 99: ```python names the language (Matrix clients read class="language-…").
      const lang = /^[\w+#.-]{1,20}$/.test(first) ? languageOf(first) : null;
      if (first && !lang) code.push(first);
      i++;
      while (i < lines.length && !(lines[i] as string).trim().startsWith("```")) code.push(lines[i++] as string);
      i++;
      out.push(`<pre><code${lang && lang !== "plaintext" ? ` class="language-${lang}"` : ""}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i] as string)) quote.push((lines[i++] as string).replace(/^>\s?/, ""));
      out.push(`<blockquote>${quote.map((l) => line1(l)).join("<br>")}</blockquote>`);
      continue;
    }
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i] as string)) items.push((lines[i++] as string).replace(/^\s*[-*•]\s+/, ""));
      out.push(`<ul>${items.map((l) => `<li>${line1(l)}</li>`).join("")}</ul>`);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i] as string)) items.push((lines[i++] as string).replace(/^\s*\d+[.)]\s+/, ""));
      out.push(`<ol>${items.map((l) => `<li>${line1(l)}</li>`).join("")}</ol>`);
      continue;
    }
    out.push(line1(line));
    i++;
  }
  // Join plain lines with <br>, but not around block elements.
  let html = "";
  out.forEach((part, idx) => {
    const block = /^<(pre|blockquote|ul|ol)>/.test(part);
    const prevBlock = idx > 0 && /^<(pre|blockquote|ul|ol)>/.test(out[idx - 1] as string);
    if (idx > 0 && !block && !prevBlock) html += "<br>";
    html += part;
  });
  return html === escapeHtml(text).replace(/\n/g, "<br>") ? null : html;
}

/** The content of a text message from the composer; typed emoticons go out as emoji (step 87). */
export function textContent(text: string, mentions: Mention[] = [], channels: ChannelRef[] = []): Record<string, unknown> {
  const body = emoticonsToEmoji(text.trim());
  const used = mentions.filter((m) => body.includes(`@${m.displayName}`));
  const room = ROOM_MENTIONS.some((m) => new RegExp(`(^|\\s)${m}\\b`).test(body));
  const html = toHtml(body, used, channels.filter((c) => c.name && body.includes(`#${c.name}`)));
  return {
    msgtype: "m.text",
    body,
    ...(html ? { format: "org.matrix.custom.html", formatted_body: html } : {}),
    "m.mentions": { ...(used.length ? { user_ids: [...new Set(used.map((m) => m.userId))] } : {}), ...(room ? { room: true } : {}) },
  };
}
