import React from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from '../../features/home/screens/HomeScreen';
import {SavedAgreementsScreen} from '../../features/agreements/screens/SavedAgreementsScreen';
import {CreateAgreementScreen} from '../../features/agreements/screens/CreateAgreementScreen';
import {TrashScreen} from '../../features/agreements/screens/TrashScreen';
import {AdminPanelScreen} from '../../features/admin/screens/AdminPanelScreen';
import {Colors, FontSize, Spacing} from '../../theme';
import type {TabParamList} from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, {active: string; inactive: string}> = {
  Home: {active: '\u2B24', inactive: '\u25CB'},
  New: {active: '\uFF0B', inactive: '\uFF0B'},
  Saved: {active: '\u2B24', inactive: '\u25CB'},
  Trash: {active: '\u2B24', inactive: '\u25CB'},
  More: {active: '\u2B24', inactive: '\u25CB'},
};

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
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
        component={CreateAgreementScreen}
        options={{
          tabBarLabel: 'New',
          tabBarIcon: ({focused}) => (
            <View style={[styles.tabNewBtn, focused && styles.tabNewBtnActive]}>
              <Text style={[styles.tabNewBtnText, focused && styles.tabNewBtnTextActive]}>
                {'\uFF0B'}
              </Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedAgreementsScreen}
        options={{tabBarLabel: 'Saved'}}
      />
      <Tab.Screen
        name="Trash"
        component={TrashScreen}
        options={{tabBarLabel: 'Trash'}}
      />
      <Tab.Screen
        name="More"
        component={AdminPanelScreen}
        options={{tabBarLabel: 'More'}}
      />
    </Tab.Navigator>
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
