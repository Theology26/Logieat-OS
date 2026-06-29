import { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../lib/theme-context';
import type { Theme } from '../../theme';
import { api } from '../../lib/api';
import { realtime } from '../../lib/ws';

// Live fleet map: courier markers updated from realtime GPS, depot pin from the API.
function buildFleetMap(theme: Theme): string {
  const c = theme.color;
  const tiles = theme.mode === 'dark' ? 'dark_all' : 'light_all';
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet">
<style>html,body,#map{height:100%;margin:0;background:${c.bg}}
.pin{width:24px;height:24px;border-radius:50%;border:2px solid #000;box-shadow:0 0 0 4px ${c.accentSub}}</style>
</head><body><div id="map"></div><script>
var map=new maplibregl.Map({container:'map',style:{version:8,sources:{c:{type:'raster',tiles:['https://a.basemaps.cartocdn.com/${tiles}/{z}/{x}/{y}.png','https://b.basemaps.cartocdn.com/${tiles}/{z}/{x}/{y}.png'],tileSize:256}},layers:[{id:'c',type:'raster',source:'c'}]},center:[106.84,-6.2],zoom:12,attributionControl:false});
var M={};
function dot(color){var e=document.createElement('div');e.className='pin';e.style.background=color;return e;}
function updateCourier(id,lng,lat,name){ if(!M[id]){var e=dot('${c.accent}');e.title=name||'';M[id]=new maplibregl.Marker({element:e});M[id].setLngLat([lng,lat]).addTo(map);} else {M[id].setLngLat([lng,lat]);} }
function init(d){ if(d.depot&&d.depot.lat){var e=document.createElement('div');e.className='pin';e.style.cssText='width:16px;height:16px;border-radius:50%;background:${c.accentT};border:2px solid #000';new maplibregl.Marker({element:e}).setLngLat([d.depot.lng,d.depot.lat]).addTo(map);map.setCenter([d.depot.lng,d.depot.lat]);}
  (d.locations||[]).forEach(function(l){updateCourier(l.courier_id,l.longitude,l.latitude,(d.names||{})[l.courier_id]);}); }
</script></body></html>`;
}

export default function ArmadaScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const mapSource = useMemo(() => ({ html: buildFleetMap(theme) }), [theme]);
  const web = useRef<WebView>(null);
  const dataRef = useRef<any>(null);
  const namesRef = useRef<Record<string, string>>({});
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');

  const load = useCallback(async () => {
    try {
      const f = await api.fleetLocations();
      namesRef.current = Object.fromEntries(f.couriers.map((c: any) => [c.id, c.name]));
      dataRef.current = { depot: f.depot, locations: f.locations, names: namesRef.current };
      web.current?.injectJavaScript(`init(${JSON.stringify(dataRef.current)});true;`);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    realtime.connect();
    const off = realtime.on((m) => {
      if (m.type === 'gps') {
        const name = namesRef.current[m.courier_id] ?? '';
        web.current?.injectJavaScript(`updateCourier('${m.courier_id}',${m.lng},${m.lat},${JSON.stringify(name)});true;`);
      } else if (m.type === 'chat') {
        setMessages((p) => [...p, m]);
      }
    });
    return off;
  }, [load]));

  const send = () => {
    const b = text.trim();
    if (!b) return;
    realtime.send({ type: 'chat', body: b });
    setText('');
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Text style={s.title}>Armada Live</Text>
      <View style={s.mapWrap}>
        <WebView
          ref={web}
          originWhitelist={['*']}
          source={mapSource}
          style={{ flex: 1, backgroundColor: theme.color.bg }}
          javaScriptEnabled
          onLoadEnd={() => dataRef.current && web.current?.injectJavaScript(`init(${JSON.stringify(dataRef.current)});true;`)}
        />
      </View>
      <View style={s.chat}>
        <FlatList
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          ListEmptyComponent={<Text style={s.muted}>Chat ke kurir di lapangan…</Text>}
          renderItem={({ item }) => {
            const mine = item.sender_role === 'owner' || item.sender_role === 'admin';
            return <View style={[s.bubble, mine ? s.mine : s.theirs]}><Text style={mine ? s.mineT : s.theirsT}>{item.body}</Text></View>;
          }}
        />
        <View style={s.inputBar}>
          <TextInput value={text} onChangeText={setText} placeholder="Pesan ke kurir…" placeholderTextColor={theme.color.ink2} style={s.input} onSubmitEditing={send} />
          <Pressable style={s.send} onPress={send}><Text style={s.sendT}>➤</Text></Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  title: { color: theme.color.ink, fontSize: 22, fontWeight: '600', padding: 16, paddingBottom: 10 },
  mapWrap: { flex: 1, marginHorizontal: 12, borderRadius: theme.radius.xs, overflow: 'hidden', borderWidth: 1, borderColor: theme.color.line },
  chat: { height: 240, margin: 12, marginBottom: 70, backgroundColor: theme.color.raised, borderRadius: theme.radius.xs, borderWidth: 1, borderColor: theme.color.line, overflow: 'hidden' },
  muted: { color: theme.color.ink2, fontSize: 12, textAlign: 'center', marginTop: 16 },
  bubble: { maxWidth: '80%', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12 },
  mine: { alignSelf: 'flex-end', backgroundColor: theme.color.accent },
  theirs: { alignSelf: 'flex-start', backgroundColor: theme.color.overlay, borderWidth: 1, borderColor: theme.color.line },
  mineT: { color: theme.color.inverse, fontSize: 13 },
  theirsT: { color: theme.color.ink, fontSize: 13 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: theme.color.line },
  input: { flex: 1, height: 40, borderRadius: theme.radius.md, backgroundColor: theme.color.overlay, borderWidth: 1, borderColor: theme.color.line2, color: theme.color.ink, paddingHorizontal: 14, fontSize: 13 },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.color.accent, alignItems: 'center', justifyContent: 'center' },
  sendT: { color: theme.color.inverse, fontSize: 14 },
});
