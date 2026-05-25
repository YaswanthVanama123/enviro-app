/**
 * MapView Component
 * Reusable Mapbox map component for React Native
 */

import React, {useRef} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import {
  MAPBOX_ACCESS_TOKEN,
  DEFAULT_MAP_CONFIG,
  DEFAULT_CAMERA_CONFIG,
  MARKER_COLORS,
  isMapboxConfigured,
} from '../../config/mapbox';

// Initialize Mapbox
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

export interface MapMarker {
  id: string;
  longitude: number;
  latitude: number;
  color?: string;
  label?: string;
}

interface MapViewProps {
  markers?: MapMarker[];
  onMarkerPress?: (marker: MapMarker) => void;
  onMapPress?: (longitude: number, latitude: number) => void;
  style?: object;
  showUserLocation?: boolean;
  initialCamera?: {
    centerCoordinate: [number, number];
    zoomLevel: number;
  };
}

export function MapView({
  markers = [],
  onMarkerPress,
  onMapPress,
  style,
  showUserLocation = false,
  initialCamera = {
    centerCoordinate: DEFAULT_CAMERA_CONFIG.centerCoordinate as [number, number],
    zoomLevel: DEFAULT_CAMERA_CONFIG.zoomLevel,
  },
}: MapViewProps) {
  const cameraRef = useRef<Mapbox.Camera>(null);

  // Handle map press
  const handleMapPress = (feature: GeoJSON.Feature) => {
    if (onMapPress && feature.geometry.type === 'Point') {
      const [longitude, latitude] = feature.geometry.coordinates;
      onMapPress(longitude, latitude);
    }
  };

  // Show error if Mapbox is not configured
  if (!isMapboxConfigured()) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Text style={styles.errorTitle}>Mapbox Not Configured</Text>
        <Text style={styles.errorText}>
          Add your Mapbox access token to{'\n'}
          src/config/mapbox.ts
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={DEFAULT_MAP_CONFIG.style}
        onPress={handleMapPress}
        logoEnabled={true}
        attributionEnabled={true}
        compassEnabled={true}
        scaleBarEnabled={true}
      >
        {/* Camera */}
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={initialCamera.zoomLevel}
          centerCoordinate={initialCamera.centerCoordinate}
          animationDuration={DEFAULT_CAMERA_CONFIG.animationDuration}
        />

        {/* User Location */}
        {showUserLocation && (
          <Mapbox.UserLocation visible={true} />
        )}

        {/* Markers */}
        {markers.map((marker) => (
          <Mapbox.PointAnnotation
            key={marker.id}
            id={marker.id}
            coordinate={[marker.longitude, marker.latitude]}
            onSelected={() => onMarkerPress?.(marker)}
          >
            <View style={styles.markerContainer}>
              <View
                style={[
                  styles.marker,
                  {backgroundColor: marker.color || MARKER_COLORS.default},
                ]}
              >
                <View style={styles.markerInner} />
              </View>
              {marker.label && (
                <View style={styles.labelContainer}>
                  <Text style={styles.labelText}>{marker.label}</Text>
                </View>
              )}
            </View>
            <Mapbox.Callout title={marker.label || marker.id} />
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 300,
  },
  map: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    minHeight: 300,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  labelContainer: {
    marginTop: 4,
    backgroundColor: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
});

export default MapView;
