import { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import SplashScreen from './src/screens/SplashScreen';
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import NavigationScreen from './src/screens/NavigationScreen';
import PodCameraScreen from './src/screens/PodCameraScreen';
import CourierTabs from './src/navigation/CourierTabs';
import CateringTabs from './src/navigation/CateringTabs';
import { api, getToken } from './src/lib/api';
import { realtime } from './src/lib/ws';
import { config } from './src/lib/config';
import { setupNotifications, registerForPush, showLocal } from './src/lib/push';
import { ThemeProvider, useTheme } from './src/lib/theme-context';

const Stack = createNativeStackNavigator();
const isCatering = config.appRole === 'catering';

export default function App() {
  return (
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  );
}

function Root() {
  const theme = useTheme();
  const navTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: theme.color.bg, card: theme.color.bg, text: theme.color.ink, border: theme.color.line, primary: theme.color.accent },
  };
  const [booted, setBooted] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    (async () => {
      setSignedIn(!!(await getToken()));
      setTimeout(() => setBooted(true), 1300);
    })();
  }, []);

  useEffect(() => {
    let off = () => {};
    (async () => {
      await setupNotifications();
      if (await getToken()) {
        realtime.connect();
        const pushToken = await registerForPush();
        if (pushToken) api.savePushToken(pushToken).catch(() => {});
      }
      off = realtime.on((m) => { if (m.type === 'notif') showLocal(m.title || 'LogiEat OS', m.body || ''); });
    })();
    return () => off();
  }, []);

  if (!booted) return <SplashScreen />;

  const Home = isCatering ? CateringTabs : CourierTabs;

  return (
    <SafeAreaProvider>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          initialRouteName={signedIn ? 'Main' : 'Landing'}
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.color.bg } }}
        >
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={Home} />
          {!isCatering && (
            <>
              <Stack.Screen name="Navigation" component={NavigationScreen} />
              <Stack.Screen name="Pod" component={PodCameraScreen} options={{ presentation: 'modal' }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
