// A company's logo on its colour, or its initial; the red count of the others' news.
import { useRoomsTheme } from '@xenaxio/rooms-native';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { Account } from './account';

const HEX = /^#[0-9a-f]{6}$/i;

export function CompanyMark({ account, size = 40, count = 0 }: { account: Account; size?: number; count?: number }) {
  const theme = useRoomsTheme();
  const [broken, setBroken] = useState(false);
  const color = account.portal?.color && HEX.test(account.portal.color) ? account.portal.color : null;
  const logo = account.portal?.logoUrl && !broken ? { uri: `${account.origin}${account.portal.logoUrl}`, headers: { Authorization: `Bearer ${account.token}` } } : null;
  const logoBg = account.portal?.iconBackground && HEX.test(account.portal.iconBackground) ? account.portal.iconBackground : theme.card;
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.box, { width: size, height: size, borderRadius: size / 4, backgroundColor: logo ? logoBg : (color ?? theme.muted), borderColor: theme.border }]}>
        {logo ? (
          <Image source={logo} style={{ width: size - 4, height: size - 4 }} resizeMode="contain" onError={() => setBroken(true)} />
        ) : (
          <Text style={{ color: color ? (account.portal?.colorText ?? theme.primaryForeground) : theme.foreground, fontWeight: '700', fontSize: size / 2.6 }}>
            {account.company.slice(0, 1).toUpperCase()}
          </Text>
        )}
      </View>
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.destructive, borderColor: theme.background }]}>
          <Text style={[styles.badgeText, { color: theme.destructiveForeground }]}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  badge: { position: 'absolute', top: -4, right: -6, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
