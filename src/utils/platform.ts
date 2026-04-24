import {Platform, useWindowDimensions} from 'react-native';

export const isWindows = Platform.OS === 'windows';

export const DESKTOP_SIDEBAR_WIDTH = 220;
export const DESKTOP_BREAKPOINT = 900;

export function useIsDesktop(): boolean {
  const {width} = useWindowDimensions();
  return isWindows || width >= DESKTOP_BREAKPOINT;
}

export const DesktopSpacing = {
  sidebarWidth: DESKTOP_SIDEBAR_WIDTH,
  contentPadding: 32,
  cardPadding: 24,
  rowGap: 20,
  sectionGap: 32,
};

export const DesktopFontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 26,
  xxxl: 32,
};
