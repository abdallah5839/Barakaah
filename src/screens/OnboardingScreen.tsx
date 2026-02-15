/**
 * OnboardingScreen — Ecran d'accueil premiere ouverture
 * 7 etapes: 4 slides, Permission Location, Permission Notifs, Lancement
 * Francais uniquement
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Steps: 0-3=slides, 4=location, 5=notifs, 6=final
type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const TOTAL_STEPS = 7;
const SLIDE_STEPS = [0, 1, 2, 3];

interface OnboardingScreenProps {
  onComplete: () => void;
}

// Textes francais
const TEXT = {
  // Slide 1 - Bienvenue
  slide1Title: 'Bienvenue sur Sakina',
  slide1Subtitle: 'Votre compagnon spirituel au quotidien',
  slide1Desc: 'Prieres, Coran, Duas et outils spirituels reunis en une seule application.',

  // Slide 2 - Cercle de lecture
  slide2Title: 'Cercle de Lecture',
  slide2Subtitle: 'Lisez le Coran ensemble',
  slide2Desc: 'Rejoignez un cercle de lecture et partagez votre progression avec la communaute.',

  // Slide 3 - Outils
  slide3Title: 'Outils Spirituels',
  slide3Subtitle: 'Tout ce dont vous avez besoin',
  slide3Desc: 'Horaires de priere, Qibla, Tasbih, Calendrier Hijri et bien plus encore.',

  // Slide 4 - Philosophie
  slide4Title: 'Notre Philosophie',
  slide4Subtitle: 'Sakina — La Quietude',
  slide4Desc: 'Une application concue avec amour pour vous accompagner dans votre cheminement spirituel.',

  // Permission - Location
  permLocationTitle: 'Localisation',
  permLocationSubtitle: 'Pour des horaires precis',
  permLocationDesc: 'Activez la localisation pour calculer les horaires de priere et la direction de la Qibla adaptes a votre position.',
  permLocationBtn: 'Activer la localisation',
  permLocationSkip: 'Plus tard',

  // Permission - Notifications
  permNotifTitle: 'Notifications',
  permNotifSubtitle: 'Ne manquez aucune priere',
  permNotifDesc: 'Recevez un rappel avant chaque priere pour ne jamais en manquer une.',
  permNotifBtn: 'Activer les notifications',
  permNotifSkip: 'Plus tard',

  // Navigation
  next: 'Suivant',
  skip: 'Passer',
  start: 'Bismillah, commencer',
};

// Slide data (icons and gradients for each content slide)
const SLIDE_DATA = [
  { icon: 'moon' as const, gradient: ['#16a34a', '#166534'] as [string, string], useLogo: true },
  { icon: 'book' as const, gradient: ['#0891B2', '#0E7490'] as [string, string], useLogo: false },
  { icon: 'compass' as const, gradient: ['#D4AF37', '#B8860B'] as [string, string], useLogo: false },
  { icon: 'heart' as const, gradient: ['#7C3AED', '#5B21B6'] as [string, string], useLogo: false },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for CTA button
  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  // Transition between steps
  const transitionTo = useCallback((newStep: Step) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setStep(newStep);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
      ]).start();

      if (newStep === 6) {
        startPulse();
      }
    });
  }, [fadeAnim, slideAnim, startPulse]);

  const goNext = useCallback(() => {
    if (step < 6) {
      transitionTo((step + 1) as Step);
    }
  }, [step, transitionTo]);

  const goBack = useCallback(() => {
    if (step > 0) {
      transitionTo((step - 1) as Step);
    }
  }, [step, transitionTo]);

  const skipToEnd = useCallback(() => {
    transitionTo(6);
  }, [transitionTo]);

  // Permission handlers
  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      await AsyncStorage.setItem('sakina_location_permission', status);
    } catch (e) {
      console.log('Location permission error:', e);
    }
    goNext();
  }, [goNext]);

  const requestNotifications = useCallback(async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      await AsyncStorage.setItem('sakina_notif_permission', status);
    } catch (e) {
      console.log('Notification permission error:', e);
    }
    goNext();
  }, [goNext]);

  // Final: mark onboarding complete
  const finishOnboarding = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem('sakina_onboarding_done', 'true');
    await AsyncStorage.setItem('sakina_language', 'fr');
    onComplete();
  }, [onComplete]);

  // Progress dots (only for slides 0-3)
  const renderProgressDots = () => {
    if (!SLIDE_STEPS.includes(step)) return null;
    return (
      <View style={styles.dotsRow}>
        {SLIDE_DATA.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === step ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    );
  };

  // ===== RENDER SLIDES 0-3 =====
  const renderSlide = () => {
    const data = SLIDE_DATA[step];

    const titles = [TEXT.slide1Title, TEXT.slide2Title, TEXT.slide3Title, TEXT.slide4Title];
    const subtitles = [TEXT.slide1Subtitle, TEXT.slide2Subtitle, TEXT.slide3Subtitle, TEXT.slide4Subtitle];
    const descs = [TEXT.slide1Desc, TEXT.slide2Desc, TEXT.slide3Desc, TEXT.slide4Desc];

    return (
      <View style={styles.slideContent}>
        {/* Icon circle or Logo for slide 1 */}
        <View style={styles.slideIconArea}>
          {data.useLogo ? (
            <View style={styles.logoImageWrap}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
          ) : (
            <LinearGradient
              colors={data.gradient}
              style={styles.slideIconCircle}
            >
              <Ionicons name={data.icon} size={64} color="#FFF" />
            </LinearGradient>
          )}
        </View>

        {/* Text */}
        <View style={styles.slideTextArea}>
          <Text style={styles.slideTitle}>{titles[step]}</Text>
          <Text style={styles.slideSubtitle}>{subtitles[step]}</Text>
          <Text style={styles.slideDesc}>{descs[step]}</Text>
        </View>

        {/* Progress dots */}
        {renderProgressDots()}

        {/* Buttons */}
        <View style={styles.slideButtons}>
          <Pressable onPress={goNext} style={styles.nextBtn}>
            <LinearGradient
              colors={['#16a34a', '#166534']}
              style={styles.nextBtnGradient}
            >
              <Text style={styles.nextBtnText}>{TEXT.next}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </LinearGradient>
          </Pressable>

          <Pressable onPress={skipToEnd} hitSlop={12}>
            <Text style={styles.skipText}>{TEXT.skip}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // ===== RENDER PERMISSION SCREENS =====
  const renderPermission = (type: 'location' | 'notifs') => {
    const isLocation = type === 'location';
    const icon = isLocation ? 'location' : 'notifications';
    const gradient: [string, string] = isLocation ? ['#0891B2', '#0E7490'] : ['#7C3AED', '#5B21B6'];
    const title = isLocation ? TEXT.permLocationTitle : TEXT.permNotifTitle;
    const subtitle = isLocation ? TEXT.permLocationSubtitle : TEXT.permNotifSubtitle;
    const desc = isLocation ? TEXT.permLocationDesc : TEXT.permNotifDesc;
    const btnText = isLocation ? TEXT.permLocationBtn : TEXT.permNotifBtn;
    const skipLabel = isLocation ? TEXT.permLocationSkip : TEXT.permNotifSkip;
    const onAllow = isLocation ? requestLocation : requestNotifications;

    return (
      <View style={styles.slideContent}>
        <View style={styles.slideIconArea}>
          <LinearGradient colors={gradient} style={styles.slideIconCircle}>
            <Ionicons name={icon as any} size={64} color="#FFF" />
          </LinearGradient>
        </View>

        <View style={styles.slideTextArea}>
          <Text style={styles.slideTitle}>{title}</Text>
          <Text style={styles.slideSubtitle}>{subtitle}</Text>
          <Text style={styles.slideDesc}>{desc}</Text>
        </View>

        <View style={styles.slideButtons}>
          <Pressable onPress={onAllow} style={styles.nextBtn}>
            <LinearGradient colors={gradient} style={styles.nextBtnGradient}>
              <Ionicons name={icon as any} size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.nextBtnText}>{btnText}</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={goNext} hitSlop={12}>
            <Text style={styles.skipText}>{skipLabel}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // ===== RENDER FINAL SCREEN =====
  const renderFinal = () => (
    <View style={styles.centerContent}>
      <View style={styles.finalLogoArea}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.finalLogoImage}
          resizeMode="cover"
        />
      </View>

      <Text style={styles.finalTitle}>Sakina</Text>
      <Text style={styles.finalSubtitle}>Votre compagnon spirituel</Text>

      <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%', alignItems: 'center' }}>
        <Pressable onPress={finishOnboarding} style={styles.startBtn}>
          <LinearGradient
            colors={['#16a34a', '#166534']}
            style={styles.startBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.startBtnText}>{TEXT.start}</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );

  // ===== RENDER CURRENT STEP =====
  const renderStep = () => {
    switch (step) {
      case 0: case 1: case 2: case 3: return renderSlide();
      case 4: return renderPermission('location');
      case 5: return renderPermission('notifs');
      case 6: return renderFinal();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Top bar with back button (hidden on step 0 and final) */}
        {step > 0 && step < 6 && (
          <View style={styles.topBar}>
            <Pressable onPress={goBack} hitSlop={12} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.7)" />
            </Pressable>

            {/* Step indicator */}
            <View style={styles.stepIndicator}>
              <View style={styles.stepTrack}>
                <View style={[styles.stepFill, { width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }]} />
              </View>
            </View>
          </View>
        )}

        {/* Animated content */}
        <Animated.View
          style={[
            styles.animatedContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {renderStep()}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  safeArea: {
    flex: 1,
  },
  animatedContent: {
    flex: 1,
  },

  // === Top bar ===
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    flex: 1,
  },
  stepTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  stepFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#16a34a',
  },

  // === Center content (final) ===
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  // === Slides ===
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  slideIconArea: {
    marginBottom: 40,
  },
  slideIconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImageWrap: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#115e30',
  },
  logoImage: {
    width: 220,
    height: 220,
  },
  slideTextArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  slideSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#D4AF37',
    textAlign: 'center',
    marginBottom: 16,
  },
  slideDesc: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },

  // === Dots ===
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#16a34a',
    width: 24,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // === Buttons ===
  slideButtons: {
    width: '100%',
    alignItems: 'center',
    gap: 20,
  },
  nextBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  nextBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
  skipText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },

  // === Final screen ===
  finalLogoArea: {
    marginBottom: 32,
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
    backgroundColor: '#115e30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalLogoImage: {
    width: 220,
    height: 220,
  },
  finalTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 2,
    marginBottom: 8,
  },
  finalSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 48,
  },
  startBtn: {
    width: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  startBtnGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  startBtnText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
});

export default OnboardingScreen;
