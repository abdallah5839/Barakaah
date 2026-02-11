/**
 * ARQiblaView — Camera-based AR view for Qibla direction.
 * Shows live camera feed with a directional gold arrow overlay,
 * calibration banner, info bar, and haptic feedback.
 */

import React, { useState, useEffect, useRef, Component, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  StatusBar,
  Easing,
} from 'react-native';
import { CameraView } from 'expo-camera';

// ErrorBoundary to catch CameraView native module crashes (Expo Go)
class CameraBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { DirectionalArrow } from './DirectionalArrow';

const GOLD = '#D4AF37';

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
  qiblaAngle,
  distance,
  locationName,
  isDark = false,
}) => {
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [needsCalibration, setNeedsCalibration] = useState(false);

  const mounted = useRef(true);
  const headingSubscription = useRef<any>(null);
  const lastAngleRef = useRef(0);
  const qiblaHapticFired = useRef(false);
  const sampleCount = useRef(0);
  const calibratedRef = useRef(false);

  // Calibration banner animation — rotating icon
  const calibRotateAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (needsCalibration) {
      Animated.loop(
        Animated.timing(calibRotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      calibRotateAnim.stopAnimation();
      calibRotateAnim.setValue(0);
    }
  }, [needsCalibration]);

  const calibRotation = calibRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Compute relative rotation for the arrow
  let relativeAngle = qiblaAngle - deviceHeading;
  if (relativeAngle > 180) relativeAngle -= 360;
  if (relativeAngle < -180) relativeAngle += 360;
  const absOffset = Math.abs(relativeAngle);

  // Start heading sensor
  useEffect(() => {
    // Show calibration hint initially — hide once we get stable readings
    setNeedsCalibration(true);

    const startSensors = async () => {
      const magAvailable = await Magnetometer.isAvailableAsync();
      if (magAvailable) {
        Magnetometer.setUpdateInterval(16);
        headingSubscription.current = Magnetometer.addListener((data) => {
          if (!mounted.current) return;

          // Detect poor calibration: very weak field magnitude
          const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
          if (magnitude < 10) return; // Skip garbage readings

          let fieldAngle = Math.atan2(data.x, data.y);
          fieldAngle = (fieldAngle * 180) / Math.PI;
          fieldAngle = (fieldAngle + 360) % 360;
          const angle = (360 - fieldAngle) % 360;

          let diff = angle - lastAngleRef.current;
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;
          if (Math.abs(diff) < 0.5) return;
          lastAngleRef.current = angle;

          sampleCount.current++;
          // After ~30 stable samples, consider calibrated
          if (sampleCount.current > 30 && !calibratedRef.current) {
            calibratedRef.current = true;
            setNeedsCalibration(false);
          }

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

          sampleCount.current++;
          if (sampleCount.current > 30 && !calibratedRef.current) {
            calibratedRef.current = true;
            setNeedsCalibration(false);
          }

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

  // Haptic on Qibla alignment (<5°) — single fire
  useEffect(() => {
    if (absOffset < 5 && !qiblaHapticFired.current) {
      qiblaHapticFired.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (absOffset >= 5) {
      qiblaHapticFired.current = false;
    }
  }, [absOffset]);

  const precisionLabel = needsCalibration
    ? '🧭 Calibration nécessaire'
    : 'Boussole calibrée ✓';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Camera — wrapped in error boundary for Expo Go fallback */}
      <CameraBoundary>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
        />
      </CameraBoundary>

      {/* Darkened overlay for better contrast */}
      <View style={styles.darkOverlay} />

      {/* Calibration banner */}
      {needsCalibration && (
        <View style={styles.calibBanner}>
          <Animated.View style={{ transform: [{ rotate: calibRotation }] }}>
            <Ionicons name="sync" size={20} color="#FFF" />
          </Animated.View>
          <Text style={styles.calibBannerText}>
            Calibrez votre boussole — Effectuez un mouvement en 8
          </Text>
        </View>
      )}

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
      <View style={styles.infoOverlay}>
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
      </View>
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
  calibBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    height: 60,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 10,
    zIndex: 20,
  },
  calibBannerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
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
