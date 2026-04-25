import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
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

interface TabItem {
  name: string;
  label: string;
  icon: string;
  iconFocused: string;
  component: React.ComponentType<any>;
}

const PUBLIC_TABS: TabItem[] = [
  {name: 'Home',  label: 'Home',  icon: 'home-outline',                       iconFocused: 'home',                       component: HomeScreen},
  {name: 'New',   label: 'New',   icon: 'add-circle-outline',                 iconFocused: 'add-circle',                 component: CreateAgreementScreen},
  {name: 'Saved', label: 'Saved', icon: 'document-text-outline',              iconFocused: 'document-text',              component: SavedAgreementsScreen},
  {name: 'Trash', label: 'Trash', icon: 'trash-outline',                      iconFocused: 'trash',                      component: TrashScreen},
  {name: 'More',  label: 'More',  icon: 'ellipsis-horizontal-circle-outline', iconFocused: 'ellipsis-horizontal-circle', component: AdminPanelScreen},
];

const AUTH_TABS: TabItem[] = [
  {name: 'Dashboard', label: 'Dash',      icon: 'grid-outline',              iconFocused: 'grid',              component: AdminDashboardScreen},
  {name: 'New',       label: 'New',       icon: 'add-circle-outline',        iconFocused: 'add-circle',        component: CreateAgreementScreen},
  {name: 'Saved',     label: 'Saved',     icon: 'document-text-outline',     iconFocused: 'document-text',     component: SavedAgreementsScreen},
  {name: 'Approvals', label: 'Approvals', icon: 'checkmark-circle-outline',  iconFocused: 'checkmark-circle',  component: ApprovalDocumentsScreen},
  {name: 'Pricing',   label: 'Pricing',   icon: 'pricetag-outline',          iconFocused: 'pricetag',          component: PricingDetailsScreen},
  {name: 'Admin',     label: 'Admin',     icon: 'shield-checkmark-outline',  iconFocused: 'shield-checkmark',  component: AdminPanelScreen},
];

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 50 : 56;

export function TabNavigator() {
  const {isAuthenticated, authReady} = useAdminAuth();
  const [activeTab, setActiveTab] = useState(0);
  const insets = useSafeAreaInsets();

  if (!authReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const tabs = isAuthenticated ? AUTH_TABS : PUBLIC_TABS;
  const ActiveScreen = tabs[activeTab]?.component ?? tabs[0].component;

  // Total height of the tab bar including the bottom safe-area inset
  const tabBarTotalHeight = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View style={styles.shell}>

      {/* ── Screen content — padded so it never slides under the tab bar ── */}
      <View style={[styles.content, {paddingBottom: tabBarTotalHeight}]}>
        <ActiveScreen />
      </View>

      {/* ── Bottom tab bar (absolutely positioned, always on top) ── */}
      <View style={[styles.tabBar, {height: tabBarTotalHeight, paddingBottom: insets.bottom}]}>
        {tabs.map((tab, idx) => {
          const focused = idx === activeTab;
          const isNew = tab.name === 'New';
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => setActiveTab(idx)}
              activeOpacity={0.7}>
              {isNew ? (
                <View style={[styles.newBtn, focused && styles.newBtnActive]}>
                  <Ionicons
                    name={focused ? tab.iconFocused : tab.icon}
                    size={26}
                    color={focused ? Colors.textWhite : Colors.primary}
                  />
                </View>
              ) : (
                <>
                  <Ionicons
                    name={focused ? tab.iconFocused : tab.icon}
                    size={22}
                    color={focused ? Colors.primary : Colors.textMuted}
                  />
                  <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  shell: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopColor: '#e5e7eb',
    borderTopWidth: 1,
    zIndex: 999,
    elevation: 8,          // Android shadow
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TAB_BAR_HEIGHT - Spacing.sm,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
  newBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBtnActive: {
    backgroundColor: Colors.primary,
  },
});
