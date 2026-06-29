import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../lib/theme-context';
import type { Theme } from '../../theme';
import { api } from '../../lib/api';
import ThemeToggle from '../../components/ThemeToggle';

const rp = (v: number) => 'Rp ' + Number(v).toLocaleString('id-ID');

export default function StatistikScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const [d, setD] = useState<any>(null);
  useFocusEffect(useCallback(() => { api.analytics().then(setD).catch(() => {}); }, []));

  if (!d) return <SafeAreaView style={[s.root, { justifyContent: 'center' }]}><ActivityIndicator color={theme.color.accentT} /></SafeAreaView>;

  const k = d.kpis;
  const months = d.trend.month as any[];
  const maxSales = Math.max(...months.map((m) => m.sales), 1);
  const maxKm = Math.max(...d.couriers.map((c: any) => c.km), 1);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
        <View style={s.header}>
          <Text style={s.title}>Statistik</Text>
          <ThemeToggle />
        </View>
        <View style={s.kpis}>
          <Kpi s={s} l="Penjualan Hari Ini" v={rp(k.sales_today)} />
          <Kpi s={s} l="Pesanan Hari Ini" v={String(k.orders_today)} />
          <Kpi s={s} l="Total Terkirim" v={String(k.deliveries)} />
          <Kpi s={s} l="On-Time" v={k.on_time_pct + '%'} />
        </View>

        <Card s={s} title="Tren Penjualan · 12 Bulan">
          <View style={s.bars}>
            {months.map((m, i) => (
              <View key={i} style={s.barCol}>
                <View style={[s.bar, { height: Math.max(3, (m.sales / maxSales) * 110) }]} />
              </View>
            ))}
          </View>
        </Card>

        <Card s={s} title="Rekap Kurir · jarak tempuh">
          {d.couriers.length === 0 ? <Text style={s.muted}>Belum ada data kurir.</Text> :
            d.couriers.map((c: any, i: number) => (
              <View key={i} style={s.kmRow}>
                <Text style={s.kmName}>{c.name}</Text>
                <View style={s.track}><View style={[s.fill, { width: `${(c.km / maxKm) * 100}%` }]} /></View>
                <Text style={s.kmVal}>{c.km}km</Text>
              </View>
            ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ l, v, s }: { l: string; v: string; s: any }) {
  return <View style={s.kpi}><Text style={s.kpiL}>{l}</Text><Text style={s.kpiV}>{v}</Text></View>;
}
function Card({ title, children, s }: any) {
  return <View style={s.card}><Text style={s.cardT}>{title}</Text>{children}</View>;
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { color: theme.color.ink, fontSize: 22, fontWeight: '600' },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { width: '47.8%', backgroundColor: theme.color.raised, borderWidth: 1, borderColor: theme.color.line, borderRadius: theme.radius.xs, padding: 14 },
  kpiL: { color: theme.color.ink2, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: '600' },
  kpiV: { color: theme.color.ink, fontSize: 22, fontWeight: '700', fontFamily: 'monospace', marginTop: 6 },
  card: { backgroundColor: theme.color.raised, borderWidth: 1, borderColor: theme.color.line, borderRadius: theme.radius.xs, padding: 16, marginTop: 14 },
  cardT: { color: theme.color.ink, fontWeight: '600', fontSize: 13, marginBottom: 12 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 116, gap: 3 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '70%', backgroundColor: theme.color.accent, borderRadius: 3 },
  muted: { color: theme.color.ink2, fontSize: 13 },
  kmRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  kmName: { color: theme.color.ink2, fontSize: 12, width: 56 },
  track: { flex: 1, height: 14, backgroundColor: theme.color.overlay, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: theme.color.accent, borderRadius: 4 },
  kmVal: { color: theme.color.ink, fontSize: 12, fontFamily: 'monospace', width: 50, textAlign: 'right' },
});
