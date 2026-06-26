import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme, riskColor } from '../theme';
import { api, ApiError } from '../lib/api';
import { PrimaryButton } from '../components/Buttons';

export default function TasksScreen({ navigation }: any) {
  const [data, setData] = useState<{ route: any; stops: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.courierTasks());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await api.logout();
        navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
        return;
      }
      setError('Gagal memuat tugas.');
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const route = data?.route;
  const stops = data?.stops ?? [];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Tugas Hari Ini</Text>
          <Text style={s.sub}>{route ? `${stops.length} pengantaran · urutan AI` : 'Belum ada tugas aktif'}</Text>
        </View>
      </View>

      {route && (
        <View style={s.summary}>
          <Summary label="Stop" value={`${stops.length}`} />
          <Summary label="Jarak" value={`${route.total_distance_km ?? '–'} km`} />
          <Summary label="Estimasi" value={`${Math.round(route.total_time_minutes ?? 0)} min`} />
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={theme.color.accentT} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={stops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={theme.color.accentT} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>{error ?? 'Tidak ada tugas. Tarik untuk menyegarkan.'}</Text>
            </View>
          }
          renderItem={({ item }) => <StopCard stop={item} />}
        />
      )}

      {route && stops.some((s: any) => s.status !== 'delivered') && (
        <View style={s.footer}>
          <PrimaryButton label="Mulai Navigasi  →" onPress={() => navigation.navigate('Navigation')} />
        </View>
      )}
    </SafeAreaView>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.sumLabel}>{label}</Text>
      <Text style={s.sumValue}>{value}</Text>
    </View>
  );
}

function StopCard({ stop }: { stop: any }) {
  const o = stop.order;
  return (
    <View style={s.card}>
      <Text style={s.seq}>{stop.sequence}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.recipient}>{o.recipient_name}</Text>
        <Text style={s.meta}>{o.code} · {o.menu_name} · {o.quantity} pax</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={[s.chip, { backgroundColor: riskColor(stop.spoilage_risk) + '28' }]}>
          <View style={[s.dot, { backgroundColor: riskColor(stop.spoilage_risk) }]} />
          <Text style={[s.chipText, { color: riskColor(stop.spoilage_risk) }]}>{stop.spoilage_risk}</Text>
        </View>
        <Text style={s.eta}>ETA {Math.round(stop.estimated_minutes ?? 0)}m</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { color: theme.color.ink, fontSize: 22, fontWeight: '600' },
  sub: { color: theme.color.ink2, fontSize: 13, marginTop: 2 },
  logout: { color: theme.color.ink2, fontSize: 14 },
  chat: { color: theme.color.accentT, fontSize: 14 },
  summary: { flexDirection: 'row', marginHorizontal: 16, padding: 16, borderRadius: theme.radius.xs, backgroundColor: theme.color.raised, borderWidth: 1, borderColor: theme.color.line },
  sumLabel: { color: theme.color.ink2, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  sumValue: { color: theme.color.ink, fontSize: 18, fontWeight: '600', marginTop: 2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.color.raised, borderWidth: 1, borderColor: theme.color.line, borderRadius: theme.radius.xs, padding: 14, marginBottom: 10 },
  seq: { color: theme.color.accentT, fontWeight: '600', fontSize: 16, width: 18 },
  recipient: { color: theme.color.ink, fontWeight: '600', fontSize: 15 },
  meta: { color: theme.color.ink2, fontSize: 12, marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.radius.sm },
  dot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  eta: { color: theme.color.ink2, fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: theme.color.ink2, fontSize: 14, textAlign: 'center' },
  footer: { position: 'absolute', left: 16, right: 16, bottom: 24 },
  startBtn: { height: 56, borderRadius: theme.radius.md, backgroundColor: theme.color.accent, alignItems: 'center', justifyContent: 'center' },
  startText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
