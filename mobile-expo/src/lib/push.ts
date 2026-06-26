// Notifications: in-app heads-up (from WS 'notif') + remote token registration (Expo Push).
// Remote push needs an EAS project (eas init) / real build; local heads-up works in Expo Go.
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Tugas & Update',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5264AE',
    });
  }
}

export async function registerForPush(): Promise<string | null> {
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;
  try {
    const projectId =
      (Constants.expoConfig as any)?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;
    const res = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : (undefined as any));
    return res.data;
  } catch {
    return null; // no EAS project yet — fine in dev; in-app heads-up still works
  }
}

export async function showLocal(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}
