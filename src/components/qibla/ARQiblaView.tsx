/**
 * ARQiblaView — Spatial AR view for Qibla direction.
 *
 * The Kaaba pin is positioned in screen space based on the real-world
 * azimuth difference. When the user faces the Qibla, the pin is centered;
 * turning away moves it off-screen with directional indicators.
 *
 * Validation: holding alignment < 5° for 2.5 s fills a circular progress
 * arc, then celebrates with haptic + checkmark.
 *
 * Performance: Animated.Value with direct setValue() from sensor callback
 * (zero latency, ~60 fps). EMA smoothing + gyroscope complementary filter.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  StatusBar,
  Easing,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Magnetometer, Gyroscope } from 'expo-sensors';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { KaabaPin } from './KaabaPin';

// ─── Constants ───────────────────────────────────────────────────────
const GOLD = '#D4AF37';
const { width: SW } = Dimensions.get('window');

const FOV_DEGREES = 60;
const FOV_HALF = FOV_DEGREES / 2; // 30°

const EMA_ALPHA = 0.55;          // Heading EMA (0-1, higher = faster)
const GYRO_ALPHA = 0.97;         // Complementary filter gyro trust

const VALIDATION_DURATION = 2500; // ms
const ALIGNMENT_PERFECT = 5;      // ° to start validation
const PAUSE_THRESHOLD = 10;       // ° to pause (keeps progress)

// ─── Helpers ─────────────────────────────────────────────────────────
const getCardinalDirection = (angle: number): string => {
  const d = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
  return d[Math.round(angle / 45) % 8];
};

// ─── Props ───────────────────────────────────────────────────────────
interface ARQiblaViewProps {
  onClose: () => void;
  qiblaAngle: number;
  distance: number;
  locationName: string;
  isDark?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────
export const ARQiblaView: React.FC<ARQiblaViewProps> = ({
  onClose,
  qiblaAngle,
  distance,
  locationName,
  isDark = false,
}) => {
  // ── Camera ──
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission?.granted]);

  // ── Calibration ──
  const [needsCalibration, setNeedsCalibration] = useState(false);

  // ── Throttled UI state (~12 fps) ──
  const [uiRelAngle, setUiRelAngle] = useState(180);
  const [validationProgress, setValidationProgress] = useState(0);
  const [isValidated, setIsValidated] = useState(false);

  // ── Animated value for pin position (setValue direct, ~60 fps) ──
  const relativeAngleAnim = useRef(new Animated.Value(180)).current;

  // ── Sensor refs ──
  const mounted = useRef(true);
  const headingSubscription = useRef<any>(null);
  const gyroSubscription = useRef<any>(null);
  const qiblaAngleRef = useRef(qiblaAngle);
  const smoothedHeadingRef = useRef(0);
  const lastAngleRef = useRef(0);
  const sampleCount = useRef(0);
  const calibratedRef = useRef(false);
  const lastUiUpdateRef = useRef(0);
  const lastGyroTimeRef = useRef(0);
  const fusedHeadingRef = useRef(0);
  const hasGyro = useRef(false);

  // ── Haptic ref ──
  const qiblaHapticFired = useRef(false);

  // ── Validation refs ──
  const validationStateRef = useRef<'idle' | 'validating' | 'paused' | 'completed'>('idle');
  const validationStartRef = useRef(0);
  const validationAccumulatedRef = useRef(0);
  const lastProgressRef = useRef(0);

  // Track qiblaAngle prop
  useEffect(() => { qiblaAngleRef.current = qiblaAngle; }, [qiblaAngle]);

  // ── Core heading handler ──────────────────────────────────────────
  const applyHeading = useCallback((rawAngle: number) => {
    // EMA smoothing (circular)
    let emaDiff = rawAngle - smoothedHeadingRef.current;
    if (emaDiff > 180) emaDiff -= 360;
    if (emaDiff < -180) emaDiff += 360;
    smoothedHeadingRef.current = ((smoothedHeadingRef.current + EMA_ALPHA * emaDiff) + 360) % 360;

    const heading = smoothedHeadingRef.current;

    // Relative angle (-180..180)
    let rel = qiblaAngleRef.current - heading;
    if (rel > 180) rel -= 360;
    if (rel < -180) rel += 360;

    // Direct setValue → pin position moves at sensor speed
    relativeAngleAnim.setValue(rel);

    const offset = Math.abs(rel);

    // ── Haptic ──
    if (offset < 5 && !qiblaHapticFired.current) {
      qiblaHapticFired.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (offset >= 5) {
      qiblaHapticFired.current = false;
    }

    // ── Validation state machine ──
    if (offset < ALIGNMENT_PERFECT) {
      if (validationStateRef.current === 'idle') {
        validationAccumulatedRef.current = 0;
        validationStartRef.current = Date.now();
        validationStateRef.current = 'validating';
      } else if (validationStateRef.current === 'paused') {
        validationStartRef.current = Date.now();
        validationStateRef.current = 'validating';
      }

      if (validationStateRef.current === 'validating') {
        const elapsed = Date.now() - validationStartRef.current;
        const total = validationAccumulatedRef.current + elapsed;
        const pct = Math.min(Math.round((total / VALIDATION_DURATION) * 100), 100);

        if (pct !== lastProgressRef.current) {
          lastProgressRef.current = pct;
          setValidationProgress(pct);
        }

        if (pct >= 100) {
          validationStateRef.current = 'completed';
          setIsValidated(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } else if (offset < PAUSE_THRESHOLD) {
      if (validationStateRef.current === 'validating') {
        validationAccumulatedRef.current += Date.now() - validationStartRef.current;
        validationStateRef.current = 'paused';
      }
    } else {
      if (validationStateRef.current !== 'idle') {
        validationStateRef.current = 'idle';
        validationAccumulatedRef.current = 0;
        lastProgressRef.current = 0;
        setValidationProgress(0);
        setIsValidated(false);
      }
    }

    // ── Throttled UI state update (~12 fps) ──
    const now = Date.now();
    if (now - lastUiUpdateRef.current > 80) {
      lastUiUpdateRef.current = now;
      setUiRelAngle(rel);
    }
  }, [relativeAngleAnim]);

  // ── Calibration banner animation ──────────────────────────────────
  const calibRotateAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (needsCalibration) {
      Animated.loop(
        Animated.timing(calibRotateAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
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

  // ── Start sensors ─────────────────────────────────────────────────
  useEffect(() => {
    setNeedsCalibration(true);

    const startSensors = async () => {
      // Gyroscope (for complementary filter)
      try {
        const gyroAvail = await Gyroscope.isAvailableAsync();
        if (gyroAvail) {
          hasGyro.current = true;
          Gyroscope.setUpdateInterval(16);
          gyroSubscription.current = Gyroscope.addListener((data) => {
            if (!mounted.current) return;
            const now = Date.now();
            const dt = (now - lastGyroTimeRef.current) / 1000;
            lastGyroTimeRef.current = now;
            if (dt > 0.1 || dt <= 0) return;

            const yawDeg = data.z * (180 / Math.PI) * dt;
            fusedHeadingRef.current = ((fusedHeadingRef.current - yawDeg) + 360) % 360;
            applyHeading(fusedHeadingRef.current);
          });
        }
      } catch {}

      // Magnetometer
      const magAvail = await Magnetometer.isAvailableAsync();
      if (magAvail) {
        Magnetometer.setUpdateInterval(16);
        headingSubscription.current = Magnetometer.addListener((data) => {
          if (!mounted.current) return;

          const mag = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
          if (mag < 10) return;

          let fa = Math.atan2(data.x, data.y);
          fa = (fa * 180) / Math.PI;
          fa = (fa + 360) % 360;
          const angle = (360 - fa) % 360;

          let diff = angle - lastAngleRef.current;
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;
          if (Math.abs(diff) < 0.3) return;
          lastAngleRef.current = angle;

          sampleCount.current++;
          if (sampleCount.current > 30 && !calibratedRef.current) {
            calibratedRef.current = true;
            setNeedsCalibration(false);
          }

          if (hasGyro.current) {
            // Correct fused heading toward magnetometer
            let corr = angle - fusedHeadingRef.current;
            if (corr > 180) corr -= 360;
            if (corr < -180) corr += 360;
            fusedHeadingRef.current = ((fusedHeadingRef.current + (1 - GYRO_ALPHA) * corr) + 360) % 360;
          } else {
            applyHeading(angle);
          }
        });
        return;
      }

      // Fallback: Location heading
      try {
        const sub = await Location.watchHeadingAsync((d) => {
          if (!mounted.current) return;
          const h = d.trueHeading >= 0 ? d.trueHeading : d.magHeading;
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

  // ── Derived values ────────────────────────────────────────────────
  const absOffset = Math.abs(uiRelAngle);
  const isInFOV = absOffset <= FOV_HALF;
  const isBehind = absOffset > 150;

  // ── Animated interpolations for pin ───────────────────────────────
  const pinTranslateX = relativeAngleAnim.interpolate({
    inputRange: [-FOV_HALF, 0, FOV_HALF],
    outputRange: [-SW * 0.42, 0, SW * 0.42],
    extrapolate: 'clamp',
  });

  const pinOpacity = relativeAngleAnim.interpolate({
    inputRange: [-FOV_HALF - 5, -FOV_HALF, FOV_HALF, FOV_HALF + 5],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp',
  });

  const pinScale = relativeAngleAnim.interpolate({
    inputRange: [-FOV_HALF - 3, -FOV_HALF, -6, 0, 6, FOV_HALF, FOV_HALF + 3],
    outputRange: [0.65, 0.8, 1.04, 1.04, 1.04, 0.8, 0.65],
    extrapolate: 'clamp',
  });

  // ── Dynamic message ───────────────────────────────────────────────
  const message = useMemo(() => {
    if (isValidated) return { text: '✅ Direction validée', color: '#4CAF50' };
    if (validationProgress > 0 && absOffset < PAUSE_THRESHOLD)
      return { text: `Maintenez la position… ${Math.round(validationProgress)}%`, color: GOLD };
    if (isInFOV && absOffset >= 5 && absOffset < 15)
      return { text: 'Alignez-vous avec le repère', color: '#FFC107' };
    if (!isInFOV && !isBehind)
      return null; // Indicators handle it
    return null;
  }, [isValidated, validationProgress, absOffset, isInFOV, isBehind]);

  const precisionLabel = needsCalibration ? '🧭 Calibration nécessaire' : 'Boussole calibrée ✓';

  // ── Render ────────────────────────────────────────────────────────
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

      <View style={styles.darkOverlay} />

      {/* Camera status (hidden once ready) */}
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

      {/* ── AR Area: pin + indicators ─────────────────────────────── */}
      <View style={styles.arArea}>
        {/* Kaaba pin — spatially positioned */}
        <Animated.View
          style={[
            styles.pinWrapper,
            {
              transform: [{ translateX: pinTranslateX }, { scale: pinScale }],
              opacity: pinOpacity,
            },
          ]}
        >
          <KaabaPin
            offset={absOffset}
            validationProgress={validationProgress}
            isValidated={isValidated}
            distance={distance}
          />
        </Animated.View>

        {/* ── Direction indicators (when pin off-screen) ── */}

        {/* Left */}
        {!isInFOV && !isBehind && uiRelAngle < 0 && (
          <View style={styles.indicatorLeft}>
            <Ionicons name="chevron-back" size={30} color={GOLD} />
            <Text style={styles.indicatorText}>Tournez à gauche</Text>
            <Text style={styles.indicatorDeg}>{Math.round(absOffset)}°</Text>
          </View>
        )}

        {/* Right */}
        {!isInFOV && !isBehind && uiRelAngle > 0 && (
          <View style={styles.indicatorRight}>
            <Ionicons name="chevron-forward" size={30} color={GOLD} />
            <Text style={styles.indicatorText}>Tournez à droite</Text>
            <Text style={styles.indicatorDeg}>{Math.round(absOffset)}°</Text>
          </View>
        )}

        {/* Behind (U-turn) */}
        {isBehind && (
          <View style={styles.indicatorCenter}>
            <Ionicons name="reload" size={36} color={GOLD} />
            <Text style={styles.indicatorText}>Faites demi-tour</Text>
          </View>
        )}
      </View>

      {/* ── Dynamic message badge ──────────────────────────────── */}
      {message && (
        <View style={[styles.messageBadge, { backgroundColor: message.color + 'E6' }]}>
          <Text style={styles.messageText}>{message.text}</Text>
        </View>
      )}

      {/* ── Info overlay (bottom) ──────────────────────────────── */}
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
            <Text style={styles.infoValue}>
              {Math.round(qiblaAngle)}° {getCardinalDirection(qiblaAngle)}
            </Text>
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

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },

  // Camera status
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

  // Calibration
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

  // Header
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

  // AR area
  arArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinWrapper: {
    // Centered by parent; translateX offsets from center
  },

  // Direction indicators
  indicatorLeft: {
    position: 'absolute',
    left: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 4,
  },
  indicatorRight: {
    position: 'absolute',
    right: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 4,
  },
  indicatorCenter: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 6,
  },
  indicatorText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  indicatorDeg: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '800',
  },

  // Message badge
  messageBadge: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 130 : 110,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
  },
  messageText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Info overlay
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
