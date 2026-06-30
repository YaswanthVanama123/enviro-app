

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
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
import {MoreScreen} from './MoreScreen';
import {TabNavigator as DesktopNav} from './TabNavigator.windows';

const C = {
  primary:       '#c00000',
  navBg:         '#ffffff',
  navBorder:     '#e6e6e6',
  navItemActive: '#c00000',
  navText:       '#333333',
  navTextActive: '#ffffff',
  bg:            '#f9fafb',
  textMuted:     '#9ca3af',
  primaryLight:  '#fef2f2',
};

interface NavItem {
  name:       string;
  label:      string;
  icon:       string;
  iconActive: string;
  component:  React.ComponentType<any>;
}

const ADMIN_NAV: NavItem[] = [
  {name: 'Dashboard', label: 'Home',     icon: 'grid-outline',             iconActive: 'grid',             component: AdminDashboardScreen},
  {name: 'New',       label: 'New',      icon: 'add-circle-outline',       iconActive: 'add-circle',       component: CreateAgreementScreen},
  {name: 'Saved',     label: 'Saved',    icon: 'document-text-outline',    iconActive: 'document-text',    component: SavedAgreementsScreen},
  {name: 'Approvals', label: 'Approve',  icon: 'checkmark-circle-outline', iconActive: 'checkmark-circle', component: ApprovalDocumentsScreen},
  {name: 'Pricing',   label: 'Pricing',  icon: 'pricetag-outline',         iconActive: 'pricetag',         component: PricingDetailsScreen},
  {name: 'Admin',     label: 'Admin',    icon: 'shield-checkmark-outline', iconActive: 'shield-checkmark', component: AdminPanelScreen},
];

const EMPLOYEE_NAV: NavItem[] = [
  {name: 'Home',  label: 'Home',  icon: 'home-outline',                       iconActive: 'home',                       component: HomeScreen},
  {name: 'New',   label: 'New',   icon: 'add-circle-outline',                 iconActive: 'add-circle',                 component: CreateAgreementScreen},
  {name: 'Saved', label: 'Saved', icon: 'document-text-outline',              iconActive: 'document-text',              component: SavedAgreementsScreen},
  {name: 'Trash', label: 'Trash', icon: 'trash-outline',                      iconActive: 'trash',                      component: TrashScreen},
  {name: 'More',  label: 'More',  icon: 'ellipsis-horizontal-circle-outline', iconActive: 'ellipsis-horizontal-circle', component: MoreScreen},
];

const PUBLIC_NAV: NavItem[] = EMPLOYEE_NAV;

function MobileNav() {
  const {isAuthenticated, isAdmin, authReady} = useAdminAuth();
  const [activeTab, setActiveTab] = useState(0);

  if (!authReady) {
    return (
      <View style={mob.loading}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  
  const navItems = !isAuthenticated
    ? PUBLIC_NAV
    : isAdmin
      ? ADMIN_NAV
      : EMPLOYEE_NAV;
  const ActiveScreen = navItems[activeTab]?.component ?? navItems[0].component;

  return (
    <View style={mob.shell}>
      {}
      <View style={mob.pageBody}>
        <ActiveScreen />
      </View>

      {}
      <View style={mob.tabBar}>
        {navItems.map((item, idx) => {
          const isActive = idx === activeTab;
          const isNew = item.name === 'New';
          return (
            <TouchableOpacity
              key={item.name}
              style={mob.tabItem}
              onPress={() => setActiveTab(idx)}
              activeOpacity={0.8}>
              {isNew ? (
                <View style={mob.newBtnWrap}>
                  <View style={mob.newBtn}>
                    <Ionicons name="add" size={30} color="#ffffff" />
                  </View>
                </View>
              ) : (
                <>
                  <Ionicons
                    name={isActive ? item.iconActive : item.icon}
                    size={23}
                    color={isActive ? C.primary : C.textMuted}
                  />
                  <Text
                    style={[mob.tabLabel, isActive && mob.tabLabelActive]}
                    numberOfLines={1}>
                    {item.label}
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

export function TabNavigator() {
  const {width} = useWindowDimensions();
  if (width >= 768) {
    return <DesktopNav />;
  }
  return <MobileNav />;
}

const mob = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  shell: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: C.bg,
  },
  pageBody: {
    flex: 1,
    backgroundColor: C.bg,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.navBg,
    borderTopWidth: 1,
    borderTopColor: C.navBorder,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingHorizontal: 4,
    overflow: 'visible',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.textMuted,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: C.primary,
    fontWeight: '700',
  },
  newBtnWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  newBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: C.navBg,
    shadowColor: C.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
