import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme-context';
import type { Theme } from '../theme';
import { api, clearToken } from '../lib/api';
import { realtime } from '../lib/ws';
import { GhostButton } from '../components/Buttons';
import ThemeToggle from '../components/ThemeToggle';

export default function ProfileScreen({ navigation }: any) {
  const theme = useTheme();
  const s = makeStyles(theme);
  const [data, setData] = useState<{ user: any; company: any } | null>(null);
  useEffect(() => { api.me().then(setData).catch(() => {}); }, []);

  const logout = async () => {
    realtime.close();
    await clearToken();
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Landing' }] });
  };

  const u = data?.user, c = data?.company;
  const initials = (u?.name ?? '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Text style={s.title}>Profil</Text>
      <View style={s.card}>
        <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
        <Text style={s.name}>{u?.name ?? '—'}</Text>
        <Text style={s.role}>Kurir · {c?.name ?? ''}</Text>
      </View>
      <View style={s.rows}>
        <Row label="Telepon" value={u?.phone} s={s} />
        <Row label="Email" value={u?.email} s={s} />
        <Row label="Kendaraan" value={u?.vehicle_plate} s={s} />
        <Row label="Catering ID" value={c?.catering_code} s={s} />
      </View>
      <View style={[s.rows, s.themeRow]}>
        <View>
          <Text style={s.rv}>Tema {theme.mode === 'dark' ? 'gelap' : 'terang'}</Text>
          <Text style={s.rl}>Ketuk untuk berganti</Text>
        </View>
        <ThemeToggle />
      </View>
      <View style={{ flex: 1 }} />
      <GhostButton label="Keluar" onPress={logout} style={{ borderColor: theme.color.danger, marginBottom: 90 }} />
    </SafeAreaView>
  );
}

function Row({ label, value, s }: { label: string; value?: string; s: any }) {
  return (
    <View style={s.row}>
      <Text style={s.rl}>{label}</Text>
      <Text style={s.rv}>{value || '—'}</Text>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg, paddingHorizontal: 20 },
  title: { color: theme.color.ink, fontSize: 22, fontWeight: '600', marginVertical: 16 },
  card: { alignItems: 'center', backgroundColor: theme.color.raised, borderWidth: 1, borderColor: theme.color.line, borderRadius: theme.radius.xs, padding: 24, gap: 6 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.color.accentSub, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  avatarText: { color: theme.color.accentT, fontWeight: '700', fontSize: 22 },
  name: { color: theme.color.ink, fontSize: 19, fontWeight: '600' },
  role: { color: theme.color.ink2, fontSize: 13 },
  rows: { marginTop: 18, backgroundColor: theme.color.raised, borderWidth: 1, borderColor: theme.color.line, borderRadius: theme.radius.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  themeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  rl: { color: theme.color.ink2, fontSize: 14 },
  rv: { color: theme.color.ink, fontSize: 14, fontWeight: '500' },
});
