/**
 * ARQiblaView — Camera-based AR view for Qibla direction.
 * Shows live camera feed with a directional gold arrow overlay,
 * calibration banner, info bar, and haptic feedback.
 *
 * Performance: Heading drives Animated.Value via direct setValue() —
 * bypasses React state for the arrow rotation (zero latency, ~60fps).
 * EMA smoothing + gyroscope fusion for fluid, jitter-free tracking.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Magnetometer, Gyroscope } from 'expo-sensors';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { DirectionalArrow } from './DirectionalArrow';

const GOLD = '#D4AF37';

/** EMA smoothing factor (0-1). Higher = more responsive, lower = smoother. */
const EMA_ALPHA = 0.55;

/** Gyroscope trust in complementary filter (0-1). Higher = trust gyro more. */
const GYRO_ALPHA = 0.97;

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
  // --- Camera ---
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission?.granted]);

  // --- Calibration state (only updates once) ---
  const [needsCalibration, setNeedsCalibration] = useState(false);

  // --- Throttled UI state (circle color, badges, info — ~12fps) ---
  const [absOffset, setAbsOffset] = useState(180);

  // --- Animated.Value for arrow rotation — driven by direct setValue() ---
  const relativeAngleAnim = useRef(new Animated.Value(0)).current;

  // --- Refs (no re-renders) ---
  const mounted = useRef(true);
  const headingSubscription = useRef<any>(null);
  const gyroSubscription = useRef<any>(null);
  const qiblaAngleRef = useRef(qiblaAngle);
  const smoothedHeadingRef = useRef(0);
  const prevRelativeRef = useRef(0);
  const lastAngleRef = useRef(0);
  const qiblaHapticFired = useRef(false);
  const sampleCount = useRef(0);
  const calibratedRef = useRef(false);
  const lastUiUpdateRef = useRef(0);
  const lastGyroTimeRef = useRef(0);
  const fusedHeadingRef = useRef(0);
  const hasGyro = useRef(false);

  // Track qiblaAngle prop changes
  useEffect(() => {
    qiblaAngleRef.current = qiblaAngle;
  }, [qiblaAngle]);

  // --- Core heading handler: EMA smooth → relative angle → setValue() ---
  const applyHeading = useCallback((rawAngle: number) => {
    // EMA smoothing (circular, handles 0/360 wraparound)
    let emaDiff = rawAngle - smoothedHeadingRef.current;
    if (emaDiff > 180) emaDiff -= 360;
    if (emaDiff < -180) emaDiff += 360;
    smoothedHeadingRef.current = ((smoothedHeadingRef.current + EMA_ALPHA * emaDiff) + 360) % 360;

    const heading = smoothedHeadingRef.current;

    // Compute relative angle (qibla - heading)
    let rel = qiblaAngleRef.current - heading;
    if (rel > 180) rel -= 360;
    if (rel < -180) rel += 360;

    // Cumulative rotation — avoid 360→0 jumps
    let relDiff = rel - prevRelativeRef.current;
    if (relDiff > 180) relDiff -= 360;
    if (relDiff < -180) relDiff += 360;
    const target = prevRelativeRef.current + relDiff;
    prevRelativeRef.current = target;

    // DIRECT setValue — zero latency, no animation scheduling
    relativeAngleAnim.setValue(target);

    // Haptic on Qibla alignment (<5°) — fire once
    const offset = Math.abs(rel);
    if (offset < 5 && !qiblaHapticFired.current) {
      qiblaHapticFired.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (offset >= 5) {
      qiblaHapticFired.current = false;
    }

    // Throttled UI update (~12fps for circle color, badges)
    const now = Date.now();
    if (now - lastUiUpdateRef.current > 80) {
      lastUiUpdateRef.current = now;
      setAbsOffset(offset);
    }
  }, [relativeAngleAnim]);

  // --- Calibration banner animation ---
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

  // --- Start sensors ---
  useEffect(() => {
    setNeedsCalibration(true);

    const startSensors = async () => {
      // --- Gyroscope (Solution 3): fast rotation tracking ---
      try {
        const gyroAvailable = await Gyroscope.isAvailableAsync();
        if (gyroAvailable) {
          hasGyro.current = true;
          Gyroscope.setUpdateInterval(16);
          gyroSubscription.current = Gyroscope.addListener((data) => {
            if (!mounted.current) return;

            const now = Date.now();
            const dt = (now - lastGyroTimeRef.current) / 1000;
            lastGyroTimeRef.current = now;

            // Skip first reading or stale data
            if (dt > 0.1 || dt <= 0) return;

            // Z-axis = yaw rotation (rad/s → deg/s), integrate
            const yawDeg = data.z * (180 / Math.PI) * dt;
            fusedHeadingRef.current = ((fusedHeadingRef.current - yawDeg) + 360) % 360;

            // Apply immediately — gyro is ultra-responsive
            applyHeading(fusedHeadingRef.current);
          });
        }
      } catch {}

      // --- Magnetometer: absolute heading (corrects gyro drift) ---
      const magAvailable = await Magnetometer.isAvailableAsync();
      if (magAvailable) {
        Magnetometer.setUpdateInterval(16);
        headingSubscription.current = Magnetometer.addListener((data) => {
          if (!mounted.current) return;

          // Skip weak field readings
          const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
          if (magnitude < 10) return;

          let fieldAngle = Math.atan2(data.x, data.y);
          fieldAngle = (fieldAngle * 180) / Math.PI;
          fieldAngle = (fieldAngle + 360) % 360;
          const angle = (360 - fieldAngle) % 360;

          // Light jitter filter
          let diff = angle - lastAngleRef.current;
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;
          if (Math.abs(diff) < 0.3) return;
          lastAngleRef.current = angle;

          // Calibration check
          sampleCount.current++;
          if (sampleCount.current > 30 && !calibratedRef.current) {
            calibratedRef.current = true;
            setNeedsCalibration(false);
          }

          if (hasGyro.current) {
            // Complementary filter: correct fused heading toward magnetometer
            let correction = angle - fusedHeadingRef.current;
            if (correction > 180) correction -= 360;
            if (correction < -180) correction += 360;
            fusedHeadingRef.current = ((fusedHeadingRef.current + (1 - GYRO_ALPHA) * correction) + 360) % 360;
            // Gyro callback handles applyHeading
          } else {
            // No gyro — magnetometer drives heading directly
            applyHeading(angle);
          }
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
          if (Math.abs(diff) < 0.3) return;
          lastAngleRef.current = h;

          sampleCount.current++;
          if (sampleCount.current > 30 && !calibratedRef.current) {
            calibratedRef.current = true;
            setNeedsCalibration(false);
          }

          applyHeading(h);
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
      gyroSubscription.current?.remove();
    };
  }, [applyHeading]);

  const precisionLabel = needsCalibration
    ? '🧭 Calibration nécessaire'
    : 'Boussole calibrée ✓';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Camera feed */}
      {permission?.granted && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
          onMountError={(e) => setCameraError(e.message)}
        />
      )}

      {/* Darkened overlay for better contrast */}
      <View style={styles.darkOverlay} />

      {/* Camera status indicator (hidden once camera is ready) */}
      {!cameraReady && (
        <View style={styles.cameraStatus}>
          <Ionicons name="camera" size={32} color="rgba(255,255,255,0.3)" />
          <Text style={styles.cameraStatusText}>
            {cameraError
              ? `Caméra indisponible: ${cameraError}`
              : !permission?.granted
                ? 'Autorisation caméra requise'
                : 'Chargement caméra…'}
          </Text>
        </View>
      )}

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

      {/* Directional Arrow (centered) — driven by Animated.Value */}
      <View style={styles.arrowContainer}>
        <DirectionalArrow rotationAnim={relativeAngleAnim} offset={absOffset} />

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
  cameraStatus: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  cameraStatusText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
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
