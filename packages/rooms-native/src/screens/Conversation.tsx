// One channel or direct conversation: the timeline (older messages load when scrolling up),
// sending, editing and deleting one's own messages, reactions, @mentions, and the read mark
// while the conversation is on screen. Threads, files and voice come with R2.
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MessageActions } from '../components/MessageActions';
import type { RoomsHost } from '../host';
import { useRoomsI18n } from '../i18n/context';
import { mediaSource } from '../matrix/api';
import type { ChatClient, Message } from '../matrix/client';
import { type Mention, textContent } from '../matrix/format';
import { mentionCandidates, typingText } from '../helpers';
import { suggestionAt, timelineRows, type TimelineRow } from '../matrix/view';
import { useRoomsTheme } from '../theme-context';
import { useChatClient } from '../useChat';

export interface ConversationProps {
  client: ChatClient;
  host: RoomsHost;
  roomId: string;
  /** False while another screen covers it: then nothing is marked read. */
  active?: boolean;
}

export function Conversation({ client, host, roomId, active = true }: ConversationProps) {
  const version = useChatClient(client);
  const theme = useRoomsTheme();
  const { t, locale } = useRoomsI18n();
  const room = client.rooms.get(roomId) ?? null;
  const [text, setText] = useState('');
  const [cursor, setCursor] = useState(0);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [editing, setEditing] = useState<Message | null>(null);
  const [acting, setActing] = useState<Message | null>(null);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    void client.loadMembers(roomId).catch(() => undefined);
  }, [client, roomId]);

  const rows = useMemo(() => {
    void version;
    if (!room) return [];
    const messages = room.timeline.filter((m) => m.type === 'm.room.message');
    return timelineRows(messages, { readUpTo: room.readUpTo, me: client.userId, hasUnread: client.isUnread(room) }).reverse();
  }, [client, room, version]);

  // The newest message on screen is read.
  const newest = room?.timeline.at(-1)?.id;
  useEffect(() => {
    if (active && newest && !newest.startsWith('~')) void client.markRead(roomId).catch(() => undefined);
  }, [active, client, roomId, newest]);

  if (!room) return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  const name = client.roomName(room);
  const suggestion = suggestionAt(text, cursor);
  const candidates = suggestion?.trigger === '@' ? mentionCandidates(room, client.userId, suggestion.query) : [];
  const typing = typingText(room.typing.filter((u) => u !== client.userId).map((u) => client.displayName(u, room)), t);

  const pick = (m: Mention) => {
    if (!suggestion) return;
    const next = `${text.slice(0, suggestion.start)}@${m.displayName} ${text.slice(cursor)}`;
    setText(next);
    setMentions((list) => (list.some((x) => x.userId === m.userId) ? list : [...list, m]));
  };

  const send = () => {
    const body = text.trim();
    if (!body) return;
    const content = textContent(body, mentions, client.channelRefs());
    if (editing) void client.edit(roomId, editing.id, content).catch(() => undefined);
    else void client.send(roomId, content).catch(() => undefined);
    setText('');
    setMentions([]);
    setEditing(null);
    void client.setTyping(roomId, false).catch(() => undefined);
  };

  const day = (ts: number) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(Date.now() - 86_400_000);
    if (d.toDateString() === today.toDateString()) return t('chat.today');
    if (d.toDateString() === yesterday.toDateString()) return t('chat.yesterday');
    return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  };
  const time = (ts: number) => new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  const body = (m: Message) => {
    if (m.redacted) return <Text style={[styles.body, styles.muted, { color: theme.mutedForeground }]}>{t('chat.deleted')}</Text>;
    const c = m.content;
    if (c.msgtype === 'm.image') {
      const source = mediaSource(host, typeof c.url === 'string' ? c.url : null, { thumbnail: { width: 480, height: 360 } });
      if (source) return <Image source={source} style={[styles.image, { backgroundColor: theme.muted }]} resizeMode="cover" accessibilityLabel={String(c.body ?? '')} />;
    }
    const label = typeof c.body === 'string' ? c.body : '';
    const file = c.msgtype === 'm.file' || c.msgtype === 'm.video' || c.msgtype === 'm.audio';
    return (
      <Text style={[styles.body, { color: theme.foreground }]} selectable>
        {file ? `📎 ${label}` : label}
        {m.edited ? <Text style={{ color: theme.mutedForeground }}> {t('chat.edited')}</Text> : null}
      </Text>
    );
  };

  const renderRow = ({ item }: { item: TimelineRow }) => {
    if (item.kind === 'day') return <Text style={[styles.day, { color: theme.mutedForeground }]}>{day(item.day)}</Text>;
    if (item.kind === 'new')
      return (
        <View style={styles.newRow}>
          <View style={[styles.newLine, { backgroundColor: theme.destructive }]} />
          <Text style={[styles.newText, { color: theme.destructive }]}>{t('chat.new_line')}</Text>
        </View>
      );
    const m = item.message;
    const reactions = Object.entries(m.reactions).filter(([, who]) => who.length > 0);
    return (
      <Pressable
        onLongPress={() => setActing(m)}
        delayLongPress={350}
        style={[styles.message, !item.continued && styles.first, m.status === 'sending' && styles.sending]}
        accessibilityHint={t('chat.message_actions')}
      >
        {!item.continued && (
          <View style={styles.head}>
            <Text style={[styles.sender, { color: theme.foreground }]} numberOfLines={1}>
              {client.displayName(m.sender, room)}
            </Text>
            <Text style={[styles.time, { color: theme.mutedForeground }]}>{time(m.ts)}</Text>
          </View>
        )}
        {body(m)}
        {m.status === 'failed' && (
          <Pressable onPress={() => void client.retry(roomId, m.id)} accessibilityRole="button">
            <Text style={[styles.failed, { color: theme.destructive }]}>
              {t('chat.failed')} {t('chat.retry')}
            </Text>
          </Pressable>
        )}
        {reactions.length > 0 && (
          <View style={styles.reactions}>
            {reactions.map(([key, who]) => {
              const mine = who.includes(client.userId);
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  onPress={() => void client.toggleReaction(roomId, m.id, key).catch(() => undefined)}
                  style={[styles.chip, { borderColor: mine ? theme.primary : theme.border, backgroundColor: mine ? theme.accent : theme.card }]}
                >
                  <Text style={{ color: mine ? theme.accentForeground : theme.foreground }}>
                    {key} {who.length}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <FlatList
        inverted
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={renderRow}
        onEndReached={() => {
          if (!room.atStart) void client.loadOlder(roomId).catch(() => undefined);
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={room.atStart ? <Text style={[styles.beginning, { color: theme.mutedForeground }]}>{t(room.kind === 'dm' ? 'chat.beginning_dm' : 'chat.beginning', { name })}</Text> : null}
        contentContainerStyle={styles.list}
      />
      {typing && <Text style={[styles.typing, { color: theme.mutedForeground }]}>{typing}</Text>}
      {candidates.length > 0 && (
        <View style={[styles.suggestions, { backgroundColor: theme.popover, borderColor: theme.border }]}>
          {candidates.map((m) => (
            <Pressable key={m.userId} onPress={() => pick(m)} style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: theme.muted }]} accessibilityRole="button">
              <Text style={{ color: theme.foreground }}>{m.displayName}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {editing && (
        <View style={[styles.editing, { backgroundColor: theme.muted }]}>
          <Text style={{ color: theme.mutedForeground, flex: 1 }}>{t('chat.edit')}</Text>
          <Pressable
            onPress={() => {
              setEditing(null);
              setText('');
            }}
            accessibilityRole="button"
          >
            <Text style={{ color: theme.primary }}>{t('chat.cancel')}</Text>
          </Pressable>
        </View>
      )}
      <View style={[styles.composer, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <TextInput
          ref={input}
          value={text}
          onChangeText={(v) => {
            setText(v);
            void client.setTyping(roomId, v.length > 0).catch(() => undefined);
          }}
          onSelectionChange={(e) => setCursor(e.nativeEvent.selection.end)}
          placeholder={t('chat.composer_placeholder', { name: room.kind === 'channel' ? `#${name}` : name })}
          placeholderTextColor={theme.mutedForeground}
          multiline
          style={[styles.input, { color: theme.foreground }]}
        />
        <Pressable onPress={send} disabled={!text.trim()} accessibilityRole="button" accessibilityLabel={t('chat.send')} style={[styles.send, { backgroundColor: text.trim() ? theme.primary : theme.muted }]}>
          <Text style={{ color: text.trim() ? theme.primaryForeground : theme.mutedForeground, fontWeight: '600' }}>{t('chat.send')}</Text>
        </Pressable>
      </View>
      <MessageActions
        message={acting}
        own={acting?.sender === client.userId}
        onClose={() => setActing(null)}
        onReact={(key) => acting && void client.toggleReaction(roomId, acting.id, key).catch(() => undefined)}
        onEdit={() => {
          if (!acting) return;
          setEditing(acting);
          setText(typeof acting.content.body === 'string' ? acting.content.body : '');
          input.current?.focus();
        }}
        onDelete={() => acting && void client.remove(roomId, acting.id).catch(() => undefined)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 8 },
  day: { textAlign: 'center', fontSize: 12, fontWeight: '600', marginVertical: 12 },
  newRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginVertical: 6, gap: 8 },
  newLine: { flex: 1, height: StyleSheet.hairlineWidth },
  newText: { fontSize: 12, fontWeight: '700' },
  message: { paddingHorizontal: 16, paddingVertical: 2 },
  first: { paddingTop: 10 },
  sending: { opacity: 0.6 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 2 },
  sender: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  time: { fontSize: 12 },
  body: { fontSize: 16, lineHeight: 22 },
  muted: { fontStyle: 'italic' },
  image: { width: 240, height: 180, borderRadius: 8, marginTop: 4 },
  failed: { fontSize: 13, marginTop: 2 },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  beginning: { textAlign: 'center', fontSize: 13, padding: 16 },
  typing: { fontSize: 12, paddingHorizontal: 16, paddingBottom: 4 },
  suggestions: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  suggestion: { paddingHorizontal: 16, minHeight: 40, justifyContent: 'center' },
  editing: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 8, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 40, maxHeight: 140, fontSize: 16, paddingHorizontal: 8, paddingVertical: 8 },
  send: { height: 40, paddingHorizontal: 14, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
