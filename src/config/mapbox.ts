/**
 * Mapbox Configuration for React Native
 *
 * Setup Instructions:
 * 1. Get your access token from: https://account.mapbox.com/access-tokens/
 * 2. Replace the placeholder token below with your actual token
 *
 * iOS Setup:
 * 1. Add to ios/Podfile before `target 'EnviroApp'`:
 *    $RNMapboxMapsDownloadToken = 'YOUR_SECRET_TOKEN_HERE'
 * 2. Run: cd ios && pod install
 *
 * Android Setup:
 * 1. Add to android/gradle.properties:
 *    MAPBOX_DOWNLOADS_TOKEN=YOUR_SECRET_TOKEN_HERE
 * 2. Add to android/app/src/main/AndroidManifest.xml inside <application>:
 *    <meta-data android:name="MAPBOX_ACCESS_TOKEN" android:value="YOUR_PUBLIC_TOKEN" />
 */

// TODO: Replace with your actual Mapbox public access token
export const MAPBOX_ACCESS_TOKEN = 'pk.your_mapbox_public_token_here';

// Map style options
export const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  satelliteStreets: 'mapbox://styles/mapbox/satellite-streets-v12',
  navigationDay: 'mapbox://styles/mapbox/navigation-day-v1',
  navigationNight: 'mapbox://styles/mapbox/navigation-night-v1',
};

// Default map settings
export const DEFAULT_MAP_CONFIG = {
  style: MAP_STYLES.streets,
  // Center on USA (approximate center)
  centerCoordinate: [-98.5795, 39.8283],
  zoomLevel: 4,
};

// Default camera settings
export const DEFAULT_CAMERA_CONFIG = {
  centerCoordinate: [-98.5795, 39.8283],
  zoomLevel: 4,
  animationDuration: 500,
};

// Marker colors
export const MARKER_COLORS = {
  customer: '#3b82f6', // Blue
  anchor: '#16a34a',   // Green
  selected: '#dc2626', // Red
  default: '#6b7280',  // Gray
};

// Check if Mapbox is properly configured
export const isMapboxConfigured = (): boolean => {
  return MAPBOX_ACCESS_TOKEN.length > 0 && MAPBOX_ACCESS_TOKEN.startsWith('pk.');
};
