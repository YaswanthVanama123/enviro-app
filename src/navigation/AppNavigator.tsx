import React from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import {Colors, FontSize, Spacing} from '../theme';

// ─── Placeholder screens (build these next) ──────────────────────────────────

function PlaceholderScreen({title}: {title: string}) {
  return (
    <View style={placeholderStyles.container}>
      <Text style={placeholderStyles.emoji}>🚧</Text>
      <Text style={placeholderStyles.title}>{title}</Text>
      <Text style={placeholderStyles.sub}>Coming soon</Text>
    </View>
  );
}

const placeholderStyles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6'},
  emoji: {fontSize: 48, marginBottom: 12},
  title: {fontSize: 20, fontWeight: '700', color: '#1f2937'},
  sub: {fontSize: 14, color: '#9ca3af', marginTop: 4},
});

function NewAgreementScreen() {
  return <PlaceholderScreen title="New Agreement" />;
}
function SavedScreen() {
  return <PlaceholderScreen title="Saved Agreements" />;
}
function TrashScreen() {
  return <PlaceholderScreen title="Trash" />;
}
function MoreScreen() {
  return <PlaceholderScreen title="More" />;
}

// ─── Tab icons (pure text/unicode — no native icon library needed) ────────────

const TAB_ICONS: Record<string, {active: string; inactive: string}> = {
  Home: {active: '⬤', inactive: '○'},
  New: {active: '＋', inactive: '＋'},
  Saved: {active: '⬤', inactive: '○'},
  Trash: {active: '⬤', inactive: '○'},
  More: {active: '⬤', inactive: '○'},
};

// ─── Stack + Tab Navigators ───────────────────────────────────────────────────

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,   // #c00000
        tabBarInactiveTintColor: Colors.textMuted, // #9ca3af
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({focused, color}) => {
          const icon = TAB_ICONS[route.name];
          return (
            <Text style={{fontSize: focused ? 10 : 8, color}}>
              {focused ? icon.active : icon.inactive}
            </Text>
          );
        },
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{tabBarLabel: 'Home'}}
      />
      <Tab.Screen
        name="New"
        component={NewAgreementScreen}
        options={{
          tabBarLabel: 'New',
          tabBarIcon: ({focused}) => (
            <View style={[styles.tabNewBtn, focused && styles.tabNewBtnActive]}>
              <Text style={[styles.tabNewBtnText, focused && styles.tabNewBtnTextActive]}>＋</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedScreen}
        options={{tabBarLabel: 'Saved'}}
      />
      <Tab.Screen
        name="Trash"
        component={TrashScreen}
        options={{tabBarLabel: 'Trash'}}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{tabBarLabel: 'More'}}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Main" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: '#e5e7eb',
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.sm,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  tabNewBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabNewBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabNewBtnText: {
    fontSize: 22,
    color: Colors.primary,
    fontWeight: '300',
    marginTop: -2,
  },
  tabNewBtnTextActive: {
    color: Colors.textWhite,
  },
});
