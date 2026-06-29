import { useRef, useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { useTheme } from '../lib/theme-context';
import type { Theme } from '../theme';
import { api, ApiError } from '../lib/api';

export default function PodCameraScreen({ navigation, route }: any) {
  const theme = useTheme();
  const s = makeStyles(theme);
  const { assignmentId, recipient } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!permission) return <View style={s.center}><ActivityIndicator color={theme.color.accentT} /></View>;

  if (!permission.granted) {
    return (
      <SafeAreaView style={s.center}>
        <Text style={s.info}>Izinkan akses kamera untuk mengambil bukti pengantaran.</Text>
        <Pressable style={s.cta} onPress={requestPermission}><Text style={s.ctaText}>Izinkan Kamera</Text></Pressable>
        <Pressable onPress={() => navigation.goBack()}><Text style={s.link}>← Kembali</Text></Pressable>
      </SafeAreaView>
    );
  }

  const capture = async () => {
    const pic = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    if (pic?.uri) setPhoto(pic.uri);
  };

  const confirm = async () => {
    if (!photo) return;
    setBusy(true);
    try {
      // compress client-side before upload (bandwidth — design.md §10)
      const out = await ImageManipulator.manipulateAsync(
        photo, [{ resize: { width: 1280 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
      );
      let lat: number | undefined, lng: number | undefined;
      const loc = await Location.requestForegroundPermissionsAsync();
      if (loc.granted) {
        const pos = await Location.getCurrentPositionAsync({});
        lat = pos.coords.latitude; lng = pos.coords.longitude;
      }
      await api.deliverStop(assignmentId, out.uri, lat, lng);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Gagal', e instanceof ApiError ? e.message : 'Tidak bisa mengunggah bukti.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}><Text style={s.x}>✕</Text></Pressable>
        <Text style={s.headerTitle}>Bukti Antar · {recipient}</Text>
        <View style={{ width: 18 }} />
      </View>

      <View style={s.viewport}>
        {photo ? (
          <Image source={{ uri: photo }} style={s.preview} resizeMode="cover" />
        ) : (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        )}
        {/* corner brackets */}
        {!photo && <>
          <View style={[s.corner, s.tl]} /><View style={[s.corner, s.tr]} />
          <View style={[s.corner, s.bl]} /><View style={[s.corner, s.br]} />
        </>}
      </View>

      <View style={s.controls}>
        {!photo ? (
          <>
            <Text style={s.hint}>Foto makanan diterima sebelum lanjut</Text>
            <Pressable style={s.shutter} onPress={capture}><View style={s.shutterInner} /></Pressable>
          </>
        ) : (
          <View style={s.confirmRow}>
            <Pressable style={s.retake} onPress={() => setPhoto(null)} disabled={busy}>
              <Text style={s.retakeText}>↺ Ulangi</Text>
            </Pressable>
            <Pressable style={[s.cta, { flex: 1 }, busy && { opacity: 0.6 }]} onPress={confirm} disabled={busy}>
              <Text style={s.ctaText}>{busy ? 'Mengunggah…' : 'Konfirmasi Pengantaran'}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  center: { flex: 1, backgroundColor: theme.color.bg, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  info: { color: theme.color.ink2, textAlign: 'center', fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 },
  x: { color: theme.color.ink, fontSize: 18 },
  headerTitle: { color: theme.color.ink, fontWeight: '600', fontSize: 14 },
  viewport: { flex: 1, margin: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111' },
  preview: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  corner: { position: 'absolute', width: 26, height: 26, borderColor: '#fff', opacity: 0.7 },
  tl: { top: 14, left: 14, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 4 },
  tr: { top: 14, right: 14, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 4 },
  bl: { bottom: 14, left: 14, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 4 },
  br: { bottom: 14, right: 14, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 4 },
  controls: { padding: 20, alignItems: 'center', gap: 14 },
  hint: { color: theme.color.ink2, fontSize: 12 },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.color.accent },
  confirmRow: { flexDirection: 'row', gap: 12, width: '100%', alignItems: 'center' },
  retake: { height: 52, paddingHorizontal: 18, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.line2, alignItems: 'center', justifyContent: 'center' },
  retakeText: { color: theme.color.ink, fontWeight: '500' },
  cta: { height: 52, borderRadius: theme.radius.md, backgroundColor: theme.color.accent, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  link: { color: theme.color.ink2 },
});
