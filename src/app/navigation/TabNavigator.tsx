import React from 'react';
import {View, Text, StyleSheet, Platform, TouchableOpacity, Alert} from 'react-native';
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
import {EditHistoryScreen} from '../../features/admin/screens/EditHistoryScreen';
import {EmployeeAgreementsScreen} from '../../features/admin/screens/EmployeeAgreementsScreen';
import {useAuth} from '../../features/admin/context/AdminAuthContext';
import {Colors, FontSize, Spacing} from '../../theme';

const Tab = createBottomTabNavigator();

const TAB_ICON: Record<string, [string, string]> = {
  Home:      ['home-outline',                       'home'],
  Saved:     ['document-text-outline',              'document-text'],
  Trash:     ['trash-outline',                      'trash'],
  More:      ['person-circle-outline',              'person-circle'],
  Dashboard: ['grid-outline',                       'grid'],
  Approvals: ['checkmark-circle-outline',           'checkmark-circle'],
  Pricing:   ['pricetag-outline',                   'pricetag'],
  Admin:     ['shield-checkmark-outline',           'shield-checkmark'],
  History:   ['time-outline',                       'time'],
  Employees: ['people-outline',                     'people'],
};

// Profile/More Screen Component
function ProfileScreen() {
  const {user, isAdmin, logout} = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  };

  return (
    <View style={profileStyles.container}>
      <View style={profileStyles.header}>
        <View style={profileStyles.avatarContainer}>
          <Text style={profileStyles.avatarText}>
            {(user?.fullName || user?.username || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={profileStyles.name}>{user?.fullName || user?.username}</Text>
        <View style={[
          profileStyles.roleBadge,
          isAdmin ? profileStyles.adminBadge : profileStyles.employeeBadge,
        ]}>
          <Text style={profileStyles.roleText}>
            {isAdmin ? 'Admin' : 'Employee'}
          </Text>
        </View>
      </View>

      <View style={profileStyles.infoSection}>
        <View style={profileStyles.infoRow}>
          <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
          <Text style={profileStyles.infoLabel}>Username</Text>
          <Text style={profileStyles.infoValue}>{user?.username}</Text>
        </View>
        {user?.email && (
          <View style={profileStyles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />
            <Text style={profileStyles.infoLabel}>Email</Text>
            <Text style={profileStyles.infoValue}>{user.email}</Text>
          </View>
        )}
        <View style={profileStyles.infoRow}>
          <Ionicons name="shield-outline" size={20} color={Colors.textSecondary} />
          <Text style={profileStyles.infoLabel}>Role</Text>
          <Text style={profileStyles.infoValue}>
            {isAdmin ? 'Administrator' : 'Employee'}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={profileStyles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={Colors.primary} />
        <Text style={profileStyles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

export function TabNavigator() {
  const {isAdmin} = useAuth();

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

      {isAdmin ? (
        // Admin tabs
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
            name="History"
            component={EditHistoryScreen}
            options={{tabBarLabel: 'History'}}
          />
          <Tab.Screen
            name="Employees"
            component={EmployeeAgreementsScreen}
            options={{tabBarLabel: 'Staff'}}
          />
          <Tab.Screen
            name="Admin"
            component={AdminPanelScreen}
            options={{tabBarLabel: 'Admin'}}
          />
          <Tab.Screen
            name="More"
            component={ProfileScreen}
            options={{tabBarLabel: 'Profile'}}
          />
        </>
      ) : (
        // Employee tabs
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
            component={ProfileScreen}
            options={{tabBarLabel: 'Profile'}}
          />
        </>
      )}
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

const profileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  adminBadge: {
    backgroundColor: Colors.primary,
  },
  employeeBadge: {
    backgroundColor: Colors.blue,
  },
  roleText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textWhite,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoLabel: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  logoutText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.primary,
  },
});
