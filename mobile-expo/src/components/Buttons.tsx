import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '../lib/theme-context';
import type { Theme } from '../theme';

type PrimaryProps = { label: string; onPress?: () => void; loading?: boolean; disabled?: boolean; style?: ViewStyle };

export function PrimaryButton({ label, onPress, loading, disabled, style }: PrimaryProps) {
  const theme = useTheme();
  const s = makeStyles(theme);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{ color: 'rgba(0,0,0,0.18)' }}
      style={({ pressed }) => [
        s.btn,
        (disabled || loading) && { opacity: 0.55 },
        pressed && { transform: [{ scale: 0.975 }] },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={theme.color.inverse} /> : <Text style={s.label}>{label}</Text>}
    </Pressable>
  );
}

export function GhostButton({ label, onPress, style }: { label: string; onPress?: () => void; style?: ViewStyle }) {
  const theme = useTheme();
  const s = makeStyles(theme);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.ghost, pressed && { opacity: 0.65 }, style]}
    >
      <Text style={s.ghostLabel}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  btn: {
    height: theme.touch.primary, borderRadius: theme.radius.md, backgroundColor: theme.color.accent,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
    shadowColor: theme.color.accent, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  label: { color: theme.color.inverse, fontWeight: '700', fontSize: 16, letterSpacing: 0.2 },
  ghost: { height: 50, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.line2, alignItems: 'center', justifyContent: 'center' },
  ghostLabel: { color: theme.color.ink, fontWeight: '600', fontSize: 14 },
});
