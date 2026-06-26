import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { api, ApiError } from '../lib/api';
import { config } from '../lib/config';
import { PrimaryButton } from '../components/Buttons';

const isCatering = config.appRole === 'catering';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const { user } = await api.login(email.trim(), password);
      const ok = isCatering ? (user.role === 'owner' || user.role === 'admin') : user.role === 'courier';
      if (!ok) {
        await api.logout();
        setError(isCatering ? 'Akun ini bukan owner/admin catering.' : 'Akun ini bukan kurir.');
        return;
      }
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal masuk. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.body}>
        <Text style={s.brand}>LOGIEAT OS</Text>
        <Text style={s.title}>{isCatering ? 'Masuk Catering' : 'Masuk Kurir'}</Text>
        <Text style={s.sub}>{isCatering ? 'Akun owner / admin katering.' : 'Gunakan akun dari kateringmu.'}</Text>

        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Kata sandi" value={password} onChangeText={setPassword} secureTextEntry />

        {error && <Text style={s.error}>{error}</Text>}

        <PrimaryButton label={busy ? 'Memproses…' : 'Masuk'} onPress={submit} loading={busy} style={{ marginTop: 24 }} />
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 14 }}>
          <Text style={s.back}>← Kembali</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }: any) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={theme.color.ink2}
        style={s.input}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  body: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  brand: { color: theme.color.accentT, fontWeight: '600', fontSize: 13, letterSpacing: 1 },
  title: { color: theme.color.ink, fontSize: 28, fontWeight: '600', marginTop: 6 },
  sub: { color: theme.color.ink2, fontSize: 14, marginTop: 4 },
  label: { color: theme.color.ink2, fontSize: 12, marginBottom: 6 },
  input: { height: 54, borderRadius: theme.radius.xs, backgroundColor: theme.color.overlay, borderWidth: 1, borderColor: theme.color.line2, color: theme.color.ink, paddingHorizontal: 14, fontSize: 16 },
  error: { color: theme.color.danger, fontSize: 13, marginTop: 12 },
  cta: { height: 56, borderRadius: theme.radius.md, backgroundColor: theme.color.accent, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  ctaText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  back: { color: theme.color.ink2, textAlign: 'center', fontSize: 14 },
});
