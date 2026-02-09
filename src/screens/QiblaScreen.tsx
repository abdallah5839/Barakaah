/**
 * QiblaScreen - Boussole de direction vers la Qibla (Mecque)
 * Animations fluides via Animated.Value + useNativeDriver (thread natif).
 * Capteur magnétomètre à 16ms (~60fps).
 * Le disque entier (N/S/E/W + graduations) tourne avec le magnétomètre
 * pour que N pointe toujours vers le nord magnétique réel.
 * La flèche Qibla est sur le disque et pointe dans la bonne direction absolue.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Animated,
  Alert,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Spacing, Typography, Shadows } from '../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(SCREEN_WIDTH * 0.78, 320);

const KAABA_COORDS = {
  latitude: 21.4225,
  longitude: 39.8262,
};

interface QiblaScreenProps {
  navigation?: any;
  isDark?: boolean;
}

// Calcul de l'angle Qibla (formule sphérique)
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
  angle = (angle + 360) % 360;

  return angle;
};

// Calcul de la distance avec la formule Haversine
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

// Conversion degrés en direction cardinale
const getCardinalDirection = (angle: number): string => {
  const directions = [
    'Nord', 'Nord-Est', 'Est', 'Sud-Est',
    'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'
  ];
  const index = Math.round(angle / 45) % 8;
  return directions[index];
};

// Pre-computed tick marks (static, never changes)
const TICK_MARKS = [...Array(72)].map((_, i) => {
  const deg = i * 5;
  const isMajor = deg % 90 === 0;
  const isMinor = deg % 45 === 0 && !isMajor;
  const tickHeight = isMajor ? 16 : isMinor ? 10 : 6;
  const radius = COMPASS_SIZE / 2 - 14;
  const rad = (deg * Math.PI) / 180;
  const x = Math.sin(rad) * radius;
  const y = -Math.cos(rad) * radius;
  return { deg, isMajor, isMinor, tickHeight, x, y };
});

// Static compass elements extracted to avoid re-renders
const CompassTicks = React.memo(({ textColor, borderColor }: { textColor: string; borderColor: string }) => (
  <>
    {TICK_MARKS.map((tick, i) => (
      <View
        key={i}
        style={{
          position: 'absolute',
          width: tick.isMajor ? 3 : 1.5,
          height: tick.tickHeight,
          backgroundColor: tick.isMajor ? textColor : borderColor,
          borderRadius: 1,
          left: COMPASS_SIZE / 2 - (tick.isMajor ? 1.5 : 0.75) + tick.x,
          top: COMPASS_SIZE / 2 - tick.tickHeight / 2 + tick.y,
          transform: [{ rotate: `${tick.deg}deg` }],
        }}
      />
    ))}
  </>
));

// Static info cards
const InfoCard = React.memo(({ icon, iconColor, iconBg, label, value, cardBg, textColor, secondaryColor }: any) => (
  <View style={[qStyles.infoCard, { backgroundColor: cardBg }, Shadows.small]}>
    <View style={[qStyles.infoIconContainer, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={22} color={iconColor} />
    </View>
    <View style={qStyles.infoContent}>
      <Text style={[qStyles.infoLabel, { color: secondaryColor }]}>{label}</Text>
      <Text style={[qStyles.infoValue, { color: textColor }]}>{value}</Text>
    </View>
  </View>
));

export const QiblaScreen: React.FC<QiblaScreenProps> = ({ navigation, isDark = false }) => {
  const colors = isDark ? Colors.dark : Colors.light;

  // Static state (set once after GPS)
  const [qiblaAngle, setQiblaAngle] = useState(0);
  const [distance, setDistance] = useState(0);
  const [locationName, setLocationName] = useState('Chargement...');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [facingQibla, setFacingQibla] = useState(false);

  // Native-driven Animated.Value — no JS bridge per frame
  const compassRotationAnim = useRef(new Animated.Value(0)).current;

  // Track cumulative rotation to avoid 360->0 jumps
  const prevSmooth = useRef(0);
  const qiblaAngleRef = useRef(0);
  // Throttle facingQibla state updates to avoid re-renders
  const lastFacingRef = useRef(false);

  // Subscription ref
  const headingSubscription = useRef<any>(null);
  const mounted = useRef(true);

  // Interpolations (computed once, stable references)
  const compassRotation = compassRotationAnim.interpolate({
    inputRange: [-3600, 0, 3600],
    outputRange: ['-3600deg', '0deg', '3600deg'],
  });

  const centerCounterRotation = compassRotationAnim.interpolate({
    inputRange: [-3600, 0, 3600],
    outputRange: ['3600deg', '0deg', '-3600deg'],
  });

  // Process heading update — called directly from sensor, bypasses React state
  const updateHeading = useCallback((angle: number) => {
    // Shortest path for smooth 0/360 crossing
    let diff = -angle - prevSmooth.current;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const target = prevSmooth.current + diff;
    prevSmooth.current = target;

    // Animate on native thread — 80ms fast timing, no setState
    Animated.timing(compassRotationAnim, {
      toValue: target,
      duration: 80,
      useNativeDriver: true,
    }).start();

    // Check facing Qibla (±15°) — only setState if changed
    const relativeQibla = ((qiblaAngleRef.current - angle) % 360 + 360) % 360;
    const isFacing = relativeQibla < 15 || relativeQibla > 345;
    if (isFacing !== lastFacingRef.current) {
      lastFacingRef.current = isFacing;
      setFacingQibla(isFacing);
    }
  }, [compassRotationAnim]);

  // Start magnetometer with high frequency
  const startMagnetometer = useCallback(async (): Promise<boolean> => {
    try {
      const isAvailable = await Magnetometer.isAvailableAsync();
      if (!isAvailable) return false;

      // 16ms = ~60fps sensor updates
      Magnetometer.setUpdateInterval(16);

      let lastAngle = 0;

      headingSubscription.current = Magnetometer.addListener((data) => {
        if (!mounted.current) return;

        let fieldAngle = Math.atan2(data.x, data.y);
        fieldAngle = (fieldAngle * 180) / Math.PI;
        fieldAngle = (fieldAngle + 360) % 360;
        const angle = (360 - fieldAngle) % 360;

        // Light jitter filter: skip changes < 0.5°
        let diff = angle - lastAngle;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        if (Math.abs(diff) < 0.5) return;
        lastAngle = angle;

        updateHeading(angle);
      });
      return true;
    } catch {
      return false;
    }
  }, [updateHeading]);

  // Setup: permissions → heading → GPS
  useEffect(() => {
    const setup = async () => {
      let permissionGranted = false;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        permissionGranted = status === 'granted';
      } catch {}

      let headingStarted = false;

      if (Platform.OS === 'android') {
        headingStarted = await startMagnetometer();

        if (!headingStarted && permissionGranted) {
          try {
            let lastAngle = 0;
            const sub = await Location.watchHeadingAsync((data) => {
              if (!mounted.current) return;
              const h = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
              let diff = h - lastAngle;
              if (diff > 180) diff -= 360;
              if (diff < -180) diff += 360;
              if (Math.abs(diff) < 0.5) return;
              lastAngle = h;
              updateHeading(h);
            });
            headingSubscription.current = sub;
            headingStarted = true;
          } catch {}
        }
      } else {
        if (permissionGranted) {
          try {
            let lastAngle = 0;
            const sub = await Location.watchHeadingAsync((data) => {
              if (!mounted.current) return;
              const h = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
              let diff = h - lastAngle;
              if (diff > 180) diff -= 360;
              if (diff < -180) diff += 360;
              if (Math.abs(diff) < 0.5) return;
              lastAngle = h;
              updateHeading(h);
            });
            headingSubscription.current = sub;
            headingStarted = true;
          } catch {}
        }

        if (!headingStarted) {
          headingStarted = await startMagnetometer();
        }
      }

      // GPS position
      let lat = 5.3600;
      let lon = -4.0083;
      let city = 'Abidjan, Côte d\'Ivoire';

      if (permissionGranted) {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;

          try {
            const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
            if (address) {
              city = `${address.city || address.region}, ${address.country}`;
            }
          } catch {
            city = 'Position actuelle';
          }
        } catch {}
      }

      if (mounted.current) {
        const qa = calculateQiblaAngle(lat, lon);
        qiblaAngleRef.current = qa;
        setLocationName(city);
        setQiblaAngle(qa);
        setDistance(calculateDistance(lat, lon));
      }
    };

    setup();

    return () => {
      mounted.current = false;
      if (headingSubscription.current) {
        headingSubscription.current.remove();
      }
    };
  }, []);

  const handleCalibrate = useCallback(() => {
    setIsCalibrating(true);
    Alert.alert(
      'Calibration de la boussole',
      'Faites un mouvement en forme de 8 avec votre téléphone pendant quelques secondes.',
      [{
        text: 'Compris',
        onPress: () => setTimeout(() => setIsCalibrating(false), 5000),
      }]
    );
  }, []);

  const goBack = useCallback(() => {
    if (navigation?.goBack) navigation.goBack();
  }, [navigation]);

  // Qibla marker position (static, computed from qiblaAngle)
  const markerRadius = COMPASS_SIZE / 2 - 22;
  const markerRad = (qiblaAngle * Math.PI) / 180;
  const markerX = Math.sin(markerRad) * markerRadius;
  const markerY = -Math.cos(markerRad) * markerRadius;

  return (
    <SafeAreaView style={[qStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[qStyles.header, { borderBottomColor: colors.separator }]}>
        <Pressable onPress={goBack} style={qStyles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={qStyles.headerCenter}>
          <Text style={[qStyles.headerTitle, { color: colors.text }]}>Direction Qibla</Text>
        </View>
        <View style={qStyles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Localisation */}
        <View style={qStyles.locationContainer}>
          <Ionicons name="location" size={20} color={colors.primary} />
          <Text style={[qStyles.locationText, { color: colors.text }]}>{locationName}</Text>
        </View>

        {/* Indicateur fixe en haut */}
        <View style={qStyles.topIndicatorContainer}>
          <View style={[qStyles.topIndicator, { borderTopColor: facingQibla ? colors.secondary : colors.primary }]} />
        </View>

        {/* Boussole */}
        <View style={qStyles.compassContainer}>
          <Animated.View
            style={[
              qStyles.compassOuter,
              {
                borderColor: facingQibla ? colors.secondary : colors.border,
                backgroundColor: colors.surface,
                transform: [{ rotate: compassRotation }],
              },
            ]}
          >
            {/* Graduations (memoized) */}
            <CompassTicks textColor={colors.text} borderColor={colors.border} />

            {/* Points cardinaux */}
            <Text style={[qStyles.cardinalN, { color: '#E53E3E' }]}>N</Text>
            <Text style={[qStyles.cardinalE, { color: colors.textSecondary }]}>E</Text>
            <Text style={[qStyles.cardinalS, { color: colors.textSecondary }]}>S</Text>
            <Text style={[qStyles.cardinalW, { color: colors.textSecondary }]}>W</Text>

            {/* Flèche Qibla */}
            <View
              style={[
                qStyles.qiblaArrowWrapper,
                { transform: [{ rotate: `${qiblaAngle}deg` }] },
              ]}
            >
              <View style={qStyles.qiblaArrowTop}>
                <View style={[qStyles.qiblaArrowHead, { borderBottomColor: colors.secondary }]} />
                <View style={[qStyles.qiblaArrowBody, { backgroundColor: colors.secondary }]} />
              </View>
              <View style={qStyles.qiblaArrowBottom}>
                <View style={[qStyles.qiblaArrowTail, { backgroundColor: colors.secondary + '30' }]} />
              </View>
            </View>

            {/* Kaaba marker */}
            <View
              style={[
                qStyles.qiblaMarker,
                {
                  left: COMPASS_SIZE / 2 - 14 + markerX,
                  top: COMPASS_SIZE / 2 - 14 + markerY,
                },
              ]}
            >
              <Text style={qStyles.qiblaMarkerText}>🕋</Text>
            </View>

            {/* Centre du disque */}
            <View style={[qStyles.compassCenter, { backgroundColor: colors.primary }]}>
              <Animated.View
                style={{
                  alignItems: 'center',
                  transform: [{ rotate: centerCounterRotation }],
                }}
              >
                <Text style={qStyles.compassCenterAngle}>{Math.round(qiblaAngle)}°</Text>
                <Text style={qStyles.compassCenterLabel}>Qibla</Text>
              </Animated.View>
            </View>
          </Animated.View>

          {/* Badge "Face à la Qibla" */}
          {facingQibla && (
            <View style={[qStyles.facingBadge, { backgroundColor: colors.secondary }]}>
              <Text style={qStyles.facingBadgeText}>Face à la Qibla</Text>
            </View>
          )}

          {/* Calibration badge */}
          {isCalibrating && (
            <View style={[qStyles.calibratingBadge, { backgroundColor: colors.secondary }]}>
              <Text style={qStyles.calibratingText}>Calibration en cours...</Text>
            </View>
          )}
        </View>

        {/* Informations */}
        <View style={qStyles.infoContainer}>
          <InfoCard
            icon="navigate"
            iconColor={colors.primary}
            iconBg={colors.primaryLight}
            label="Distance"
            value={`${distance.toLocaleString()} km`}
            cardBg={colors.surface}
            textColor={colors.text}
            secondaryColor={colors.textSecondary}
          />
          <InfoCard
            icon="compass"
            iconColor={colors.secondary}
            iconBg={colors.secondaryLight}
            label="Direction"
            value={`${getCardinalDirection(qiblaAngle)} (${Math.round(qiblaAngle)}°)`}
            cardBg={colors.surface}
            textColor={colors.text}
            secondaryColor={colors.textSecondary}
          />
        </View>

        {/* Bouton calibration */}
        <Pressable
          style={[qStyles.calibrateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleCalibrate}
        >
          <Ionicons name="sync" size={20} color={colors.primary} />
          <Text style={[qStyles.calibrateText, { color: colors.text }]}>Calibrer la boussole</Text>
        </Pressable>

        <Text style={[qStyles.instructions, { color: colors.textSecondary }]}>
          Tenez votre téléphone à plat. Tournez-vous jusqu'à ce que la flèche dorée pointe vers le haut.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const qStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.sm,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 44,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  locationText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  topIndicatorContainer: {
    alignItems: 'center',
    marginBottom: -8,
    zIndex: 10,
  },
  topIndicator: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  compassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  compassOuter: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardinalN: {
    position: 'absolute',
    top: 24,
    fontSize: 22,
    fontWeight: '800',
  },
  cardinalE: {
    position: 'absolute',
    right: 24,
    fontSize: 18,
    fontWeight: '600',
  },
  cardinalS: {
    position: 'absolute',
    bottom: 24,
    fontSize: 18,
    fontWeight: '600',
  },
  cardinalW: {
    position: 'absolute',
    left: 24,
    fontSize: 18,
    fontWeight: '600',
  },
  qiblaArrowWrapper: {
    position: 'absolute',
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    alignItems: 'center',
  },
  qiblaArrowTop: {
    height: COMPASS_SIZE / 2 - 34,
    width: 30,
    alignItems: 'center',
  },
  qiblaArrowBottom: {
    height: COMPASS_SIZE / 2 - 34,
    width: 30,
    alignItems: 'center',
  },
  qiblaArrowTail: {
    width: 3,
    height: COMPASS_SIZE / 2 - 60,
    borderRadius: 2,
    marginTop: 4,
  },
  qiblaArrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  qiblaArrowBody: {
    width: 5,
    flex: 1,
    marginTop: -2,
    borderRadius: 3,
  },
  qiblaMarker: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  qiblaMarkerText: {
    fontSize: 18,
  },
  compassCenter: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  compassCenterAngle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  compassCenterLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    fontWeight: '600',
  },
  facingBadge: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  facingBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  calibratingBadge: {
    position: 'absolute',
    bottom: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.radiusFull,
  },
  calibratingText: {
    color: '#FFF',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  infoContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.sm,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Spacing.radiusLg,
    gap: Spacing.md,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Typography.sizes.sm,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  calibrateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 52,
    borderRadius: Spacing.radiusMd,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  calibrateText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  instructions: {
    textAlign: 'center',
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    lineHeight: 20,
  },
});

export default QiblaScreen;
