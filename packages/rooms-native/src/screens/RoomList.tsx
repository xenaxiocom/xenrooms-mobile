// The company's channels and direct messages, sectioned as in the web client's sidebar
// (favourites, the person's own sections, channels, direct messages; account data
// `com.xenaxio.sidebar`). Unread rooms are bold; mentions and direct messages get a count.
import { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useRoomsI18n } from '../i18n/context';
import { badgeOf } from '../helpers';
import type { ChatClient } from '../matrix/client';
import { sidebarGroups } from '../matrix/view';
import { useRoomsTheme } from '../theme-context';
import { useChatClient } from '../useChat';

export interface RoomListProps {
  client: ChatClient;
  onOpen: (roomId: string) => void;
  /** Shown above the list (the app's company header). */
  header?: React.ReactElement | null;
}

export function RoomList({ client, onOpen, header }: RoomListProps) {
  const version = useChatClient(client);
  const theme = useRoomsTheme();
  const { t } = useRoomsI18n();
  const sections = useMemo(() => {
    void version;
    const groups = sidebarGroups([...client.rooms.values()], (r) => client.roomName(r), client.sidebar);
    return [
      { key: 'invites', title: t('chat.invites'), data: groups.invites },
      { key: 'starred', title: t('chat.starred'), data: groups.starred },
      ...groups.custom.map((s) => ({ key: s.id, title: s.name, data: s.rooms })),
      { key: 'channels', title: t('chat.channels'), data: groups.channels },
      { key: 'direct', title: t('chat.direct'), data: groups.direct },
    ].filter((s) => s.data.length > 0);
  }, [client, version, t]);

  if (!client.ready) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.mutedForeground }}>{client.syncError ? t('chat.reconnecting') : t('chat.loading')}</Text>
      </View>
    );
  }

  return (
    <SectionList
      style={{ backgroundColor: theme.background }}
      sections={sections}
      keyExtractor={(room) => room.id}
      ListHeaderComponent={header ?? null}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => <Text style={[styles.section, { color: theme.mutedForeground }]}>{section.title}</Text>}
      renderItem={({ item }) => {
        const unread = client.isUnread(item);
        const badge = badgeOf(item);
        const name = client.roomName(item);
        return (
          <Pressable
            accessibilityRole="button"
            onPress={() => onOpen(item.id)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.muted }]}
          >
            <Text numberOfLines={1} style={[styles.name, { color: unread ? theme.foreground : theme.mutedForeground }, unread && styles.bold]}>
              {item.kind === 'channel' ? `# ${name}` : name}
            </Text>
            {badge > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.destructive }]}>
                <Text style={[styles.badgeText, { color: theme.destructiveForeground }]}>{badge > 99 ? '99+' : badge}</Text>
              </View>
            )}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  section: { fontSize: 13, fontWeight: '600', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 44, gap: 8 },
  name: { flex: 1, fontSize: 16 },
  bold: { fontWeight: '700' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
