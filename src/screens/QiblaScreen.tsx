/**
 * QiblaScreen - Boussole de direction vers la Qibla (Mecque)
 * Le disque entier (N/S/E/W + graduations) tourne avec le magnétomètre
 * pour que N pointe toujours vers le nord magnétique réel.
 * La flèche Qibla est sur le disque et pointe dans la bonne direction absolue.
 * Quand l'utilisateur tourne, tout le disque tourne, donc la flèche
 * pointe toujours physiquement vers la Mecque.
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
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, Shadows } from '../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(SCREEN_WIDTH * 0.78, 320);

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

// Calcul de l'angle Qibla (formule sphérique) - bearing depuis la position vers la Kaaba
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
  const [facingQibla, setFacingQibla] = useState(false);

  // Animation : le disque entier tourne avec -heading
  const compassRotationAnim = useRef(new Animated.Value(0)).current;
  const prevCompassRotation = useRef(0);

  // Lissage du cap : filtre les micro-variations pour fluidité
  const lastHeadingRef = useRef(0);

  // Subscription heading (cap)
  const headingSubscription = useRef<any>(null);
  const mounted = useRef(true);

  // Démarrer le magnétomètre brut (fiable sur Android)
  const startMagnetometer = async (): Promise<boolean> => {
    try {
      const isAvailable = await Magnetometer.isAvailableAsync();
      if (!isAvailable) return false;

      Magnetometer.setUpdateInterval(100);
      headingSubscription.current = Magnetometer.addListener((data) => {
        if (!mounted.current) return;
        // atan2(x, y) donne 0° quand le haut du téléphone pointe au nord magnétique
        let fieldAngle = Math.atan2(data.x, data.y);
        fieldAngle = (fieldAngle * 180) / Math.PI;
        fieldAngle = (fieldAngle + 360) % 360;
        const angle = (360 - fieldAngle) % 360;

        // Filtre anti-jitter : ignorer les variations < 1°
        let diff = angle - lastHeadingRef.current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        if (Math.abs(diff) < 1) return;
        lastHeadingRef.current = angle;

        setHeading(angle);
      });
      console.log('🧭 [Qibla] Magnétomètre démarré');
      return true;
    } catch {
      return false;
    }
  };

  // Setup unique : permissions → heading (rapide) → GPS position (lent)
  useEffect(() => {
    const setup = async () => {
      // 1. Permissions (une seule fois)
      let permissionGranted = false;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        permissionGranted = status === 'granted';
      } catch {
        // Permission refusée, on utilise les valeurs par défaut
      }

      // 2. Démarrer le cap IMMÉDIATEMENT (avant le GPS qui est lent)
      let headingStarted = false;

      if (Platform.OS === 'android') {
        // Sur Android : utiliser le magnétomètre directement
        // Location.watchHeadingAsync est peu fiable sur Android (ne délivre souvent aucune donnée)
        headingStarted = await startMagnetometer();

        // Fallback : tenter Location.watchHeadingAsync si le magnétomètre échoue
        if (!headingStarted && permissionGranted) {
          try {
            const sub = await Location.watchHeadingAsync((data) => {
              if (!mounted.current) return;
              const h = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;

              let diff = h - lastHeadingRef.current;
              if (diff > 180) diff -= 360;
              if (diff < -180) diff += 360;
              if (Math.abs(diff) < 1) return;
              lastHeadingRef.current = h;

              setHeading(h);
            });
            headingSubscription.current = sub;
            headingStarted = true;
          } catch {
            // Aucun capteur disponible
          }
        }
      } else {
        // Sur iOS : Location.watchHeadingAsync fonctionne bien (fusion capteurs, vrai nord)
        if (permissionGranted) {
          try {
            const sub = await Location.watchHeadingAsync((data) => {
              if (!mounted.current) return;
              const h = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;

              let diff = h - lastHeadingRef.current;
              if (diff > 180) diff -= 360;
              if (diff < -180) diff += 360;
              if (Math.abs(diff) < 1) return;
              lastHeadingRef.current = h;

              setHeading(h);
            });
            headingSubscription.current = sub;
            headingStarted = true;
          } catch {
            // Fallback vers magnétomètre brut
          }
        }

        // Fallback iOS : magnétomètre brut
        if (!headingStarted) {
          headingStarted = await startMagnetometer();
        }
      }

      if (!headingStarted) {
        console.warn('⚠️ [Qibla] Aucun capteur de boussole disponible');
      }

      // 3. Position GPS (peut prendre plusieurs secondes)
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
        } catch {
          // Utiliser coordonnées par défaut
        }
      }

      if (mounted.current) {
        setLocationName(city);
        setQiblaAngle(calculateQiblaAngle(lat, lon));
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

  // Animation du disque boussole
  useEffect(() => {
    const targetRotation = -heading;

    // Gestion du passage 360° → 0° pour éviter les rotations brusques
    let diff = targetRotation - prevCompassRotation.current;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const smoothTarget = prevCompassRotation.current + diff;
    prevCompassRotation.current = smoothTarget;

    Animated.timing(compassRotationAnim, {
      toValue: smoothTarget,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Détection si on fait face à la Qibla (±15°)
    const relativeQibla = ((qiblaAngle - heading) % 360 + 360) % 360;
    setFacingQibla(relativeQibla < 15 || relativeQibla > 345);
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

  // Interpolation rotation du disque
  const compassRotation = compassRotationAnim.interpolate({
    inputRange: [-720, 0, 720],
    outputRange: ['-720deg', '0deg', '720deg'],
  });

  // La flèche Qibla est à l'angle absolu sur le disque (le disque tourne, donc la flèche suit)
  const ARROW_RADIUS = COMPASS_SIZE / 2 - 40;

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

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Localisation */}
        <View style={styles.locationContainer}>
          <Ionicons name="location" size={20} color={colors.primary} />
          <Text style={[styles.locationText, { color: colors.text }]}>{locationName}</Text>
        </View>

        {/* Indicateur fixe en haut - triangle qui pointe vers le bas */}
        <View style={styles.topIndicatorContainer}>
          <View style={[styles.topIndicator, { borderTopColor: facingQibla ? colors.secondary : colors.primary }]} />
        </View>

        {/* Boussole */}
        <View style={styles.compassContainer}>
          {/* Disque tournant : tout tourne ensemble (N/S/E/W + graduations + flèche Qibla) */}
          <Animated.View
            style={[
              styles.compassOuter,
              {
                borderColor: facingQibla ? colors.secondary : colors.border,
                backgroundColor: colors.surface,
                transform: [{ rotate: compassRotation }],
              },
            ]}
          >
            {/* Graduations */}
            {[...Array(72)].map((_, i) => {
              const deg = i * 5;
              const isMajor = deg % 90 === 0;
              const isMinor = deg % 45 === 0 && !isMajor;
              const tickHeight = isMajor ? 16 : isMinor ? 10 : 6;
              const radius = COMPASS_SIZE / 2 - 14;
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

            {/* Points cardinaux - sur le disque, tournent avec */}
            <Text style={[styles.cardinalN, { color: '#E53E3E' }]}>N</Text>
            <Text style={[styles.cardinalE, { color: colors.textSecondary }]}>E</Text>
            <Text style={[styles.cardinalS, { color: colors.textSecondary }]}>S</Text>
            <Text style={[styles.cardinalW, { color: colors.textSecondary }]}>W</Text>

            {/* Flèche Qibla - wrapper centré, tourne depuis le centre du disque */}
            <View
              style={[
                styles.qiblaArrowWrapper,
                {
                  transform: [{ rotate: `${qiblaAngle}deg` }],
                },
              ]}
            >
              {/* Partie haute : flèche qui pointe vers le bord */}
              <View style={styles.qiblaArrowTop}>
                <View style={[styles.qiblaArrowHead, { borderBottomColor: colors.secondary }]} />
                <View style={[styles.qiblaArrowBody, { backgroundColor: colors.secondary }]} />
              </View>
              {/* Partie basse : queue transparente */}
              <View style={styles.qiblaArrowBottom}>
                <View style={[styles.qiblaArrowTail, { backgroundColor: colors.secondary + '30' }]} />
              </View>
            </View>

            {/* 🕋 Kaaba sur le cercle à l'angle Qibla */}
            {(() => {
              const markerRadius = COMPASS_SIZE / 2 - 22;
              const rad = (qiblaAngle * Math.PI) / 180;
              const mx = Math.sin(rad) * markerRadius;
              const my = -Math.cos(rad) * markerRadius;
              // Contre-rotation pour que le texte reste lisible
              return (
                <View
                  style={[
                    styles.qiblaMarker,
                    {
                      left: COMPASS_SIZE / 2 - 14 + mx,
                      top: COMPASS_SIZE / 2 - 14 + my,
                    },
                  ]}
                >
                  <Text style={styles.qiblaMarkerText}>🕋</Text>
                </View>
              );
            })()}

            {/* Centre du disque */}
            <View style={[styles.compassCenter, { backgroundColor: colors.primary }]}>
              {/* Contre-rotation du texte pour qu'il reste lisible */}
              <Animated.View
                style={{
                  alignItems: 'center',
                  transform: [{
                    rotate: compassRotationAnim.interpolate({
                      inputRange: [-720, 0, 720],
                      outputRange: ['720deg', '0deg', '-720deg'],
                    }),
                  }],
                }}
              >
                <Text style={styles.compassCenterAngle}>{Math.round(qiblaAngle)}°</Text>
                <Text style={styles.compassCenterLabel}>Qibla</Text>
              </Animated.View>
            </View>
          </Animated.View>

          {/* Badge "Face à la Qibla" */}
          {facingQibla && (
            <View style={[styles.facingBadge, { backgroundColor: colors.secondary }]}>
              <Text style={styles.facingBadgeText}>Face à la Qibla</Text>
            </View>
          )}

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
          Tenez votre téléphone à plat. Tournez-vous jusqu'à ce que la flèche dorée pointe vers le haut.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  // Points cardinaux - sur le disque tournant
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
  // Wrapper centré dans le disque, taille = disque entier, rotation depuis le centre
  qiblaArrowWrapper: {
    position: 'absolute',
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    alignItems: 'center',
  },
  // Partie haute : contient la flèche (pointe vers le haut = vers le bord)
  qiblaArrowTop: {
    height: COMPASS_SIZE / 2 - 34,
    width: 30,
    alignItems: 'center',
  },
  // Partie basse : queue
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
  // Repère Qibla (🕋) sur le cercle
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
  // Centre
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
