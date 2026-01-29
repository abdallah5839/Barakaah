/**
 * QiblaScreen - Boussole de direction vers la Qibla (Mecque)
 * N/S/E/W fixes, seule la flèche Qibla tourne
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Animated,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, Shadows } from '../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(SCREEN_WIDTH * 0.75, 320);

// Coordonnées de la Kaaba (Mecque)
const KAABA_COORDS = {
  latitude: 21.4225,
  longitude: 39.8262,
};

// Couleurs
const Colors = {
  light: {
    primary: '#059669',
    secondary: '#D4AF37',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
  },
  dark: {
    primary: '#10B981',
    secondary: '#FBBF24',
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    border: '#334155',
  },
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

export const QiblaScreen: React.FC<QiblaScreenProps> = ({ navigation, isDark = false }) => {
  const colors = isDark ? Colors.dark : Colors.light;

  // États
  const [heading, setHeading] = useState(0);
  const [qiblaAngle, setQiblaAngle] = useState(0);
  const [distance, setDistance] = useState(0);
  const [locationName, setLocationName] = useState('Chargement...');
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Animation : seule la flèche Qibla tourne
  const arrowRotationAnim = useRef(new Animated.Value(0)).current;
  const prevRotation = useRef(0);

  // Subscriptions
  const magnetometerSubscription = useRef<any>(null);

  // Setup localisation
  useEffect(() => {
    const setup = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        let lat = 5.3600;
        let lon = -4.0083;
        let city = 'Abidjan, Côte d\'Ivoire';

        if (status === 'granted') {
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
        }

        setLocationName(city);
        setQiblaAngle(calculateQiblaAngle(lat, lon));
        setDistance(calculateDistance(lat, lon));
      } catch (error) {
        const lat = 5.3600;
        const lon = -4.0083;
        setLocationName('Abidjan, Côte d\'Ivoire');
        setQiblaAngle(calculateQiblaAngle(lat, lon));
        setDistance(calculateDistance(lat, lon));
      }
    };

    setup();
  }, []);

  // Magnétomètre
  useEffect(() => {
    const startMagnetometer = async () => {
      const isAvailable = await Magnetometer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Capteur non disponible', 'Le magnétomètre n\'est pas disponible sur cet appareil.');
        return;
      }

      Magnetometer.setUpdateInterval(100);

      magnetometerSubscription.current = Magnetometer.addListener((data) => {
        let angle = Math.atan2(data.y, data.x);
        angle = (angle * 180) / Math.PI;
        angle = (angle + 360) % 360;

        if (Platform.OS === 'ios') {
          angle = (angle + 90) % 360;
        }

        setHeading(angle);
      });
    };

    startMagnetometer();

    return () => {
      if (magnetometerSubscription.current) {
        magnetometerSubscription.current.remove();
      }
    };
  }, []);

  // Animation de la flèche Qibla
  useEffect(() => {
    // La flèche pointe vers la Qibla par rapport à l'orientation du téléphone
    const targetRotation = qiblaAngle - heading;

    // Gestion du passage 360° → 0° pour éviter les rotations complètes
    let diff = targetRotation - prevRotation.current;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const smoothTarget = prevRotation.current + diff;
    prevRotation.current = smoothTarget;

    Animated.timing(arrowRotationAnim, {
      toValue: smoothTarget,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [heading, qiblaAngle]);

  // Calibration
  const handleCalibrate = () => {
    setIsCalibrating(true);
    Alert.alert(
      'Calibration de la boussole',
      'Faites un mouvement en forme de 8 avec votre téléphone pendant quelques secondes.',
      [{
        text: 'Compris',
        onPress: () => setTimeout(() => setIsCalibrating(false), 5000),
      }]
    );
  };

  const goBack = () => {
    if (navigation?.goBack) navigation.goBack();
  };

  // Interpolation rotation flèche
  const arrowRotation = arrowRotationAnim.interpolate({
    inputRange: [-720, 0, 720],
    outputRange: ['-720deg', '0deg', '720deg'],
  });

  // Position du repère Qibla sur le cercle (angle fixe par rapport au Nord)
  const qiblaMarkerAngle = qiblaAngle;
  const MARKER_RADIUS = COMPASS_SIZE / 2 - 8;
  const markerX = Math.sin((qiblaMarkerAngle * Math.PI) / 180) * MARKER_RADIUS;
  const markerY = -Math.cos((qiblaMarkerAngle * Math.PI) / 180) * MARKER_RADIUS;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Direction Qibla</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Localisation */}
      <View style={styles.locationContainer}>
        <Ionicons name="location" size={20} color={colors.primary} />
        <Text style={[styles.locationText, { color: colors.text }]}>{locationName}</Text>
      </View>

      {/* Boussole */}
      <View style={styles.compassContainer}>
        <View style={[styles.compassOuter, { borderColor: colors.border, backgroundColor: colors.surface }]}>

          {/* Graduations FIXES */}
          {[...Array(72)].map((_, i) => {
            const deg = i * 5;
            const isMajor = deg % 90 === 0;
            const isMinor = deg % 45 === 0 && !isMajor;
            const tickHeight = isMajor ? 16 : isMinor ? 10 : 6;
            const radius = COMPASS_SIZE / 2 - 12;
            const rad = (deg * Math.PI) / 180;
            const x = Math.sin(rad) * radius;
            const y = -Math.cos(rad) * radius;

            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  width: isMajor ? 3 : 1.5,
                  height: tickHeight,
                  backgroundColor: isMajor ? colors.text : colors.border,
                  borderRadius: 1,
                  left: COMPASS_SIZE / 2 - (isMajor ? 1.5 : 0.75) + x,
                  top: COMPASS_SIZE / 2 - tickHeight / 2 + y,
                  transform: [{ rotate: `${deg}deg` }],
                }}
              />
            );
          })}

          {/* Points cardinaux FIXES */}
          <Text style={[styles.cardinalN, { color: colors.secondary }]}>N</Text>
          <Text style={[styles.cardinalE, { color: colors.textSecondary }]}>E</Text>
          <Text style={[styles.cardinalS, { color: colors.textSecondary }]}>S</Text>
          <Text style={[styles.cardinalW, { color: colors.textSecondary }]}>W</Text>

          {/* Repère Qibla FIXE sur le cercle */}
          <View style={[styles.qiblaMarker, {
            left: COMPASS_SIZE / 2 - 14 + markerX,
            top: COMPASS_SIZE / 2 - 14 + markerY,
          }]}>
            <Text style={styles.qiblaMarkerText}>🕋</Text>
          </View>

          {/* Flèche Qibla qui TOURNE */}
          <Animated.View
            style={[
              styles.arrowContainer,
              { transform: [{ rotate: arrowRotation }] },
            ]}
          >
            {/* Pointe de la flèche */}
            <View style={[styles.arrowHead, { borderBottomColor: colors.secondary }]} />
            <View style={[styles.arrowBody, { backgroundColor: colors.secondary }]} />
            {/* Queue */}
            <View style={{ flex: 1 }} />
            <View style={[styles.arrowTail, { backgroundColor: colors.secondary + '40' }]} />
          </Animated.View>

          {/* Centre avec angle */}
          <View style={[styles.compassCenter, { backgroundColor: colors.primary }]}>
            <Text style={styles.compassCenterAngle}>{Math.round(qiblaAngle)}°</Text>
            <Text style={styles.compassCenterLabel}>Qibla</Text>
          </View>
        </View>

        {/* Calibration badge */}
        {isCalibrating && (
          <View style={[styles.calibratingBadge, { backgroundColor: colors.secondary }]}>
            <Text style={styles.calibratingText}>Calibration en cours...</Text>
          </View>
        )}
      </View>

      {/* Informations */}
      <View style={styles.infoContainer}>
        <View style={[styles.infoCard, { backgroundColor: colors.surface }, Shadows.small]}>
          <View style={[styles.infoIconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="navigate" size={24} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Distance</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{distance.toLocaleString()} km</Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surface }, Shadows.small]}>
          <View style={[styles.infoIconContainer, { backgroundColor: colors.secondary + '15' }]}>
            <Ionicons name="compass" size={24} color={colors.secondary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Direction</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {getCardinalDirection(qiblaAngle)} ({Math.round(qiblaAngle)}°)
            </Text>
          </View>
        </View>
      </View>

      {/* Bouton calibration */}
      <Pressable
        style={[styles.calibrateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={handleCalibrate}
      >
        <Ionicons name="sync" size={20} color={colors.primary} />
        <Text style={[styles.calibrateText, { color: colors.text }]}>Calibrer la boussole</Text>
      </Pressable>

      <Text style={[styles.instructions, { color: colors.textSecondary }]}>
        Tenez votre téléphone à plat. Alignez la flèche dorée vers le haut pour faire face à la Qibla.
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
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
  compassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  compassOuter: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Points cardinaux FIXES
  cardinalN: {
    position: 'absolute',
    top: 22,
    fontSize: 22,
    fontWeight: '800',
  },
  cardinalE: {
    position: 'absolute',
    right: 22,
    fontSize: 18,
    fontWeight: '600',
  },
  cardinalS: {
    position: 'absolute',
    bottom: 22,
    fontSize: 18,
    fontWeight: '600',
  },
  cardinalW: {
    position: 'absolute',
    left: 22,
    fontSize: 18,
    fontWeight: '600',
  },
  // Repère Qibla fixe sur le cercle
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
    fontSize: 20,
  },
  // Flèche Qibla tournante
  arrowContainer: {
    position: 'absolute',
    width: 30,
    height: COMPASS_SIZE - 80,
    alignItems: 'center',
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowBody: {
    width: 6,
    height: COMPASS_SIZE / 2 - 70,
    marginTop: -2,
    borderRadius: 3,
  },
  arrowTail: {
    width: 4,
    height: COMPASS_SIZE / 2 - 70,
    borderRadius: 2,
  },
  // Centre
  compassCenter: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  compassCenterAngle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  compassCenterLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '600',
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
