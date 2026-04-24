// iOS — adaptive navigator
// Mac Catalyst (width >= 768): horizontal top nav matching web app
// iPhone (width < 768): mobile bottom tabs
import React from 'react';
import {useWindowDimensions} from 'react-native';
import {TabNavigator as DesktopNav} from './TabNavigator.windows';
import {TabNavigator as MobileNav} from './TabNavigatorBase';

export function TabNavigator() {
  const {width} = useWindowDimensions();
  if (width >= 768) {
    return <DesktopNav />;
  }
  return <MobileNav />;
}
