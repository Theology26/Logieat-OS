// Animated dark/light switch for mobile — same idea as the web Galahhad toggle:
// day-blue night track, a sun that slides over and morphs into a moon.
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useTheme, useThemeMode } from '../lib/theme-context';

const TRACK_W = 64;
const TRACK_H = 34;
const KNOB = 26;
const PAD = 4;

export default function ThemeToggle() {
  const theme = useTheme();
  const { mode, toggle } = useThemeMode();
  const isDark = mode === 'dark';

  // 0 = light (sun, left), 1 = dark (moon, right)
  const t = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: isDark ? 1 : 0,
      duration: 320,
      easing: Easing.bezier(0, -0.02, 0.35, 1.17),
      useNativeDriver: false,
    }).start();
  }, [isDark, t]);

  const trackColor = t.interpolate({ inputRange: [0, 1], outputRange: ['#3D7EAE', '#1D1F2C'] });
  const knobColor = t.interpolate({ inputRange: [0, 1], outputRange: ['#ECCA2F', '#C4C9D1'] });
  const knobX = t.interpolate({ inputRange: [0, 1], outputRange: [PAD, TRACK_W - KNOB - PAD] });
  // Moon crater overlay fades in as it slides to the dark side.
  const craterOpacity = t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] });

  return (
    <Pressable
      onPress={toggle}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel="Ganti tema gelap atau terang"
      style={{ borderRadius: TRACK_H / 2 }}
    >
      <Animated.View style={[s.track, { backgroundColor: trackColor, borderColor: theme.color.line2 }]}>
        <Animated.View style={[s.knob, { backgroundColor: knobColor, transform: [{ translateX: knobX }] }]}>
          <Animated.View style={[s.crater, s.craterA, { opacity: craterOpacity }]} />
          <Animated.View style={[s.crater, s.craterB, { opacity: craterOpacity }]} />
          <Animated.View style={[s.crater, s.craterC, { opacity: craterOpacity }]} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    overflow: 'hidden',
  },
  crater: { position: 'absolute', borderRadius: 999, backgroundColor: '#959DB1' },
  craterA: { width: 8, height: 8, top: 9, left: 4 },
  craterB: { width: 5, height: 5, top: 13, left: 15 },
  craterC: { width: 4, height: 4, top: 5, left: 11 },
});
