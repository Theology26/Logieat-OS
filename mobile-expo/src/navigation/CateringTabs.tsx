import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import DispatchScreen from '../screens/catering/DispatchScreen';
import PesananScreen from '../screens/catering/PesananScreen';
import ArmadaScreen from '../screens/catering/ArmadaScreen';
import KurirScreen from '../screens/catering/KurirScreen';
import StatistikScreen from '../screens/catering/StatistikScreen';

const Tab = createBottomTabNavigator();
const ICON: Record<string, string> = {
  Dispatch: 'navigate', Pesanan: 'receipt', Armada: 'map', Kurir: 'people', Statistik: 'stats-chart',
};

export default function CateringTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.color.accentT,
        tabBarInactiveTintColor: theme.color.ink2,
        tabBarStyle: { backgroundColor: theme.color.raised, borderTopColor: theme.color.line, borderTopWidth: 1, height: 62, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ color, focused }) => {
          const base = ICON[route.name];
          return <Ionicons name={(focused ? base : `${base}-outline`) as any} size={21} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dispatch" component={DispatchScreen} />
      <Tab.Screen name="Pesanan" component={PesananScreen} />
      <Tab.Screen name="Armada" component={ArmadaScreen} />
      <Tab.Screen name="Kurir" component={KurirScreen} />
      <Tab.Screen name="Statistik" component={StatistikScreen} />
    </Tab.Navigator>
  );
}
