import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme-context';
import type { Theme } from '../theme';

export default function SplashScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  return (
    <View style={s.root}>
      <View style={s.logo}>
        <Text style={s.logoMark}>◈</Text>
      </View>
      <Text style={s.brand}>
        LogiEat <Text style={{ color: theme.color.accentT }}>OS</Text>
      </Text>
      <ActivityIndicator color={theme.color.accentT} style={{ marginTop: 18 }} />
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg, alignItems: 'center', justifyContent: 'center' },
  logo: {
    width: 84, height: 84, borderRadius: 24, backgroundColor: theme.color.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    shadowColor: theme.color.accent, shadowOpacity: 0.6, shadowRadius: 30, shadowOffset: { width: 0, height: 0 },
  },
  logoMark: { fontSize: 40, color: '#fff' },
  brand: { fontSize: 24, fontWeight: '600', color: theme.color.ink, letterSpacing: -0.3 },
});
