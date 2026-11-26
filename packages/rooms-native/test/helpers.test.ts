import { describe, expect, it } from 'vitest';
import { badgeOf, mentionCandidates, typingText } from '../src/helpers';
import { textContent } from '../src/matrix/format';
import type { Member } from '../src/matrix/client';

const members = (list: [string, string, Member['membership']][]) => ({ members: new Map(list.map(([userId, displayName, membership]) => [userId, { userId, displayName, membership }])) });

describe('screens without React Native', () => {
  it('counts mentions in channels and every unread message in conversations', () => {
    expect(badgeOf({ kind: 'channel', notifications: 5, highlights: 1 })).toBe(1);
    expect(badgeOf({ kind: 'dm', notifications: 3, highlights: 0 })).toBe(3);
  });

  it('"@" offers members who joined, not oneself', () => {
    const room = members([
      ['@max:acme.de', 'Max', 'join'],
      ['@anna:acme.de', 'Anna Schmidt', 'join'],
      ['@ann:acme.de', 'Ann Leave', 'leave'],
    ]);
    expect(mentionCandidates(room, '@max:acme.de', 'an').map((m) => m.userId)).toEqual(['@anna:acme.de']);
  });

  it('says who is typing as the web client does', () => {
    const t = (key: string, p?: Record<string, string>) => `${key}:${Object.values(p ?? {}).join(',')}`;
    expect(typingText([], t)).toBeNull();
    expect(typingText(['Anna'], t)).toBe('chat.typing_one:Anna');
    expect(typingText(['Anna', 'Tom'], t)).toBe('chat.typing_two:Anna,Tom');
    expect(typingText(['A', 'B', 'C'], t)).toBe('chat.typing_many:');
  });

  it('sends a message as the web composer does: mention as link and in m.mentions', () => {
    const content = textContent('Hallo @Anna Schmidt **jetzt**', [{ userId: '@anna:acme.de', displayName: 'Anna Schmidt' }]);
    expect(content).toMatchObject({ msgtype: 'm.text', body: 'Hallo @Anna Schmidt **jetzt**', format: 'org.matrix.custom.html', 'm.mentions': { user_ids: ['@anna:acme.de'] } });
    expect(content.formatted_body).toBe('Hallo <a href="https://matrix.to/#/%40anna%3Aacme.de">@Anna Schmidt</a> <strong>jetzt</strong>');
  });
});
