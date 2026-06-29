import { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import type { Theme } from '../theme';
import { config } from '../lib/config';

const isCatering = config.appRole === 'catering';

const COPY = isCatering
  ? {
      tag: 'MANAGER', emblem: 'storefront' as const,
      title: ['Kelola katering,', 'satu layar.'],
      sub: 'Dispatch AI, armada live, & analitik — di genggaman.',
      features: [
        ['flash', 'Dispatch AI', 'Bagi tugas & rute otomatis'],
        ['map', 'Armada Live', 'Pantau kurir real-time'],
        ['stats-chart', 'Analitik', 'Penjualan & rekap kurir'],
      ] as const,
    }
  : {
      tag: 'KURIR', emblem: 'navigate' as const,
      title: ['Antar lebih', 'cepat & pintar.'],
      sub: 'Rute pasti, bukti foto, & live GPS dalam satu app.',
      features: [
        ['navigate', 'AI Routing', 'Urutan antar paling efisien'],
        ['location', 'Live GPS', 'Terpantau dapur pusat'],
        ['camera', 'Bukti Antar', 'Foto verifikasi tiap titik'],
      ] as const,
    };

export default function LandingScreen({ navigation }: any) {
  const theme = useTheme();
  const s = makeStyles(theme);
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={s.root}>
      {/* gold glow backdrop */}
      <LinearGradient colors={['rgba(232,181,74,0.20)', 'transparent']} style={s.glow} />
      <SafeAreaView style={s.safe}>
        <Animated.View style={[s.body, { opacity: fade, transform: [{ translateY: rise }] }]}>
          {/* emblem */}
          <View style={s.emblemWrap}>
            <LinearGradient colors={['#fff0cf', '#ffd277', '#c9962f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.emblem}>
              <Ionicons name={COPY.emblem} size={38} color="#1a1206" />
            </LinearGradient>
            <View style={s.ring} />
          </View>

          <View style={s.tag}><Text style={s.tagText}>LOGIEAT · {COPY.tag}</Text></View>
          <Text style={s.title}>{COPY.title[0]}{'\n'}<Text style={s.titleGold}>{COPY.title[1]}</Text></Text>
          <Text style={s.sub}>{COPY.sub}</Text>

          <View style={s.features}>
            {COPY.features.map(([icon, t, d]) => (
              <View key={t} style={s.feat}>
                <View style={s.featIcon}><Ionicons name={icon as any} size={20} color={theme.color.accentT} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.featTitle}>{t}</Text>
                  <Text style={s.featDesc}>{d}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[s.footer, { opacity: fade }]}>
          <Pressable onPress={() => navigation.navigate('Login')} style={({ pressed }) => pressed && { transform: [{ scale: 0.98 }] }}>
            <LinearGradient colors={['#fff0cf', '#ffd277', '#c9962f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
              <Text style={s.ctaText}>Masuk</Text>
              <Ionicons name="arrow-forward" size={18} color="#1a1206" />
            </LinearGradient>
          </Pressable>
          <Text style={s.hint}>
            {isCatering ? 'Belum punya akun? Daftar lewat web LogiEat OS.' : 'Akun kurir dibuat oleh kateringmu.'}
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  glow: { position: 'absolute', top: -120, left: -60, right: -60, height: 420, borderRadius: 300 },
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  emblemWrap: { alignItems: 'flex-start', marginBottom: 26 },
  emblem: { width: 76, height: 76, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: theme.color.accent, shadowOpacity: 0.55, shadowRadius: 26, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  ring: { position: 'absolute', top: -10, left: -10, width: 96, height: 96, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,210,119,0.25)' },
  tag: { alignSelf: 'flex-start', backgroundColor: theme.color.accentSub, borderWidth: 1, borderColor: 'rgba(255,210,119,0.3)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { color: theme.color.accentT, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: theme.color.ink, fontSize: 42, fontWeight: '700', lineHeight: 46, letterSpacing: -1, marginTop: 16 },
  titleGold: { color: theme.color.accentT },
  sub: { color: theme.color.ink2, fontSize: 16, marginTop: 12, lineHeight: 23 },
  features: { marginTop: 32, gap: 16 },
  feat: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: theme.color.accentSub, borderWidth: 1, borderColor: 'rgba(255,210,119,0.2)', alignItems: 'center', justifyContent: 'center' },
  featTitle: { color: theme.color.ink, fontSize: 15, fontWeight: '600' },
  featDesc: { color: theme.color.ink2, fontSize: 13, marginTop: 1 },
  footer: { paddingHorizontal: 28, paddingBottom: 24, gap: 12 },
  cta: { height: 58, borderRadius: theme.radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: theme.color.accent, shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  ctaText: { color: '#1a1206', fontSize: 17, fontWeight: '700' },
  hint: { color: theme.color.ink2, fontSize: 12, textAlign: 'center' },
});
