/**
 * ARQiblaView — Camera-based AR view for Qibla direction.
 * Shows live camera feed with a directional gold arrow overlay,
 * info bar (distance, direction, precision), and haptic feedback.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { DirectionalArrow } from './DirectionalArrow';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const GOLD = '#D4AF37';

const KAABA_COORDS = {
  latitude: 21.4225,
  longitude: 39.8262,
};

const calculateQiblaAngle = (userLat: number, userLon: number): number => {
  const lat1 = (userLat * Math.PI) / 180;
  const lon1 = (userLon * Math.PI) / 180;
  const lat2 = (KAABA_COORDS.latitude * Math.PI) / 180;
  const lon2 = (KAABA_COORDS.longitude * Math.PI) / 180;
  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  let angle = Math.atan2(y, x);
  angle = (angle * 180) / Math.PI;
  return (angle + 360) % 360;
};

const calculateDistance = (userLat: number, userLon: number): number => {
  const R = 6371;
  const lat1 = (userLat * Math.PI) / 180;
  const lat2 = (KAABA_COORDS.latitude * Math.PI) / 180;
  const dLat = ((KAABA_COORDS.latitude - userLat) * Math.PI) / 180;
  const dLon = ((KAABA_COORDS.longitude - userLon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

const getCardinalDirection = (angle: number): string => {
  const directions = [
    'Nord', 'Nord-Est', 'Est', 'Sud-Est',
    'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest',
  ];
  return directions[Math.round(angle / 45) % 8];
};

interface ARQiblaViewProps {
  onClose: () => void;
  qiblaAngle: number;
  distance: number;
  locationName: string;
  isDark?: boolean;
}

export const ARQiblaView: React.FC<ARQiblaViewProps> = ({
  onClose,
  qiblaAngle: initialQiblaAngle,
  distance: initialDistance,
  locationName,
  isDark = false,
}) => {
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [qiblaAngle] = useState(initialQiblaAngle);
  const [distance] = useState(initialDistance);
  const [needsCalibration, setNeedsCalibration] = useState(false);

  const mounted = useRef(true);
  const headingSubscription = useRef<any>(null);
  const lastAngleRef = useRef(0);
  const qiblaHapticFired = useRef(false);
  const infoFadeAnim = useRef(new Animated.Value(1)).current;

  // Compute relative rotation for the arrow
  let relativeAngle = qiblaAngle - deviceHeading;
  // Normalize to -180..180
  if (relativeAngle > 180) relativeAngle -= 360;
  if (relativeAngle < -180) relativeAngle += 360;

  // Absolute offset for precision circle
  const absOffset = Math.abs(relativeAngle);

  // Start heading sensor
  useEffect(() => {
    const startSensors = async () => {
      // Try magnetometer first (especially on Android)
      const magAvailable = await Magnetometer.isAvailableAsync();
      if (magAvailable) {
        Magnetometer.setUpdateInterval(16); // 60fps is enough for AR overlay
        headingSubscription.current = Magnetometer.addListener((data) => {
          if (!mounted.current) return;
          let fieldAngle = Math.atan2(data.x, data.y);
          fieldAngle = (fieldAngle * 180) / Math.PI;
          fieldAngle = (fieldAngle + 360) % 360;
          const angle = (360 - fieldAngle) % 360;

          // Jitter filter
          let diff = angle - lastAngleRef.current;
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;
          if (Math.abs(diff) < 0.5) return;
          lastAngleRef.current = angle;

          setDeviceHeading(angle);
        });
        return;
      }

      // Fallback: Location.watchHeadingAsync
      try {
        const sub = await Location.watchHeadingAsync((data) => {
          if (!mounted.current) return;
          const h = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
          let diff = h - lastAngleRef.current;
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;
          if (Math.abs(diff) < 0.5) return;
          lastAngleRef.current = h;
          setDeviceHeading(h);
        });
        headingSubscription.current = sub;
      } catch {
        setNeedsCalibration(true);
      }
    };

    startSensors();

    return () => {
      mounted.current = false;
      headingSubscription.current?.remove();
    };
  }, []);

  // Haptic on Qibla alignment (<5°)
  useEffect(() => {
    if (absOffset < 5 && !qiblaHapticFired.current) {
      qiblaHapticFired.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (absOffset >= 5) {
      qiblaHapticFired.current = false;
    }
  }, [absOffset]);

  // Fade info bar on fast movement
  useEffect(() => {
    // Show info bar
    Animated.timing(infoFadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [deviceHeading]);

  const precisionLabel = needsCalibration
    ? '🧭 Calibration nécessaire'
    : 'Boussole calibrée ✓';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      {/* Darkened overlay for better contrast */}
      <View style={styles.darkOverlay} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Ionicons name="videocam" size={14} color={GOLD} />
          <Text style={styles.headerBadgeText}>Mode AR</Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#FFF" />
        </Pressable>
      </View>

      {/* Directional Arrow (centered) */}
      <View style={styles.arrowContainer}>
        <DirectionalArrow rotation={relativeAngle} offset={absOffset} />

        {/* Aligned badge */}
        {absOffset < 5 && (
          <View style={styles.alignedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#FFF" />
            <Text style={styles.alignedText}>Face à la Qibla</Text>
          </View>
        )}
      </View>

      {/* Info overlay */}
      <Animated.View style={[styles.infoOverlay, { opacity: infoFadeAnim }]}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="navigate" size={16} color={GOLD} />
            <Text style={styles.infoLabel}>Distance</Text>
            <Text style={styles.infoValue}>{distance.toLocaleString()} km</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Ionicons name="compass" size={16} color={GOLD} />
            <Text style={styles.infoLabel}>Direction</Text>
            <Text style={styles.infoValue}>{Math.round(qiblaAngle)}° {getCardinalDirection(qiblaAngle)}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Ionicons name="analytics" size={16} color={GOLD} />
            <Text style={styles.infoLabel}>Précision</Text>
            <Text style={styles.infoValue}>±5°</Text>
          </View>
        </View>
        <View style={styles.calibrationRow}>
          <Text style={styles.calibrationText}>{precisionLabel}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  headerBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 20,
    gap: 6,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  alignedText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  infoDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '500',
  },
  infoValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  calibrationRow: {
    alignItems: 'center',
    marginTop: 12,
  },
  calibrationText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
});
