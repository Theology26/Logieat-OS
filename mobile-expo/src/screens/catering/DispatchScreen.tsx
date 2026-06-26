import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme, riskColor } from '../../theme';
import { api, ApiError } from '../../lib/api';
import { PrimaryButton } from '../../components/Buttons';

export default function DispatchScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [courierId, setCourierId] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [os, cs] = await Promise.all([api.orders(), api.couriersAll()]);
      setOrders(os.filter((o: any) => o.status === 'pending'));
      const act = cs.filter((c: any) => c.status === 'active');
      setCouriers(act);
      setCourierId((p) => p || act[0]?.id || '');
    } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const ids = orders.filter((o) => checked[o.id]).map((o) => o.id);
  const pax = orders.filter((o) => checked[o.id]).reduce((s, o) => s + o.quantity, 0);

  const optimize = async () => {
    setBusy(true);
    try { setResult(await api.dispatchOptimize({ order_ids: ids, courier_id: courierId })); }
    catch (e) { Alert.alert('Gagal', e instanceof ApiError ? e.message : 'Optimasi gagal.'); }
    finally { setBusy(false); }
  };
  const assign = async () => {
    setBusy(true);
    try {
      await api.dispatchAssign({ order_ids: ids, courier_id: courierId });
      Alert.alert('Terkirim', 'Tugas dikirim ke kurir.');
      setChecked({}); setResult(null); load();
    } catch (e) { Alert.alert('Gagal', e instanceof ApiError ? e.message : 'Gagal mengirim.'); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Text style={s.title}>Dispatcher</Text>
      <Text style={s.sub}>Pilih kurir & pesanan, AI susun rutenya.</Text>

      {loading ? <ActivityIndicator color={theme.color.accentT} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          ListHeaderComponent={
            <>
              <Text style={s.lbl}>Kurir</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {couriers.length === 0 && <Text style={s.muted}>Belum ada kurir aktif.</Text>}
                {couriers.map((c) => (
                  <Pressable key={c.id} onPress={() => setCourierId(c.id)} style={[s.chip, courierId === c.id && s.chipOn]}>
                    <Text style={[s.chipText, courierId === c.id && { color: theme.color.inverse }]}>{c.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={s.lbl}>Pesanan pending</Text>
            </>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => setChecked((c) => ({ ...c, [item.id]: !c[item.id] }))} style={s.order}>
              <View style={[s.cb, checked[item.id] && s.cbOn]}>{checked[item.id] && <Text style={s.cbTick}>✓</Text>}</View>
              <View style={{ flex: 1 }}>
                <Text style={s.oName}>{item.recipient_name}</Text>
                <Text style={s.oMeta}>{item.code} · {item.menu_name} · {item.quantity} pax</Text>
              </View>
              {item.food_category && <Text style={s.cat}>{item.food_category}</Text>}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={s.muted}>Tidak ada pesanan pending.</Text>}
          ListFooterComponent={
            result ? (
              <View style={s.result}>
                <Text style={s.resultHead}>Hasil AI · {result.model_type}</Text>
                {result.route.map((r: any) => (
                  <View key={r.sequence} style={s.step}>
                    <Text style={s.seq}>{r.sequence}</Text>
                    <Text style={{ flex: 1, color: theme.color.ink }}>{r.code} {r.recipient}</Text>
                    <Text style={s.stepMeta}>{r.distance_km}km · {Math.round(r.estimated_minutes)}m</Text>
                    <View style={[s.dot, { backgroundColor: riskColor(r.spoilage_risk) }]} />
                  </View>
                ))}
                <Text style={s.total}>{result.total_distance_km}km · {Math.round(result.total_time_minutes)}m · {result.route.length} stop</Text>
              </View>
            ) : null
          }
        />
      )}

      <View style={s.bar}>
        <Text style={s.selText}>Terpilih {ids.length} · {pax} pax</Text>
        {result
          ? <PrimaryButton label="Kirim ke Kurir →" onPress={assign} loading={busy} disabled={!courierId} style={{ flex: 1, marginLeft: 12 }} />
          : <PrimaryButton label="◈ Optimasi Rute (AI)" onPress={optimize} loading={busy} disabled={ids.length === 0 || !courierId} style={{ flex: 1, marginLeft: 12 }} />}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  title: { color: theme.color.ink, fontSize: 22, fontWeight: '600', paddingHorizontal: 20, paddingTop: 16 },
  sub: { color: theme.color.ink2, fontSize: 13, paddingHorizontal: 20, marginTop: 2, marginBottom: 6 },
  lbl: { color: theme.color.ink2, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontWeight: '600' },
  muted: { color: theme.color.ink2, fontSize: 13 },
  chip: { paddingHorizontal: 16, height: 38, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.line2, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  chipOn: { backgroundColor: theme.color.accent, borderColor: theme.color.accent },
  chipText: { color: theme.color.ink, fontSize: 13, fontWeight: '600' },
  order: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.color.raised, borderWidth: 1, borderColor: theme.color.line, borderRadius: theme.radius.xs, padding: 13, marginBottom: 9 },
  cb: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: theme.color.line2, alignItems: 'center', justifyContent: 'center' },
  cbOn: { backgroundColor: theme.color.accent, borderColor: theme.color.accent },
  cbTick: { color: theme.color.inverse, fontSize: 13, fontWeight: '700' },
  oName: { color: theme.color.ink, fontWeight: '600', fontSize: 14 },
  oMeta: { color: theme.color.ink2, fontSize: 12, marginTop: 2 },
  cat: { color: theme.color.ink2, fontSize: 11 },
  result: { marginTop: 6, backgroundColor: theme.color.raised, borderWidth: 1, borderColor: theme.color.line, borderRadius: theme.radius.xs, padding: 14 },
  resultHead: { color: theme.color.accentT, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  seq: { color: theme.color.accentT, fontWeight: '700', width: 18, fontFamily: 'monospace' },
  stepMeta: { color: theme.color.ink2, fontSize: 11 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  total: { color: theme.color.ink2, fontSize: 12, marginTop: 8 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 24, backgroundColor: theme.color.raised, borderTopWidth: 1, borderTopColor: theme.color.line },
  selText: { color: theme.color.ink2, fontSize: 13 },
});
