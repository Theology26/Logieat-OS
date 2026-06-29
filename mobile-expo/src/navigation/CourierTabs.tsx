import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import TasksScreen from '../screens/TasksScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const ICON: Record<string, string> = { Tugas: 'list', Chat: 'chatbubble-ellipses', Profil: 'person' };

export default function CourierTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.color.accentT,
        tabBarInactiveTintColor: theme.color.ink2,
        tabBarStyle: { backgroundColor: theme.color.raised, borderTopColor: theme.color.line, borderTopWidth: 1, height: 62, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, focused }) => {
          const base = ICON[route.name];
          return <Ionicons name={(focused ? base : `${base}-outline`) as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Tugas" component={TasksScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
