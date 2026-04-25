import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
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

// ── Exact web app color palette ──────────────────────────
const C = {
  primary:        '#c00000',
  navBg:          '#ffffff',
  navBorder:      '#e6e6e6',
  navItemHover:   '#f3f3f3',
  navItemActive:  '#c00000',
  navText:        '#333333',
  navTextActive:  '#ffffff',
  bg:             '#f9fafb',
  surface:        '#ffffff',
  textPrimary:    '#1f2937',
  textSecondary:  '#4a4a4a',
  textMuted:      '#9ca3af',
  border:         '#e5e7eb',
  green:          '#10b981',
};

interface NavItem {
  name:       string;
  label:      string;
  icon:       string;
  component:  React.ComponentType<any>;
}

const AUTH_NAV: NavItem[] = [
  {name: 'Dashboard',  label: 'Dashboard',      icon: 'grid-outline',              component: AdminDashboardScreen},
  {name: 'New',        label: 'New Agreement',   icon: 'add-circle-outline',        component: CreateAgreementScreen},
  {name: 'Saved',      label: 'Saved PDFs',      icon: 'document-text-outline',     component: SavedAgreementsScreen},
  {name: 'Approvals',  label: 'Approvals',       icon: 'checkmark-circle-outline',  component: ApprovalDocumentsScreen},
  {name: 'Pricing',    label: 'Pricing',         icon: 'pricetag-outline',          component: PricingDetailsScreen},
  {name: 'Admin',      label: 'Admin Panel',     icon: 'shield-checkmark-outline',  component: AdminPanelScreen},
];

const PUBLIC_NAV: NavItem[] = [
  {name: 'Home',    label: 'Home',          icon: 'home-outline',                       component: HomeScreen},
  {name: 'New',     label: 'Form Filling',  icon: 'create-outline',                     component: CreateAgreementScreen},
  {name: 'Saved',   label: 'Saved PDFs',    icon: 'document-text-outline',              component: SavedAgreementsScreen},
  {name: 'Trash',   label: 'Trash',         icon: 'trash-outline',                      component: TrashScreen},
  {name: 'More',    label: 'Admin Panel',   icon: 'shield-checkmark-outline',           component: AdminPanelScreen},
];

export function TabNavigator() {
  const {isAuthenticated, authReady} = useAdminAuth();
  const [activeTab, setActiveTab] = useState(0);

  if (!authReady) {
    return (
      <View style={ss.loading}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const navItems = isAuthenticated ? AUTH_NAV : PUBLIC_NAV;
  const ActiveScreen = navItems[activeTab]?.component ?? navItems[0].component;

  return (
    <View style={ss.shell}>

      {/* ── Top Nav Bar — exact web app layout ── */}
      <View style={ss.topnav}>
        {/* Brand / Logo */}
        <View style={ss.brand}>
          <View style={ss.logoBox}>
            <Text style={ss.logoText}>EM</Text>
          </View>
          <Text style={ss.brandName}>EnviroMaster</Text>
        </View>

        {/* Nav links — right-aligned, exact web app style */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={ss.navScroll}
          contentContainerStyle={ss.navMenu}>
          {navItems.map((item, idx) => {
            const isActive = idx === activeTab;
            return (
              <TouchableOpacity
                key={item.name}
                style={[ss.navItem, isActive && ss.navItemActive]}
                onPress={() => setActiveTab(idx)}
                activeOpacity={0.8}>
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={isActive ? C.navTextActive : C.navText}
                  style={ss.navIcon}
                />
                <Text style={[ss.navLabel, isActive && ss.navLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Page Body ── */}
      <View style={ss.pageBody}>
        <ActiveScreen />
      </View>

    </View>
  );
}

const NAV_HEIGHT = 72;

const ss = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: C.bg,
  },

  // ── Top Nav ──
  topnav: {
    height:            NAV_HEIGHT,
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 24,
    backgroundColor:   C.navBg,
    borderBottomWidth: 1,
    borderBottomColor: C.navBorder,
    gap: 16,
  },

  // Brand
  brand: {
    flexDirection: 'row',
    alignItems:    'center',
    gap: 10,
    flexShrink: 0,
  },
  logoBox: {
    width:           52,
    height:          52,
    borderRadius:    8,
    backgroundColor: C.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  logoText: {
    color:      '#ffffff',
    fontSize:   20,
    fontWeight: '800',
    fontFamily: 'Arial',
  },
  brandName: {
    fontSize:   21,
    fontWeight: '700',
    color:      C.textPrimary,
    fontFamily: 'Arial',
  },

  // Nav scroll + items
  navScroll: {
    flex: 1,
  },
  navMenu: {
    flexGrow:       1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingLeft: 8,
  },
  navItem: {
    flexDirection:     'row',
    alignItems:        'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical:   12,
    borderRadius:      8,
  },
  navItemActive: {
    backgroundColor: C.navItemActive,
  },
  navIcon: {},
  navLabel: {
    fontSize:   17,
    fontWeight: '600',
    color:      C.navText,
    fontFamily: 'Arial',
  },
  navLabelActive: {
    color: C.navTextActive,
  },

  // Page body below nav
  pageBody: {
    flex:            1,
    backgroundColor: C.bg,
  },

  loading: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: C.bg,
  },
});
