// iOS — adaptive navigator
// Mac Catalyst (width >= 768): horizontal top nav matching web app
// iPhone (width < 768): bottom tab nav
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
import {TabNavigator as DesktopNav} from './TabNavigator.windows';

// ── Shared color palette ──────────────────────────────────
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
  name:      string;
  label:     string;
  icon:      string;
  component: React.ComponentType<any>;
}

const AUTH_NAV: NavItem[] = [
  {name: 'Dashboard', label: 'Dashboard', icon: 'grid-outline',              component: AdminDashboardScreen},
  {name: 'New',       label: 'New',       icon: 'add-circle-outline',        component: CreateAgreementScreen},
  {name: 'Saved',     label: 'Saved',     icon: 'document-text-outline',     component: SavedAgreementsScreen},
  {name: 'Approvals', label: 'Approvals', icon: 'checkmark-circle-outline',  component: ApprovalDocumentsScreen},
  {name: 'Pricing',   label: 'Pricing',   icon: 'pricetag-outline',          component: PricingDetailsScreen},
  {name: 'Admin',     label: 'Admin',     icon: 'shield-checkmark-outline',  component: AdminPanelScreen},
];

const PUBLIC_NAV: NavItem[] = [
  {name: 'Home',  label: 'Home',  icon: 'home-outline',                       component: HomeScreen},
  {name: 'New',   label: 'New',   icon: 'add-circle-outline',                 component: CreateAgreementScreen},
  {name: 'Saved', label: 'Saved', icon: 'document-text-outline',              component: SavedAgreementsScreen},
  {name: 'Trash', label: 'Trash', icon: 'trash-outline',                      component: TrashScreen},
  {name: 'More',  label: 'More',  icon: 'ellipsis-horizontal-circle-outline', component: AdminPanelScreen},
];

// ── Mobile bottom-tab navigator (iPhone) ─────────────────
function MobileNav() {
  const {isAuthenticated, authReady} = useAdminAuth();
  const [activeTab, setActiveTab] = useState(0);

  if (!authReady) {
    return (
      <View style={mob.loading}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const navItems = isAuthenticated ? AUTH_NAV : PUBLIC_NAV;
  const ActiveScreen = navItems[activeTab]?.component ?? navItems[0].component;

  return (
    <View style={mob.shell}>
      {/* ── Page content ── */}
      <View style={mob.pageBody}>
        <ActiveScreen />
      </View>

      {/* ── Bottom tab bar ── */}
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
                <View style={[mob.newBtn, isActive && mob.newBtnActive]}>
                  <Ionicons name="add" size={26} color={isActive ? C.navTextActive : C.primary} />
                </View>
              ) : (
                <>
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={isActive ? C.primary : C.textMuted}
                  />
                  <Text style={[mob.tabLabel, isActive && mob.tabLabelActive]}>
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

// ── Root adaptive navigator ───────────────────────────────
export function TabNavigator() {
  const {width} = useWindowDimensions();
  if (width >= 768) {
    return <DesktopNav />;
  }
  return <MobileNav />;
}

// ── Styles ───────────────────────────────────────────────
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
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textMuted,
    marginTop: 2,
  },
  tabLabelActive: {
    color: C.primary,
  },
  newBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBtnActive: {
    backgroundColor: C.primary,
  },
});
