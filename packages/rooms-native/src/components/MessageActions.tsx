// What a long press on a message offers, as the web client's action sheet on phones
// (step 99, part 0): quick reactions, copy, and for one's own message edit and delete.
import * as Clipboard from 'expo-clipboard';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRoomsI18n } from '../i18n/context';
import type { Message } from '../matrix/client';
import { useRoomsTheme } from '../theme-context';

/** The reactions offered first (the web client's quick row). */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '😮', '🙏'];

export interface MessageActionsProps {
  message: Message | null;
  own: boolean;
  onClose: () => void;
  onReact: (key: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function MessageActions({ message, own, onClose, onReact, onEdit, onDelete }: MessageActionsProps) {
  const theme = useRoomsTheme();
  const { t } = useRoomsI18n();
  const text = typeof message?.content.body === 'string' ? message.content.body : '';
  const isText = message?.content.msgtype === 'm.text' || message?.content.msgtype === 'm.emote' || message?.content.msgtype === 'm.notice';
  const live = !!message && !message.redacted && !message.id.startsWith('~');

  const confirmDelete = () =>
    Alert.alert(t('chat.delete'), t('chat.delete_confirm'), [
      { text: t('chat.cancel'), style: 'cancel' },
      { text: t('chat.delete'), style: 'destructive', onPress: onDelete },
    ]);

  const row = (label: string, onPress: () => void, danger = false) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        onClose();
        onPress();
      }}
      style={({ pressed }) => [styles.action, pressed && { backgroundColor: theme.muted }]}
    >
      <Text style={[styles.actionText, { color: danger ? theme.destructive : theme.foreground }]}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={!!message} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('chat.cancel')} />
      <View style={[styles.sheet, { backgroundColor: theme.popover, borderColor: theme.border }]} accessibilityLabel={t('chat.message_actions')}>
        {live && (
          <View style={styles.reactions}>
            {QUICK_REACTIONS.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`${t('chat.react')} ${key}`}
                onPress={() => {
                  onClose();
                  onReact(key);
                }}
                style={({ pressed }) => [styles.reaction, { backgroundColor: pressed ? theme.accent : theme.muted }]}
              >
                <Text style={styles.reactionText}>{key}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {!!text && !message?.redacted && row(t('chat.copy_text'), () => void Clipboard.setStringAsync(text))}
        {live && own && isText && row(t('chat.edit'), onEdit)}
        {live && own && row(t('chat.delete'), confirmDelete, true)}
        {row(t('chat.cancel'), () => undefined)}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingBottom: 24, paddingTop: 8 },
  reactions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 12, paddingVertical: 8 },
  reaction: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  reactionText: { fontSize: 22 },
  action: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 20 },
  actionText: { fontSize: 16 },
});
