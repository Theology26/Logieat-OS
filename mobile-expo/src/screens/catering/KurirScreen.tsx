import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../lib/theme-context';
import type { Theme } from '../../theme';
import { api } from '../../lib/api';

export default function KurirScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [code, setCode] = useState('');

  const load = useCallback(async () => {
    try {
      const [cs, me] = await Promise.all([api.couriersAll(), api.me()]);
      setCouriers(cs); setCode(me.company?.catering_code ?? '');
    } catch {}
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = async (id: string, a: 'approve' | 'reject') => {
    try { a === 'approve' ? await api.approveCourier(id) : await api.rejectCourier(id); load(); }
    catch { Alert.alert('Gagal'); }
  };

  const pending = couriers.filter((c) => c.status === 'pending');
  const others = couriers.filter((c) => c.status !== 'pending');

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <FlatList
        data={others}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        ListHeaderComponent={
          <>
            <Text style={s.title}>Kurir</Text>
            <View style={s.codeCard}>
              <Text style={s.codeLbl}>CATERING ID · bagikan ke kurir</Text>
              <Text style={s.code}>{code || '—'}</Text>
            </View>
            <Text style={[s.sec, { color: theme.color.warning }]}>Menunggu Persetujuan ({pending.length})</Text>
            {pending.length === 0 && <Text style={s.muted}>Tidak ada permintaan baru.</Text>}
            {pending.map((c) => (
              <View key={c.id} style={s.pcard}>
                <Avatar s={s} name={c.name} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{c.name}</Text>
                  <Text style={s.meta}>{c.phone}{c.vehicle_plate ? ` · ${c.vehicle_plate}` : ''}</Text>
                </View>
                <Pressable onPress={() => act(c.id, 'reject')} style={s.reject}><Text style={s.rejectT}>Tolak</Text></Pressable>
                <Pressable onPress={() => act(c.id, 'approve')} style={s.approve}><Text style={s.approveT}>Setujui</Text></Pressable>
              </View>
            ))}
            <Text style={s.sec}>Semua Kurir ({others.length})</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={s.lcard}>
            <Avatar s={s} name={item.name} />
            <View style={{ flex: 1 }}><Text style={s.name}>{item.name}</Text><Text style={s.meta}>{item.phone}</Text></View>
            <Text style={[s.badge, item.status === 'active' && { color: theme.color.success }]}>{item.status}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Avatar({ name, s }: { name: string; s: any }) {
  const i = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return <View style={s.av}><Text style={s.avT}>{i}</Text></View>;
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  title: { color: theme.color.ink, fontSize: 22, fontWeight: '600', marginBottom: 14 },
  codeCard: { backgroundColor: theme.color.raised, borderWidth: 1, borderColor: theme.color.line, borderRadius: theme.radius.xs, padding: 16 },
  codeLbl: { color: theme.color.ink2, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  code: { color: theme.color.accentT, fontSize: 22, fontWeight: '700', fontFamily: 'monospace', marginTop: 4, letterSpacing: 1 },
  sec: { fontWeight: '600', fontSize: 13, marginTop: 20, marginBottom: 8, color: theme.color.ink2 },
  muted: { color: theme.color.ink2, fontSize: 13 },
  pcard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.color.raised, borderWidth: 1, borderColor: theme.color.line, borderRadius: theme.radius.xs, padding: 12, marginBottom: 9 },
  lcard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.color.raised, borderWidth: 1, borderColor: theme.color.line, borderRadius: theme.radius.xs, padding: 12, marginBottom: 8 },
  av: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.color.accentSub, alignItems: 'center', justifyContent: 'center' },
  avT: { color: theme.color.accentT, fontWeight: '700', fontSize: 13 },
  name: { color: theme.color.ink, fontWeight: '600', fontSize: 14 },
  meta: { color: theme.color.ink2, fontSize: 12, marginTop: 2 },
  reject: { height: 36, paddingHorizontal: 14, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.line2, alignItems: 'center', justifyContent: 'center' },
  rejectT: { color: theme.color.ink2, fontSize: 13 },
  approve: { height: 36, paddingHorizontal: 16, borderRadius: theme.radius.md, backgroundColor: theme.color.accent, alignItems: 'center', justifyContent: 'center' },
  approveT: { color: theme.color.inverse, fontSize: 13, fontWeight: '700' },
  badge: { color: theme.color.ink2, fontSize: 11, textTransform: 'uppercase' },
});
