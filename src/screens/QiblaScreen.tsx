/**
 * QiblaScreen - Boussole de direction vers la Qibla (Mecque)
 * Utilise les capteurs du téléphone pour pointer vers la Kaaba
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Magnetometer, Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, Shadows } from '../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPASS_SIZE = SCREEN_WIDTH * 0.75;

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
  const R = 6371; // Rayon de la Terre en km
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
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [magnetometerData, setMagnetometerData] = useState({ x: 0, y: 0, z: 0 });
  const [heading, setHeading] = useState(0);
  const [qiblaAngle, setQiblaAngle] = useState(0);
  const [distance, setDistance] = useState(0);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationName, setLocationName] = useState('Chargement...');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [accuracy, setAccuracy] = useState<'low' | 'medium' | 'high'>('medium');

  // Animation
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const qiblaRotationAnim = useRef(new Animated.Value(0)).current;

  // Subscriptions
  const magnetometerSubscription = useRef<any>(null);

  // Demander permissions et obtenir localisation
  useEffect(() => {
    const setup = async () => {
      try {
        // Permission localisation
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setHasPermission(false);
          // Utiliser Abidjan par défaut
          const defaultLat = 5.3600;
          const defaultLon = -4.0083;
          setLocation({ latitude: defaultLat, longitude: defaultLon });
          setLocationName('Abidjan, Côte d\'Ivoire');
          setQiblaAngle(calculateQiblaAngle(defaultLat, defaultLon));
          setDistance(calculateDistance(defaultLat, defaultLon));
          return;
        }

        setHasPermission(true);

        // Obtenir position
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const { latitude, longitude } = loc.coords;
        setLocation({ latitude, longitude });

        // Calculer Qibla
        setQiblaAngle(calculateQiblaAngle(latitude, longitude));
        setDistance(calculateDistance(latitude, longitude));

        // Obtenir nom de la ville
        try {
          const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (address) {
            setLocationName(`${address.city || address.region}, ${address.country}`);
          }
        } catch {
          setLocationName('Position actuelle');
        }
      } catch (error) {
        console.error('Erreur setup:', error);
        // Fallback Abidjan
        const defaultLat = 5.3600;
        const defaultLon = -4.0083;
        setLocation({ latitude: defaultLat, longitude: defaultLon });
        setLocationName('Abidjan, Côte d\'Ivoire');
        setQiblaAngle(calculateQiblaAngle(defaultLat, defaultLon));
        setDistance(calculateDistance(defaultLat, defaultLon));
      }
    };

    setup();
  }, []);

  // Démarrer le magnétomètre
  useEffect(() => {
    const startMagnetometer = async () => {
      // Vérifier disponibilité
      const isAvailable = await Magnetometer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          'Capteur non disponible',
          'Le magnétomètre n\'est pas disponible sur cet appareil.'
        );
        return;
      }

      // Configurer intervalle de mise à jour
      Magnetometer.setUpdateInterval(50);

      // S'abonner aux données
      magnetometerSubscription.current = Magnetometer.addListener((data) => {
        setMagnetometerData(data);

        // Calculer l'angle de la boussole
        let angle = Math.atan2(data.y, data.x);
        angle = (angle * 180) / Math.PI;
        angle = (angle + 360) % 360;

        // Correction pour le mode portrait
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

  // Animation de la boussole
  useEffect(() => {
    Animated.timing(rotationAnim, {
      toValue: -heading,
      duration: 100,
      useNativeDriver: true,
    }).start();

    // Animation flèche Qibla
    const qiblaDirection = qiblaAngle - heading;
    Animated.timing(qiblaRotationAnim, {
      toValue: qiblaDirection,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [heading, qiblaAngle]);

  // Calibration
  const handleCalibrate = () => {
    setIsCalibrating(true);
    Alert.alert(
      'Calibration de la boussole',
      'Faites un mouvement en forme de 8 avec votre téléphone pendant quelques secondes pour calibrer le magnétomètre.',
      [
        {
          text: 'Compris',
          onPress: () => {
            setTimeout(() => setIsCalibrating(false), 5000);
          },
        },
      ]
    );
  };

  // Retour
  const goBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  // Interpolation rotation
  const compassRotation = rotationAnim.interpolate({
    inputRange: [-360, 0, 360],
    outputRange: ['-360deg', '0deg', '360deg'],
  });

  const qiblaArrowRotation = qiblaRotationAnim.interpolate({
    inputRange: [-360, 0, 360],
    outputRange: ['-360deg', '0deg', '360deg'],
  });

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
        {/* Cercle extérieur avec graduations */}
        <View style={[styles.compassOuter, { borderColor: colors.border }]}>
          {/* Boussole rotative */}
          <Animated.View
            style={[
              styles.compassInner,
              {
                backgroundColor: colors.surface,
                transform: [{ rotate: compassRotation }],
              },
            ]}
          >
            {/* Graduations */}
            {[...Array(72)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.tick,
                  {
                    backgroundColor: i % 9 === 0 ? colors.text : colors.border,
                    height: i % 9 === 0 ? 15 : 8,
                    transform: [
                      { rotate: `${i * 5}deg` },
                      { translateY: -(COMPASS_SIZE / 2 - 20) },
                    ],
                  },
                ]}
              />
            ))}

            {/* Points cardinaux */}
            <Text style={[styles.cardinalN, { color: colors.secondary }]}>N</Text>
            <Text style={[styles.cardinalE, { color: colors.textSecondary }]}>E</Text>
            <Text style={[styles.cardinalS, { color: colors.textSecondary }]}>S</Text>
            <Text style={[styles.cardinalW, { color: colors.textSecondary }]}>W</Text>
          </Animated.View>

          {/* Flèche Qibla (fixe, pointe toujours vers la Mecque) */}
          <Animated.View
            style={[
              styles.qiblaArrow,
              {
                transform: [{ rotate: qiblaArrowRotation }],
              },
            ]}
          >
            <View style={[styles.arrowHead, { borderBottomColor: colors.secondary }]} />
            <View style={[styles.arrowBody, { backgroundColor: colors.secondary }]} />
            {/* Kaaba icon */}
            <View style={[styles.kaabaIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="cube" size={18} color="#FFF" />
            </View>
          </Animated.View>

          {/* Centre */}
          <View style={[styles.compassCenter, { backgroundColor: colors.primary }]}>
            <Text style={styles.compassCenterText}>{Math.round(qiblaAngle)}°</Text>
          </View>
        </View>

        {/* Indicateur de calibration */}
        {isCalibrating && (
          <View style={[styles.calibratingBadge, { backgroundColor: colors.secondary }]}>
            <Text style={styles.calibratingText}>Calibration en cours...</Text>
          </View>
        )}
      </View>

      {/* Informations */}
      <View style={styles.infoContainer}>
        {/* Distance */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }, Shadows.small]}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="navigate" size={24} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Distance jusqu'à la Mecque
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {distance.toLocaleString()} km
            </Text>
          </View>
        </View>

        {/* Direction */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }, Shadows.small]}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="compass" size={24} color={colors.secondary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Direction
            </Text>
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
        <Text style={[styles.calibrateText, { color: colors.text }]}>
          Calibrer la boussole
        </Text>
      </Pressable>

      {/* Instructions */}
      <Text style={[styles.instructions, { color: colors.textSecondary }]}>
        Tenez votre téléphone à plat pour une lecture précise
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
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.xs,
  },
  locationText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  compassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  compassOuter: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassInner: {
    width: COMPASS_SIZE - 10,
    height: COMPASS_SIZE - 10,
    borderRadius: (COMPASS_SIZE - 10) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  tick: {
    position: 'absolute',
    width: 2,
    borderRadius: 1,
  },
  cardinalN: {
    position: 'absolute',
    top: 25,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  cardinalE: {
    position: 'absolute',
    right: 25,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  cardinalS: {
    position: 'absolute',
    bottom: 25,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  cardinalW: {
    position: 'absolute',
    left: 25,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  qiblaArrow: {
    position: 'absolute',
    alignItems: 'center',
    height: COMPASS_SIZE / 2 - 30,
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowBody: {
    width: 6,
    height: 60,
    marginTop: -2,
  },
  kaabaIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  compassCenter: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassCenterText: {
    color: '#FFF',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
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
    gap: Spacing.md,
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
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.xs,
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
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
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
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
});

export default QiblaScreen;
