import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import { riskColor, type Theme } from '../theme';
import { api, ApiError } from '../lib/api';
import { realtime } from '../lib/ws';
import { buildNavHtml } from '../lib/navHtml';
import { PrimaryButton } from '../components/Buttons';

export default function NavigationScreen({ navigation }: any) {
  const theme = useTheme();
  const s = makeStyles(theme);
  const [data, setData] = useState<{ route: any; stops: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [perm, setPerm] = useState<boolean | null>(null);

  const webRef = useRef<WebView>(null);
  const webReady = useRef(false);
  const posRef = useRef<[number, number] | null>(null);
  const routedFor = useRef<string | null>(null); // current stop id we've routed to

  // Rebuilt only when the theme changes, so the WebView never reloads on a normal render.
  const mapSource = useMemo(() => ({ html: buildNavHtml(theme) }), [theme]);

  const load = useCallback(async () => {
    try {
      const res = await api.courierTasks();
      setData(res);
      if (res.route?.status === 'assigned') api.startRoute(res.route.id).catch(() => {});
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await api.logout();
        navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
      }
    } finally { setLoading(false); }
  }, [navigation]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // request location up-front so GPS is active
  useEffect(() => { (async () => { const r = await Location.requestForegroundPermissionsAsync(); setPerm(r.granted); })(); }, []);

  const route = data?.route;
  const stops = data?.stops ?? [];
  const current = stops.find((s) => s.status !== 'delivered');
  const pending = stops.filter((s) => s.status !== 'delivered');
  const doneCount = stops.filter((s) => s.status === 'delivered').length;

  // (re)compute the road route from the live position to the current stop
  const sendRoute = useCallback(() => {
    if (!webReady.current || !current) return;
    const depot = route?.depot_lat != null ? [route.depot_lng, route.depot_lat] : [106.84, -6.2];
    const from = posRef.current ?? depot;
    const pins = pending.map((s) => ({ lng: s.order.longitude, lat: s.order.latitude, color: riskColor(s.spoilage_risk, theme) }));
    webRef.current?.injectJavaScript(
      `setRoute(${from[0]},${from[1]},${current.order.longitude},${current.order.latitude},${JSON.stringify(pins)});true;`,
    );
    routedFor.current = current.id;
  }, [current, route, pending, theme]);

  // Latest values read by the long-lived GPS callback without re-subscribing.
  const sendRouteRef = useRef(sendRoute);
  sendRouteRef.current = sendRoute;
  const routeIdRef = useRef<string | undefined>(undefined);
  routeIdRef.current = route?.id;
  const currentIdRef = useRef<string | undefined>(undefined);
  currentIdRef.current = current?.id;

  // re-route whenever the active stop changes
  useEffect(() => { if (current && routedFor.current !== current.id) sendRouteRef.current(); }, [current?.id]);

  // Live GPS: follow camera, trim the route, and stream position to the dashboard.
  useEffect(() => {
    if (!perm) return;
    let sub: Location.LocationSubscription | undefined;
    let alive = true;
    (async () => {
      realtime.connect();
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2500, distanceInterval: 4 },
        (p) => {
          if (!alive) return;
          const lng = p.coords.longitude, lat = p.coords.latitude, hd = p.coords.heading ?? 0;
          posRef.current = [lng, lat];
          webRef.current?.injectJavaScript(`updatePosition(${lng},${lat},${hd});true;`);
          realtime.send({ type: 'gps', lat, lng, heading: hd, speed: (p.coords.speed ?? 0) * 3.6, route_id: routeIdRef.current });
          if (routedFor.current !== currentIdRef.current) sendRouteRef.current();
        },
      );
    })();
    return () => { alive = false; sub?.remove(); };
  }, [perm]);

  const complete = async () => {
    try {
      await api.completeRoute(route.id);
      Alert.alert('Selesai', 'Pengantaran selesai. Terima kasih!');
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch { Alert.alert('Gagal', 'Tidak bisa menyelesaikan rute.'); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={theme.color.accentT} /></View>;
  if (!route) return (
    <SafeAreaView style={s.center}>
      <Text style={s.muted}>Tidak ada rute aktif.</Text>
      <Pressable onPress={() => navigation.goBack()}><Text style={s.link}>← Kembali</Text></Pressable>
    </SafeAreaView>
  );

  return (
    <View style={s.root}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={mapSource}
        style={s.map}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => { webReady.current = true; sendRoute(); }}
      />

      <SafeAreaView style={s.topBar} edges={['top']} pointerEvents="box-none">
        <Pressable style={s.iconBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={20} color={theme.color.ink} /></Pressable>
      </SafeAreaView>

      {perm === false && (
        <View style={s.permOverlay}>
          <Ionicons name="location" size={32} color={theme.color.accentT} />
          <Text style={s.permText}>Izinkan akses lokasi agar navigasi & GPS aktif.</Text>
          <PrimaryButton label="Izinkan Lokasi" onPress={async () => setPerm((await Location.requestForegroundPermissionsAsync()).granted)} style={{ paddingHorizontal: 24 }} />
        </View>
      )}

      <Pressable style={s.recenter} onPress={() => webRef.current?.injectJavaScript('recenter();true;')}>
        <Ionicons name="locate" size={20} color={theme.color.accentT} />
      </Pressable>

      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={s.rowBetween}>
          <View style={[s.pill, { backgroundColor: theme.color.success + '28' }]}>
            <View style={[s.dot, { backgroundColor: theme.color.success }]} />
            <Text style={[s.pillText, { color: theme.color.success }]}>Aktif</Text>
          </View>
          <Text style={s.progress}>Stop {doneCount}/{stops.length}</Text>
        </View>
        {current ? (
          <>
            <View style={[s.rowBetween, { marginVertical: 14 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.stopName}>{current.order.recipient_name}</Text>
                <Text style={s.stopMeta}>Berikutnya · {current.order.menu_name} · {current.order.quantity} pax</Text>
              </View>
              <View style={[s.pill, { backgroundColor: riskColor(current.spoilage_risk, theme) + '28' }]}>
                <View style={[s.dot, { backgroundColor: riskColor(current.spoilage_risk, theme) }]} />
                <Text style={[s.pillText, { color: riskColor(current.spoilage_risk, theme) }]}>{current.spoilage_risk}</Text>
              </View>
            </View>
            <PrimaryButton label="Konfirmasi Tiba  &  Foto" onPress={() => navigation.navigate('Pod', { assignmentId: current.id, recipient: current.order.recipient_name })} />
          </>
        ) : (
          <>
            <Text style={[s.stopMeta, { marginVertical: 14 }]}>Semua titik terkirim. Kembali ke depot, lalu selesaikan.</Text>
            <PrimaryButton label="Selesaikan Pengantaran" onPress={complete} />
          </>
        )}
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  center: { flex: 1, backgroundColor: theme.color.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: theme.color.ink2 }, link: { color: theme.color.accentT },
  map: { flex: 1, backgroundColor: '#000' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(21,18,11,.9)', borderWidth: 1, borderColor: theme.color.line, alignItems: 'center', justifyContent: 'center' },
  recenter: { position: 'absolute', right: 16, bottom: 230, width: 46, height: 46, borderRadius: 23, backgroundColor: theme.color.raised, borderWidth: 1, borderColor: theme.color.line2, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  permOverlay: { position: 'absolute', top: '30%', left: 24, right: 24, alignItems: 'center', gap: 14, backgroundColor: theme.color.raised, borderWidth: 1, borderColor: theme.color.line, borderRadius: theme.radius.xs, padding: 24 },
  permText: { color: theme.color.ink, textAlign: 'center', fontSize: 14 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.color.raised, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderTopWidth: 1, borderColor: theme.color.line, padding: 16, paddingBottom: 28 },
  handle: { width: 34, height: 4, borderRadius: 2, backgroundColor: theme.color.line2, alignSelf: 'center', marginBottom: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radius.md },
  pillText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  progress: { color: theme.color.ink2, fontSize: 12 },
  stopName: { color: theme.color.ink, fontWeight: '600', fontSize: 16 },
  stopMeta: { color: theme.color.ink2, fontSize: 12, marginTop: 2 },
});
