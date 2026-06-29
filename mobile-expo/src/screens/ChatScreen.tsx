import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme-context';
import type { Theme } from '../theme';
import { realtime } from '../lib/ws';

export default function ChatScreen({ navigation, route }: any) {
  const theme = useTheme();
  const s = makeStyles(theme);
  const routeId = route.params?.routeId;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    realtime.connect();
    const off = realtime.on((m) => {
      if (m.type === 'chat') {
        setMessages((p) => [...p, m]);
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
      }
    });
    return off;
  }, []);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    realtime.send({ type: 'chat', body, route_id: routeId });
    setText('');
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.header}>
        <View style={s.avatar}><Text style={s.avatarText}>DP</Text><View style={s.presence} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>Dapur Pusat</Text>
          <Text style={s.online}>online</Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 14, gap: 10 }}
        ListEmptyComponent={<Text style={s.empty}>Mulai percakapan dengan dapur pusat.</Text>}
        renderItem={({ item }) => {
          const mine = item.sender_role === 'courier';
          return (
            <View style={[s.bubble, mine ? s.mine : s.theirs]}>
              <Text style={mine ? s.mineText : s.theirsText}>{item.body}</Text>
            </View>
          );
        }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.inputBar}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Tulis pesan…"
            placeholderTextColor={theme.color.ink2}
            style={s.input}
            onSubmitEditing={send}
          />
          <Pressable style={s.sendBtn} onPress={send}><Text style={s.sendIcon}>➤</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: theme.color.line },
  back: { color: theme.color.ink, fontSize: 20 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.color.accentSub, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.color.accentT, fontWeight: '600', fontSize: 13 },
  presence: { position: 'absolute', right: -1, bottom: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: theme.color.success, borderWidth: 2, borderColor: theme.color.bg },
  name: { color: theme.color.ink, fontWeight: '600', fontSize: 15 },
  online: { color: theme.color.success, fontSize: 11 },
  empty: { color: theme.color.ink2, textAlign: 'center', marginTop: 40, fontSize: 13 },
  bubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14 },
  mine: { alignSelf: 'flex-end', backgroundColor: theme.color.accent, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: theme.color.raised, borderWidth: 1, borderColor: theme.color.line, borderBottomLeftRadius: 4 },
  mineText: { color: '#fff', fontSize: 14 },
  theirsText: { color: theme.color.ink, fontSize: 14 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderColor: theme.color.line },
  input: { flex: 1, height: 44, borderRadius: theme.radius.md, backgroundColor: theme.color.overlay, borderWidth: 1, borderColor: theme.color.line2, color: theme.color.ink, paddingHorizontal: 16, fontSize: 14 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.color.accent, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { color: '#fff', fontSize: 16 },
});
