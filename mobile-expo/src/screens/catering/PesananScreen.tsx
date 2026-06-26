import { useCallback, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../theme';
import { api, ApiError } from '../../lib/api';
import { PrimaryButton } from '../../components/Buttons';

const CATS = ['Santan', 'Basah', 'Kering'];
const blank = { recipient_name: '', menu_name: '', food_category: 'Basah', quantity: '1', price: '', address: '', latitude: '', longitude: '' };

export default function PesananScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [f, setF] = useState({ ...blank });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const load = useCallback(async () => { try { setOrders(await api.orders()); } catch {} }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submit = async () => {
    setBusy(true);
    try {
      await api.createOrder({
        ...f, quantity: Number(f.quantity) || 1, price: Number(f.price) || 0,
        latitude: Number(f.latitude), longitude: Number(f.longitude),
      });
      setF({ ...blank }); load();
    } catch (e) { Alert.alert('Gagal', e instanceof ApiError ? e.message : 'Periksa alamat & koordinat.'); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        ListHeaderComponent={
          <>
            <Text style={s.title}>Pesanan</Text>
            <View style={s.form}>
              <Text style={s.formTitle}>+ Tambah Pesanan</Text>
              <Inp ph="Penerima" v={f.recipient_name} on={(v: string) => set('recipient_name', v)} />
              <Inp ph="Menu" v={f.menu_name} on={(v: string) => set('menu_name', v)} />
              <View style={s.cats}>
                {CATS.map((c) => (
                  <Pressable key={c} onPress={() => set('food_category', c)} style={[s.cat, f.food_category === c && s.catOn]}>
                    <Text style={[s.catText, f.food_category === c && { color: theme.color.inverse }]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={s.row2}>
                <Inp ph="Jumlah (pax)" v={f.quantity} on={(v: string) => set('quantity', v)} kt="number-pad" flex />
                <Inp ph="Harga (Rp)" v={f.price} on={(v: string) => set('price', v)} kt="number-pad" flex />
              </View>
              <Inp ph="Alamat" v={f.address} on={(v: string) => set('address', v)} />
              <View style={s.row2}>
                <Inp ph="Latitude" v={f.latitude} on={(v: string) => set('latitude', v)} kt="numbers-and-punctuation" flex />
                <Inp ph="Longitude" v={f.longitude} on={(v: string) => set('longitude', v)} kt="numbers-and-punctuation" flex />
              </View>
              <PrimaryButton label="Simpan Pesanan" onPress={submit} loading={busy} style={{ marginTop: 12 }} />
            </View>
            <Text style={s.sec}>Daftar ({orders.length})</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={s.line}>
            <Text style={s.code}>{item.code}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rn}>{item.recipient_name}</Text>
              <Text style={s.rm}>{item.menu_name} · {item.quantity} pax · Rp {Number(item.price).toLocaleString('id-ID')}</Text>
            </View>
            <Text style={[s.status, item.status === 'delivered' && { color: theme.color.success }]}>{item.status}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Inp({ ph, v, on, kt, flex }: any) {
  return (
    <TextInput
      placeholder={ph} value={v} onChangeText={on} keyboardType={kt} placeholderTextColor={theme.color.ink2}
      style={[s.inp, flex && { flex: 1 }]}
    />
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  title: { color: theme.color.ink, fontSize: 22, fontWeight: '600', marginBottom: 14 },
  form: { backgroundColor: theme.color.raised, borderWidth: 1, borderColor: theme.color.line, borderRadius: theme.radius.xs, padding: 14 },
  formTitle: { color: theme.color.ink, fontWeight: '600', marginBottom: 4 },
  inp: { height: 48, borderRadius: 10, backgroundColor: theme.color.overlay, borderWidth: 1, borderColor: theme.color.line2, color: theme.color.ink, paddingHorizontal: 12, fontSize: 15, marginTop: 10 },
  cats: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cat: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: theme.color.line2, alignItems: 'center', justifyContent: 'center' },
  catOn: { backgroundColor: theme.color.accent, borderColor: theme.color.accent },
  catText: { color: theme.color.ink, fontSize: 13, fontWeight: '600' },
  row2: { flexDirection: 'row', gap: 8 },
  sec: { color: theme.color.ink2, fontWeight: '600', fontSize: 13, marginTop: 18, marginBottom: 8 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.color.raised, borderWidth: 1, borderColor: theme.color.line, borderRadius: theme.radius.xs, padding: 12, marginBottom: 8 },
  code: { color: theme.color.ink2, fontFamily: 'monospace', fontSize: 11 },
  rn: { color: theme.color.ink, fontWeight: '600', fontSize: 14 },
  rm: { color: theme.color.ink2, fontSize: 12, marginTop: 2 },
  status: { color: theme.color.ink2, fontSize: 11, textTransform: 'uppercase' },
});
