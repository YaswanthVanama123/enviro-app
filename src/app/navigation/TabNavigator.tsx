import React from 'react';
import {View, StyleSheet, Platform, ActivityIndicator} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../../features/home/screens/HomeScreen';
import {SavedAgreementsScreen} from '../../features/agreements/screens/SavedAgreementsScreen';
import {CreateAgreementScreen} from '../../features/agreements/screens/CreateAgreementScreen';
import {TrashScreen} from '../../features/agreements/screens/TrashScreen';
import {AdminPanelScreen} from '../../features/admin/screens/AdminPanelScreen';
import {AdminDashboardScreen} from '../../features/admin/screens/AdminDashboardScreen';
import {ApprovalDocumentsScreen} from '../../features/admin/screens/ApprovalDocumentsScreen';
import {PricingDetailsScreen} from '../../features/admin/screens/PricingDetailsScreen';
import {useAdminAuth} from '../../features/admin/context/AdminAuthContext';
import {Colors, FontSize, Spacing} from '../../theme';

const Tab = createBottomTabNavigator();

const TAB_ICON: Record<string, [string, string]> = {
  Home:      ['home-outline',                       'home'],
  Saved:     ['document-text-outline',              'document-text'],
  Trash:     ['trash-outline',                      'trash'],
  More:      ['ellipsis-horizontal-circle-outline', 'ellipsis-horizontal-circle'],
  Dashboard: ['grid-outline',                       'grid'],
  Approvals: ['checkmark-circle-outline',           'checkmark-circle'],
  Pricing:   ['pricetag-outline',                   'pricetag'],
  Admin:     ['shield-checkmark-outline',           'shield-checkmark'],
};

export function TabNavigator() {
  const {isAuthenticated, authReady} = useAdminAuth();

  if (!authReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({focused, color, size}) => {
          const icons = TAB_ICON[route.name];
          if (!icons) {return null;}
          return (
            <Ionicons
              name={focused ? icons[1] : icons[0]}
              size={size ?? 22}
              color={color}
            />
          );
        },
      })}>

      {isAuthenticated ? (
        <>
          <Tab.Screen
            name="Dashboard"
            component={AdminDashboardScreen}
            options={{tabBarLabel: 'Dash'}}
          />
          <Tab.Screen
            name="New"
            component={CreateAgreementScreen}
            options={{
              tabBarLabel: 'New',
              tabBarIcon: ({focused}) => (
                <View style={[styles.newBtn, focused && styles.newBtnActive]}>
                  <Ionicons
                    name="add"
                    size={26}
                    color={focused ? Colors.textWhite : Colors.primary}
                  />
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
            name="Approvals"
            component={ApprovalDocumentsScreen}
            options={{tabBarLabel: 'Approvals'}}
          />
          <Tab.Screen
            name="Pricing"
            component={PricingDetailsScreen}
            options={{tabBarLabel: 'Pricing'}}
          />
          <Tab.Screen
            name="Admin"
            component={AdminPanelScreen}
            options={{tabBarLabel: 'Admin'}}
          />
        </>
      ) : (
        <>
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
                <View style={[styles.newBtn, focused && styles.newBtnActive]}>
                  <Ionicons
                    name="add"
                    size={26}
                    color={focused ? Colors.textWhite : Colors.primary}
                  />
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
        </>
      )}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
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
  newBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  newBtnActive: {
    backgroundColor: Colors.primary,
  },
});
