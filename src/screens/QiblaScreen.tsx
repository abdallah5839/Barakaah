/**
 * QiblaScreen - Boussole de direction vers la Qibla (Mecque)
 * Animations ultra-fluides via Animated.Value + setValue() direct (zéro latence).
 * Capteur magnétomètre à 8ms (~120fps).
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
  Linking,
} from 'react-native';
import Svg, { Polygon, Circle as SvgCircle, Defs, LinearGradient as SvgGradient, Stop, Line } from 'react-native-svg';
import { Magnetometer } from 'expo-sensors';
import { getCameraPermissionsAsync, requestCameraPermissionsAsync } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Spacing, Typography, Shadows } from '../constants';
import { ARQiblaView } from '../components/qibla/ARQiblaView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(SCREEN_WIDTH * 0.78, 320);

const KAABA_COORDS = {
  latitude: 21.4225,
  longitude: 39.8262,
};

const QIBLA_CACHE_KEY = 'sakina_qibla_position';
const QIBLA_VIEW_MODE_KEY = 'qibla_view_mode';

// Default coords (Abidjan)
const DEFAULT_LAT = 5.3600;
const DEFAULT_LON = -4.0083;

const GOLD = '#D4AF37';
const GOLD_LIGHT = '#F4E4BA';

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
  const isCardinal = deg % 90 === 0;
  const is30 = deg % 30 === 0 && !isCardinal;
  const is10 = deg % 10 === 0 && !isCardinal && !is30;
  const tickHeight = isCardinal ? 14 : is30 ? 10 : is10 ? 7 : 4;
  const tickWidth = isCardinal ? 2 : is30 ? 1.5 : 1;
  const outerRadius = COMPASS_SIZE / 2 - 8;
  const rad = (deg * Math.PI) / 180;
  const outerX = Math.sin(rad) * outerRadius;
  const outerY = -Math.cos(rad) * outerRadius;
  const innerX = Math.sin(rad) * (outerRadius - tickHeight);
  const innerY = -Math.cos(rad) * (outerRadius - tickHeight);
  return { deg, isCardinal, is30, tickWidth, outerX, outerY, innerX, innerY };
});

// Degree labels at 30° intervals (except cardinals)
const DEGREE_LABELS = [30, 60, 120, 150, 210, 240, 300, 330].map(deg => {
  const labelRadius = COMPASS_SIZE / 2 - 28;
  const rad = (deg * Math.PI) / 180;
  const x = Math.sin(rad) * labelRadius;
  const y = -Math.cos(rad) * labelRadius;
  return { deg, x, y };
});

// Static compass elements extracted to avoid re-renders
const CompassTicks = React.memo(({ mutedColor, borderColor }: { mutedColor: string; borderColor: string }) => {
  const center = COMPASS_SIZE / 2;
  return (
    <>
      {/* SVG tick marks for crisp rendering */}
      <Svg width={COMPASS_SIZE} height={COMPASS_SIZE} style={StyleSheet.absoluteFill}>
        {TICK_MARKS.map((tick, i) => (
          <Line
            key={i}
            x1={center + tick.outerX}
            y1={center + tick.outerY}
            x2={center + tick.innerX}
            y2={center + tick.innerY}
            stroke={tick.isCardinal ? mutedColor : borderColor}
            strokeWidth={tick.tickWidth}
            strokeLinecap="round"
          />
        ))}
      </Svg>
      {/* Degree labels */}
      {DEGREE_LABELS.map(label => (
        <Text
          key={label.deg}
          style={{
            position: 'absolute',
            left: center - 12 + label.x,
            top: center - 7 + label.y,
            width: 24,
            textAlign: 'center',
            fontSize: 9,
            fontWeight: '500',
            color: borderColor,
          }}
        >
          {label.deg}
        </Text>
      ))}
    </>
  );
});

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

  // Pre-compute default qibla angle so compass is usable immediately
  const defaultQibla = calculateQiblaAngle(DEFAULT_LAT, DEFAULT_LON);

  // Static state (updated when GPS arrives)
  const [qiblaAngle, setQiblaAngle] = useState(defaultQibla);
  const [distance, setDistance] = useState(calculateDistance(DEFAULT_LAT, DEFAULT_LON));
  const [locationName, setLocationName] = useState('Abidjan, Côte d\'Ivoire');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [facingQibla, setFacingQibla] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | 'ar'>('2d');
  const cameraPermissionGranted = useRef(false);

  // Preload: check if permission already granted + restore saved mode
  useEffect(() => {
    const checkSaved = async () => {
      try {
        const permResult = await getCameraPermissionsAsync();
        if (permResult.granted) {
          cameraPermissionGranted.current = true;
          // Restore saved AR mode only if permission already granted
          const saved = await AsyncStorage.getItem(QIBLA_VIEW_MODE_KEY);
          if (saved === 'ar') setViewMode('ar');
        }
      } catch {}
    };
    checkSaved();
  }, []);

  // Toggle AR mode — button always visible, permission checked on tap
  const handleToggleAR = useCallback(async () => {
    if (viewMode === 'ar') {
      setViewMode('2d');
      AsyncStorage.setItem(QIBLA_VIEW_MODE_KEY, '2d').catch(() => {});
      return;
    }

    // Already granted — go straight to AR
    if (cameraPermissionGranted.current) {
      setViewMode('ar');
      AsyncStorage.setItem(QIBLA_VIEW_MODE_KEY, 'ar').catch(() => {});
      return;
    }

    // Request permission
    try {
      const { status, canAskAgain } = await requestCameraPermissionsAsync();
      if (status === 'granted') {
        cameraPermissionGranted.current = true;
        setViewMode('ar');
        AsyncStorage.setItem(QIBLA_VIEW_MODE_KEY, 'ar').catch(() => {});
      } else {
        // Permission denied — offer to open Settings
        Alert.alert(
          '📷 Permission requise',
          'L\'accès à la caméra est nécessaire pour le mode AR Qibla. Souhaitez-vous autoriser l\'accès dans les paramètres ?',
          [
            { text: 'Plus tard', style: 'cancel' },
            { text: 'Paramètres', onPress: () => Linking.openSettings() },
          ],
        );
      }
    } catch {
      Alert.alert(
        '📷 Caméra non disponible',
        'Votre appareil ne supporte pas le mode AR. La boussole 2D reste disponible.',
        [{ text: 'Compris' }],
      );
    }
  }, [viewMode]);

  // Native-driven Animated.Value — no JS bridge per frame
  const compassRotationAnim = useRef(new Animated.Value(0)).current;

  // Track cumulative rotation to avoid 360->0 jumps
  const prevSmooth = useRef(0);
  const qiblaAngleRef = useRef(defaultQibla);
  // Throttle facingQibla state updates to avoid re-renders
  const lastFacingRef = useRef(false);

  // Subscription ref
  const headingSubscription = useRef<any>(null);
  const mounted = useRef(true);

  // Haptic tracking refs — all refs to avoid re-renders on every sensor tick
  const lastCardinalRef = useRef<number | null>(null);   // last cardinal that triggered haptic
  const lastTickDegRef = useRef(0);                       // last 15° tick that triggered haptic
  const hapticCooldownRef = useRef(0);                    // timestamp of last haptic
  const qiblaHapticFiredRef = useRef(false);              // whether qibla haptic already fired

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

    // Direct setValue — zero latency, no animation scheduling overhead
    compassRotationAnim.setValue(target);

    const now = Date.now();

    // === Haptic: Qibla alignment (±5°) ===
    const relativeQibla = ((qiblaAngleRef.current - angle) % 360 + 360) % 360;
    const isFacingQibla = relativeQibla < 5 || relativeQibla > 355;
    if (isFacingQibla && !qiblaHapticFiredRef.current) {
      qiblaHapticFiredRef.current = true;
      hapticCooldownRef.current = now;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (!isFacingQibla) {
      qiblaHapticFiredRef.current = false;
    }

    // === Haptic: Cardinal points N/E/S/W (±2°) ===
    const cardinals = [0, 90, 180, 270];
    let hitCardinal: number | null = null;
    for (const c of cardinals) {
      let d = angle - c;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      if (Math.abs(d) <= 2) { hitCardinal = c; break; }
    }
    if (hitCardinal !== null && hitCardinal !== lastCardinalRef.current && now - hapticCooldownRef.current > 100) {
      lastCardinalRef.current = hitCardinal;
      hapticCooldownRef.current = now;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (hitCardinal === null) {
      lastCardinalRef.current = null;
    }

    // === Haptic: Rotation ticks every 15° ===
    const currentTick = Math.round(angle / 15) * 15;
    if (currentTick !== lastTickDegRef.current && now - hapticCooldownRef.current > 80) {
      lastTickDegRef.current = currentTick;
      hapticCooldownRef.current = now;
      // Soft tick — only if not already firing a cardinal or qibla haptic
      if (hitCardinal === null && !isFacingQibla) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }

    // Update facingQibla state (broader ±15° zone for UI badge)
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

      // 8ms = ~120fps sensor updates for ultra-fluid response
      Magnetometer.setUpdateInterval(8);

      let lastAngle = 0;

      headingSubscription.current = Magnetometer.addListener((data) => {
        if (!mounted.current) return;

        let fieldAngle = Math.atan2(data.x, data.y);
        fieldAngle = (fieldAngle * 180) / Math.PI;
        fieldAngle = (fieldAngle + 360) % 360;
        const angle = (360 - fieldAngle) % 360;

        // Light jitter filter: skip changes < 0.3°
        let diff = angle - lastAngle;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        if (Math.abs(diff) < 0.3) return;
        lastAngle = angle;

        updateHeading(angle);
      });
      return true;
    } catch {
      return false;
    }
  }, [updateHeading]);

  // Setup: parallel — magnetometer starts instantly, GPS runs in background
  useEffect(() => {
    // 1) Load cached position immediately (synchronous-ish, before any await)
    const loadCachedPosition = async () => {
      try {
        const cached = await AsyncStorage.getItem(QIBLA_CACHE_KEY);
        if (cached && mounted.current) {
          const { lat, lon, city } = JSON.parse(cached);
          const qa = calculateQiblaAngle(lat, lon);
          qiblaAngleRef.current = qa;
          setQiblaAngle(qa);
          setDistance(calculateDistance(lat, lon));
          setLocationName(city || 'Position enregistrée');
        }
      } catch {}
    };

    // 2) Start heading sensor (magnetometer or Location.watchHeading)
    const startHeading = async (permissionGranted: boolean) => {
      let headingStarted = false;

      if (Platform.OS === 'android') {
        // Android: prefer raw magnetometer (no permission needed)
        headingStarted = await startMagnetometer();
        // Fallback to Location heading if magnetometer unavailable
        if (!headingStarted && permissionGranted) {
          try {
            let lastAngle = 0;
            const sub = await Location.watchHeadingAsync((data) => {
              if (!mounted.current) return;
              const h = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
              let diff = h - lastAngle;
              if (diff > 180) diff -= 360;
              if (diff < -180) diff += 360;
              if (Math.abs(diff) < 0.3) return;
              lastAngle = h;
              updateHeading(h);
            });
            headingSubscription.current = sub;
          } catch {}
        }
      } else {
        // iOS: prefer Location heading (uses trueHeading with GPS correction)
        if (permissionGranted) {
          try {
            let lastAngle = 0;
            const sub = await Location.watchHeadingAsync((data) => {
              if (!mounted.current) return;
              const h = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
              let diff = h - lastAngle;
              if (diff > 180) diff -= 360;
              if (diff < -180) diff += 360;
              if (Math.abs(diff) < 0.3) return;
              lastAngle = h;
              updateHeading(h);
            });
            headingSubscription.current = sub;
            headingStarted = true;
          } catch {}
        }
        // Fallback to raw magnetometer
        if (!headingStarted) {
          await startMagnetometer();
        }
      }
    };

    // 3) Fetch fresh GPS and update qibla (runs in parallel)
    const fetchGPS = async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced, // faster fix than High
        });
        const lat = loc.coords.latitude;
        const lon = loc.coords.longitude;

        let city = 'Position actuelle';
        try {
          const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
          if (address) {
            city = `${address.city || address.region}, ${address.country}`;
          }
        } catch {}

        if (mounted.current) {
          const qa = calculateQiblaAngle(lat, lon);
          qiblaAngleRef.current = qa;
          setQiblaAngle(qa);
          setDistance(calculateDistance(lat, lon));
          setLocationName(city);
        }

        // Cache for next launch
        try {
          await AsyncStorage.setItem(QIBLA_CACHE_KEY, JSON.stringify({ lat, lon, city }));
        } catch {}
      } catch {}
    };

    // Execute: cache first, then magnetometer + GPS in parallel
    const setup = async () => {
      // Load cache immediately (updates qibla if available)
      await loadCachedPosition();

      // Start magnetometer right away on Android (no permission needed)
      if (Platform.OS === 'android') {
        startMagnetometer();
      }

      // Request permission (needed for iOS heading + GPS on both platforms)
      let permissionGranted = false;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        permissionGranted = status === 'granted';
      } catch {}

      // Launch heading and GPS in parallel — don't await one before the other
      const headingPromise = startHeading(permissionGranted);
      const gpsPromise = permissionGranted ? fetchGPS() : Promise.resolve();
      await Promise.all([headingPromise, gpsPromise]);
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
  const markerRadius = COMPASS_SIZE / 2 - 26;
  const markerRad = (qiblaAngle * Math.PI) / 180;
  const markerX = Math.sin(markerRad) * markerRadius;
  const markerY = -Math.cos(markerRad) * markerRadius;

  // Needle geometry (SVG)
  const needleCenter = COMPASS_SIZE / 2;
  const needleTip = 32;           // distance from edge for the tip
  const needleBack = needleCenter + 24; // tail extends slightly past center
  const needleHalfWidth = 5;

  // Pulse animation for center when facing Qibla
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (facingQibla) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [facingQibla]);

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
        <Pressable onPress={handleToggleAR} style={qStyles.arToggleButton}>
          <Ionicons
            name={viewMode === 'ar' ? 'compass-outline' : 'camera-outline'}
            size={22}
            color={GOLD}
          />
        </Pressable>
      </View>

      {/* AR Mode */}
      {viewMode === 'ar' ? (
        <ARQiblaView
          onClose={() => {
            setViewMode('2d');
            AsyncStorage.setItem(QIBLA_VIEW_MODE_KEY, '2d').catch(() => {});
          }}
          qiblaAngle={qiblaAngle}
          distance={distance}
          locationName={locationName}
          isDark={isDark}
        />
      ) : (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Localisation */}
        <View style={qStyles.locationContainer}>
          <Ionicons name="location" size={18} color={colors.primary} />
          <Text style={[qStyles.locationText, { color: colors.text }]}>{locationName}</Text>
        </View>

        {/* Indicateur fixe en haut — triangle doré */}
        <View style={qStyles.topIndicatorContainer}>
          <Svg width={24} height={16}>
            <Polygon
              points="12,0 0,16 24,16"
              fill={facingQibla ? GOLD : colors.primary}
            />
          </Svg>
        </View>

        {/* Boussole */}
        <View style={qStyles.compassContainer}>
          {/* Outer glow ring when facing Qibla */}
          {facingQibla && (
            <View style={[qStyles.compassGlow, { borderColor: GOLD + '30' }]} />
          )}

          <Animated.View
            style={[
              qStyles.compassOuter,
              {
                borderColor: facingQibla ? GOLD : (isDark ? colors.border : '#E5E7EB'),
                backgroundColor: isDark ? colors.surface : '#FFFFFF',
                transform: [{ rotate: compassRotation }],
              },
            ]}
          >
            {/* Graduations (memoized SVG) */}
            <CompassTicks mutedColor={isDark ? colors.textMuted : '#9CA3AF'} borderColor={isDark ? colors.border : '#D1D5DB'} />

            {/* Points cardinaux */}
            <Text style={[qStyles.cardinalN, { color: '#DC2626' }]}>N</Text>
            <Text style={[qStyles.cardinalE, { color: isDark ? colors.textSecondary : '#6B7280' }]}>E</Text>
            <Text style={[qStyles.cardinalS, { color: isDark ? colors.textSecondary : '#6B7280' }]}>S</Text>
            <Text style={[qStyles.cardinalW, { color: isDark ? colors.textSecondary : '#6B7280' }]}>W</Text>

            {/* SVG Needle — elegant tapered shape */}
            <View style={qStyles.needleWrapper} pointerEvents="none">
              <Svg width={COMPASS_SIZE} height={COMPASS_SIZE} style={StyleSheet.absoluteFill}>
                <Defs>
                  <SvgGradient id="needleGold" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#F5D76E" />
                    <Stop offset="0.5" stopColor={GOLD} />
                    <Stop offset="1" stopColor="#B8960C" />
                  </SvgGradient>
                  <SvgGradient id="needleTail" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={isDark ? '#555' : '#C0C0C0'} />
                    <Stop offset="1" stopColor={isDark ? '#333' : '#9CA3AF'} />
                  </SvgGradient>
                </Defs>
                {/* Rotate the whole needle group around center */}
                <Polygon
                  points={`${needleCenter},${needleTip} ${needleCenter - needleHalfWidth},${needleCenter} ${needleCenter + needleHalfWidth},${needleCenter}`}
                  fill="url(#needleGold)"
                  rotation={qiblaAngle}
                  origin={`${needleCenter}, ${needleCenter}`}
                />
                <Polygon
                  points={`${needleCenter},${needleBack} ${needleCenter - needleHalfWidth + 1},${needleCenter} ${needleCenter + needleHalfWidth - 1},${needleCenter}`}
                  fill="url(#needleTail)"
                  rotation={qiblaAngle}
                  origin={`${needleCenter}, ${needleCenter}`}
                />
                {/* Tiny center pin */}
                <SvgCircle cx={needleCenter} cy={needleCenter} r={4} fill={GOLD} />
                <SvgCircle cx={needleCenter} cy={needleCenter} r={2} fill="#FFF" />
              </Svg>
            </View>

            {/* Kaaba marker — elegant gold dot with halo */}
            <View
              style={[
                qStyles.qiblaMarker,
                {
                  left: COMPASS_SIZE / 2 - 16 + markerX,
                  top: COMPASS_SIZE / 2 - 16 + markerY,
                },
              ]}
            >
              <View style={[qStyles.markerHalo, { backgroundColor: GOLD + '20' }]}>
                <View style={[qStyles.markerDot, { backgroundColor: GOLD }]}>
                  <Text style={qStyles.markerIcon}>🕋</Text>
                </View>
              </View>
            </View>

            {/* Centre du disque — green with gold ring */}
            <Animated.View
              style={[
                qStyles.compassCenter,
                {
                  backgroundColor: colors.primary,
                  borderColor: GOLD,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Animated.View
                style={{
                  alignItems: 'center',
                  transform: [{ rotate: centerCounterRotation }],
                }}
              >
                <Text style={qStyles.compassCenterAngle}>{Math.round(qiblaAngle)}°</Text>
                <Text style={qStyles.compassCenterLabel}>Qibla</Text>
              </Animated.View>
            </Animated.View>
          </Animated.View>

          {/* Badge "Face à la Qibla" */}
          {facingQibla && (
            <View style={[qStyles.facingBadge, { backgroundColor: GOLD }]}>
              <Ionicons name="checkmark-circle" size={16} color="#FFF" style={{ marginRight: 6 }} />
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
            iconColor={GOLD}
            iconBg={GOLD_LIGHT + '40'}
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
      )}
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
  arToggleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  locationText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  topIndicatorContainer: {
    alignItems: 'center',
    marginBottom: -6,
    zIndex: 10,
  },
  compassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  compassGlow: {
    position: 'absolute',
    width: COMPASS_SIZE + 16,
    height: COMPASS_SIZE + 16,
    borderRadius: (COMPASS_SIZE + 16) / 2,
    borderWidth: 4,
  },
  compassOuter: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  cardinalN: {
    position: 'absolute',
    top: 38,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardinalE: {
    position: 'absolute',
    right: 38,
    fontSize: 14,
    fontWeight: '600',
  },
  cardinalS: {
    position: 'absolute',
    bottom: 38,
    fontSize: 14,
    fontWeight: '600',
  },
  cardinalW: {
    position: 'absolute',
    left: 38,
    fontSize: 14,
    fontWeight: '600',
  },
  needleWrapper: {
    position: 'absolute',
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    zIndex: 5,
  },
  qiblaMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  markerHalo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  markerIcon: {
    fontSize: 12,
  },
  compassCenter: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  compassCenterAngle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  compassCenterLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  facingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
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
